/* Lessons 11–15, "Which Part Don't You Like?" — checked as a built app.
 *
 *   node _build/test_mathundo.js
 *
 * The generator solves every equation in the spec and refuses to build if the
 * spec disagrees with it. This is the second opinion required of anything that
 * puts arithmetic in front of a child: it reads the shipped file, pulls each
 * equation back out of the question text a child will actually see, works out
 * from scratch which move undoes it and what the variable is worth, and insists
 * that the option marked correct and the explanation both agree. It shares no
 * code with gen_math.py.
 *
 * The point of the app is naming the move, so that is what is checked hardest:
 * a "which move" question has to offer all four operations and mark the right
 * one, or it is teaching the wrong reflex on the night before a test.
 */
"use strict";
const fs = require("fs");
const path = require("path");
const vm = require("vm");

let pass = 0;
const fails = [];
const ok = (what, cond, extra) => {
  if (cond) { pass++; console.log("  ok   " + what); }
  else { fails.push(what); console.log("  FAIL " + what + (extra ? " — " + extra : "")); }
};
const G = g => console.log("\n" + g);

const FILE = path.join(__dirname, "..", "math", "saxon-c2-l11-15", "index.html");
const html = fs.readFileSync(FILE, "utf8");

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
const items = DATA.sets.flatMap(s => s.items.map(it => Object.assign({ set: s.id }, it)));
const picks = items.filter(it => it.type === "pick");

/* Plain text as the child reads it: entities decoded, tags gone. */
const text = s => String(s)
  .replace(/&minus;/g, "-").replace(/&divide;/g, "/").replace(/&middot;/g, "*")
  .replace(/&times;/g, "*").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&")
  .replace(/−/g, "-").replace(/÷/g, "/").replace(/·/g, "*")
  .replace(/×/g, "*")
  .replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();

const money = s => String(s).indexOf("$") !== -1;
const val = s => Number(String(s).replace(/[$,]/g, ""));
const show = (n, asMoney) => asMoney
  ? "$" + n.toFixed(2)
  : String(Math.round(n * 100) / 100);

/* ---------------------------------------------------------------------- */
/* Solve an equation from first principles. Written to the shape of the
   equation rather than to a table of patterns, so a bug here and a bug in the
   generator would have to be the same bug twice, independently. */
function solve(eq) {
  const m = eq.match(/^(.*?)=\s*(\$?[\d.,]+)\s*$/);
  if (!m) return null;
  const lhs = m[1].trim(), rhs = val(m[2]), cash = money(eq);
  const V = /[a-z]/;

  let g;
  if ((g = lhs.match(/^([a-z])\s*\+\s*(\$?[\d.,]+)$/)))         // v + b
    return { move: "subtract", by: val(g[2]), value: rhs - val(g[2]), cash };
  if ((g = lhs.match(/^(\$?[\d.,]+)\s*\+\s*([a-z])$/)))         // b + v
    return { move: "subtract", by: val(g[1]), value: rhs - val(g[1]), cash };
  if ((g = lhs.match(/^([a-z])\s*-\s*(\$?[\d.,]+)$/)))          // v - b, unknown minuend
    return { move: "add", by: val(g[2]), value: rhs + val(g[2]), cash };
  if ((g = lhs.match(/^(\$?[\d.,]+)\s*-\s*([a-z])$/)))          // b - v, unknown subtrahend
    return { move: "subtract from", by: rhs, value: val(g[1]) - rhs, cash };
  if ((g = lhs.match(/^([\d.,]+)\s*\*\s*([\d.,]+)\s*([a-z])$/)))  // j * kv
    return { move: "divide", by: val(g[1]) * val(g[2]),
             value: rhs / (val(g[1]) * val(g[2])), cash };
  if ((g = lhs.match(/^([\d.,]+)\s*([a-z])$/)))                 // kv
    return { move: "divide", by: val(g[1]), value: rhs / val(g[1]), cash };
  if ((g = lhs.match(/^([a-z])\s*\/\s*([\d.,]+)$/)))            // v / b
    return { move: "multiply", by: val(g[2]), value: rhs * val(g[2]), cash };
  if (!V.test(lhs)) return null;
  return null;
}

/* Every equation printed anywhere in a question, in reading order. */
function equationsIn(s) {
  const t = text(s);
  const out = [];
  const rx = /(?:[a-z]\s*[-+]\s*\$?[\d.,]+|\$?[\d.,]+\s*[-+]\s*[a-z]|[\d.,]+\s*\*\s*[\d.,]+\s*[a-z]|[\d.,]+[a-z]|[a-z]\s*\/\s*[\d.,]+)\s*=\s*\$?[\d.,]+/g;
  let m;
  while ((m = rx.exec(t))) out.push(m[0].trim());
  return out;
}

/* ====================================================================== */
G("what the app is");
ok("four sets, twelve questions",
   DATA.sets.length === 4 && items.length === 12, DATA.sets.length + " sets, " + items.length);
ok("every one of them is a single multiple choice, as asked",
   picks.length === 12 && picks.every(p => p.opts.length === 4),
   items.filter(i => i.type !== "pick").map(i => i.type).join(", "));
ok("the three steps are what the page leads with",
   /Find the part you don['’]t like/.test(DATA.bigQuestion) &&
   /Undo it/.test(DATA.bigQuestion) && /both/.test(DATA.bigQuestion),
   DATA.bigQuestion);
ok("eight of the twelve ask which move, not what the answer is",
   picks.filter(p => /^(Add|Subtract|Multiply|Divide)\b/.test(text(p.opts[0])) ||
                     p.opts.every(o => /both sides/.test(text(o)))).length >= 4,
   "move-naming questions");

/* ====================================================================== */
G("every equation, solved again from the question a child sees");
{
  const seen = [];
  picks.forEach((it, n) => {
    const eqs = equationsIn(it.q);
    eqs.forEach(eq => {
      const got = solve(eq);
      if (!got) { fails.push("could not solve " + eq); console.log("  FAIL could not solve " + eq); return; }
      seen.push(eq);
      const why = text(it.why);
      const answer = show(got.value, got.cash);
      /* The explanation is where the answer is stated, so that is where it has
         to be right. A wrong number here is the one a child copies down. */
      ok(eq + "  →  " + answer + ", and the explanation says so",
         why.indexOf(answer) !== -1,
         "q" + (n + 1) + " explains: " + why.slice(0, 90));
    });
  });
  ok(seen.length + " equations found and solved", seen.length >= 8, seen.join(" | "));
}

/* ====================================================================== */
G("the move marked correct is the move that undoes it");
{
  const WORD = { add: "Add", subtract: "Subtract", multiply: "Multiply", divide: "Divide" };
  let judged = 0;
  picks.forEach((it, n) => {
    const opts = it.opts.map(text);
    /* A "which move" question is one whose options are the four operations. */
    const isMove = opts.filter(o => /^(Add|Subtract|Multiply|Divide)\b/.test(o)).length === 4;
    if (!isMove) return;
    const eq = equationsIn(it.q)[0];
    const got = eq && solve(eq);
    if (!got) { fails.push("no equation to judge in q" + (n + 1)); console.log("  FAIL no equation in q" + (n + 1)); return; }
    judged++;

    ok("q" + (n + 1) + " " + eq + ": all four operations are on offer",
       new Set(opts.map(o => o.split(" ")[0])).size === 4, opts.join(" / "));
    ok("...and every option acts on both sides",
       opts.every(o => /both sides/.test(o)), opts.join(" / "));
    const want = new RegExp("^" + WORD[got.move] + "\\b");
    ok("...and the one marked right is " + WORD[got.move] + " " + got.by,
       want.test(opts[it.a]) && opts[it.a].indexOf(String(got.by)) !== -1,
       "marked: " + opts[it.a]);
  });
  ok(judged + " questions ask purely which move", judged === 5, String(judged));
}

/* ====================================================================== */
G("the questions that go all the way to an answer");
{
  let judged = 0;
  picks.forEach((it, n) => {
    const opts = it.opts.map(text);
    /* Options that are all bare numbers: the answer itself is being asked for. */
    if (!opts.every(o => /^\$?[\d.,]+$/.test(o))) return;
    const eq = equationsIn(it.q)[0];
    const got = eq && solve(eq);
    if (!got) { fails.push("no equation to judge in q" + (n + 1)); return; }
    judged++;
    ok("q" + (n + 1) + " " + eq + " = " + show(got.value, got.cash) + ", and that is the option marked right",
       opts[it.a] === show(got.value, got.cash), "marked: " + opts[it.a]);
    ok("...and no other option is also correct",
       opts.filter(o => val(o) === Math.round(got.value * 100) / 100).length === 1,
       opts.join(" / "));
  });
  ok(judged + " questions ask for the value", judged >= 3, String(judged));
}

/* ====================================================================== */
G("the Property of Zero, which is the other thing he missed");
{
  const zero = picks.filter(p => p.kind === "property of zero");
  ok("two questions on it", zero.length === 2);
  ok("the answer uses the book's own name for it",
     zero.every(z => /Property of Zero for Multiplication/.test(text(z.opts[z.a]) + " " + text(z.q))),
     zero.map(z => text(z.opts[z.a])).join(" | "));
  ok("...and says out loud that other books call it the Zero Property",
     zero.some(z => /Zero Property of Multiplication/.test(text(z.why))));
  /* The three neighbours are the whole reason this is missed, so they have to
     be the distractors rather than three unrelated words. */
  const named = zero.flatMap(z => z.opts.concat([z.why])).map(text).join(" ");
  ok("...and the three it gets confused with are all named",
     /Identity Property of Multiplication/.test(named) &&
     /Identity Property of Addition/.test(named) &&
     /Commutative Property/.test(named));
  const eqn = zero.find(z => z.opts.every(o => /=/.test(text(o))));
  if (eqn) {
    const marked = text(eqn.opts[eqn.a]);
    ok("the equation marked right really is n times zero: " + marked,
       /^(\d+)\s*\*\s*0\s*=\s*0$/.test(marked), marked);
    ok("...and the other three really are the other three properties",
       eqn.opts.map(text).filter(o => /^\d+\s*\*\s*0\s*=\s*0$/.test(o)).length === 1,
       eqn.opts.map(text).join(" / "));
  }
}

/* ====================================================================== */
G("well formed, and aimed at the homework");
{
  const bad = [];
  picks.forEach((it, n) => {
    const where = "q" + (n + 1);
    if (new Set(it.opts).size !== it.opts.length) bad.push(where + ": repeated option");
    if (!(it.a >= 0 && it.a < it.opts.length)) bad.push(where + ": answer out of range");
    if (!it.why || !it.cite || !it.kind) bad.push(where + ": missing why, cite or kind");
    const L = it.opts.map(o => text(o).length).sort((x, y) => y - x);
    if (text(it.opts[it.a]).length === L[0] && L[0] - L[1] >= 6)
      bad.push(where + ": correct option is the longest by " + (L[0] - L[1]));
    const P = DATA.passages[it.p];
    if (!P) bad.push(where + ": no worked example " + it.p);
    else if ([].concat(it.hi).some(h => P.text.join(" ").indexOf(h) === -1))
      bad.push(where + ": a highlight points at nothing");
  });
  ok("every question holds together", !bad.length, bad.join(" | "));

  const kinds = {};
  picks.forEach(p => { kinds[p.kind] = (kinds[p.kind] || 0) + 1; });
  ok("no kind is asked more than twice",
     Object.values(kinds).every(v => v <= 2),
     Object.entries(kinds).filter(e => e[1] > 2).map(e => e[0]).join(", "));
  ok("all four undo directions are covered: " +
     ["subtraction", "addition", "multiplication", "division"].join(", "),
     ["undo a subtraction", "undo an addition", "undo a multiplication", "undo a division"]
       .every(k => kinds[k] === 2), JSON.stringify(kinds));

  /* Tagged with the homework it came from, not with a lesson number that would
     read as a claim about what the page covers. */
  ok("every set names the homework problems behind it",
     DATA.sets.every(s => /#\d/.test(s.tag)) &&
     !DATA.sets.some(s => /^lessons?\s/i.test(s.tag)),
     DATA.sets.map(s => s.tag).join(" | "));
  ok("the four misses are all named somewhere: L12 #14, L14 #4, #8, #12",
     /L12 #14/.test(html) && /#4/.test(html) && /#8/.test(html) && /#12/.test(html));
}

/* ====================================================================== */
G("nothing of the homework's own numbers is reused");
{
  /* The homework problems he actually sat. Practising the same numbers is a
     second run at the same questions, not practice on the skill. */
  const HOMEWORK = ["2714", "3601", "407", "623", "2.40", "7070", "3.47", "1200", "630"];
  const body = text(JSON.stringify(DATA.sets));
  const reused = HOMEWORK.filter(n => body.indexOf(n) !== -1);
  ok("none of the homework's numbers appear in a question", !reused.length, reused.join(", "));
}

/* ====================================================================== */
G("the page runs");
{
  const scripts = [...html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g)]
    .map(m => m[1]);
  let parsed = 0;
  for (const b of scripts) {
    try { new vm.Script(b); parsed++; } catch (e) { console.log("      " + e.message); }
  }
  ok("all " + scripts.length + " inline scripts parse", parsed === scripts.length);
  ok("it is configured as math1115 with the dragon on s2",
     /"app":\s*"math1115"/.test(html) && /"dragon":\s*\["s2"\]/.test(html));
  ok("it calls itself Saxon, not a history chapter",
     /Saxon Math Course 2/.test(html) && !/Core Knowledge/.test(html));
}

console.log("\n" + pass + " assertions passed" + (fails.length ? ", " + fails.length + " FAILED" : ""));
process.exit(fails.length ? 1 : 0);
