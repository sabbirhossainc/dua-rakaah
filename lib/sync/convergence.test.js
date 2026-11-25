// Several simulated devices of one reader make random changes while the "network" drops, delays and repeats
// requests, and some devices sign in part-way. After everything is delivered, every device and the server must
// hold identical bookmarks (data-sync spec, "Devices converge"). The simulation runs the real server code
// (syncRequest, on a real libSQL file) and the same client functions the app uses (lib/local/apply.js).
//
// A failure prints its seed. Replay one seed with:  CONVERGENCE_SEEDS=1 CONVERGENCE_FIRST_SEED=<seed> npm test
import test from "node:test";
import assert from "node:assert/strict";
import { testClient, seededRandom } from "./test-helpers.js";
import { syncRequest } from "./service.js";
import { SyncError } from "./identity.js";
import { mergeBookmark, MAX_FUTURE_MS } from "./records.js";
import { localChange, nextBatch, pulledRecord, resendOps, withoutAcknowledged } from "../local/apply.js";

const SEEDS = Number(process.env.CONVERGENCE_SEEDS ?? 200);
const FIRST_SEED = Number(process.env.CONVERGENCE_FIRST_SEED ?? 1);
const STEPS = 70;
const DUAS = 5; // few ids, so devices collide on the same bookmark often
const START = 1_800_000_000_000;

function simulate(client, seed) {
  const rand = seededRandom(seed);
  const int = (n) => Math.floor(rand() * n);
  const chance = (p) => rand() < p;
  const hex = (n) => Array.from({ length: n }, () => int(16).toString(16)).join("");
  const uuid = () => `${hex(8)}-${hex(4)}-4${hex(3)}-8${hex(3)}-${hex(12)}`;
  const accountId = `google:seed-${seed}`;

  let clock = START;
  const everyOp = []; // every change any device made, for the oracle
  const futureDevice = chance(0.3);
  const devices = Array.from({ length: 3 + int(3) }, (_, i) => ({
    anonId: uuid(),
    cookie: null,
    signedIn: false,
    epoch: 0,
    // One device may have its clock days ahead, which the server must correct.
    // Whole hundreds of milliseconds, so two devices often stamp the same time and the op id decides.
    skew: i === 0 && futureDevice ? MAX_FUTURE_MS * 11 : (int(5) - 2) * 100,
    bookmarks: new Map(),
    outbox: [],
    cursor: 0,
    inFlight: null,
  }));
  const network = [];
  const history = [];

  const ctxOf = (dev) => ({ session: dev.signedIn ? { accountId } : null, cookieOwnerId: dev.cookie });

  function toggle(dev) {
    const dua_id = 1 + int(DUAS);
    const existing = dev.bookmarks.get(dua_id);
    const deleted = existing && existing.deleted === 0 ? 1 : 0;
    const { record, op } = localChange(existing, { dua_id, deleted, now: clock + dev.skew, op_id: uuid() });
    dev.bookmarks.set(dua_id, record);
    dev.outbox.push(op);
    everyOp.push(record);
  }

  function send(dev) {
    if (dev.inFlight) return;
    const ops = nextBatch(dev.outbox);
    const msg = { dev, epoch: dev.epoch, body: { anonId: dev.anonId, cursor: dev.cursor, ops }, ctx: ctxOf(dev), sentIds: ops.map((o) => o.op_id) };
    dev.inFlight = msg;
    network.push(msg);
  }

  async function serve(msg) {
    try {
      return { ok: true, value: await syncRequest(client, msg.body, { ...msg.ctx, now: clock }) };
    } catch (error) {
      if (error instanceof SyncError) return { ok: false, status: error.status };
      throw error;
    }
  }

  function apply(dev, msg, res) {
    if (dev.inFlight !== msg || msg.epoch !== dev.epoch) return; // the device gave up on it or signed in meanwhile
    dev.inFlight = null;
    if (!res.ok) {
      if (res.status === 403) {
        // The cookie never arrived (or is gone): start a new anonymous identity and send everything again.
        dev.anonId = uuid();
        dev.cookie = null;
        dev.cursor = 0;
        const known = new Set(dev.outbox.map((o) => o.op_id));
        dev.outbox.push(...resendOps([...dev.bookmarks.values()]).filter((o) => !known.has(o.op_id)));
      }
      return;
    }
    const { value } = res;
    dev.outbox = withoutAcknowledged(dev.outbox, msg.sentIds);
    for (const row of value.rows) {
      const hasPending = dev.outbox.some((o) => o.dua_id === row.dua_id);
      dev.bookmarks.set(row.dua_id, pulledRecord(dev.bookmarks.get(row.dua_id), row, hasPending));
    }
    dev.cursor = value.cursor;
    if (value.set_cookie_owner_id) dev.cookie = value.set_cookie_owner_id;
  }

  async function deliver(msg, { keepResponse }) {
    const res = await serve(msg);
    history.push(msg);
    if (keepResponse) apply(msg.dev, msg, res);
  }

  function signIn(dev) {
    if (dev.signedIn) return;
    dev.signedIn = true;
    dev.epoch += 1;
    dev.inFlight = null;
    dev.cursor = 0;
    const known = new Set(dev.outbox.map((o) => o.op_id));
    dev.outbox.push(...resendOps([...dev.bookmarks.values()]).filter((o) => !known.has(o.op_id)));
  }

  async function run() {
    for (let step = 0; step < STEPS; step++) {
      clock += int(3) * 100;
      const dev = devices[int(devices.length)];
      const roll = rand();
      if (roll < 0.3) toggle(dev);
      else if (roll < 0.52) send(dev);
      else if (roll < 0.82) {
        if (network.length > 0) {
          const msg = network.splice(int(network.length), 1)[0];
          await deliver(msg, { keepResponse: !chance(0.2) });
        }
      } else if (roll < 0.88) {
        // The device gives up on its request. The request may still arrive later, or be lost.
        dev.inFlight = null;
        if (chance(0.4) && network.length > 0) network.splice(int(network.length), 1);
      } else if (roll < 0.94) {
        if (history.length > 0) await deliver(history[int(history.length)], { keepResponse: false }); // a repeated request
      } else signIn(dev);
    }

    // The reader signs in everywhere, the network recovers, and every request is delivered.
    for (const dev of devices) signIn(dev);
    clock += 1000;
    while (network.length > 0) await deliver(network.shift(), { keepResponse: chance(0.5) });
    for (let round = 0; round < 6; round++) {
      for (const dev of devices) {
        dev.inFlight = null;
        send(dev);
        const msg = network.pop();
        await deliver(msg, { keepResponse: true });
      }
      clock += 1000;
    }
  }

  const snapshot = (bookmarks) =>
    [...bookmarks.values()]
      .map((r) => ({ dua_id: r.dua_id, deleted: r.deleted, updated_at: r.updated_at, op_id: r.op_id }))
      .sort((a, b) => a.dua_id - b.dua_id);

  return {
    async check() {
      await run();
      const where = `seed ${seed}`;
      const server = await client.execute({
        sql: `SELECT b.dua_id, b.deleted, b.updated_at, b.op_id FROM bookmarks b
                JOIN owners o ON o.id = b.owner_id WHERE o.user_id = ? ORDER BY b.dua_id`,
        args: [accountId],
      });
      const serverRows = server.rows.map((r) => ({
        dua_id: Number(r.dua_id), deleted: Number(r.deleted), updated_at: Number(r.updated_at), op_id: String(r.op_id),
      }));
      for (const [i, dev] of devices.entries()) {
        assert.equal(dev.outbox.length, 0, `${where}: device ${i} still has unsent changes`);
        assert.deepEqual(snapshot(dev.bookmarks), serverRows, `${where}: device ${i} differs from the server`);
      }
      // With every clock sane, the result must also be the newest change per bookmark among all changes made.
      if (!futureDevice) {
        const expected = new Map();
        for (const r of everyOp) expected.set(r.dua_id, mergeBookmark(expected.get(r.dua_id), r));
        assert.deepEqual(serverRows, snapshot(expected), `${where}: the server did not keep the newest change`);
      }
    },
  };
}

test(`devices converge over ${SEEDS} random schedules`, { timeout: 240_000 }, async (t) => {
  const { client, cleanup } = await testClient();
  t.after(cleanup);
  for (let seed = FIRST_SEED; seed < FIRST_SEED + SEEDS; seed++) {
    await simulate(client, seed).check();
  }
});
