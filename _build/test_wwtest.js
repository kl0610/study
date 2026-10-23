/* The vocabulary test rehearsals, checked as built apps.
 *
 *   node _build/test_wwtest.js
 *
 * These mirror the paper Myles actually sits: five parts, fifty points, and
 * two parts that ask him to write rather than tap. The drill app next door
 * never asked for either of those, which is why they are the ones he loses
 * marks on, so the thing this suite guards hardest is that they are still
 * there and still weighted the way the teacher weights them.
 *
 * Every check here is about the paper arithmetic or about an answer being
 * guessable without reading the question. A wrong definition is a thing a
 * human has to catch; a part that silently adds up to 48 is not.
 */
"use strict";
const fs = require("fs");
const path = require("path");

let pass = 0;
const fails = [];
const ok = (what, cond, extra) => {
  if (cond) { pass++; console.log("  ok   " + what); }
  else { fails.push(what); console.log("  FAIL " + what + (extra ? " — " + extra : "")); }
};
const G = g => console.log("\n" + g);

const ROOT = path.join(__dirname, "..");
const DIR = path.join(ROOT, "vocabulary");

/* An exam app is any vocabulary app carrying the five-part DATA. Found by
   looking, not by a list in this file: a suite that names its apps goes quiet
   the week a new one arrives, which has already happened twice here. */
const APPS = fs.readdirSync(DIR)
  .filter(d => fs.existsSync(path.join(DIR, d, "index.html")))
  .map(d => ({ dir: d, html: fs.readFileSync(path.join(DIR, d, "index.html"), "utf8") }))
  .filter(a => /"parts":\s*\[/.test(a.html) && /"total":\s*\d+/.test(a.html))
  .map(a => {
    const i = a.html.indexOf("const DATA = ");
    const b = a.html.indexOf("{", i);
    let depth = 0, end = -1;
    for (let j = b; j < a.html.length; j++) {
      if (a.html[j] === "{") depth++;
      else if (a.html[j] === "}" && !--depth) { end = j + 1; break; }
    }
    a.DATA = JSON.parse(a.html.slice(b, end));
    return a;
  });

const strip = s => String(s).replace(/<[^>]+>/g, "");
const bare = s => String(s).toLowerCase().replace(/[^a-z]/g, "");

G("what is on the shelf");
ok(APPS.length + " test rehearsal(s) built: " + APPS.map(a => a.dir).join(", "),
   APPS.length >= 1);

APPS.forEach(A => {
  const D = A.DATA;
  G(D.lesson + "  (vocabulary/" + A.dir + ")");

  /* ---- the paper's arithmetic ---- */
  const sum = D.parts.reduce((n, p) => n + p.pts, 0);
  ok("the five parts add up to the paper's " + D.total + " points", sum === D.total, "got " + sum);
  ok("...and every part's items times its per-item value is its own total",
     D.parts.every(p => p.items.length * p.each === p.pts),
     D.parts.filter(p => p.items.length * p.each !== p.pts).map(p => p.id).join(", "));
  ok("...and no two parts share an id",
     new Set(D.parts.map(p => p.id)).size === D.parts.length);

  /* ---- the two parts that cannot be tapped ---- */
  const kinds = D.parts.map(p => p.type);
  ok("there is a part that makes him write the word himself",
     kinds.indexOf("write") !== -1, kinds.join(", "));
  ok("...and a part that makes him answer in sentences",
     kinds.indexOf("say") !== -1, kinds.join(", "));
  ok("...and a part on parts of speech", kinds.indexOf("pos") !== -1, kinds.join(", "));

  /* ---- matching: the bank must not run parallel to the words ---- */
  D.parts.filter(p => p.type === "match").forEach(p => {
    const letters = p.defs.map(d => d[0]);
    ok(p.name + ": " + p.defs.length + " definitions for " + p.items.length + " words, one each",
       p.defs.length === p.items.length &&
       new Set(p.items.map(i => i.a)).size === p.items.length);
    const inorder = p.items.filter((it, i) => it.a === letters[i]).length;
    ok("..." + p.name + " cannot be answered straight down the alphabet",
       inorder <= 2, inorder + " of " + p.items.length + " words sit opposite their own letter");
  });

  /* ---- multiple choice: never the longest, never already in the sentence ---- */
  D.parts.filter(p => p.type === "pick").forEach(p => {
    const longest = p.items.filter(it =>
      it.opts[it.a].length > Math.max(...it.opts.filter((_, i) => i !== it.a).map(x => x.length)));
    ok(p.name + ": the right answer is never the longest option on offer",
       !longest.length, longest.map(it => it.opts[it.a]).join(", "));
    const leaks = p.items.filter(it =>
      new RegExp("\\b" + it.opts[it.a] + "\\b", "i").test(it.q));
    ok("..." + p.name + " never prints its own answer in the sentence",
       !leaks.length, leaks.map(it => it.opts[it.a]).join(", "));
    /* Four options and the answer always third is a pattern he will find. */
    const spread = new Set(p.items.map(it => it.a));
    ok("..." + p.name + " does not keep the answer in one position",
       spread.size >= 3, "uses positions " + [...spread].sort().join(","));
  });

  /* ---- write-the-word: the prompt must not contain the word ---- */
  D.parts.filter(p => p.type === "write").forEach(p => {
    const leaks = p.items.filter(it =>
      it.ok.some(a => new RegExp("\\b" + a + "\\b", "i").test(strip(it.q))));
    ok(p.name + ": no prompt hands over the word it is asking for",
       !leaks.length, leaks.map(it => it.ok[0]).join(", "));
    ok("..." + p.name + " accepts at least one answer for every line",
       p.items.every(it => (it.ok || []).length >= 1));
  });

  /* ---- parts of speech ---- */
  D.parts.filter(p => p.type === "pos").forEach(p => {
    ok(p.name + ": every answer is a part of speech the app offers",
       p.items.every(it => ["noun", "verb", "adjective", "adverb"].indexOf(it.a) !== -1));
    ok("..." + p.name + " bolds the word being classified",
       p.items.every(it => /<b>/.test(it.q)));
    ok("..." + p.name + " is not all one part of speech",
       new Set(p.items.map(it => it.a)).size >= 2);
  });

  /* ---- written answers: the model has to obey the rule he is held to ---- */
  D.parts.filter(p => p.type === "say").forEach(p => {
    ok(p.name + ": every question names the word he has to use",
       p.items.every(it => (it.need || []).length >= 1));
    const weak = p.items.filter(it =>
      it.need.some(w => bare(it.model).indexOf(bare(w).slice(0, 5)) === -1));
    ok("..." + p.name + " model answers use the words they demand",
       !weak.length, weak.map(it => it.need.join("+")).join(" | "));
    ok("..." + p.name + " model answers are finished sentences",
       p.items.every(it => /[.!?]$/.test(String(it.model).trim())));
    /* He marks himself against the model, so a model shorter than the rule
       the app enforces would be rejected by the app that printed it. */
    ok("..." + p.name + " model answers would themselves pass the app's own check",
       p.items.every(it => String(it.model).trim().split(/\s+/).length >= 6 &&
                           /^[A-Z]/.test(String(it.model).trim())));
  });
});

console.log("\n" + pass + " assertions passed" + (fails.length ? ", " + fails.length + " FAILED" : ""));
process.exit(fails.length ? 1 : 0);
