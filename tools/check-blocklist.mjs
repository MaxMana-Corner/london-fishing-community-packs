/* Proves the blocklist machinery works, and that no term - live or parked -
   fires on ordinary fishing writing.

   The live list (moderation/blocklist.txt) is deliberately EMPTY right now.
   That is a decision, not an oversight, so an empty list is not a failure
   here. What still has to hold with an empty list is that the MATCHER is
   correct, because the matcher is the part that made this file empty in the
   first place: it used to compare substrings, and "smallmouth bass" contains
   "ass" while "crappie" contains "crap". Any term list on top of that was
   unusable, so none was ever turned on.

   So this checks three things:

     1. the matcher itself, against fixture terms defined here, so it is
        verified whether or not anything is live;
     2. the live list, if it has anything in it;
     3. the PARKED candidates in moderation/blocklist-candidates.txt, which
        nothing loads - so that when somebody reviews them, they already know
        which ones would cry wolf.

   The failure mode worth guarding is a false positive, not a miss. A human
   reads every submission before it merges; a filter that rejects honest
   writing just gets switched off.

   Run:  node tools/check-blocklist.mjs
*/

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { readBlocklist, scan } from "../.github/scripts/lib.mjs";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

/* Real fishing vocabulary, including the awkward ones a substring filter
   mangles, and phrases from the app's own Tactics and species content.
   If any of these flag, the term that did it is too broad - fix the term,
   never relax the fixture. */
const MUST_PASS = [
  "smallmouth bass on a tube jig",
  "crappie under a slip float",
  "largemouth bass in the pads",
  "peacock herl and a cockchafer",
  "woolly bugger swung on the drop",
  "rock bass and freshwater drum",
  "a hair rig for carp",
  "shad rap trolled at two miles an hour",
  "bottom bouncing a worm harness",
  "the assembly weir below the dam",
  "titmouse feather, grizzly hackle",
  "scunthorpe angling club",
  "cut bait and chicken liver after dark",
  "jigging a hole for perch and bluegill",
  "a Clouser minnow on a sink tip",
  "pumpkinseed and yellow perch",
  "dead drift, no drag, fine tippet",
  "night fishing below the bridge",
  "bass fishing is closed until the fourth Saturday in June",
];

let failed = 0;
const falsePositives = (words, label) => {
  let n = 0;
  for (const s of MUST_PASS) {
    const hits = scan(s, words);
    if (hits.length) {
      n++;
      console.error(`  FALSE POSITIVE  ${JSON.stringify(s)}`);
      console.error(`                  flagged by: ${hits.join(", ")}  <- too broad for ${label}`);
    }
  }
  return n;
};

/* ---- 1. the matcher, on fixtures, so this file means something even with
          nothing live ---------------------------------------------------- */
console.log("matcher");
const FIXTURE = ["casino", "free money", "*bit.ly*"];
const MATCHER_CASES = [
  ["play at the casino tonight", true, "whole word matches"],
  ["casinoish is not a word", false, "no substring match by default"],
  ["bocasino", false, "no match glued to the front either"],
  ["FREE MONEY click here", true, "multi-word phrase, case-insensitive"],
  ["go to bit.ly/xyz now", true, "*term* opts in to substring"],
  ["smallmouth bass on a jig", false, "fishing prose is untouched"],
];
for (const [text, want, why] of MATCHER_CASES) {
  const got = scan(text, FIXTURE).length > 0;
  if (got !== want) {
    failed++;
    console.error(`  FAIL  ${JSON.stringify(text)} — expected ${want ? "a flag" : "no flag"} (${why})`);
  }
}
failed += falsePositives(FIXTURE, "the fixtures");
console.log(failed ? "  BROKEN" : "  ok    whole-word matching, substring opt-in, no fishing false positives");

/* ---- 2. the live list ------------------------------------------------- */
const live = readBlocklist(ROOT);
console.log(`\nlive list  moderation/blocklist.txt — ${live.length} term${live.length === 1 ? "" : "s"}`);
if (!live.length) {
  console.log("  ok    empty on purpose. Nothing is blocked by word.");
  console.log("        Terms are parked in moderation/blocklist-candidates.txt for review.");
} else {
  const n = falsePositives(live, "the live list");
  failed += n;
  if (!n) console.log("  ok    no false positives on fishing vocabulary");
}

/* ---- 3. the parked candidates ----------------------------------------- */
const candPath = path.join(ROOT, "moderation", "blocklist-candidates.txt");
if (fs.existsSync(candPath)) {
  const cand = fs.readFileSync(candPath, "utf8").split("\n")
    .map((l) => l.trim().toLowerCase())
    .filter((l) => l && !l.startsWith("#"));
  console.log(`\ncandidates  moderation/blocklist-candidates.txt — ${cand.length} terms, NOT loaded`);
  const n = falsePositives(cand, "the candidates");
  failed += n;
  if (!n) console.log("  ok    none of them would flag ordinary fishing writing");
}

console.log();
if (failed) {
  console.error(`${failed} failure(s).`);
  process.exit(1);
}
console.log("blocklist framework verified");
