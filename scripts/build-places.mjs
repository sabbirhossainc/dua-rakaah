// Writes the place data of the home page (designs 2 and 9 of the apply-ux-audit change). Run by hand, and commit the
// results: the build downloads nothing.
//   data/capitals.json   the capital of each country, and the capital for each time zone name (in the page's script)
//   public/places.json   names for a position: Bangladesh districts, and elsewhere states (fetched by the browser)
//   node scripts/build-places.mjs            download the sources again (about 200 MB)
//   node scripts/build-places.mjs --cached   reuse the downloads in .places-cache/
// Sources: zone.tab and backward from IANA tzdata (public domain); cities15000, admin1CodesASCII, countryInfo and
// alternateNamesV2 from GeoNames (CC BY 4.0); data/bd-districts.json for Bangladesh. data/capitals-bn.json holds the
// Bangla capital names that are drafted or corrected by hand.
import fs from "node:fs";
import path from "node:path";
import readline from "node:readline";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { fileURLToPath } from "node:url";
import zlib from "node:zlib";

const root = (file) => fileURLToPath(new URL(`../${file}`, import.meta.url));
const CACHE = root(".places-cache");
const OUTPUT = root("data/capitals.json");
const PLACES = root("public/places.json");
const DISTRICTS = root("data/bd-districts.json");
const OVERRIDES = root("data/capitals-bn.json");

const SOURCES = {
  "zone.tab": "https://data.iana.org/time-zones/tzdb/zone.tab",
  backward: "https://data.iana.org/time-zones/tzdb/backward",
  "cities15000.zip": "https://download.geonames.org/export/dump/cities15000.zip",
  "admin1CodesASCII.txt": "https://download.geonames.org/export/dump/admin1CodesASCII.txt",
  "countryInfo.txt": "https://download.geonames.org/export/dump/countryInfo.txt",
  "alternateNamesV2.zip": "https://download.geonames.org/export/dump/alternateNamesV2.zip",
};

// Old names for a bare offset or a group of zones. They name no country, whatever zone they now link to.
const NO_COUNTRY = new Set(["EST", "MST", "HST", "CET", "EET", "MET", "WET", "EST5EDT", "CST6CDT", "MST7MDT", "PST8PDT"]);

// Bangladesh's capital keeps the coordinates the app has always used for Dhaka, so that its times do not change.
const FIXED = { bd: { lat: 23.7104, lng: 90.4074 } };

const BANGLA = /^[ঀ-৿‌‍ .'’(),-]+$/;

// Each capital is written as a row of these values: names on every row would add a third to the home page's script.
const FIELDS = ["id", "name_en", "name_bn", "lat", "lng", "tz"];

async function download(name, cached) {
  const file = path.join(CACHE, name);
  if (cached && fs.existsSync(file)) return file;
  console.log(`downloading ${SOURCES[name]}`);
  const response = await fetch(SOURCES[name]);
  if (!response.ok) throw new Error(`${SOURCES[name]}: ${response.status}`);
  await pipeline(Readable.fromWeb(response.body), fs.createWriteStream(`${file}.part`));
  fs.renameSync(`${file}.part`, file);
  return file;
}

/** The lines of one file inside a zip archive (stored or deflated, below 4 GB). */
function zipLines(archive, wanted) {
  const fd = fs.openSync(archive, "r");
  try {
    const read = (position, length) => {
      const buffer = Buffer.alloc(length);
      fs.readSync(fd, buffer, 0, length, position);
      return buffer;
    };
    const size = fs.fstatSync(fd).size;
    const tail = read(Math.max(0, size - 65557), Math.min(size, 65557));
    const end = tail.lastIndexOf("PK\x05\x06", undefined, "latin1");
    if (end < 0) throw new Error(`${archive}: not a zip file`);
    let at = tail.readUInt32LE(end + 16);
    for (let i = 0; i < tail.readUInt16LE(end + 10); i++) {
      const entry = read(at, 46);
      const [nameLength, extraLength, commentLength] = [28, 30, 32].map((o) => entry.readUInt16LE(o));
      if (read(at + 46, nameLength).toString() === wanted) {
        const method = entry.readUInt16LE(10);
        const compressed = entry.readUInt32LE(20);
        const offset = entry.readUInt32LE(42);
        const local = read(offset, 30);
        const start = offset + 30 + local.readUInt16LE(26) + local.readUInt16LE(28);
        const raw = fs.createReadStream(archive, { start, end: start + compressed - 1 });
        const input = method === 0 ? raw : raw.pipe(zlib.createInflateRaw());
        return readline.createInterface({ input, crlfDelay: Infinity });
      }
      at += 46 + nameLength + extraLength + commentLength;
    }
    throw new Error(`${archive}: no ${wanted}`);
  } finally {
    fs.closeSync(fd);
  }
}

/** Every country's capital, by lower-case country code. */
async function readCapitals(archive) {
  const found = new Map();
  for await (const line of zipLines(archive, "cities15000.txt")) {
    const f = line.split("\t");
    if (f[7] !== "PPLC") continue;
    const [id, population] = [f[8].toLowerCase(), Number(f[14])];
    if (found.has(id) && found.get(id).population >= population) continue;
    const round = (v) => Math.round(Number(v) * 10000) / 10000;
    found.set(id, { geonameId: f[0], population, id, name_en: f[1], lat: round(f[4]), lng: round(f[5]), tz: f[17] });
  }
  return found;
}

/** Every town but Bangladesh's: its position, country code and state code. */
async function readTowns(archive) {
  const towns = [];
  for await (const line of zipLines(archive, "cities15000.txt")) {
    const f = line.split("	");
    if (f[8] && f[8] !== "BD") towns.push({ lat: Number(f[4]), lng: Number(f[5]), country: f[8], admin: f[10] });
  }
  return towns;
}

/** `{ "US.CA": { name, geonameId } }` and `{ US: { name, geonameId } }`. */
function readNames(admin1, countryInfo) {
  const admins = new Map();
  for (const line of admin1.split("\n")) {
    const [code, name, , geonameId] = line.split("	");
    if (geonameId) admins.set(code, { name, geonameId: geonameId.trim() });
  }
  const countries = new Map();
  for (const line of countryInfo.split("\n")) {
    if (line.startsWith("#") || !line.trim()) continue;
    const f = line.split("	");
    countries.set(f[0], { name: f[4], geonameId: f[16] });
  }
  return { admins, countries };
}

/** The Bangla name of each wanted place: a preferred one if there is one, never a historic or colloquial one. */
async function readBangla(archive, wanted) {
  const names = new Map();
  for await (const line of zipLines(archive, "alternateNamesV2.txt")) {
    const [, geonameId, language, name, preferred, , colloquial, historic] = line.split("\t");
    if (language !== "bn" || !wanted.has(geonameId) || colloquial === "1" || historic === "1" || !BANGLA.test(name)) continue;
    if (!names.has(geonameId) || preferred === "1") names.set(geonameId, name);
  }
  return names;
}

/** `{ zone name: lower-case country code }`, with the older names that browsers still report. */
function readZones(zoneTab, backward) {
  const countries = new Map();
  for (const line of zoneTab.split("\n")) {
    if (line.startsWith("#") || !line.trim()) continue;
    const [country, , zone] = line.split("\t");
    countries.set(zone.trim(), country.toLowerCase());
  }
  // "Link TARGET ALIAS", sometimes followed by "#= ZONE": the zone the alias really stands for.
  const links = new Map();
  for (const line of backward.split("\n")) {
    const match = /^Link\s+(\S+)\s+(\S+)(?:\s+#=\s*(\S+))?/.exec(line);
    if (match) links.set(match[2], { target: match[1], origin: match[3] });
  }
  // zone.tab first; a link is followed only for a name that is not there.
  const country = (zone, seen = new Set()) => {
    if (countries.has(zone)) return countries.get(zone);
    const link = links.get(zone);
    if (!link || seen.has(zone)) return null;
    seen.add(zone);
    return countries.get(link.origin) ?? country(link.target, seen);
  };
  const names = [...countries.keys(), ...links.keys()].filter((zone) => !NO_COUNTRY.has(zone));
  return new Map(names.map((zone) => [zone, country(zone)]).filter(([, code]) => code));
}

async function main() {
  const cached = process.argv.includes("--cached");
  fs.mkdirSync(CACHE, { recursive: true });
  const files = {};
  for (const name of Object.keys(SOURCES)) files[name] = await download(name, cached);

  const all = await readCapitals(files["cities15000.zip"]);
  const zones = readZones(fs.readFileSync(files["zone.tab"], "utf8"), fs.readFileSync(files.backward, "utf8"));
  const used = [...new Set(zones.values())].filter((id) => all.has(id)).sort();
  const towns = await readTowns(files["cities15000.zip"]);
  const { admins, countries } = readNames(
    fs.readFileSync(files["admin1CodesASCII.txt"], "utf8"),
    fs.readFileSync(files["countryInfo.txt"], "utf8"),
  );
  const wanted = [...used.map((id) => all.get(id).geonameId), ...[...admins.values(), ...countries.values()].map((n) => n.geonameId)];
  const bangla = await readBangla(files["alternateNamesV2.zip"], new Set(wanted));
  const overrides = JSON.parse(fs.readFileSync(OVERRIDES, "utf8")).names;

  const unnamed = [];
  const capitals = used.map((id) => {
    const { geonameId, name_en, lat, lng, tz } = all.get(id);
    const name_bn = overrides[id] ?? bangla.get(geonameId);
    if (!name_bn) unnamed.push(`${id} ${name_en}`);
    return { id, name_en, name_bn, lat, lng, tz, ...FIXED[id] };
  });
  if (process.argv.includes("--list")) for (const c of capitals) console.log(`${c.id}\t${c.name_en}\t${c.name_bn}`);
  if (unnamed.length > 0) throw new Error(`Add Bangla names to data/capitals-bn.json for:\n${unnamed.join("\n")}`);

  const table = Object.fromEntries([...zones].filter(([, id]) => all.has(id)).sort(([a], [b]) => (a < b ? -1 : 1)));
  // One entry to a line, so that a change reads well in a diff.
  const lines = (entries) => entries.map((entry) => `    ${entry}`).join(",\n");
  fs.writeFileSync(
    OUTPUT,
    `{
  "source": "Generated by scripts/build-places.mjs: do not edit by hand. IANA tzdata (public domain) and GeoNames (https://www.geonames.org/), retrieved ${new Date().toISOString().slice(0, 10)}. Bangla names are drafts awaiting review.",
  "license": "GeoNames data: CC BY 4.0 (https://creativecommons.org/licenses/by/4.0/)",
  "fields": ${JSON.stringify(FIELDS)},
  "capitals": [
${lines(capitals.map((c) => JSON.stringify(FIELDS.map((field) => c[field]))))}
  ],
  "zones": {
${lines(Object.entries(table).map(([zone, id]) => `${JSON.stringify(zone)}: ${JSON.stringify(id)}`))}
  }
}
`,
  );
  console.log(`${capitals.length} capitals, ${Object.keys(table).length} zone names written to data/capitals.json`);
  writePlaces(towns, admins, countries, bangla);
}

/**
 * public/places.json: `names`, each `[English, Bangla or null]`, and `points`, flat triples of latitude and longitude in
 * whole hundredths of a degree and an index into `names`. A town is named by its state, or by its country where it has
 * none; a Bangladesh district town by its district.
 */
function writePlaces(towns, admins, countries, bangla) {
  const names = [];
  const index = new Map();
  const nameIndex = (en, bn) => {
    const key = `${en}|${bn ?? ""}`;
    if (!index.has(key)) index.set(key, names.push([en, bn ?? null]) - 1);
    return index.get(key);
  };
  const points = new Map();
  const add = (lat, lng, name) => {
    const [y, x] = [Math.round(lat * 100), Math.round(lng * 100)];
    points.set(`${y},${x}`, [y, x, name]);
  };
  for (const town of towns) {
    const place = admins.get(`${town.country}.${town.admin}`) ?? countries.get(town.country);
    if (place) add(town.lat, town.lng, nameIndex(place.name, bangla.get(place.geonameId)));
  }
  // Districts last, so that one wins a point it shares with a town across the border.
  for (const d of JSON.parse(fs.readFileSync(DISTRICTS, "utf8")).towns) add(d.lat, d.lng, nameIndex(d.name_en, d.name_bn));
  const flat = [...points.values()].sort((a, b) => a[0] - b[0] || a[1] - b[1]).flat();
  fs.writeFileSync(
    PLACES,
    `${JSON.stringify({
      source: `Generated by scripts/build-places.mjs: do not edit by hand. GeoNames (https://www.geonames.org/), retrieved ${new Date().toISOString().slice(0, 10)}.`,
      license: "CC BY 4.0 (https://creativecommons.org/licenses/by/4.0/)",
      names,
      points: flat,
    })}\n`,
  );
  const missing = names.filter(([, bn]) => !bn).length;
  console.log(`${points.size} points, ${names.length} names (${missing} without Bangla) written to public/places.json`);
}

await main();
