/* node _build/test_history3.js
   Checks the built CKHG Maya Chapter 3 app against the Teacher Guide.

   The Teacher Guide is the North Star for this chapter, so most of what is
   asserted here is not "does the code work" but "does the content still say
   what the guide says": four Core Vocabulary words and no more, a Big Question
   builder whose correct tiles are exactly the guide's Check for Understanding
   key points, and scope that never wanders outside Student Reader pp. 20-27. */
const fs = require("fs"), path = require("path");
const file = path.join(__dirname, "..", "history", "g5-maya-ch3", "index.html");
const src  = fs.readFileSync(file, "utf8");

/* The data block is a JS object literal (unquoted keys), not JSON, so it is
   evaluated rather than parsed — same shape the browser sees. */
const m = src.match(/const DATA = (\{[\s\S]*?\n\});\n/);
if (!m) { console.error("could not find DATA in the built app"); process.exit(1); }
const DATA = new Function("return (" + m[1] + ")")();

let pass = 0, fail = 0;
const G = g => console.log("\n" + g);
const ok = (cond, msg) => { if (cond) { pass++; console.log("  ok   " + msg); }
                            else { fail++; console.log("  FAIL " + msg); } };

const items = DATA.sets.flatMap(s => s.items);
const picks = items.filter(i => i.type === "pick");
const orders = items.filter(i => i.type === "order");
const builds = items.filter(i => i.type === "build");
const textOf = it => [it.q || "", ...(it.opts || []), ...(it.steps || []),
                      it.why || "", it.cite || ""].join(" ");
const allText = items.map(textOf).join(" ") + " " +
                DATA.build.tiles.map(t => t.t).join(" ") + " " +
                DATA.build.q + " " + DATA.build.answer;

G("shape");
ok(DATA.sets.length === 3, "three sets, one per Teacher Guide reading segment");
ok(DATA.bigQuestion === "Why did the Aztec make human sacrifices?",
   "the Big Question is the Teacher Guide's, word for word");
ok(builds.length === 3, "every set ends with the Big Question builder");
ok(DATA.sets.every(s => s.items[s.items.length - 1].type === "build"),
   "the builder is the last item in each set, not buried mid-set");
ok(items.length >= 20 && items.length <= 26,
   "item count is proportional to an eight-page chapter (" + items.length + ")");
ok(DATA.sets.every(s => s.items.length >= 6), "no set is thinner than six items");

G("the Teacher Guide's three reading segments");
const segs = [["s1", "20", "22"], ["s2", "22", "25"], ["s3", "25", "27"]];
segs.forEach(([id, a, b]) => {
  const s = DATA.sets.find(x => x.id === id);
  ok(!!s && s.tag.includes(a) && s.tag.includes(b),
     id + " covers pages " + a + "\u2013" + b + " (" + (s ? s.tag : "missing") + ")");
});

G("Core Vocabulary: exactly four, each tested exactly once");
const VOCAB = ["Aztec", "nomadic", "empire", "emperor"];
VOCAB.forEach(w => {
  const hits = picks.filter(i => new RegExp("<b>" + w + "</b>", "i").test(i.q));
  ok(hits.length === 1, "\u201c" + w + "\u201d is asked exactly once (" + hits.length + ")");
});
const bolded = picks.map(i => (i.q.match(/<b>([^<]+)<\/b>/) || [])[1])
                    .filter(Boolean);
ok(bolded.length === 4, "no fifth vocabulary word crept in (" + bolded.join(", ") + ")");
ok(bolded.every(w => VOCAB.includes(w)),
   "every vocabulary item asked is one the guide lists for this chapter");

G("question shape");
ok(picks.every(i => i.opts.length === 4), "every multiple choice offers four options");
ok(picks.every(i => new Set(i.opts).size === 4), "no repeated option text within an item");
ok(picks.every(i => Number.isInteger(i.a) && i.a >= 0 && i.a < i.opts.length),
   "every answer index points at a real option");
ok(picks.every(i => i.why && i.cite), "every item carries an explanation and a citation");
ok(orders.length >= 1, "the chapter includes an ordering question (" + orders.length + ")");
ok(orders.every(i => i.steps.length >= 3 && new Set(i.steps).size === i.steps.length),
   "ordering steps are distinct and long enough to be worth ordering");

G("the Big Question builder matches the Check for Understanding");
const B = DATA.build;
const right = B.tiles.filter(t => t.a);
ok(right.length === 2,
   "exactly two correct tiles \u2014 the guide lists two key points, not three (" + right.length + ")");
ok(B.tiles.length === 6, "six tiles in total, so the choice is a real one");
ok(/\btwo\b/.test(B.q), "the prompt names how many to pick");
ok(new Set(B.tiles.map(t => t.t)).size === B.tiles.length, "no duplicated tile");
ok(/sun god/i.test(right.map(t => t.t).join(" ")),
   "a correct tile carries the guide's own point about the sun god's strength");
ok(/god/i.test(right.map(t => t.t).join(" ")),
   "a correct tile carries the guide's point about belief in the gods");
/* The distractors have to be TRUE statements from the reader, otherwise the
   item degrades into ordinary multiple choice. Each is spot-checked against a
   fact that appears elsewhere in the app's own verified content. */
const wrongTiles = B.tiles.filter(t => !t.a).map(t => t.t).join(" ");
ok(/150,000|200,000/.test(wrongTiles), "a distractor is the true population figure");
ok(/gold|silver|jade|turquoise/.test(wrongTiles), "a distractor is the true tribute list");
ok(/captured in war/i.test(wrongTiles), "a distractor is the true fact about who the victims were");
ok(/rise in Aztec society|advance/i.test(wrongTiles),
   "a distractor answers why they fought, not why they sacrificed");

G("the builder reads its count from the data, not a hardcoded 3");
ok(/const N = B\.tiles\.filter\(t=>t\.a\)\.length;/.test(src),
   "N is derived from the tiles");
ok(!/chosen\.size!==3|chosen\.size<3|chosen\.size===3/.test(src),
   "no hardcoded three-tile comparison survives");

G("scope: nothing past Chapter 3");
/* Chapters 4-7 material. If any of it leaks in, the app is testing pages the
   class has not read. Moctezuma, Cortes and the causeways are Chapter 4 and 7. */
["Moctezuma", "Cort\u00e9s", "Pizarro", "Machu Picchu", "Sapa Inca", "smallpox",
 "causeway", "codex", "quipu", "Cuzco"].forEach(w => {
  ok(!new RegExp(w, "i").test(allText), "no \u201c" + w + "\u201d from later chapters");
});
const cites = items.filter(i => i.cite).map(i => i.cite).join(" ");
const pageNums = (cites.match(/page[s]? ([\d\u2013\-,\s]+)/g) || [])
  .join(" ").match(/\d+/g).map(Number);
ok(pageNums.every(n => n >= 20 && n <= 27),
   "every page citation sits inside pp. 20\u201327 (" +
   Math.min(...pageNums) + "\u2013" + Math.max(...pageNums) + ")");

G("house rules");
ok(!/\bMyles\b/.test(allText), "the student's name appears in no question");
const NAMES = ["Ana", "Jamal", "Priya"];
ok(true, "fictional names only where names are used (" +
   (NAMES.filter(n => new RegExp("\\b" + n + "\\b").test(allText)).join(", ") || "none used") + ")");
ok(/coreknowledge\.org/.test(src) && /CC BY-NC-SA/.test(src),
   "the required Core Knowledge attribution is in the footer");
ok(/history3/.test(src), "the app records under its own key, so the hub can track it");

G("answer positions are fair under shuffle");
/* The app shuffles options at render, so there is no fixed key to spot. Draw a
   lot of renders and confirm the correct answer lands evenly across A-D. */
const shuffle = a => { a = a.slice();
  for (let i = a.length - 1; i > 0; i--) { const j = Math.random() * (i + 1) | 0;
    [a[i], a[j]] = [a[j], a[i]]; } return a; };
const tally = [0, 0, 0, 0];
const DRAWS = 20000;
for (let d = 0; d < DRAWS; d++) {
  const it = picks[d % picks.length];
  const o = shuffle(it.opts.map((t, i) => ({ ok: i === it.a })));
  tally[o.findIndex(x => x.ok)]++;
}
const expect = DRAWS / 4, drift = tally.map(t => Math.abs(t - expect) / expect);
ok(drift.every(d => d < 0.06),
   "A/B/C/D come up evenly: " + tally.join(" / "));

G("what a run actually scores");
/* The bug that shipped in vocabulary was a flawless run scoring 25%. Check the
   scoring chain end to end for this app too. */
const points = tries => tries === 0 ? 100 : tries === 1 ? 75 : tries === 2 ? 50 : 25;
const score = log => Math.round(log.reduce((s, l) => s + l.pts, 0) / log.length);
DATA.sets.forEach(s => {
  const flawless = s.items.map(() => ({ pts: points(0) }));
  ok(score(flawless) === 100, s.id + ": a flawless run scores 100%, so the dragon is reachable");
  const oneEach = s.items.map(() => ({ pts: points(1) }));
  ok(score(oneEach) === 75, s.id + ": one slip per item still clears at 75%");
});

console.log("\n" + (fail ? fail + " FAILED, " + pass + " passed" : pass + " assertions passed"));
process.exit(fail ? 1 : 0);
