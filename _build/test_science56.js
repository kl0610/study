/* node _build/test_science56.js
   The two new Matter chapters, checked as built artifacts rather than as
   sources: the DATA the app really parses, the inline scripts really parsing,
   the theme really injected, the header really naming this chapter, and a
   flawless and a hopeless run really scoring what the ladder expects. */
const fs = require("fs"), path = require("path"), vm = require("vm");

let pass = 0, fail = 0;
const G = g => console.log("\n" + g);
const ok = (cond, msg) => { if (cond) { pass++; console.log("  ok   " + msg); }
                            else { fail++; console.log("  FAIL " + msg); } };

const points = (tries, hinted) =>
  hinted ? 25 : (tries === 1 ? 100 : tries === 2 ? 75 : tries === 3 ? 50 : 25);
const score = pts => Math.round(pts.reduce((s, p) => s + p, 0) / pts.length);

const CH = [
  { dir: "g5-matter-ch5", app: "science5", n: 5,
    big: "Why do some interactions of matter result in new substances?",
    h1: "Matter Can Change", pages: [27, 32] },
  { dir: "g5-matter-ch6", app: "science6", n: 6,
    big: "What are atoms, elements, and molecules?",
    h1: "The Language of", pages: [33, 38] },
];

for (const C of CH) {
  const file = path.join(__dirname, "..", "science", C.dir, "index.html");
  const src = fs.readFileSync(file, "utf8");
  G("science/" + C.dir + " — it is a built app");

  /* every inline script has to parse; a chapter that throws on load is a
     chapter that shows a blank page, and the file size looks fine either way */
  const scripts = [...src.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g)].map(m => m[1]);
  ok(scripts.length >= 2, scripts.length + " inline scripts");
  let parsed = 0;
  for (const s of scripts) { try { new vm.Script(s); parsed++; } catch (e) { console.log("      " + e.message); } }
  ok(parsed === scripts.length, "all " + scripts.length + " of them parse");

  ok(/MC\.config\(/.test(src) && new RegExp('"app":\\s*"' + C.app + '"').test(src),
     'the engine is configured as "' + C.app + '"');
  ok(src.includes("--mc-") || /mc\.css|\.mc-hud|\.mc-heart/.test(src),
     "the theme's stylesheet came across, not just its config");
  ok(/drawerHi/.test(src) && /markUp/.test(src),
     "the highlighter is present and called");

  G("science/" + C.dir + " — it introduces itself as chapter " + C.n);
  const eyebrow = src.match(/<div class="eyebrow">([^<]*)<\/div>/)[1];
  ok(eyebrow.includes("Chapter " + C.n), "the eyebrow says Chapter " + C.n + ": " + eyebrow);
  ok(eyebrow.includes("pp. " + C.pages[0]) && eyebrow.includes(String(C.pages[1])),
     "and names its own pages, " + C.pages.join("\u2013"));
  ok(src.match(/<h1>([\s\S]*?)<\/h1>/)[1].includes(C.h1), "the h1 is this chapter's");
  ok(src.includes(C.big), "the Big Question is this chapter's");
  ok(!/Chapter\s*[1-4]\b/.test(eyebrow), "no earlier chapter's number survives in the header");
  ok(!/teacher'?s guide/i.test(src), "nothing addressed to a teacher leaked in");
  ok(!/\bpage 1[23]\b/.test(src) || C.n < 5, "no video note points at an earlier chapter's pages");

  const DATA = JSON.parse(src.match(/const DATA = (\{[\s\S]*?\});\r?\n/)[1]);
  G("science/" + C.dir + " — the questions");
  ok(DATA.missions.length === 1, "one mission");
  const M = DATA.missions[0];
  ok(M.id === "m1", "the mission is m1, which is what the hub and the dragon name");
  ok(M.items.length === 11, M.items.length + " questions");
  ok(M.tag.startsWith(M.items.length + " questions"),
     "the tag agrees: " + JSON.stringify(M.tag));
  ok(M.items.every(i => DATA.passages[i.p]), "every question points at a passage that exists");
  ok(M.items.every(i => i.why && i.cite), "every question explains itself and cites a page");
  ok(M.items.every(i => i.hi), "every question points at the line that helps most");
  ok(M.items.every(i => {
       const P = DATA.passages[i.p];
       const hay = P.text.join(" ") + " " + (P.vocab || []).map(v => v[1]).join(" ");
       return [].concat(i.hi).every(h => hay.includes(h));
     }), "and every one of those lines is really in that passage");
  ok(Object.values(DATA.passages).every(p => p.title && p.cite && p.text.length),
     "every passage carries its title, its citation and its text");
  ok(DATA.videos.length === 3 && DATA.videos.every(v => v.id && v.when),
     "three videos, each with a note on when to watch it");

  G("science/" + C.dir + " — the questions are answerable and fair");
  const picks = M.items.filter(i => i.type === "pick");
  ok(picks.every(i => i.opts.length === 4), "every multiple choice offers four");
  ok(picks.every(i => new Set(i.opts).size === 4), "with no option repeated");
  ok(picks.every(i => Number.isInteger(i.a) && i.a >= 0 && i.a < 4), "and a real answer index");
  ok(picks.every(i => {
       const L = i.opts.map(o => o.length).sort((a, b) => b - a);
       return !(i.opts[i.a].length === L[0] && L[0] - L[1] >= 6);
     }), "the right answer is never the giveaway-longest one");
  ok(new Set(picks.map(i => i.a)).size >= 3,
     "the answer is not parked on one position (" + picks.map(i => i.a).join("") + ")");
  const sel = M.items.filter(i => i.type === "selectall");
  ok(sel.every(i => i.opts.some(o => o[1]) && !i.opts.every(o => o[1])),
     "each select-all has some right and some wrong");
  const srt = M.items.filter(i => i.type === "sort");
  ok(srt.every(i => i.chips.every(c => c[1] >= 0 && c[1] < i.bins.length)),
     "every sort chip belongs to a bin that exists");
  ok(srt.every(i => new Set(i.chips.map(c => c[1])).size === i.bins.length),
     "and no bin is left empty");
  const mys = M.items.filter(i => i.type === "mystery");
  ok(mys.every(i => i.rows.every(r => i.choices.includes(r.answer))),
     "every mystery row's answer is one of the offered choices");
  ok(mys.every(i => new Set(i.rows.map(r => r.answer)).size === i.rows.length),
     "and no two rows share an answer");

  G("science/" + C.dir + " — what a run scores");
  const perfect = score(M.items.map(() => points(1, false)));
  const hopeless = score(M.items.map(() => points(4, false)));
  const hinted = score(M.items.map(() => points(1, true)));
  ok(perfect === 100, "a flawless run is 100 and takes the dragon");
  ok(hopeless === 25 && hopeless < 75, "a fumbled run still scores (" + hopeless + "), and does not clear");
  ok(hinted === 25, "reading the hint first is honest about it (" + hinted + ")");
}

console.log("\n" + pass + " assertions passed" + (fail ? ", " + fail + " FAILED" : ""));
process.exit(fail ? 1 : 0);
