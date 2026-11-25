// Several simulated devices of one reader make random changes (bookmarks, memorize records and settings) while the "network" drops, delays and repeats
// requests, and some devices sign in part-way. After everything is delivered, every device and the server must
// hold identical data (data-sync spec, "Devices converge"). The simulation runs the real server code
// (syncRequest, on a real libSQL file) and the same client functions the app uses (lib/local/apply.js).
//
// A failure prints its seed. Replay one seed with:  CONVERGENCE_SEEDS=1 CONVERGENCE_FIRST_SEED=<seed> npm test
import test from "node:test";
import assert from "node:assert/strict";
import { testClient, seededRandom } from "./test-helpers.js";
import { syncRequest } from "./service.js";
import { SyncError } from "./identity.js";
import { mergeBookmark, mergeMemorize, mergePreference, MAX_FUTURE_MS, MAX_OPS } from "./records.js";
import { SETTING_NAMES, SETTINGS } from "../preferences.js";
import {
  CLIENT_TYPES,
  claimsRecord,
  clientTypeNames,
  localChange,
  memorizeChange,
  memorizeTarget,
  nextBatch,
  preferenceChange,
  pulledMemorize,
  pulledPreference,
  pulledRecord,
  resendOps,
  withoutAcknowledged,
} from "../local/apply.js";

const SEEDS = Number(process.env.CONVERGENCE_SEEDS ?? 200);
const FIRST_SEED = Number(process.env.CONVERGENCE_FIRST_SEED ?? 1);
const STEPS = 70;
const DUAS = 5; // few ids, so devices collide on the same bookmark often
const START = 1_800_000_000_000;

function simulate(client, seed, stats) {
  const rand = seededRandom(seed);
  const int = (n) => Math.floor(rand() * n);
  const chance = (p) => rand() < p;
  const hex = (n) => Array.from({ length: n }, () => int(16).toString(16)).join("");
  const uuid = () => `${hex(8)}-${hex(4)}-4${hex(3)}-8${hex(3)}-${hex(12)}`;
  const accountId = `google:seed-${seed}`;

  let clock = START;
  const everyOp = []; // every bookmark change any device made, for the oracle
  const everyMemorize = []; // every memorize record any device made, for the oracle
  const everyPref = []; // every setting any device chose: only for the statistics at the end, there is no oracle for settings
  const futureDevice = chance(0.3);
  // Usually a request carries every queued change; sometimes only a few, so a pull can arrive before the changes behind it.
  const batchSize = chance(0.5) ? MAX_OPS : 1 + int(4);
  const devices = Array.from({ length: 3 + int(3) }, (_, i) => ({
    anonId: uuid(),
    cookie: null,
    signedIn: false,
    epoch: 0,
    // One device may have its clock days ahead, which the server must correct.
    // Whole hundreds of milliseconds, so two devices often stamp the same time and the op id decides.
    skew: i === 0 && futureDevice ? MAX_FUTURE_MS * 11 : (int(5) - 2) * 100,
    bookmarks: new Map(),
    memorize: new Map(),
    prefs: new Map(),
    outbox: [],
    cursor: 0,
    inFlight: null,
  }));
  const network = [];
  const history = [];

  const ctxOf = (dev) => ({ session: dev.signedIn ? { accountId } : null, cookieOwnerId: dev.cookie });

  // What the reader does to a dua's memorize state: tick or un-tick, pick a step, or start over.
  function memorizeAction() {
    const roll = int(8);
    if (roll < 2) return { kind: "learned", value: roll === 0 };
    if (roll === 7) return { kind: "startOver" };
    return { kind: "progress", value: [0, 25, 50, 75, 100][int(5)] };
  }

  function memorizeStep(dev) {
    const dua_id = 1 + int(DUAS);
    const existing = dev.memorize.get(dua_id);
    const target = { dua_id, ...memorizeTarget(existing, memorizeAction()) };
    const change = memorizeChange(existing, target, { op_id: uuid(), now: clock + dev.skew });
    if (!change) return;
    dev.memorize.set(dua_id, change.record);
    dev.outbox.push(change.op);
    everyMemorize.push(change.record);
  }

  // The reader picks a setting and a valid value. Choosing the default when nothing is stored is no change.
  function preferenceStep(dev) {
    const pref_key = SETTING_NAMES[int(SETTING_NAMES.length)];
    const setting = SETTINGS[pref_key];
    const value = setting.values ? setting.values[int(setting.values.length)] : ["1", "7", "42"][int(3)];
    const existing = dev.prefs.get(pref_key);
    const change = preferenceChange(existing, { pref_key, value, now: clock + dev.skew, op_id: uuid() });
    if (!change) return;
    dev.prefs.set(pref_key, change.record);
    dev.outbox.push(change.op);
    everyPref.push(change.record);
  }

  function toggle(dev) {
    const kind = int(3);
    if (kind === 0) return memorizeStep(dev);
    if (kind === 1) return preferenceStep(dev);
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
    const ops = nextBatch(dev.outbox, batchSize);
    const msg = { dev, epoch: dev.epoch, body: { anonId: dev.anonId, cursor: dev.cursor, ops, types: clientTypeNames() }, ctx: ctxOf(dev), sentIds: ops.map((o) => o.op_id) };
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

  /**
   * Every local record of every kind as changes, minus the ones already queued (as the real code does). At sign-in
   * settings go as "set only if the account has none" changes; after a 403 they go as ordinary changes (design D3).
   */
  function resendAll(dev, atSignIn) {
    const known = new Set(dev.outbox.map((o) => o.op_id));
    return [
      ...resendOps([...dev.bookmarks.values()]),
      ...resendOps([...dev.memorize.values()], "memorize", uuid),
      ...resendOps([...dev.prefs.values()], "preference", uuid, { atSignIn }),
    ].filter((o) => !known.has(o.op_id));
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
        dev.outbox.push(...resendAll(dev, false));
      }
      return;
    }
    const { value } = res;
    dev.outbox = withoutAcknowledged(dev.outbox, msg.sentIds);
    for (const row of value.rows) {
      if (row.type === "memorize") {
        dev.memorize.set(row.dua_id, pulledMemorize(dev.memorize.get(row.dua_id), row));
        continue;
      }
      if (row.type === "preference") {
        const waiting = dev.outbox.some((o) => o.type === "preference" && o.pref_key === row.pref_key && claimsRecord(o));
        dev.prefs.set(row.pref_key, pulledPreference(dev.prefs.get(row.pref_key), row, waiting));
        continue;
      }
      const hasPending = dev.outbox.some((o) => o.type === "bookmark" && o.dua_id === row.dua_id);
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
    // As the real sign-in does: queued changes of types that replace them are dropped, then every record is queued again.
    dev.outbox = dev.outbox.filter((o) => !CLIENT_TYPES[o.type].replaceQueuedAtSignIn);
    dev.outbox.push(...resendAll(dev, true));
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
    // Every device syncs in turn until nothing is left to send and a few more full rounds have passed (so every device has
    // pulled the final state). With a small batch size it takes many rounds to send everything.
    let quiet = 0;
    for (let round = 0; round < 600 && (round < 6 || quiet < 3); round++) {
      quiet = devices.some((d) => d.outbox.length > 0) ? 0 : quiet + 1;
      for (const dev of devices) {
        dev.inFlight = null;
        send(dev);
        const msg = network.pop();
        await deliver(msg, { keepResponse: true });
      }
      clock += 1000;
    }
  }

  const snapshotMemorize = (records) =>
    [...records.values()]
      .map((r) => ({ dua_id: r.dua_id, learned: r.learned, progress: r.progress, reset_gen: r.reset_gen }))
      .sort((a, b) => a.dua_id - b.dua_id);

  const snapshotPrefs = (records) =>
    [...records.values()]
      .map((r) => ({ pref_key: r.pref_key, value: r.value, updated_at: r.updated_at, op_id: r.op_id }))
      .sort((a, b) => (a.pref_key < b.pref_key ? -1 : 1));

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
      const serverMemorize = (
        await client.execute({
          sql: `SELECT m.dua_id, m.learned, m.progress, m.reset_gen FROM memorize m
                  JOIN owners o ON o.id = m.owner_id WHERE o.user_id = ? ORDER BY m.dua_id`,
          args: [accountId],
        })
      ).rows.map((r) => ({
        dua_id: Number(r.dua_id), learned: Number(r.learned), progress: Number(r.progress), reset_gen: Number(r.reset_gen),
      }));
      const serverPrefs = (
        await client.execute({
          sql: `SELECT p.pref_key, p.value, p.updated_at, p.op_id FROM preferences p
                  JOIN owners o ON o.id = p.owner_id WHERE o.user_id = ? ORDER BY p.pref_key`,
          args: [accountId],
        })
      ).rows.map((r) => ({ pref_key: String(r.pref_key), value: String(r.value), updated_at: Number(r.updated_at), op_id: String(r.op_id) }));
      for (const [i, dev] of devices.entries()) {
        assert.equal(dev.outbox.length, 0, `${where}: device ${i} still has unsent changes`);
        assert.deepEqual(snapshotPrefs(dev.prefs), serverPrefs, `${where}: device ${i} differs from the server (settings)`);
        assert.deepEqual(snapshot(dev.bookmarks), serverRows, `${where}: device ${i} differs from the server`);
        assert.deepEqual(snapshotMemorize(dev.memorize), serverMemorize, `${where}: device ${i} differs from the server (memorize)`);
      }
      // The memorize merge ignores clocks, so the server's record must be the merge of every change made, in any order.
      const expectedMemorize = new Map();
      for (const r of everyMemorize) expectedMemorize.set(r.dua_id, mergeMemorize(expectedMemorize.get(r.dua_id), r));
      assert.deepEqual(serverMemorize, snapshotMemorize(expectedMemorize), `${where}: the server's memorize records are not the merge of every change`);
      // There is no "newest of all changes" oracle for settings: at sign-in the account's value wins over a newer one
      // from a device (design D3), so which value an account ends with depends on which device came first. Only the
      // agreement checked above (every device equals the server) holds. These counts show the schedules do test it.
      const newestPref = new Map();
      for (const r of everyPref) newestPref.set(r.pref_key, mergePreference(newestPref.get(r.pref_key), r));
      stats.settingChanges += everyPref.length;
      stats.settingsOnServer += serverPrefs.length;
      stats.accountValueWon += serverPrefs.filter((r) => newestPref.get(r.pref_key)?.op_id !== r.op_id).length;
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
  const stats = { settingChanges: 0, settingsOnServer: 0, accountValueWon: 0 };
  for (let seed = FIRST_SEED; seed < FIRST_SEED + SEEDS; seed++) {
    await simulate(client, seed, stats).check();
  }
  console.log(`# settings over ${SEEDS} seeds: ${JSON.stringify(stats)}`);
  if (SEEDS >= 100) {
    assert.ok(stats.settingChanges > 0 && stats.settingsOnServer > 0, "the schedules must change settings");
    assert.ok(stats.accountValueWon > 0, "the schedules must include a sign-in where the account's value beat a newer one");
  }
});
