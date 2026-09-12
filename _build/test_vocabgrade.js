/* Does the unit test mark the right answer right?
 *
 * This exists because for a while it did not. The shell builds each question's
 * options and marks the correct one with `ok: k === 0` — the first entry in the
 * item's own list. Word List 1's data was written to that rule. Word List 2's
 * carries an explicit answer index on every one of its hundred and ten items,
 * and the shell ignored it: after the options were shuffled in the source, the
 * first entry was the answer about a third of the time.
 *
 * Seventy-three of a hundred and ten questions were graded against the wrong
 * option. A child answering perfectly was told he was wrong two times in three.
 * Nothing else in the suite could see it, because every other check was about
 * whether the questions were well formed, and they were.
 *
 * So this asks the only question that matters: for every item on every form,
 * does the option the shell will mark correct agree with what the item's own
 * explanation says the answer is?
 *
 *   node test_vocabgrade.js
 */
"use strict";
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");

let pass = 0;
const fails = [];
function ok(what, cond, extra) {
  if (cond) { pass++; console.log("  ok   " + what); }
  else { fails.push(what + (extra ? " — " + extra : "")); console.log("  FAIL " + what + (extra ? " — " + extra : "")); }
}
function group(n) { console.log("\n" + n); }

const strip = t => String(t).replace(/<[^>]+>/g, "").replace(/&mdash;/g, "—")
                            .replace(/&nbsp;/g, " ").trim();
const norm = t => strip(t).replace(/\.$/, "").toLowerCase();

function readData(html) {
  const i = html.indexOf("const DATA = ");
  const b = html.indexOf("{", i);
  let d = 0;
  for (let j = b; j < html.length; j++) {
    if (html[j] === "{") d++;
    else if (html[j] === "}") { d--; if (!d) return JSON.parse(html.slice(b, j + 1)); }
  }
  throw new Error("unbalanced DATA");
}

/* The rule the shell uses to decide which option is correct. Lifted from the
   page rather than assumed, so if the page changes its mind this notices. */
function shellKey(it) { return typeof it.a === "number" ? it.a : 0; }

/* What the answer really is, worked out from the item itself and never from
   `a` — otherwise this would only be checking that a number equals itself. */
function truth(it) {
  const opts = it.opts.map(strip);
  const why = strip(it.why || "");
  const w = it.w || "";
  if (it.type === "ant") {
    const named = opts.filter(o => why.toLowerCase().includes(o.toLowerCase()));
    return named.length === 1 ? named[0] : null;
  }
  if (opts.includes(w)) return w;                    // a word-choice question
  if (why.includes("—")) {
    const d = norm(why.split("—").slice(1).join("—"));
    const hit = opts.find(o => norm(o) === d);
    if (hit) return hit;
  }
  return null;
}

const TESTS = fs.readdirSync(path.join(ROOT, "vocabulary"))
  .filter(d => d.endsWith("-test"))
  .map(d => ({ rel: "vocabulary/" + d,
               html: fs.readFileSync(path.join(ROOT, "vocabulary", d, "index.html"), "utf8") }));

group("what is here");
ok(`${TESTS.length} unit tests`, TESTS.length >= 2);
ok("each reads the answer index where an item gives one",
   TESTS.every(t => /typeof it\.a === "number" \? it\.a : 0/.test(t.html)),
   TESTS.filter(t => !/typeof it\.a === "number"/.test(t.html)).map(t => t.rel).join(", "));

for (const t of TESTS) {
  const D = readData(t.html);
  group(t.rel);

  let judged = 0, agree = 0, unknown = 0;
  const wrong = [];
  for (const it of D.pool) {
    const want = truth(it);
    if (want === null) { unknown++; continue; }
    judged++;
    const marked = strip(it.opts[shellKey(it)]);
    if (norm(marked) === norm(want)) agree++;
    else wrong.push(`${it.w}: marks "${marked.slice(0, 34)}" want "${want.slice(0, 34)}"`);
  }
  ok(`${agree} of ${judged} items mark the answer the item itself names`,
     !wrong.length, wrong.slice(0, 4).join(" | "));
  ok(`only ${unknown} could not be judged from the explanation`, unknown <= 1,
     unknown + " of " + D.pool.length);

  /* Every form, end to end: a paper answered perfectly must score perfectly. */
  for (const form of D.forms) {
    const items = form.items.map(k => D.pool[k]);
    let right = 0, n = 0;
    for (const it of items) {
      const want = truth(it);
      if (want === null) continue;
      n++;
      if (norm(strip(it.opts[shellKey(it)])) === norm(want)) right++;
    }
    ok(`${form.id}: a perfect paper scores ${right}/${n}`, right === n && n > 0);
  }

  /* The final's own blurb says every meaning on the list, once each. It did not.
     Each item was keyed on its headword rather than on its own word form, so a
     derived form shared a key with the root's first sense and the final — which
     dedups on that key — dropped it. Five of List 3's meanings and six of List
     2's never appeared in the run that calls itself comprehensive, and they were
     the derived forms, which are the whole reason those words are on the list.
     So: a form that claims to cover everything has to prove it. */
  {
    const final = D.forms.find(f => f.id === "final");
    if (final && /every meaning/i.test(String(final.blurb))) {
      const meanings = [...new Set(D.pool.filter(p => p.type === "def").map(p => p.k))];
      const asked = new Set(final.items.map(k => D.pool[k])
                                       .filter(p => p.type === "def").map(p => p.k));
      const skipped = meanings.filter(k => !asked.has(k));
      ok(`the final says every meaning, and asks all ${meanings.length} of them`,
         !skipped.length, skipped.join(", "));
      /* And the key has to tell two word forms apart, or the count above is
         blind to the very collision it exists to catch. */
      const byKey = {}, collided = [];
      D.pool.filter(p => p.type === "def").forEach(p => {
        (byKey[p.k] = byKey[p.k] || new Set()).add(p.w);
      });
      Object.keys(byKey).forEach(k => {
        if (byKey[k].size > 1) collided.push(k + " = " + [...byKey[k]].join("/"));
      });
      ok("...and no two word forms share a meaning key", !collided.length,
         collided.join(", "));
    }
  }

  /* The warm-up is one word at a time, one per headword. A headword with no
     first meaning would drop out of Sunday without anyone noticing. */
  {
    const warm = D.forms.find(f => f.id === "warm");
    if (warm) {
      const items = warm.items.map(k => D.pool[k]);
      ok(`the warm-up is ${items.length} words, one each and all first meanings`,
         items.every(p => p.type === "def" && p.first) &&
         new Set(items.map(p => p.head || p.w)).size === items.length,
         items.filter(p => !p.first).map(p => p.w).join(", "));
    }
  }

  /* A blank item hides "____" and nothing else, so a word left anywhere else in
     the sentence is the answer printed beside the question. */
  {
    const leaks = D.pool.filter(p => p.type === "blank")
      .filter(p => strip(p.q).toLowerCase().includes(String(p.w).toLowerCase()))
      .map(p => p.w);
    ok("no sentence question contains the word it is asking for", !leaks.length,
       [...new Set(leaks)].join(", "));
  }

  ok("every answer index is inside the option list",
     D.pool.every(it => shellKey(it) >= 0 && shellKey(it) < it.opts.length));
  ok("no item repeats an option",
     D.pool.every(it => new Set(it.opts.map(norm)).size === it.opts.length));
  ok("every form draws on items that exist",
     D.forms.every(f => f.items.every(k => D.pool[k])));

  /* The test is on Friday, at school. These are practice for it, and saying
     otherwise puts the weight of a real test on a child for none of the reason
     — and spends a word worth keeping for the real one. */
  {
    const body = t.html.replace(/\/\*[\s\S]*?\*\//g, "");
    ok("it calls itself practice, not a test",
       /Practice Tests<\/(title|em)>/.test(body) && !/This is a test/.test(body));
    /* "Test-ready", "Friday's test" and the book's own sentence about cheating
       on a test all point at the real one, which is the whole idea. */
    const loose = [...body.matchAll(/.{0,30}\btest\b.{0,30}/gi)]
      .map(m => m[0])
      .filter(x => !/practice test|Test-ready|Friday's test|Cheating on the test/i.test(x));
    ok("no loose talk of a test left", !loose.length, loose.slice(0, 3).join(" | "));
  }

  /* The list it says it is has to be the list it is. Chapter 4 of History
     shipped introducing itself as Chapter 3 for the same reason: a clone. */
  const want = /lesson(\d)/.exec(t.rel)[1];
  const body = t.html.replace(/\/\*[\s\S]*?\*\//g, "");     // not developer comments
  const stale = [...body.matchAll(/Word List (\d)/g)].filter(m => m[1] !== want);
  ok(`it says Word List ${want} everywhere a child can read it`,
     !stale.length, stale.length + " mentions of another list");
}

/* The same check, over the study sheets as well as the tests. Every list is
   built from the last one's shell, so a heading that is markup rather than
   data goes on naming the list it was cloned from — and List 2's sheet said
   "Word List 1" in its title from the day it shipped. Nothing here could see
   it, because this suite only ever read the -test folders. */
group("no sheet carries another list's name");
fs.readdirSync(path.join(ROOT, "vocabulary"))
  .filter(d => !d.endsWith("-test"))
  .forEach(dir => {
    const want = (dir.match(/lesson(\d+)/) || [])[1];
    if (!want) return;
    const html = fs.readFileSync(path.join(ROOT, "vocabulary", dir, "index.html"), "utf8");
    const body = html.replace(/\/\*[\s\S]*?\*\//g, "");     // not developer comments
    const stale = [...body.matchAll(/List\s*(\d+)/g)].filter(m => m[1] !== want);
    ok(dir + " names only itself", !stale.length,
       stale.map(m => m[0]).slice(0, 4).join(" | "));
  });

console.log("");
if (fails.length) {
  console.log(fails.length + " FAILED:");
  fails.forEach(f => console.log("  - " + f));
  process.exit(1);
}
console.log(pass + " assertions passed");
