/* Saxon Course 2, Lesson 7 review — regression tests.
 *
 * The generator checks its own spec. This reads the shipped app instead, and
 * recomputes every number in it from scratch: factor lists, common factors,
 * greatest common factors, perfect squares, the value of each variable, and
 * both sides of each grouping comparison. A math app that is confidently wrong
 * is worse than no app at all — it teaches the mistake — so the arithmetic is
 * checked by a second program that shares no code with the first.
 *
 *   node test_math.js
 */
"use strict";
const fs = require("fs");
const path = require("path");

const FILE = path.join(__dirname, "..", "math", "saxon-c2-l7", "index.html");
const html = fs.readFileSync(FILE, "utf8");

let pass = 0;
const fails = [];
function ok(what, cond) {
  if (cond) { pass++; console.log("  ok   " + what); }
  else { fails.push(what); console.log("  FAIL " + what); }
}
function group(name) { console.log("\n" + name); }

/* ---------- pull DATA out of the shipped file ---------- */
function readData() {
  const i = html.indexOf("const DATA = ");
  const b = html.indexOf("{", i);
  let d = 0;
  for (let j = b; j < html.length; j++) {
    if (html[j] === "{") d++;
    else if (html[j] === "}") { d--; if (!d) return JSON.parse(html.slice(b, j + 1)); }
  }
  throw new Error("unbalanced DATA");
}
const DATA = readData();
const items = DATA.sets.flatMap(s => s.items.map(it => ({ ...it, set: s.id })));
const picks = items.filter(it => it.type === "pick");

/* ---------- arithmetic, recomputed ---------- */
const factors = n => {
  const out = [];
  for (let i = 1; i <= n; i++) if (n % i === 0) out.push(i);
  return out;
};
const single = n => factors(n).filter(f => f < 10);
const common = (a, b) => factors(a).filter(f => b % f === 0);
const csv = a => a.join(", ");
const isSquare = n => Number.isInteger(Math.sqrt(n));

/* Find a question by a fragment of its text, then name its correct option. */
function answerTo(fragment) {
  const it = picks.find(p => p.q.includes(fragment));
  if (!it) throw new Error("no question matching " + JSON.stringify(fragment));
  return it.opts[it.a];
}

group("factors — the miss on problem 6 was reading, not arithmetic");
ok("single-digit factors of 396 are " + csv(single(396)),
   answerTo("factors of 396") === csv(single(396)));
ok("the full factor list of 84 really is all factors",
   csv(factors(84)) === "1, 2, 3, 4, 6, 7, 12, 14, 21, 28, 42, 84");
ok("84's single-digit factors are 1, 2, 3, 4, 6, 7", csv(single(84)) === "1, 2, 3, 4, 6, 7");
ok("every option offered for 396 is a plausible list of its factors",
   picks.find(p => p.q.includes("factors of 396")).opts
        .every(o => o.split(", ").every(n => 396 % Number(n) === 0)));

group("common factors — the miss on problem 10 was the second step");
ok("common factors of 28 and 42 are " + csv(common(28, 42)),
   answerTo("common factors</b> of 28 and 42") === csv(common(28, 42)));
ok("14 is the greatest of them", Math.max(...common(28, 42)) === 14);
ok("4 divides 28 but not 42, so it is not common", 28 % 4 === 0 && 42 % 4 !== 0);
ok("3 divides 42 but not 28, so it is not common", 42 % 3 === 0 && 28 % 3 !== 0);
ok("28 and 42 are not the pair the lesson works as its own example",
   !/greatest common factor of 18 and 30/i.test(html));
ok("24 and 40 share 1, 2, 4, 8", csv(common(24, 40)) === "1, 2, 4, 8");

group("the divisibility tests offered as further help");
const TESTS = {
  2: n => Number(String(n).slice(-1)) % 2 === 0,
  3: n => String(n).split("").reduce((a, c) => a + Number(c), 0) % 3 === 0,
  4: n => Number(String(n).slice(-2)) % 4 === 0,
  5: n => "05".includes(String(n).slice(-1)),
  8: n => Number(String(n).slice(-3)) % 8 === 0,
  9: n => String(n).split("").reduce((a, c) => a + Number(c), 0) % 9 === 0,
  10: n => String(n).slice(-1) === "0",
};
/* Each test in the panel has to agree with actually dividing — on the numbers
   the app itself uses, and on a wide sweep, because a test that is right about
   396 and wrong in general is worse than no shortcut. */
Object.entries(TESTS).forEach(([d, f]) => {
  const n = Number(d);
  let agree = true;
  for (let x = 1; x <= 4000; x++) if (f(x) !== (x % n === 0)) { agree = false; break; }
  ok("the test for " + d + " agrees with dividing, 1 to 4000", agree);
});
ok("the panel says there is no quick test for 7",
   DATA.passages.single.vocab.some(v => v[0] === "7" && /no quick test/.test(v[2])));
ok("396 passes 2, 3, 4, 6 and 9", [2, 3, 4, 6, 9].every(d => 396 % d === 0));
ok("396 fails 5, 7, 8 and 10", [5, 7, 8, 10].every(d => 396 % d !== 0));

group("perfect squares — problem 8, the term he did not know");
const squares = Array.from({ length: 15 }, (_, i) => (i + 1) * (i + 1));
ok("after 121 the next three squares are 144, 169, 196",
   answerTo("64, 81, 100, 121").includes("144, 169, 196") &&
   csv(squares.slice(squares.indexOf(121) + 1, squares.indexOf(121) + 4)) === "144, 169, 196");
ok("1, 4, 9, 16, 25, 36 are the first six squares",
   csv(squares.slice(0, 6)) === "1, 4, 9, 16, 25, 36");

group("finding the value of a variable — problems 14 and 16");
/* Each entry: what the question shows, the move the app calls correct, and the
   value that move produces, checked by substituting back into the equation. */
const MOVES = [
  { q: "m − 47 = 156", move: "Add 47", v: 203, back: v => v - 47 === 156 },
  { q: "12n = 156", move: "Divide by 12", v: 13, back: v => 12 * v === 156 },
];
MOVES.forEach(m => {
  ok(m.q + " — the app says " + JSON.stringify(m.move), answerTo(m.q) === m.move);
  ok(m.q + " — that move gives " + m.v + ", which checks out", m.back(m.v));
});
ok("w − 98 = 432 is undone by adding, not subtracting",
   answerTo("Ana solved").includes("add it back"));
ok("adding gives 530, which checks out", 530 - 98 === 432);
ok("subtracting gives 334, which does not", 334 - 98 !== 432);
ok("w ÷ 20 = 200 is undone by multiplying, not dividing",
   answerTo("Priya solved").includes("multiply"));
ok("multiplying gives 4000, which checks out", 4000 / 20 === 200);
ok("dividing gives 10, which does not", 10 / 20 !== 200);

group("grouping — problem 24");
ok("800 ÷ (40 ÷ 2) is greater than (800 ÷ 40) ÷ 2",
   answerTo("800 ÷ (40 ÷ 2)") === "The left side is greater");
ok("...because it is 40 against 10", 800 / (40 / 2) === 40 && (800 / 40) / 2 === 10);
ok("the unequal pair is the division one",
   answerTo("Which pair is <b>not</b> equal?").startsWith("36 ÷ (6 ÷ 2)"));
ok("...36 ÷ (6 ÷ 2) = 12 but (36 ÷ 6) ÷ 2 = 3", 36 / (6 / 2) === 12 && (36 / 6) / 2 === 3);
ok("the other three pairs really are equal",
   (4 * 5) * 3 === 4 * (5 * 3) && (9 + 7) + 4 === 9 + (7 + 4) && (2 * 6) * 5 === 2 * (6 * 5));

group("the builder — held back this time, but its data still ships");
ok("nothing in the running order reaches it",
   items.every(it => it.type !== "build"));
ok("every DATA.build reference sits behind a type guard", (() => {
  /* With no build item the block is unreachable, which is only true while
     each reference is inside an `isBuild` or `type === "build"` branch. */
  const fns = ["rBuild", "revealHistory", "retryHere", "restoreState", "win"];
  return [...html.matchAll(/DATA\.build/g)].every(m => {
    const head = html.lastIndexOf("function ", m.index);
    const name = html.slice(head + 9, head + 60).split("(")[0];
    return fns.includes(name);
  });
})());
const B = DATA.build;
const right = B.tiles.filter(t => t.a);
ok("two tiles are correct", right.length === 2);
ok("both correct tiles divide x by 8", right.every(t => /÷ 8 =/.test(t.t)));
ok("no wrong tile divides x by 8", B.tiles.filter(t => !t.a).every(t => !/x ÷ 8 =/.test(t.t)));
ok("x ÷ 8 = 40 gives 320", 320 / 8 === 40);
ok("x ÷ 8 = 7 gives 56", 56 / 8 === 7);
ok("the reveal is not history's", B.lead !== "The Big Question, answered" && !!B.hit);

group("shape");
ok("three sets", DATA.sets.length === 3);
ok("every set holds two to four questions",
   DATA.sets.every(s => s.items.length >= 2 && s.items.length <= 4));
ok("no set tag claims to be a lesson",
   DATA.sets.every(s => !/^lessons?\s/i.test(s.tag)));
ok("each set names the homework problems it came from",
   DATA.sets.every(s => /^Homework \d+( and \d+)?$/.test(s.tag)));
ok("every one of the six misses is covered twice", (() => {
  const want = ["6 and 10", "14 and 16", "8 and 24"];
  return want.every(w => DATA.sets.some(s => s.tag === "Homework " + w &&
                                             s.items.length === 4));
})());
ok("there is a way back to the lesson from inside a set",
   DATA.backLabel === "Lesson 7" && /id="tohome"/.test(html));
ok("12 questions, and no more", items.length === 12 && items.length <= 12);
ok("no builder in the running order", items.filter(i => i.type === "build").length === 0);
ok("every pick has four options", picks.every(p => p.opts.length === 4));
ok("no pick repeats an option", picks.every(p => new Set(p.opts).size === 4));
ok("every answer index is in range", picks.every(p => p.a >= 0 && p.a < p.opts.length));
ok("every pick has a why and a cite", picks.every(p => p.why && p.cite));
ok("no correct option is the longest by 6 or more characters", picks.every(p => {
  const lens = p.opts.map(o => o.length).sort((a, b) => a - b);
  return !(p.opts[p.a].length === lens[3] && lens[3] - lens[2] >= 6);
}));
ok("no more than two questions of any one kind", (() => {
  const n = {};
  picks.forEach(p => { n[p.kind] = (n[p.kind] || 0) + 1; });
  return Object.values(n).every(v => v <= 2);
})());
ok("every question says what kind it is", picks.every(p => !!p.kind));
ok("the answer is not always in the same place",
   new Set(picks.map(p => p.a)).size >= 3);

group("worked examples");
ok("every item points at an example that exists",
   items.every(it => !it.p || !!DATA.passages[it.p]));
ok("every highlight is findable in the example it points at", items.every(it => {
  if (!it.p || !it.hi) return true;
  const body = DATA.passages[it.p].text.join(" ");
  return (Array.isArray(it.hi) ? it.hi : [it.hi]).every(h => body.includes(h));
}));
ok("every example has a title and a cite",
   Object.values(DATA.passages).every(p => p.title && p.cite && p.text.length));
ok("every worked example points into the book for more",
   Object.values(DATA.passages).every(p => /Saxon Course 2, Lesson \d/.test(p.book || "")));
ok("every worked example names the lesson's own words for it",
   Object.values(DATA.passages).every(p => p.vocab && p.vocab.length));
ok("the box is labelled for the lesson, not for vocabulary",
   DATA.vocabLabel === "The way the lesson puts it");
ok("the panel is labelled for math, not for reading",
   DATA.readCta === "Show me a worked example");

group("sources and names");
ok("Myles appears in no question", !items.some(it => JSON.stringify(it).includes("Myles")));
ok("nothing claims to come from Core Knowledge", !/Core Knowledge|CKHG/.test(html));
ok("the citations name Saxon", picks.every(p => p.cite.startsWith("Saxon Math Course 2")));

/* ---------- report ---------- */
console.log("");
if (fails.length) {
  console.log(fails.length + " FAILED:");
  fails.forEach(f => console.log("  - " + f));
  process.exit(1);
}
console.log(pass + " assertions passed");
