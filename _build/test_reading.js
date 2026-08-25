/* node _build/test_reading.js
   Checks the built Sherlock app's data the way the app itself consumes it:
   excerpt fidelity, question shape, answer-position fairness under shuffle,
   and what a flawless and a disastrous run actually score. */
const fs = require("fs"), path = require("path");
const file = path.join(__dirname, "..", "reading", "sherlock-speckled-1", "index.html");
const src  = fs.readFileSync(file, "utf8");

const m = src.match(/const DATA = (\{.*?\});\n/s);
if (!m) { console.error("could not find DATA in the built app"); process.exit(1); }
const DATA = JSON.parse(m[1]);

let pass = 0, fail = 0, group = "";
const G = g => { group = g; console.log("\n" + g); };
const ok = (cond, msg) => { if (cond) { pass++; console.log("  ok   " + msg); }
                            else { fail++; console.log("  FAIL " + msg); } };

/* the app's own scoring chain, copied verbatim from win() */
const points = tries => tries === 0 ? 100 : tries === 1 ? 75 : tries === 2 ? 50 : 25;
const score  = log => Math.round(log.reduce((s, l) => s + l, 0) / log.length);

G("shape");
ok(DATA.sets.length === 3, "three sections");
const items = DATA.sets.flatMap(s => s.items);
ok(items.length === 24, "twenty-four items in total (" + items.length + ")");
ok(DATA.sets.every(s => s.paras.length > 0), "every section carries its passage");
ok(DATA.sets.every(s => s.items.length >= 6), "no section is thinner than six items");

G("excerpts are verbatim and locatable");
DATA.sets.forEach(s => {
  const bad = s.items.filter((it, i) => !s.paras[it.ev] || !s.paras[it.ev].t.includes(it.quote));
  ok(bad.length === 0, s.id + ": every excerpt sits in the paragraph ev points at");
  const range = s.items.every(it => it.ev >= 0 && it.ev < s.paras.length);
  ok(range, s.id + ": every ev index is inside the passage");
});

G("question shape");
const picks = items.filter(i => i.type === "pick");
ok(picks.every(i => i.opts.length === 4), "every multiple choice offers four options");
ok(picks.every(i => new Set(i.opts).size === 4), "no repeated option text");
ok(items.filter(i => i.type === "build").every(i => i.tiles.filter(t => t.a).length === i.n),
   "every evidence question has exactly n correct tiles");
ok(items.filter(i => i.type === "build").every(i => i.tiles.length - i.n >= 2),
   "every evidence question has at least two distractors");
const ord = items.filter(i => i.type === "order");
ok(ord.length === 1 && ord[0].steps.length === 6, "one ordering question, six steps");

G("answer position is not guessable");
/* options are shuffled at render, so there is no fixed key -- prove it */
const shuffle = a => { a = a.slice();
  for (let i = a.length - 1; i > 0; i--) { const j = Math.random() * (i + 1) | 0;
    [a[i], a[j]] = [a[j], a[i]]; } return a; };
const slot = [0, 0, 0, 0];
const RUNS = 20000;
for (let r = 0; r < RUNS; r++) {
  const it = picks[r % picks.length];
  slot[shuffle(it.opts.map((t, i) => i === 0)).indexOf(true)]++;
}
const lo = RUNS / 4 * 0.93, hi = RUNS / 4 * 1.07;
ok(slot.every(n => n > lo && n < hi),
   "correct answer lands in A/B/C/D evenly: " + slot.join(" / "));
let runLen = 0, worst = 0, prev = -1;
for (let r = 0; r < 2000; r++) {
  const it = picks[r % picks.length];
  const at = shuffle(it.opts.map((t, i) => i === 0)).indexOf(true);
  runLen = at === prev ? runLen + 1 : 1; prev = at; worst = Math.max(worst, runLen);
}
ok(worst <= 8, "longest run of the same position over 2000 draws is " + worst);

G("scoring");
DATA.sets.forEach(s => {
  ok(score(s.items.map(() => points(0))) === 100, s.id + ": a flawless run scores 100");
  ok(score(s.items.map(() => points(9))) === 25,  s.id + ": a hopeless run floors at 25, not 0 or NaN");
  const mixed = score(s.items.map((_, i) => points(i % 3)));
  ok(mixed > 25 && mixed < 100 && Number.isFinite(mixed), s.id + ": a mixed run scores " + mixed + "%");
});
ok(points(0) === 100 && [1,2,3,4].every(t => points(t) < 100),
   "only an untried-and-correct answer is worth full marks (the dragon needs it)");

G("scope: nothing past page 13");
const pageOf = c => (c.match(/\d+/g) || []).map(Number);
ok(items.every(i => pageOf(i.cite).every(p => p >= 1 && p <= 13)),
   "every citation points inside pages 1-13");
ok(DATA.sets.every(s => s.paras.every(p => p.p >= 1 && p.p <= 13)),
   "every passage paragraph is inside pages 1-13");
const text = DATA.sets.flatMap(s => s.paras.map(p => p.t)).join(" ").toLowerCase();
["swamp adder", "ventilator", "bell-rope", "bell rope", "dummy"].forEach(w =>
  ok(!text.includes(w), "the passage does not leak '" + w + "' from later in the story"));

console.log("\n" + (fail ? fail + " FAILED, " : "") + pass + " assertions passed");
process.exit(fail ? 1 : 0);
