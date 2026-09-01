/* The practice generators — checked by generating a lot and re-deriving each answer.
 *
 * A hand-written question is checked once. A generator is checked by running it
 * thousands of times, because the bug that matters is the one that only appears
 * when the dice come up a particular way — a distractor that happens to equal
 * the answer, a fraction that does not reduce, an option list of three. Those
 * are exactly the faults a ten-year-old would find first and could not argue
 * with, so they are worth a few thousand rolls.
 *
 * Where it can, this recomputes the answer from the question text rather than
 * trusting what the generator reported.
 *
 *   node test_mathskills.js
 */
"use strict";
const M = require("./mathskills.js");

const ROUNDS = 4000;
let pass = 0;
const fails = [];
function ok(what, cond, extra) {
  if (cond) { pass++; console.log("  ok   " + what); }
  else { fails.push(what + (extra ? " — " + extra : "")); console.log("  FAIL " + what + (extra ? " — " + extra : "")); }
}
function group(n) { console.log("\n" + n); }

const strip = s => String(s).replace(/<[^>]+>/g, "");
const num = s => Number(String(s).replace(/[$,\s]/g, ""));

group("what is built");
ok("lessons 1 to 10 have generators",
   JSON.stringify(M.built) === JSON.stringify([1,2,3,4,5,6,7,8,9,10]));
ok("every built lesson has a name", M.built.every(n => M.name(n) && !/^Lesson/.test(M.name(n))));
ok("lesson 11 is honestly reported as not built", M.has(11) === false && M.gen(11) === null);
ok("...and asking for questions from it yields none",
   M.forProblem([11, 12], 3).length === 0);

/* ---------------- the shape every question must have ---------------- */
group(`shape — ${ROUNDS} questions per lesson`);
{
  const bad = { none: [], opts: [], dupe: [], idx: [], text: [], why: [], cite: [], ex: [], html: [] };
  for (const L of M.built) {
    for (let i = 0; i < ROUNDS; i++) {
      const q = M.gen(L);
      if (!q) { bad.none.push(L); continue; }
      if (!Array.isArray(q.opts) || q.opts.length !== 4) { bad.opts.push([L, q.opts && q.opts.length]); continue; }
      if (new Set(q.opts.map(String)).size !== 4) { bad.dupe.push([L, q.opts]); continue; }
      if (!(q.a >= 0 && q.a < 4)) { bad.idx.push([L, q.a]); continue; }
      if (!q.q || strip(q.q).length < 8) bad.text.push([L, q.q]);
      if (!q.why || q.why.length < 24) bad.why.push([L, q.why]);
      if (!/^Saxon Math Course 2, Lesson \d+ — /.test(q.cite || "")) bad.cite.push([L, q.cite]);
      if (!q.ex) bad.ex.push(L);
      if (/<(?!\/?(b|br|i|em|sup)\b)/.test(q.q)) bad.html.push([L, q.q]);
    }
  }
  ok("every call returns a question", !bad.none.length, bad.none.slice(0, 3).join());
  ok("always exactly four options", !bad.opts.length, JSON.stringify(bad.opts.slice(0, 2)));
  ok("never a repeated option", !bad.dupe.length, JSON.stringify(bad.dupe.slice(0, 2)));
  ok("the answer index is always in range", !bad.idx.length, JSON.stringify(bad.idx.slice(0, 2)));
  ok("every question has real text", !bad.text.length, JSON.stringify(bad.text.slice(0, 2)));
  ok("every question explains itself", !bad.why.length, JSON.stringify(bad.why.slice(0, 2)));
  ok("every question cites a lesson", !bad.cite.length, JSON.stringify(bad.cite.slice(0, 2)));
  ok("every question names a worked example", !bad.ex.length, bad.ex.slice(0, 3).join());
  ok("only safe markup in the question text", !bad.html.length, JSON.stringify(bad.html.slice(0, 2)));
}

/* ---------------- no pattern to notice ---------------- */
group("no tells");
{
  for (const L of M.built) {
    const at = [0, 0, 0, 0];
    let longest = 0, n = 0;
    for (let i = 0; i < ROUNDS; i++) {
      const q = M.gen(L);
      at[q.a]++;
      const lens = q.opts.map(o => String(o).length);
      const max = Math.max(...lens);
      if (lens[q.a] === max && lens.filter(x => x === max).length === 1) longest++;
      n++;
    }
    const spread = Math.min(...at) / (n / 4);
    ok(`lesson ${L}: the answer lands in all four places evenly (${at.join("/")})`, spread > 0.85);
    ok(`lesson ${L}: the answer is not usually the longest option (${Math.round(longest / n * 100)}%)`,
       longest / n < 0.45);
  }
}

/* ---------------- the arithmetic, re-derived ---------------- */
group("lesson 1 — the numbers are actually right");
{
  let checked = 0, wrong = [];
  for (let i = 0; i < ROUNDS; i++) {
    const q = M.gen(1);
    const t = strip(q.q);
    let m;
    if ((m = t.match(/Add:\s*([\d,]+)\s*\+\s*([\d,]+)/))) {
      checked++; if (num(q.opts[q.a]) !== num(m[1]) + num(m[2])) wrong.push(t);
    } else if ((m = t.match(/Subtract:\s*\$([\d.]+)\s*−\s*\$([\d.]+)/))) {
      checked++;
      const r = Math.round((num(m[1]) - num(m[2])) * 100) / 100;
      if (Math.abs(num(q.opts[q.a]) - r) > 0.001) wrong.push(t);
    } else if ((m = t.match(/Multiply:\s*(\d+)\s*×\s*(\d+)/))) {
      checked++; if (num(q.opts[q.a]) !== Number(m[1]) * Number(m[2])) wrong.push(t);
    } else if ((m = t.match(/Divide:\s*\$([\d.]+)\s*÷\s*(\d+)/))) {
      checked++;
      if (Math.abs(num(q.opts[q.a]) - num(m[1]) / Number(m[2])) > 0.001) wrong.push(t);
    } else if ((m = t.match(/Evaluate (ab|b − a|b ÷ a|a \+ b) when a = (\d+) and b = (\d+)/))) {
      checked++;
      const A = Number(m[2]), B = Number(m[3]);
      const want = m[1] === "ab" ? A * B : m[1] === "b − a" ? B - A : m[1] === "b ÷ a" ? B / A : A + B;
      if (num(q.opts[q.a]) !== want) wrong.push(t);
    } else if ((m = t.match(/product of two one-digit whole numbers is (\d+)/))) {
      checked++;
      const P = Number(m[1]), s = num(q.opts[q.a]);
      let found = false;
      for (let x = 2; x <= 9; x++) for (let y = 2; y <= 9; y++) if (x * y === P && x + y === s) found = true;
      if (!found) wrong.push(t + " -> " + q.opts[q.a]);
    }
  }
  ok(`${checked} lesson-1 answers recomputed`, checked > ROUNDS * 0.9);
  ok("every one of them is right", !wrong.length, wrong.slice(0, 2).join(" | "));
}

group("lesson 3 — the move and the value both check out");
{
  let moves = 0, values = 0, wrong = [];
  for (let i = 0; i < ROUNDS; i++) {
    const q = M.gen(3);
    const t = strip(q.q);
    let m;
    if ((m = t.match(/^(\w+) ([−+÷]) (\d+) = (\d+)\.\s*What should you do/)) ||
        (m = t.match(/^(\d+)(\w) = (\d+)\.\s*What should you do/))) {
      moves++;
      const want = t.includes("−") ? "Add" : t.includes("+") ? "Subtract"
                 : t.includes("÷") ? "Multiply by" : "Divide by";
      if (!String(q.opts[q.a]).startsWith(want)) wrong.push(t + " -> " + q.opts[q.a]);
    } else if ((m = t.match(/Find (\w+): (\w+) ([−+÷]) (\d+) = (\d+)/))) {
      values++;
      const n = Number(m[4]), r = Number(m[5]);
      const want = m[3] === "−" ? r + n : m[3] === "+" ? r - n : r * n;
      if (num(q.opts[q.a]) !== want) wrong.push(t + " -> " + q.opts[q.a]);
    } else if ((m = t.match(/Find (\w+): (\d+)(\w) = (\d+)/))) {
      values++;
      if (num(q.opts[q.a]) !== Number(m[4]) / Number(m[2])) wrong.push(t + " -> " + q.opts[q.a]);
    } else if ((m = t.match(/^(\d+) − (\w+) = (\d+)\./))) {
      moves++;
      if (String(q.opts[q.a]) !== m[2] + " = " + m[1] + " − " + m[3]) wrong.push(t + " -> " + q.opts[q.a]);
    } else if ((m = t.match(/^(\d+) ÷ (\w+) = (\d+)\./))) {
      moves++;
      if (String(q.opts[q.a]) !== m[2] + " = " + m[1] + " ÷ " + m[3]) wrong.push(t + " -> " + q.opts[q.a]);
    }
  }
  ok(`${moves} "which move" answers recomputed`, moves > 0);
  ok(`${values} "find the value" answers recomputed`, values > 0);
  ok("every one of them is right", !wrong.length, wrong.slice(0, 3).join(" | "));
  ok("every whole-number answer really is whole", (() => {
    for (let i = 0; i < 800; i++) {
      const q = M.gen(3);
      const m = strip(q.q).match(/Find \w+: \w+ ÷ (\d+) = (\d+)/);
      if (m && !Number.isInteger(Number(m[2]) * Number(m[1]))) return false;
    }
    return true;
  })());
}

group("lesson 4 — sequences continue correctly");
{
  let sq = 0, ar = 0, wrong = [];
  for (let i = 0; i < ROUNDS; i++) {
    const q = M.gen(4);
    const t = strip(q.q);
    let m;
    if ((m = t.match(/…, ([\d, ]+), …/))) {
      const seen = m[1].split(",").map(x => Number(x.trim()));
      const roots = seen.map(Math.sqrt);
      if (roots.every(Number.isInteger)) {
        sq++;
        const r = roots[roots.length - 1];
        const want = [(r+1)**2, (r+2)**2, (r+3)**2].join(", ");
        if (!String(q.opts[q.a]).endsWith(want)) wrong.push(t + " -> " + q.opts[q.a]);
      }
    } else if ((m = t.match(/next three numbers\?\s*([\d, ]+), …/))) {
      ar++;
      const seen = m[1].split(",").map(x => Number(x.trim())).filter(x => !isNaN(x));
      const step = seen[1] - seen[0];
      const last = seen[seen.length - 1];
      const want = [last + step, last + 2 * step, last + 3 * step].join(", ");
      if (String(q.opts[q.a]) !== want) wrong.push(t + " -> " + q.opts[q.a]);
    }
  }
  ok(`${sq} perfect-square sequences checked`, sq > 0);
  ok(`${ar} arithmetic sequences checked`, ar > 0);
  ok("every continuation is right", !wrong.length, wrong.slice(0, 2).join(" | "));
}

group("lesson 6 — factors, recomputed from scratch");
{
  const factors = n => { const o = []; for (let i = 1; i <= n; i++) if (n % i === 0) o.push(i); return o; };
  let single = 0, common = 0, gcf = 0, div = 0, wrong = [];
  for (let i = 0; i < ROUNDS; i++) {
    const q = M.gen(6);
    const t = strip(q.q);
    let m;
    if ((m = t.match(/single-digit factors of (\d+)/))) {
      single++;
      const want = factors(Number(m[1])).filter(f => f < 10).join(", ");
      if (String(q.opts[q.a]) !== want) wrong.push(t + " -> " + q.opts[q.a] + " want " + want);
    } else if ((m = t.match(/common factors of (\d+) and (\d+)/))) {
      common++;
      const want = factors(Number(m[1])).filter(f => Number(m[2]) % f === 0).join(", ");
      if (String(q.opts[q.a]) !== want) wrong.push(t + " -> " + q.opts[q.a] + " want " + want);
    } else if ((m = t.match(/greatest common factor of (\d+) and (\d+)/))) {
      gcf++;
      const com = factors(Number(m[1])).filter(f => Number(m[2]) % f === 0);
      if (num(q.opts[q.a]) !== com[com.length - 1]) wrong.push(t + " -> " + q.opts[q.a]);
    } else if ((m = t.match(/Is ([\d,]+) divisible by (\d+)\?/))) {
      div++;
      const yes = num(m[1]) % Number(m[2]) === 0;
      if (String(q.opts[q.a]) !== (yes ? "Yes" : "No")) wrong.push(t + " -> " + q.opts[q.a]);
    }
  }
  ok(`${single} single-digit factor lists checked`, single > 0);
  ok(`${common} common-factor lists checked`, common > 0);
  ok(`${gcf} greatest common factors checked`, gcf > 0);
  ok(`${div} divisibility answers checked`, div > 0);
  ok("every one of them is right", !wrong.length, wrong.slice(0, 3).join(" | "));
}

group("lesson 8 — fractions and percents agree");
{
  let n = 0, wrong = [];
  for (let i = 0; i < ROUNDS; i++) {
    const q = M.gen(8);
    const t = strip(q.q);
    let m;
    if ((m = t.match(/Write (\d+)\/(\d+) as a percent/))) {
      n++;
      const want = Number(m[1]) / Number(m[2]) * 100;
      if (Math.abs(num(q.opts[q.a].replace("%", "")) - want) > 0.001) wrong.push(t + " -> " + q.opts[q.a]);
    } else if ((m = t.match(/Write (\d+)% as a fraction/))) {
      n++;
      const f = String(q.opts[q.a]).split("/").map(Number);
      if (Math.abs(f[0] / f[1] - Number(m[1]) / 100) > 1e-9) wrong.push(t + " -> " + q.opts[q.a]);
      const g = (a, b) => b ? g(b, a % b) : a;
      if (g(f[0], f[1]) !== 1) wrong.push(t + " -> " + q.opts[q.a] + " not in lowest terms");
    }
  }
  ok(`${n} fraction/percent conversions checked`, n > 0);
  ok("every one of them is right, and reduced", !wrong.length, wrong.slice(0, 3).join(" | "));
}

group("lesson 9 — fraction arithmetic");
{
  const val = s => {
    s = String(s).replace(" (not reduced)", "").trim();
    const mix = s.match(/^(\d+) (\d+)\/(\d+)$/);
    if (mix) return Number(mix[1]) + Number(mix[2]) / Number(mix[3]);
    const f = s.match(/^(-?\d+)\/(\d+)$/);
    if (f) return Number(f[1]) / Number(f[2]);
    return Number(s);
  };
  let n = 0, wrong = [];
  for (let i = 0; i < ROUNDS; i++) {
    const q = M.gen(9);
    const t = strip(q.q);
    let m;
    if ((m = t.match(/(Add|Subtract): (\d+)\/(\d+) ([+−]) (\d+)\/(\d+)/))) {
      n++;
      const a = Number(m[2]) / Number(m[3]), b = Number(m[5]) / Number(m[6]);
      const want = m[4] === "+" ? a + b : a - b;
      if (Math.abs(val(q.opts[q.a]) - want) > 1e-9) wrong.push(t + " -> " + q.opts[q.a]);
    } else if ((m = t.match(/Multiply: (\d+)\/(\d+) × (\d+)\/(\d+)/))) {
      n++;
      const want = Number(m[1]) / Number(m[2]) * (Number(m[3]) / Number(m[4]));
      if (Math.abs(val(q.opts[q.a]) - want) > 1e-9) wrong.push(t + " -> " + q.opts[q.a]);
    } else if ((m = t.match(/reciprocal of (\d+)\/(\d+)/))) {
      n++;
      if (String(q.opts[q.a]) !== m[2] + "/" + m[1]) wrong.push(t + " -> " + q.opts[q.a]);
    }
  }
  ok(`${n} fraction operations checked`, n > 0);
  ok("every one of them is right", !wrong.length, wrong.slice(0, 3).join(" | "));
}

group("lesson 10 — mixed and improper");
{
  let n = 0, wrong = [];
  for (let i = 0; i < ROUNDS; i++) {
    const q = M.gen(10);
    const t = strip(q.q);
    let m;
    if ((m = t.match(/mixed number: (\d+) ÷ (\d+)/))) {
      n++;
      const mm = String(q.opts[q.a]).match(/^(\d+) (\d+)\/(\d+)$/);
      if (!mm) { wrong.push(t + " -> " + q.opts[q.a]); continue; }
      const v = Number(mm[1]) + Number(mm[2]) / Number(mm[3]);
      if (Math.abs(v - Number(m[1]) / Number(m[2])) > 1e-9) wrong.push(t + " -> " + q.opts[q.a]);
    } else if ((m = t.match(/Write (\d+)\/(\d+) as a mixed number/))) {
      n++;
      const mm = String(q.opts[q.a]).match(/^(\d+) (\d+)\/(\d+)$/);
      if (!mm) { wrong.push(t + " -> " + q.opts[q.a]); continue; }
      const v = Number(mm[1]) + Number(mm[2]) / Number(mm[3]);
      if (Math.abs(v - Number(m[1]) / Number(m[2])) > 1e-9) wrong.push(t + " -> " + q.opts[q.a]);
    } else if ((m = t.match(/Write (\d+) (\d+)\/(\d+) as an improper fraction/))) {
      n++;
      const want = Number(m[1]) * Number(m[3]) + Number(m[2]);
      if (String(q.opts[q.a]) !== want + "/" + m[3]) wrong.push(t + " -> " + q.opts[q.a]);
    }
  }
  ok(`${n} mixed-number conversions checked`, n > 0);
  ok("every one of them is right", !wrong.length, wrong.slice(0, 3).join(" | "));
}

group("building a set for a problem");
{
  const set = M.forProblem([3], 4);
  ok("asks for four and gets four", set.length === 4);
  ok("...with no two the same question", new Set(set.map(q => q.q)).size === 4);
  ok("...all from the skill asked for", set.every(q => q.skill === 3));
  const both = M.forProblem([2, 4], 4);
  ok("a problem tagged with two lessons draws on both",
     both.length === 4 && new Set(both.map(q => q.skill)).size === 2);
  const part = M.forProblem([6, 99], 3);
  ok("an unbuilt lesson in the list is skipped, not fatal",
     part.length === 3 && part.every(q => q.skill === 6));
  ok("two runs of the same request differ",
     JSON.stringify(M.forProblem([1], 4).map(q => q.q)) !==
     JSON.stringify(M.forProblem([1], 4).map(q => q.q)));
}

group("names");
ok("Myles is in none of it", (() => {
  for (const L of M.built) for (let i = 0; i < 300; i++) {
    if (JSON.stringify(M.gen(L)).includes("Myles")) return false;
  }
  return true;
})());

console.log("");
if (fails.length) {
  console.log(fails.length + " FAILED:");
  fails.forEach(f => console.log("  - " + f));
  process.exit(1);
}
console.log(pass + " assertions passed");
