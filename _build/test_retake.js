/* The second look: retaking what was missed, and the book that opens on a miss.
 *
 *   node _build/test_retake.js
 *
 * Two things, both across all twenty-six apps built on the mission shell.
 *
 * The retake. Getting a question wrong used to leave one way back — run all
 * eight again — so nothing was retried. There are two now: just the questions
 * missed, and those questions with their run-up, meaning whatever else was
 * asked about the same passage plus the question immediately before. Both are
 * correction rounds and neither may overwrite a best score.
 *
 * The book. A miss opens the passage at the place the answer is. That excerpt
 * used to come from a stored table keyed by question number, and every app is
 * generated from another app's shell, so the table came across with the shell:
 * twenty-three of twenty-six apps were quoting a different story or a different
 * chapter, and three of them could not open the panel at all because a reading
 * passage has no vocabulary list and the drawer read its length. It is derived
 * from the question's own passage now.
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

const ROOT = path.join(__dirname, "..");

function grab(html, name, open) {
  const i = html.indexOf(name);
  if (i < 0) return null;
  const b = html.indexOf(open, i);
  const shut = open === "{" ? "}" : "]";
  let d = 0;
  for (let j = b; j < html.length; j++) {
    if (html[j] === open) d++;
    else if (html[j] === shut && !--d)
      return vm.runInNewContext("(" + html.slice(b, j + 1) + ")");
  }
  return null;
}

const APPS = [];
for (const dir of ["reading", "science"]) {
  for (const d of fs.readdirSync(path.join(ROOT, dir))) {
    const rel = dir + "/" + d;
    const file = path.join(ROOT, rel, "index.html");
    if (!fs.existsSync(file)) continue;
    const html = fs.readFileSync(file, "utf8");
    if (html.indexOf("function drawer(key, exKey, mode, hi)") === -1) continue;
    APPS.push({ rel, html, DATA: grab(html, "const DATA = ", "{") });
  }
}

/* ====================================================================== */
G("what is built on the mission shell");
ok(APPS.length + " apps: " + APPS.filter(a => a.rel.startsWith("reading")).length +
   " reading, " + APPS.filter(a => a.rel.startsWith("science")).length + " science",
   APPS.length >= 26);
ok("every one of them carries the retake",
   APPS.every(a => /function leadUp\(missed\)/.test(a.html) &&
                   /function startRun\(list, partial\)/.test(a.html) &&
                   /let RUN = \[\], RUNPART = false;/.test(a.html)),
   APPS.filter(a => !/function leadUp\(missed\)/.test(a.html)).map(a => a.rel).join(", "));
ok("...and the derived excerpt",
   APPS.every(a => /function excerptFor\(key, hi\)/.test(a.html)),
   APPS.filter(a => !/function excerptFor\(key, hi\)/.test(a.html)).map(a => a.rel).join(", "));

/* The bug that broke all twenty-six at once: review.py's patches are applied
   over a file that unpatch() has stripped back to the bare shell, and one of
   the new patches kept the line it anchored on, so a rebuild added a second
   copy and the app declared `miss` twice. */
ok("no app declares the retake's locals twice",
   APPS.every(a => (a.html.match(/const miss = notClean\(\);/g) || []).length === 1),
   APPS.filter(a => (a.html.match(/const miss = notClean\(\);/g) || []).length !== 1)
       .map(a => a.rel).join(", "));
{
  let bad = 0, n = 0;
  APPS.forEach(a => {
    for (const m of a.html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g)) {
      n++;
      try { new vm.Script(m[1]); }
      catch (e) { bad++; console.log("      " + a.rel + ": " + e.message); }
    }
  });
  ok("all " + n + " inline scripts parse", !bad);
}

/* ====================================================================== */
G("the run-up is built the way it is described");
{
  /* The page's own leadUp, lifted out and run against a stub, next to the same
     rule written again here. Two programs agreeing, rather than one checking
     that a number equals itself. */
  const a = APPS.find(x => x.rel === "reading/sherlock-engineer-1") || APPS[0];
  const src = (a.html.match(/function leadUp\(missed\)\{[\s\S]*?\n\}/) || [])[0];
  ok("leadUp can be read out of " + a.rel, !!src);

  const items = a.DATA.missions[0].items;
  const mine = missed => {
    const want = new Set();
    missed.forEach(i => {
      want.add(i);
      if (i > 0) want.add(i - 1);
      items.forEach((x, j) => { if (x.p && x.p === items[i].p) want.add(j); });
    });
    let out = [...want];
    if (out.length > 6) {
      const near = j => Math.min(...missed.map(i => Math.abs(i - j)));
      const keep = new Set(missed);
      out.filter(j => !keep.has(j)).sort((x, y) => near(x) - near(y))
         .slice(0, Math.max(0, 6 - keep.size)).forEach(j => keep.add(j));
      out = [...keep];
    }
    return out.sort((x, y) => x - y);
  };

  if (src) {
    const ctx = { M: { items }, out: null };
    const script = new vm.Script(src + "\nout = cases.map(leadUp);");
    const cases = [[0], [3], [items.length - 1], [1, 4], [0, 2, 5],
                   items.map((_, i) => i)];
    ctx.cases = cases;
    script.runInNewContext(ctx);
    const disagree = cases.filter((c, k) =>
      JSON.stringify(ctx.out[k]) !== JSON.stringify(mine(c)));
    ok("the page agrees with the same rule written again, on " + cases.length + " cases",
       !disagree.length, disagree.map(c => "[" + c + "]").join(" "));

    cases.forEach((c, k) => {
      const got = ctx.out[k];
      if (!c.every(i => got.includes(i)))
        fails.push("the run-up for [" + c + "] drops a missed question");
    });
    ok("every run-up contains the questions that were missed", true);
    ok("...and never runs longer than six questions",
       ctx.out.every(o => o.length <= 6 || o.length === items.length),
       ctx.out.map(o => o.length).join(", "));
    ok("...and is in story order, never repeating a question",
       ctx.out.every(o => o.every((v, i) => i === 0 || v > o[i - 1])));
    /* The point of the run-up: for a miss that is not the first question, it
       brings in something the miss did not. */
    const one = ctx.out[1];
    ok("a single miss on question 4 pulls in its lead-in and its scene: " +
       one.map(i => i + 1).join(", "), one.length > 1);
  }
}

/* ====================================================================== */
G("a correction round is not a best score");
ok("the best is only written on a full run",
   APPS.every(a => /if\(!RUNPART\) best\[M\.id\] = Math\.max/.test(a.html)),
   APPS.filter(a => !/if\(!RUNPART\) best/.test(a.html)).map(a => a.rel).join(", "));
ok("...and the engine is told it is a partial run, so the loot is not full",
   APPS.every(a => /MC\.begin\(partial \? \{partial:true\} : undefined\)/.test(a.html)));
ok("...and the question count follows the run, not the whole mission",
   APPS.every(a => /Question \$\{idx\+1\} of \$\{RUN\.length\}/.test(a.html) &&
                   !/of \$\{M\.items\.length\}/.test(a.html)),
   APPS.filter(a => /of \$\{M\.items\.length\}/.test(a.html)).map(a => a.rel).join(", "));
ok("...and a question is filed under itself, not under where it sat in the run",
   APPS.every(a => (a.html.match(/M\.id\+"-"\+RUN\[idx\]/g) || []).length === 6 &&
                   !/M\.id\+"-"\+idx/.test(a.html)),
   APPS.filter(a => /M\.id\+"-"\+idx/.test(a.html)).map(a => a.rel).join(", "));

/* ====================================================================== */
G("the book opens at the answer, in this app's own text");
ok("no app still reads the stored excerpt table",
   APPS.every(a => !/DATA\.excerpts\[exKey\]/.test(a.html)),
   APPS.filter(a => /DATA\.excerpts\[exKey\]/.test(a.html)).map(a => a.rel).join(", "));
ok("...and the drawer no longer needs a vocabulary list to open",
   APPS.every(a => !/\$\{p\.vocab\.length\?/.test(a.html)),
   APPS.filter(a => /\$\{p\.vocab\.length\?/.test(a.html)).map(a => a.rel).join(", "));

{
  /* The real check: for every question in every app, the derived excerpt is
     non-empty and comes out of that question's own passage. This is the same
     rule the page runs, applied to the shipped data. */
  const empty = [], foreign = [];
  APPS.forEach(a => {
    const D = a.DATA;
    const items = (D.missions || []).flatMap(m => m.items || []);
    items.forEach((it, n) => {
      const p = D.passages[it.p];
      if (!p) return;
      const marks = [].concat(it.hi || []).filter(Boolean);
      let hit = (p.text || []).filter(t => marks.some(h => t.indexOf(h) !== -1));
      /* A question can turn on a definition rather than a sentence, and then the
         line it marks is in the vocabulary list rather than the text. */
      if (!hit.length)
        hit = (p.vocab || []).filter(v => marks.some(h =>
                String(v[1]).indexOf(h) !== -1 || String(v[0]).indexOf(h) !== -1))
              .map(v => v[1]);
      if (!hit.length) empty.push(a.rel + " q" + (n + 1));
      /* and it is this app's text, not a shell's leftover */
      const own = Object.values(D.passages).map(x =>
        (x.text || []).join(" ") + " " +
        (x.vocab || []).map(v => v[1]).join(" ")).join(" ");
      if (hit.some(t => own.indexOf(t) === -1)) foreign.push(a.rel + " q" + (n + 1));
    });
  });
  ok("every question has an excerpt to show when it is missed", !empty.length,
     empty.slice(0, 5).join(", "));
  ok("...and every excerpt comes from that app's own passages", !foreign.length,
     foreign.slice(0, 5).join(", "));
}

console.log("\n" + pass + " assertions passed" + (fails.length ? ", " + fails.length + " FAILED" : ""));
process.exit(fails.length ? 1 : 0);
