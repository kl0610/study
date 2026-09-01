/* Every question that opens a passage must point at a line in it.
 *
 * Opening the source without marking anything just moves the problem: a child
 * who could not answer the question is not obviously better placed to find the
 * answer in four paragraphs. History learned this first, then Math; Science and
 * Reading opened the whole page and marked nothing on it for months.
 *
 * The failure worse than no highlight is one that matches nothing — it marks
 * the page as helpful, marks nothing on it, and sends him hunting for a
 * sentence that is not there. That is what this mostly exists to prevent, and
 * it is checked against the shipped file rather than against the data that
 * built it.
 *
 *   node test_highlights.js
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

function readData(html) {
  const i = html.indexOf("const DATA = ");
  if (i < 0) return null;
  const b = html.indexOf("{", i);
  let d = 0;
  for (let j = b; j < html.length; j++) {
    if (html[j] === "{") d++;
    else if (html[j] === "}") { d--; if (!d) { try { return JSON.parse(html.slice(b, j + 1)); } catch (e) { return null; } } }
  }
  return null;
}

function apps() {
  const out = [];
  for (const sub of ["science", "reading", "history", "math"]) {
    const dir = path.join(ROOT, sub);
    if (!fs.existsSync(dir)) continue;
    for (const d of fs.readdirSync(dir)) {
      const f = path.join(dir, d, "index.html");
      if (fs.existsSync(f)) out.push({ rel: sub + "/" + d, html: fs.readFileSync(f, "utf8") });
    }
  }
  return out;
}

const APPS = apps();
group("what carries a passage");
const withPassages = APPS.filter(a => { const D = readData(a.html); return D && D.passages; });
ok(`${withPassages.length} apps ship passages`, withPassages.length >= 16);
{
  /* Named rather than counted, so a chapter losing its passages shows up as
     that chapter and not as a number quietly going down by one. History 2 and 3
     were the last two without any; they have them now. */
  const missing = APPS.filter(a => !withPassages.includes(a) && /MC\.chest\(/.test(a.html)
                                   && a.rel !== "math/practice");
  ok("every app that runs a level has passages behind it",
     !missing.length, missing.map(a => a.rel).join(", "));
}

group("every one of them can mark a line");
{
  const noMarker = withPassages.filter(a => !/function markUp\(/.test(a.html));
  ok("each has the highlighter", !noMarker.length, noMarker.map(a => a.rel).join(", "));
  const noCss = withPassages.filter(a => !/mark\.hl\{|mark\.hl,/.test(a.html));
  ok("each has the style that makes a mark visible", !noCss.length, noCss.map(a => a.rel).join(", "));
  const notWired = withPassages.filter(a => !/markUp\([^)]*\)/.test(a.html));
  ok("each actually calls it when drawing the passage", !notWired.length,
     notWired.map(a => a.rel).join(", "));
}

group("every question points at something, and it is there");
{
  let items = 0, tagged = 0;
  const untagged = [], unresolved = [];
  for (const a of withPassages) {
    const D = readData(a.html);
    const sets = D.missions || D.sets || [];
    for (const s of sets) {
      for (const it of (s.items || [])) {
        if (it.type === "build") continue;
        items++;
        if (!it.hi) { untagged.push(a.rel + " " + (it.p || "?")); continue; }
        tagged++;
        /* Two shapes in the wild: most items name one passage in `p`, and
           Chapter 1 — the older shell — lists several in `passages`. */
        const keys = it.p ? [it.p] : (it.passages || []);
        const parts = keys.map(k => D.passages[k]).filter(Boolean);
        if (!parts.length) { unresolved.push(a.rel + ": no passage " + JSON.stringify(keys)); continue; }
        const hay = parts.map(P =>
          (Array.isArray(P.text) ? P.text.join(" ") : String(P.text || "")) + " " +
          (P.vocab || []).map(v => (Array.isArray(v) ? v.join(" ") : v)).join(" ")).join(" ");
        for (const h of (Array.isArray(it.hi) ? it.hi : [it.hi])) {
          if (!hay.includes(h)) unresolved.push(a.rel + ": " + JSON.stringify(h.slice(0, 46)));
        }
      }
    }
  }
  ok(`${tagged} of ${items} questions name the line that answers them`,
     !untagged.length, untagged.slice(0, 6).join("; "));
  /* This is the one that matters. */
  ok("every highlight is findable in the passage it points at",
     !unresolved.length, unresolved.slice(0, 5).join("; "));
}

group("the highlights are pointers, not paragraphs");
{
  const tooLong = [], tooMany = [], fragments = [];
  for (const a of withPassages) {
    const D = readData(a.html);
    for (const s of (D.missions || D.sets || [])) {
      for (const it of (s.items || [])) {
        if (!it.hi) continue;
        const list = Array.isArray(it.hi) ? it.hi : [it.hi];
        if (list.length > 4) tooMany.push(a.rel + " (" + list.length + ")");
        for (const h of list) {
          if (h.length > 300) tooLong.push(a.rel + ": " + h.length + " chars");
          /* A sentence split at "Mrs." leaves a fragment that is technically in
             the passage and reads as a mistake. */
          if (/\b(Mr|Mrs|Ms|Dr|St|Prof)\.$/.test(h)) fragments.push(a.rel + ": " + h.slice(-40));
        }
      }
    }
  }
  ok("none marks more than four things", !tooMany.length, tooMany.join(", "));
  ok("none marks a whole slab of text", !tooLong.length, tooLong.slice(0, 4).join(", "));
  ok("none ends mid-name on an abbreviation", !fragments.length, fragments.slice(0, 4).join(", "));
}

console.log("");
if (fails.length) {
  console.log(fails.length + " FAILED:");
  fails.forEach(f => console.log("  - " + f));
  process.exit(1);
}
console.log(pass + " assertions passed");
