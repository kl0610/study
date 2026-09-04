/* Every shipped page, checked for the things that are invisible until they are not.
 *
 * This exists because the practice app went out built as a chrome-less page.
 * Those get two small fragments of mc.css; apps get the whole thing. So it had
 * no rule sizing the chest, the pets, the hearts or the hotbar, and none of the
 * rules that lay out the end-of-run notes — the chest rendered at 128 pixels,
 * the hotbar ran the width of the screen, and one note read "THE PORTAL WILL
 * NOT OPENA perfect run" because `.mc-shutportal small{display:block}` was in
 * the half it never received. One cause, four faults, and every other suite
 * passed the whole time: they check behaviour, and this was presentation.
 *
 * It also had no MC.config, so every score it recorded was filed under
 * "undefined" — which nothing would have noticed until a term of practice was
 * missing from the hub.
 *
 * So: whole-page invariants, checked for every page in the site.
 *
 *   node test_pages.js
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

/* Every index.html in the site.
   geography-quiz is not one: it is a standalone file that has to open by being
   double-clicked, with no theme layer, no engine and no hub around it. It is
   checked instead by geography-quiz/test_quiz.js, which drives it. */
const NOT_SITE = new Set(["geography-quiz"]);
function pages(dir, out) {
  out = out || [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name.startsWith("_") || e.name === "assets" || e.name === ".git") continue;
    if (NOT_SITE.has(e.name)) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) pages(p, out);
    else if (e.name === "index.html") out.push(p);
  }
  return out;
}
const FILES = pages(ROOT).map(p => ({
  rel: path.relative(ROOT, p).replace(/\\/g, "/"),
  html: fs.readFileSync(p, "utf8"),
}));

group("what is here");
ok(`${FILES.length} pages found`, FILES.length >= 20);
ok("the hub, the shop, the trophy room and the practice app are among them",
   ["index.html", "store/index.html", "trophy/index.html", "math/practice/index.html"]
     .every(r => FILES.some(f => f.rel === r)));

/* Which pages run a level has to be read from the page's OWN code, and that
   means cutting the engine out first: mc.js documents its API in a header
   comment, so a plain search for MC.chest( or MC.begin( matches every page that
   merely carries the engine — which is all of them. Two wrong guesses before
   this one. */
function own(f) {
  let h = f.html;
  const marked = h.match(/<!-- MC-THEME-JS[\s\S]*?<!-- \/MC-THEME-JS -->/);
  if (marked) h = h.replace(marked[0], "");
  const i = h.indexOf("<script>/* ===== Minecraft theme layer");
  if (i >= 0) h = h.slice(0, i) + h.slice(h.indexOf("</script>", i) + 9);
  return h;
}
const runs = FILES.filter(f => /MC\.(chest|begin)\(/.test(own(f)));
const reads = FILES.filter(f => !/MC\.(chest|begin)\(/.test(own(f)));

group("pages that run a level");
ok(`${runs.length} of them`, runs.length >= 15);
{
  const NEED = [".mc-hud{", ".mc-hearts{", ".mc-heart{", ".mc-bar{", ".mc-chest{",
                ".mc-loot", ".mc-tier", ".mc-cap", ".mc-shutportal small"];
  const short = runs.filter(f => NEED.some(r => !f.html.includes(r)));
  ok("every one has the full theme stylesheet, not a fragment of it",
     !short.length, short.map(f => f.rel).join(", "));
  const noCfg = runs.filter(f => !/<script>MC\.config\(\{"app": "[^"]+"/.test(f.html));
  ok("every one names itself to the engine", !noCfg.length, noCfg.map(f => f.rel).join(", "));
}

group("pages that only read state");
{
  const NEED = ["MC-SKIN-CSS"];
  const short = reads.filter(f => NEED.some(r => !f.html.includes(r)));
  ok("each still gets the wardrobe, so a bought theme repaints it",
     !short.length, short.map(f => f.rel).join(", "));
  ok("none of them drags in the level stylesheet it has no use for",
     reads.every(f => !f.html.includes(".mc-hearts{")),
     reads.filter(f => f.html.includes(".mc-hearts{")).map(f => f.rel).join(", "));
}

group("the engine, once and only once");
{
  const twice = FILES.filter(f => (f.html.match(/window\.MC = MC;/g) || []).length !== 1);
  ok("exactly one copy on every page", !twice.length,
     twice.map(f => f.rel + "=" + (f.html.match(/window\.MC = MC;/g) || []).length).join(", "));
  const css = FILES.filter(f => (f.html.match(/\.mc-hud\{/g) || []).length > 1);
  ok("and never two stylesheets", !css.length, css.map(f => f.rel).join(", "));
}

group("nothing is fetched at run time");
{
  const ext = FILES.filter(f => /<script src=/.test(f.html));
  ok("no page loads a script from disk", !ext.length, ext.map(f => f.rel).join(", "));
  const link = FILES.filter(f => /<link[^>]+stylesheet/.test(f.html));
  ok("no page loads a stylesheet from disk", !link.length, link.map(f => f.rel).join(", "));
}

group("every page knows where the sprites are");
{
  /* The engine falls back to "../../assets/", which is right for an app two
     directories down and wrong for everything else. The shop shipped without a
     prefix, so every sprite on it resolved outside the repo: no coin, and no
     tool in the character's hand. Nothing failed loudly — the images were just
     never there. */
  const noPrefix = [], broken = [];
  for (const f of FILES) {
    const m = f.html.match(/window\.__MC_PREFIX__="([^"]*)"/);
    if (!m) { noPrefix.push(f.rel); continue; }
    const from = path.dirname(path.join(ROOT, f.rel));
    if (!fs.existsSync(path.resolve(from, m[1], "tool-3.png"))) {
      broken.push(f.rel + " -> " + m[1]);
    }
  }
  ok("every page declares one", !noPrefix.length, noPrefix.join(", "));
  ok("and every one of them actually finds the sprites", !broken.length, broken.join(", "));
}

group("app names");
{
  const named = {};
  for (const f of FILES) {
    const m = f.html.match(/<script>MC\.config\(\{"app": "([^"]+)"/);
    if (m) (named[m[1]] = named[m[1]] || []).push(f.rel);
  }
  const dupes = Object.entries(named).filter(([, v]) => v.length > 1);
  ok("no two apps share a name, which would merge their progress",
     !dupes.length, dupes.map(([k, v]) => k + ": " + v.join(" + ")).join("; "));
  ok("no app is called undefined", !named["undefined"]);
  ok(`${Object.keys(named).length} distinct apps`, Object.keys(named).length >= 15);
}

group("three ways out of a chapter, not one");
{
  /* Leaving a chapter used to mean going out to the whole site and finding the
     subject again. The middle step goes back to the subject with its section
     already open. It is drawn by the engine from the folder the app lives in,
     so nothing has to be remembered per app. */
  const SUBJECTS = { history: "History", science: "Science", reading: "Reading",
                     spelling: "Spelling", vocabulary: "Vocabulary", math: "Math" };
  const missing = [], wrong = [];
  for (const f of runs) {
    const top = f.rel.split("/")[0];
    const want = SUBJECTS[top];
    const m = f.html.match(/"subject": "([^"]*)"/);
    if (!want) continue;
    if (!m) { missing.push(f.rel); continue; }
    if (m[1] !== want) wrong.push(f.rel + " says " + m[1]);
  }
  ok("every chapter knows which subject it belongs to", !missing.length, missing.join(", "));
  ok("and none of them is filed under the wrong one", !wrong.length, wrong.join(", "));
  ok("the engine draws the link rather than each shell carrying one",
     runs.every(f => /function subjectLink\(\)/.test(f.html)));
  ok("it waits for the header, which comes after the config call",
     runs.every(f => /readyState === "loading"[\s\S]{0,120}subjectLink/.test(f.html)));
  ok("no page that only reads state pretends to belong to a subject",
     reads.every(f => !/"subject": "\w/.test(f.html)));
}

group("the hub answers those links");
{
  const hub = FILES.find(f => f.rel === "index.html").html;
  ok("each subject is addressable", /<details class="subj" id="\$\{s\.name\.toLowerCase\(\)\}"/.test(hub));
  ok("arriving with one named opens it", /location\.hash/.test(hub) && /o\.open = \(o === d\)/.test(hub));
  ok("...and scrolls to it", /scrollIntoView/.test(hub));
}

group("links");
{
  const bad = [];
  for (const f of FILES) {
    for (const m of f.html.matchAll(/href="([^"#:]+)"/g)) {
      const href = m[1];
      if (/^(https?|mailto|data)/.test(href)) continue;
      if (href.includes("${")) continue;        // built at run time, not a literal
      const target = href.endsWith("/") ? href + "index.html" : href;
      const abs = path.resolve(path.dirname(path.join(ROOT, f.rel)), target);
      if (!fs.existsSync(abs)) bad.push(f.rel + " -> " + href);
    }
  }
  ok("every link points at a file that exists", !bad.length, bad.slice(0, 5).join("; "));
  const dirs = [];
  for (const f of FILES) {
    for (const m of f.html.matchAll(/href="([^"#:]+\/)"/g)) {
      if (!m[1].includes("${")) dirs.push(f.rel + " -> " + m[1]);
    }
  }
  /* A server resolves a directory href to its index; a file:// browser shows a
     directory listing instead, which is what opening the hub by double-click
     used to hit. */
  ok("no link names a directory rather than a file", !dirs.length, dirs.slice(0, 5).join("; "));
}

group("the footer every borrowed page owes");
{
  /* The footer is assembled from several JS string literals, so "Core Knowledge "
     and "Foundation" sit either side of a +. Splice the pieces together before
     looking, or a perfectly good attribution reads as missing. */
  const joined = f => f.html.replace(/"\s*\+\s*"/g, "");
  const ck = FILES.filter(f => /CKHG|CKSci|Core Classics/.test(f.html));
  const missing = ck.filter(f => !/Core Knowledge Foundation/.test(joined(f)));
  ok(`${ck.length} pages draw on Core Knowledge, and all of them say so`, !missing.length,
     missing.map(f => f.rel).join(", "));
}

console.log("");
if (fails.length) {
  console.log(fails.length + " FAILED:");
  fails.forEach(f => console.log("  - " + f));
  process.exit(1);
}
console.log(pass + " assertions passed");
