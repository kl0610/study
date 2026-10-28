/* The explorer review, checked as a built app.
 *
 *   node _build/test_explorers.js
 *
 * This one exists because it was built the night before a test. Everything it
 * checks is either "could he get this right without knowing the book" or
 * "does this send him to the right page", because those are the two ways a
 * revision app can be worse than no revision app.
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
const DIR = path.join(ROOT, "history");

/* Found by shape, not by name: a review app is a history app whose DATA
   carries explorers and quizzes. Listing the directory by name is how a
   suite goes quiet the week a second one is built. */
const APPS = fs.readdirSync(DIR)
  .filter(d => fs.existsSync(path.join(DIR, d, "index.html")))
  .map(d => ({ dir: d, html: fs.readFileSync(path.join(DIR, d, "index.html"), "utf8") }))
  .filter(a => /"explorers":\s*\[/.test(a.html) && /"quizzes":\s*\[/.test(a.html))
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

const bare = s => String(s).toLowerCase().replace(/[^a-z0-9]/g, "");

G("what is on the shelf");
ok(APPS.length + " explorer review(s) built: " + APPS.map(a => a.dir).join(", "), APPS.length >= 1);

APPS.forEach(A => {
  const D = A.DATA;
  G(D.title + "  (history/" + A.dir + ")");
  const names = D.explorers.map(e => e.name);

  /* ---- the brief ---- */
  ok("two explorers from each of the " + D.countries.length + " countries",
     D.countries.every(c => D.explorers.filter(e => e.country === c).length === 2),
     D.countries.filter(c => D.explorers.filter(e => e.country === c).length !== 2).join(", "));
  ok("...and every explorer names the country he sailed for",
     D.explorers.every(e => D.countries.indexOf(e.country) !== -1));

  /* ---- every question is traceable to the book ---- */
  const noPage = [], noHint = [];
  D.quizzes.forEach(q => q.items.forEach(it => {
    if (!(it.page >= 1 && it.page <= 99)) noPage.push(q.id + ":" + it.q.slice(0, 30));
    if (!it.hint) noHint.push(q.id + ":" + it.q.slice(0, 30));
  }));
  ok("every question cites a page in the reader", !noPage.length, noPage.join(" | "));
  ok("...and every question has a hint behind the button", !noHint.length, noHint.join(" | "));
  const sheetPages = D.explorers.filter(e => !(e.page >= 1 && e.page <= 99));
  ok("...and so does every explorer on the study sheet", !sheetPages.length,
     sheetPages.map(e => e.name).join(", "));

  /* ---- could he guess it without the book ---- */
  D.quizzes.forEach(q => {
    const written = q.items.filter(it => it.opts);
    const longest = written.filter(it => {
      const others = it.opts.filter((_, i) => i !== it.a);
      return others.length && it.opts[it.a].length > Math.max(...others.map(o => o.length));
    });
    ok(q.name + ": the right answer is never the longest option",
       !longest.length, longest.map(it => it.opts[it.a]).join(" | "));
    const spread = new Set(written.map(it => it.a));
    ok("..." + q.name + " does not park every written answer in one slot",
       written.length < 2 || spread.size >= 2, "all at index " + [...spread].join(","));
    const leaks = q.items.filter(it => {
      const ans = it.opts ? it.opts[it.a] : it.a;
      return bare(ans).length >= 5 && bare(it.q).indexOf(bare(ans)) !== -1;
    });
    ok("..." + q.name + " never prints its own answer in the question",
       !leaks.length, leaks.map(it => it.q.slice(0, 40)).join(" | "));
  });

  /* ---- coverage: nobody is left out of either round ---- */
  D.quizzes.forEach(q => {
    const asked = new Set(q.items.map(it => q.mode === "name" ? it.a : it.who));
    const missing = names.filter(n => !asked.has(n));
    ok(q.name + " asks about all " + names.length + " explorers", !missing.length,
       missing.join(", "));
  });

  /* ---- the "who said it" round ---- */
  const byName = D.quizzes.filter(q => q.mode === "name");
  ok("there is a round that gives him the names to choose from", byName.length >= 1);
  byName.forEach(q => {
    ok(q.name + ": every answer is one of the ten names",
       q.items.every(it => names.indexOf(it.a) !== -1));
    const counts = {};
    q.items.forEach(it => counts[it.a] = (counts[it.a] || 0) + 1);
    /* The brief said explicitly that a name may answer more than once, so a
       round that happened to be one-to-one would be quietly off-brief. */
    ok("..." + q.name + " lets a name answer more than once",
       Object.values(counts).some(n => n > 1),
       "every name is used exactly once, which was not what was asked for");
  });

  /* ---- length ---- */
  const total = D.quizzes.reduce((n, q) => n + q.items.length, 0);
  ok(total + " questions in all, which is inside the fifteen minutes asked for",
     total <= 40, "about " + Math.round(total * 0.4) + " minutes");
});

console.log("\n" + pass + " assertions passed" + (fails.length ? ", " + fails.length + " FAILED" : ""));
process.exit(fails.length ? 1 : 0);
