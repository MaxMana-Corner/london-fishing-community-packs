/* Shared helpers for the moderation and index workflows.
   Zero dependencies on purpose: these run on every pull request and
   should not need an npm install, a lockfile, or a supply chain. */

import fs from "node:fs";
import path from "node:path";

export const FOLDERS = { pack: "packs", locations: "locations", pins: "pins" };
export const TYPE_OF_FOLDER = { packs: "pack", locations: "locations", pins: "pins" };

export const isObj = (x) => !!x && typeof x === "object" && !Array.isArray(x);

/* Every string anywhere in a JSON tree, so a blocked word cannot hide in
   a field nobody thought to check. Depth-capped so a hostile file with a
   deeply nested structure cannot spin this out. */
export function collectText(node, depth = 0) {
  if (depth > 8) return "";
  if (typeof node === "string") return node + " ";
  if (Array.isArray(node)) return node.map((n) => collectText(n, depth + 1)).join("");
  if (isObj(node)) return Object.values(node).map((n) => collectText(n, depth + 1)).join("");
  return "";
}

export function readBlocklist(root) {
  const p = path.join(root, "moderation", "blocklist.txt");
  if (!fs.existsSync(p)) return [];
  return fs
    .readFileSync(p, "utf8")
    .split("\n")
    .map((l) => l.trim().toLowerCase())
    .filter((l) => l && !l.startsWith("#"));
}

/* Match on WORD BOUNDARIES, not substrings.

   This started as `hay.includes(w)`, which is why moderation/blocklist.txt
   sat empty for so long: on fishing prose a substring filter is not merely
   noisy, it is unusable. "smallmouth bass" contains "ass". "crappie"
   contains "crap". "peacock herl" and "cockchafer" are a fly-tying material
   and a bait. Populate the list with ordinary profanity under substring
   matching and every honest submission fails, so the gate gets switched off
   and protects nothing.

   Default is therefore a whole-word match. A term that genuinely needs to
   match inside other text - a domain fragment, a spam string glued to other
   characters - opts in explicitly by wrapping itself in asterisks:

     casino        matches "a casino"      not "casinoish" and not "bocasino"
     *casino*      matches all three

   Multi-word terms work: the boundary goes around the whole phrase.
   Leetspeak and deliberate obfuscation are NOT handled here on purpose -
   this is a coarse first filter and a human reads every submission after
   it. Pretending otherwise would be the more dangerous mistake. */
const ESC = (t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export function scan(text, words) {
  const hay = String(text || "").toLowerCase();
  return words.filter((w) => {
    const sub = w.length > 2 && w.startsWith("*") && w.endsWith("*");
    const term = sub ? w.slice(1, -1) : w;
    if (!term) return false;
    if (sub) return hay.includes(term);
    /*  does not fire next to punctuation-heavy or non-ASCII neighbours the
       way people expect, so the boundary is spelled out as "not a letter,
       digit or apostrophe" on each side. */
    const re = new RegExp("(^|[^a-z0-9'])" + ESC(term) + "([^a-z0-9']|$)", "i");
    return re.test(hay);
  });
}

/* The same shape rules community.gs enforces, applied again here.
   Defence in depth: the script is the first gate, this is the one that
   actually blocks a merge, and a human reads the diff after both. */
export function checkShape(type, p) {
  const bad = (m) => ({ ok: false, error: m });
  if (!isObj(p)) return bad("not a JSON object");
  if (p.app !== "london-fishing-companion") return bad('"app" must be "london-fishing-companion"');

  if (type === "pins") {
    if (p.kind !== "pins") return bad('"kind" must be "pins"');
    if (!Array.isArray(p.pins) || !p.pins.length) return bad("no pins in the file");
    for (const pin of p.pins) {
      if (!isObj(pin)) return bad("a pin is not an object");
      if (!pin.id || typeof pin.id !== "string") return bad("a pin has no id");
      if (!Object.keys(PIN_TYPES).includes(pin.type)) {
        return bad(`pin "${pin.id}" has an unknown type "${pin.type}"`);
      }
      if (!Array.isArray(pin.ll) || pin.ll.length !== 2) return bad(`pin "${pin.id}" has no coordinates`);
      const [lat, lon] = pin.ll.map(Number);
      if (!Number.isFinite(lat) || !Number.isFinite(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180) {
        return bad(`pin "${pin.id}" has impossible coordinates`);
      }
    }
    return { ok: true };
  }

  if (p.kind !== "pack") return bad('"kind" must be "pack"');
  if (!isObj(p.catalog)) return bad("no catalog");
  const total = CATALOG_KEYS.reduce(
    (n, k) => n + (Array.isArray(p.catalog[k]) ? p.catalog[k].length : 0), 0
  );
  if (!total) return bad("the catalog is empty");
  for (const k of CATALOG_KEYS) {
    const list = p.catalog[k];
    if (list === undefined) continue;
    if (!Array.isArray(list)) return bad(`"catalog.${k}" should be a list`);
    const seen = new Set();
    for (const r of list) {
      if (!isObj(r)) return bad(`a record in "${k}" is not an object`);
      if (typeof r.id !== "string" || !r.id) return bad(`a record in "${k}" has no id`);
      if (seen.has(r.id)) return bad(`duplicate id "${r.id}" in "${k}"`);
      seen.add(r.id);
      if (k !== "tips" && (typeof r.name !== "string" || !r.name.trim())) {
        return bad(`record "${r.id}" in "${k}" has no name`);
      }
    }
  }
  return { ok: true };
}

export const CATALOG_KEYS = ["spots", "species", "baits", "knots", "tips"];
export const PIN_TYPES = {
  pollution: 1, snag: 1, hazard: 1, "good-spot": 1, "access-rating": 1,
};

/* What a reader gets if they import it. */
export function countsOf(type, p) {
  if (type === "pins") return { pins: Array.isArray(p.pins) ? p.pins.length : 0 };
  const out = {};
  for (const k of CATALOG_KEYS) {
    const n = Array.isArray(p.catalog?.[k]) ? p.catalog[k].length : 0;
    if (n) out[k] = n;
  }
  return out;
}

export function listContentFiles(root) {
  const out = [];
  for (const folder of Object.keys(TYPE_OF_FOLDER)) {
    const dir = path.join(root, folder);
    if (!fs.existsSync(dir)) continue;
    for (const name of fs.readdirSync(dir).sort()) {
      if (!name.endsWith(".json")) continue;
      out.push({ folder, type: TYPE_OF_FOLDER[folder], name, rel: `${folder}/${name}` });
    }
  }
  return out;
}
