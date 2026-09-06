/* Moderation check.

   Runs on every pull request. Scans only the files the pull request
   actually changed - scanning everything would mean one pre-existing
   problem blocks unrelated contributions forever.

   This is a coarse first filter, not the decision. A human reads the
   diff before merging either way. Its job is to catch the obvious so
   the human can spend attention on the rest.

   Usage: node .github/scripts/moderate.mjs <changed files...>
*/

import fs from "node:fs";
import { readBlocklist, collectText, scan, checkShape, TYPE_OF_FOLDER } from "./lib.mjs";

const root = process.cwd();
const words = readBlocklist(root);
const files = process.argv.slice(2).filter((f) => /^(packs|locations|pins)\/[^/]+\.json$/.test(f));

let failed = 0;
const note = (m) => console.log(m);

note(`Blocklist: ${words.length} term${words.length === 1 ? "" : "s"}.`);

if (!files.length) {
  note("No content files changed. Nothing to check.");
  process.exit(0);
}

for (const rel of files) {
  note(`\n--- ${rel}`);

  if (!fs.existsSync(rel)) {
    note("  deleted in this pull request, skipping");
    continue;
  }

  let data;
  try {
    data = JSON.parse(fs.readFileSync(rel, "utf8"));
  } catch (err) {
    note(`  FAIL  not valid JSON: ${err.message}`);
    failed++;
    continue;
  }

  const type = TYPE_OF_FOLDER[rel.split("/")[0]];
  const shape = checkShape(type, data);
  if (!shape.ok) {
    note(`  FAIL  ${shape.error}`);
    failed++;
    continue;
  }
  note("  ok    shape is valid");

  const hits = scan(collectText(data), words);
  if (hits.length) {
    note(`  FAIL  blocked words: ${hits.join(", ")}`);
    failed++;
    continue;
  }
  note("  ok    no blocked words");

  /* A photo cannot be word-scanned. If one is referenced, say so loudly
     so whoever reviews knows to actually look at it. */
  if (typeof data.photo === "string" || rel.startsWith("locations/")) {
    const hasPhoto = fs.existsSync(rel.replace(/\.json$/, "")) ;
    if (hasPhoto) note("  NOTE  this location has a photo - look at it before merging");
  }
}

if (failed) {
  note(`\n${failed} file${failed === 1 ? "" : "s"} did not pass. See above.`);
  note("If a blocked word is a false positive, tune moderation/blocklist.txt.");
  process.exit(1);
}

note("\nAll changed files passed the automated check.");
note("This is a first filter only - read the diff before merging.");
