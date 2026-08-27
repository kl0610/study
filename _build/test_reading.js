/* node _build/test_reading.js
   Checks the built Sherlock app's data the way the app itself consumes it:
   one mission of seven questions drawn from the passages on pages 14-23, the
   shape each question type has to hold, answer-position fairness under the
   shuffle the app really performs, and what a flawless and a hopeless run
   actually score. */
const fs = require("fs"), path = require("path");
const file = path.join(__dirname, "..", "reading", "sherlock-speckled-1", "index.html");
const src  = fs.readFileSync(file, "utf8");

const m = src.match(/const DATA = (\{.*?\});\r?\n/s);
if (!m) { console.error("could not find DATA in the built app"); process.exit(1); }
const DATA = JSON.parse(m[1]);

let pass = 0, fail = 0;
const G = g => console.log("\n" + g);
const ok = (cond, msg) => { if (cond) { pass++; console.log("  ok   " + msg); }
                            else { fail++; console.log("  FAIL " + msg); } };

/* the app's own scoring chain, copied verbatim from win() and finish():
     const pts = hinted ? 25 : (tries===1?100:tries===2?75:tries===3?50:25);
     const pct = Math.round(log.reduce((s,l)=>s+l.pts,0)/log.length);
   note that tries counts from 1, so a first-try answer is tries===1. */
const points = (tries, hinted) =>
  hinted ? 25 : (tries === 1 ? 100 : tries === 2 ? 75 : tries === 3 ? 50 : 25);
const score = pts => Math.round(pts.reduce((s, p) => s + p, 0) / pts.length);

G("shape");
ok(DATA.missions.length === 1,
   "one mission — the passage is a single sitting, not parallel forms");
const M = DATA.missions[0];
ok(M.id === "m1", "the mission is m1, the id both the hub and dragon target name");
ok(M.items.length === 7, "seven questions (" + M.items.length + ")");
ok(/^7 questions\b/.test(M.tag), "the mission tag agrees: " + JSON.stringify(M.tag));
ok(Object.keys(DATA.passages).length > 0, "the chapter carries its passages");
ok(M.items.every(i => DATA.passages[i.p]),
   "every question points at a passage that exists");
ok(Object.values(DATA.passages).every(p => p.text && p.cite),
   "every passage carries its text and its citation");
ok(M.items.every(i => i.why), "every question explains its answer");

G("question shape");
const picks = M.items.filter(i => i.type === "pick");
ok(picks.length === 5, "five multiple-choice questions (" + picks.length + ")");
ok(picks.every(i => i.opts.length === 4), "every multiple choice offers four options");
ok(picks.every(i => new Set(i.opts).size === 4), "no repeated option text");
ok(picks.every(i => Number.isInteger(i.a) && i.a >= 0 && i.a < i.opts.length),
   "every multiple choice names a correct option that exists");

const sel = M.items.filter(i => i.type === "selectall");
ok(sel.length === 1, "one select-all question");
ok(sel.every(i => i.opts.every(o => Array.isArray(o) && o.length === 2)),
   "select-all options are [text, correct] pairs");
ok(sel.every(i => i.opts.some(o => o[1]) && i.opts.some(o => !o[1])),
   "select-all offers both correct answers and at least one distractor");

const sorts = M.items.filter(i => i.type === "sort");
ok(sorts.length === 1, "one sorting question");
ok(sorts.every(i => i.bins.length >= 2), "sorting offers at least two bins");
ok(sorts.every(i => i.chips.every(c => Number.isInteger(c[1]) && c[1] >= 0 && c[1] < i.bins.length)),
   "every chip sorts into a bin that exists");
ok(sorts.every(i => new Set(i.chips.map(c => c[1])).size === i.bins.length),
   "every bin is used, so none is a decoy");

ok(M.items.every(i => ["pick", "selectall", "sort"].includes(i.type)),
   "no question uses a type the app cannot render");

G("answer position is not guessable");
/* the app shuffles at render: shuffle(it.opts.map((t,i)=>({t,ok:i===it.a}))),
   so the key is it.a, not a fixed slot -- prove the shuffle is even */
const shuffle = a => { a = a.slice();
  for (let i = a.length - 1; i > 0; i--) { const j = Math.random() * (i + 1) | 0;
    [a[i], a[j]] = [a[j], a[i]]; } return a; };
const slot = [0, 0, 0, 0];
const RUNS = 20000;
for (let r = 0; r < RUNS; r++) {
  const it = picks[r % picks.length];
  slot[shuffle(it.opts.map((t, i) => i === it.a)).indexOf(true)]++;
}
const lo = RUNS / 4 * 0.93, hi = RUNS / 4 * 1.07;
ok(slot.every(n => n > lo && n < hi),
   "correct answer lands in A/B/C/D evenly: " + slot.join(" / "));
let runLen = 0, worst = 0, prev = -1;
for (let r = 0; r < 2000; r++) {
  const it = picks[r % picks.length];
  const at = shuffle(it.opts.map((t, i) => i === it.a)).indexOf(true);
  runLen = at === prev ? runLen + 1 : 1; prev = at; worst = Math.max(worst, runLen);
}
ok(worst <= 8, "longest run of the same position over 2000 draws is " + worst);

G("scoring");
ok(score(M.items.map(() => points(1, false))) === 100,
   "a flawless run scores 100, so the dragon on m1 is reachable");
ok(score(M.items.map(() => points(9, false))) === 25,
   "a hopeless run floors at 25, not 0 or NaN");
ok(score(M.items.map(() => points(1, true))) === 25,
   "a hinted run is worth the floor however fast it was");
const mixed = score(M.items.map((_, i) => points((i % 3) + 1, false)));
ok(mixed > 25 && mixed < 100 && Number.isFinite(mixed),
   "a mixed run scores " + mixed + "%");
ok(points(1, false) === 100 && [2, 3, 4].every(t => points(t, false) < 100),
   "only a first-try answer is worth full marks (the dragon needs a clean run)");

G("scope: pages 14-23, and nothing past them");
const pageOf = c => (c.match(/\d+/g) || []).map(Number);
ok(Object.values(DATA.passages).every(p => pageOf(p.cite).every(n => n >= 14 && n <= 23)),
   "every passage citation sits inside pages 14-23");
ok(/14–23/.test(DATA.chapter),
   "the chapter label names the range: " + DATA.chapter);
const text = Object.values(DATA.passages).map(p => p.text).join(" ").toLowerCase();
/* the reveal all lives past page 23; if any of it turns up here, the passage
   has been extended without the questions being rechecked */
["swamp adder", "ventilator", "bell-rope", "bell rope", "dummy",
 "baboon", "cheetah", "saucer of milk"].forEach(w =>
  ok(!text.includes(w), "the passage does not leak '" + w + "' from past page 23"));

console.log("\n" + (fail ? fail + " FAILED, " : "") + pass + " assertions passed");
process.exit(fail ? 1 : 0);
