// One revision string per build (design D4): a hash of everything that can change what the pages look like.
// It must be the same in every process that evaluates the service worker route, so it depends only on files and on
// what the caller passes in.
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

export const DEFAULT_INPUTS = ["data/dua_main.sqlite", "data/audio-sources.json", "app", "lib", "public", "package-lock.json", "next.config.mjs"];

const IGNORED = /\.test\.(?:js|mjs)$/;

function listFiles(target, out) {
  const stat = fs.statSync(target, { throwIfNoEntry: false });
  if (!stat) return;
  if (stat.isDirectory()) {
    for (const name of fs.readdirSync(target).sort()) listFiles(path.join(target, name), out);
  } else if (!IGNORED.test(target)) {
    out.push(target);
  }
}

/**
 * @param {string} root project folder
 * @param {string[]} [inputs] files and folders, relative to root
 * @param {Record<string, boolean>} [flags] settings that change the pages without changing a file, such as whether the
 *   Quran.com source is set up. Never a secret's value.
 * @returns {string} 16 hex characters
 */
export function computeBuildRevision(root, inputs = DEFAULT_INPUTS, flags = {}) {
  const files = [];
  for (const input of inputs) listFiles(path.join(root, input), files);
  const hash = crypto.createHash("sha256");
  for (const file of files) {
    // The relative path goes in too, so renaming a file changes the revision. Slashes are normalized for Windows.
    hash.update(path.relative(root, file).split(path.sep).join("/"));
    hash.update("\0");
    hash.update(fs.readFileSync(file));
    hash.update("\0");
  }
  for (const name of Object.keys(flags).sort()) hash.update(`${name}=${flags[name]}\0`);
  return hash.digest("hex").slice(0, 16);
}
