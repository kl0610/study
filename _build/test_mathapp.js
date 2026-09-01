/* The practice app — the parts that are not the generators.
 *
 * test_mathskills.js checks that the questions are right. This checks the app
 * around them: that the book's index reaches the page intact, that a lesson is
 * only offered when something can actually be generated for it, that the picker
 * ticks and counts the way it says it does, and that a saved set stores the
 * ticks rather than the questions — because the whole point is that opening it
 * again gives new numbers.
 *
 *   node test_mathapp.js
 */
"use strict";
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const html = fs.readFileSync(path.join(ROOT, "math", "practice", "index.html"), "utf8");
const MAP = require("./mathmap.js");
const MATH = require("./mathskills.js");
const EX = require("./mathex.js");

let pass = 0;
const fails = [];
function ok(what, cond, extra) {
  if (cond) { pass++; console.log("  ok   " + what); }
  else { fails.push(what + (extra ? " — " + extra : "")); console.log("  FAIL " + what + (extra ? " — " + extra : "")); }
}
function group(n) { console.log("\n" + n); }

group("the book's index");
ok("all 120 lessons are in it", MAP.lessons.length === 120);
ok("every lesson knows its printed page", MAP.lessons.every(L => MAP.page(L) > 0));
ok("page numbers climb with the lessons",
   MAP.lessons.every((L, i) => i === 0 || MAP.page(L) > MAP.page(MAP.lessons[i - 1])));
ok("lesson 7 is on page 45, as the book has it", MAP.page(7) === 45);
ok("every lesson has between 20 and 30 problems",
   MAP.lessons.every(L => MAP.count(L) >= 20 && MAP.count(L) <= 30));
ok("tags() returns one entry per problem",
   MAP.lessons.every(L => MAP.tags(L).length === MAP.count(L)));
ok("every tag names a real lesson number",
   MAP.lessons.every(L => MAP.tags(L).every(t => t.every(n => n >= 1 && n <= 120))));
ok("no problem reviews a later lesson, bar the one the book itself misprints", (() => {
  /* Lesson 25's problem 26 is printed "(26)" — a forward reference that cannot
     be right, and the only one among 3,573 tags. The extraction is faithful to
     the page so it is not corrected here; the app filters tags down to skills
     that exist, so that problem simply shows as not ready rather than
     generating the wrong practice. */
  const odd = [];
  MAP.lessons.forEach(L => MAP.tags(L).forEach((t, i) =>
    t.forEach(n => { if (n > L) odd.push(L + ":" + (i + 1) + "->" + n); })));
  return odd.length === 1 && odd[0] === "25:26->26";
})());
{
  const untagged = MAP.lessons.reduce((n, L) => n + MAP.tags(L).filter(t => !t.length).length, 0);
  const total = MAP.lessons.reduce((n, L) => n + MAP.count(L), 0);
  ok(`${total - untagged} of ${total} problems carry a tag`, untagged < total * 0.02);
}
ok("the known spot checks from lesson 7 hold", (() => {
  const t = MAP.tags(7);
  return JSON.stringify(t[5]) === "[6]" && JSON.stringify(t[13]) === "[3]" &&
         JSON.stringify(t[23]) === "[2,4]";
})());

/* ---------- the app's own two rules, lifted from the page ---------- */
function skillsFor(lesson, i) {
  const t = MAP.tags(lesson);
  const tag = t[i] || [];
  const raw = tag.length ? tag : [lesson];
  return raw.filter(s => MATH.has(s));
}
function ready(lesson) {
  const n = MAP.count(lesson);
  let ok2 = 0;
  for (let i = 0; i < n; i++) if (skillsFor(lesson, i).length) ok2++;
  return { of: n, ok: ok2 };
}

group("which lessons open");
ok("the page defines readiness the same way this test does",
   /function ready\(lesson\)\{[\s\S]*?skillsFor\(lesson, i\)\.length/.test(html));
{
  const live = MAP.lessons.filter(L => ready(L).ok > 0);
  const full = MAP.lessons.filter(L => ready(L).ok === ready(L).of);
  ok(`lessons 1 to 10 are completely ready (${full.filter(L => L <= 10).length} of 10)`,
     full.filter(L => L <= 10).length === 10);
  ok(`${live.length} lessons open at all, ${full.length} of them completely`, live.length >= 10);
  ok("a lesson with nothing generatable is disabled, not shown as working",
     /\$\{r\.ok\?"":" disabled"\}/.test(html));
  ok("...and says Soon rather than pretending", /r\.ok \? \(has \? "Open/.test(html));
  const late = MAP.lessons.filter(L => L > 30 && ready(L).ok === 0);
  ok(`the late lessons are honestly empty for now (${late.length} of them)`, late.length > 0);
}

group("an untagged problem is not silently dropped");
{
  let found = 0, covered = 0;
  MAP.lessons.forEach(L => {
    MAP.tags(L).forEach((t, i) => {
      if (!t.length) { found++; if (skillsFor(L, i).length || !MATH.has(L)) covered++; }
    });
  });
  ok(`${found} untagged problems exist`, found > 0);
  ok("each falls back to its own lesson rather than vanishing", covered === found);
  ok("the page says so in as many words", /treated as practising its own lesson/i.test(html)
     || /practises this lesson/i.test(html));
}

group("building a set from ticks");
{
  // lesson 7, the night this all started from: problems 6, 8, 10, 14, 16, 24
  const picks = { 6: 2, 8: 2, 10: 2, 14: 2, 16: 2, 24: 2 };
  const out = [];
  Object.keys(picks).map(Number).sort((a, b) => a - b).forEach(n => {
    MATH.forProblem(skillsFor(7, n - 1), picks[n]).forEach(q => { q.from = n; out.push(q); });
  });
  ok("six problems at two each makes twelve questions", out.length === 12);
  ok("every question says which problem it came from",
     out.every(q => picks[q.from] !== undefined));
  ok("problem 6 draws on factors, as the book tags it",
     out.filter(q => q.from === 6).every(q => q.skill === 6));
  ok("problem 14 draws on unknown numbers",
     out.filter(q => q.from === 14).every(q => q.skill === 3));
  ok("problem 24 draws on both lessons it is tagged with",
     new Set(out.filter(q => q.from === 24).map(q => q.skill)).size === 2);
  ok("every question has a worked example that exists", out.every(q => EX[q.ex]));
  ok("four is the most that can be asked for per problem",
     /data-k="\$\{k\}"/.test(html) && /\[2,3,4\]\.map/.test(html));

  // the same ticks twice must not give the same sheet
  const again = [];
  Object.keys(picks).map(Number).forEach(n => {
    MATH.forProblem(skillsFor(7, n - 1), picks[n]).forEach(q => again.push(q.q));
  });
  ok("asking again gives different questions",
     JSON.stringify(out.map(q => q.q)) !== JSON.stringify(again));
}

group("what gets saved");
ok("the ticks are saved, not the questions",
   /SAVED\[LESSON\] = \{ picks: Object\.assign\(\{\}, PICK\) \}/.test(html));
ok("the saved object holds nothing but the ticks", (() => {
  /* Read the keys of the object that is stored, rather than grepping near it.
     The first version of this matched the assignment and the line after it, and
     called a correct save wrong. */
  const m = html.match(/SAVED\[LESSON\] = \{([\s\S]*?)\};/);
  if (!m) return false;
  const keys = [...m[1].matchAll(/(\w+)\s*:/g)].map(x => x[1]);
  return keys.length === 1 && keys[0] === "picks";
})());
ok("saving is wrapped so a full or blocked localStorage cannot break the page",
   /function save\(o\)\{ try \{/.test(html) && /catch\(e\)\{\}/.test(html));
ok("a corrupt save reads as empty rather than throwing",
   /function load\(\)\{ try \{[\s\S]*?catch\(e\)\{ return \{\}; \} \}/.test(html));
ok("last time's picks can be brought back", /id="slast"/.test(html));

group("the run");
ok("hearts and coins come from the shared engine",
   /MC\.begin\(/.test(html) && /MC\.chest\(/.test(html) &&
   /MC\.wrong\(/.test(html) && /MC\.right/.test(html));
ok("a second-try correct answer is credited, not counted as a fresh win",
   /MC\[tries === 1 \? "right" : "credit"\]/.test(html));
ok("back and skip are on every question", /id="back"/.test(html) && /id="next"/.test(html));
ok("going back does not wipe what was answered",
   /function restore\(\)/.test(html) && /never answered — leave it blank/.test(html));
ok("a worked example is offered on the first miss", /id="readbtn"/.test(html));
ok("the answer is offered after three", /tries >= 3 && !\$\("reveal"\)/.test(html));
ok("finishing warns about blanks first", /still blank/.test(html) && /id="goback"/.test(html));
ok("...and can still be overridden", /id="anyway"/.test(html));
ok("the end offers another round on just the ones missed", /Practise just those/.test(html));
ok("...and new questions on the same problems", /New questions, same problems/.test(html));
ok("...and a way back to change the picks", /Change which problems/.test(html));

group("sources and names");
ok("no problem text from the book appears", !/Written Practice/.test(html));
ok("it says the numbers are different from the homework",
   /different numbers from the homework/i.test(html));
ok("it credits Saxon without claiming to reproduce it",
   /Nothing from the textbook is reproduced here/i.test(html));
ok("Myles is not in it", !html.includes("Myles"));

console.log("");
if (fails.length) {
  console.log(fails.length + " FAILED:");
  fails.forEach(f => console.log("  - " + f));
  process.exit(1);
}
console.log(pass + " assertions passed");
