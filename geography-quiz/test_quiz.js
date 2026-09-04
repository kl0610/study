/* The geography quiz, actually clicked.
 *
 *   node test_quiz.js
 *
 * It runs the real index.html's script in a small DOM and asserts on what the
 * page renders, not on what its source says. What it is watching for is the
 * class of fault that reads fine and plays wrong: a wrong answer coming round
 * again, a marker whose hit circle overlaps its neighbour so the tap answers a
 * different country, a score that counts a second-attempt match as a first-try
 * one, or "Retry missed only" handing back a round that is not the missed ones.
 */
"use strict";
const fs = require("fs");
const path = require("path");
const vm = require("vm");
const { boot, find, byId } = require("../_build/domshim.js");

let pass = 0;
const fails = [];
const ok = (what, cond, extra) => {
  if (cond) { pass++; console.log("  ok   " + what); }
  else { fails.push(what); console.log("  FAIL " + what + (extra ? " — " + extra : "")); }
};
const G = g => console.log("\n" + g);

const HTML = fs.readFileSync(path.join(__dirname, "index.html"), "utf8");

/* ---------------------------------------------------------------- loading */
function load(referrer) {
  const { doc, body } = boot(["modeseg", "dirseg", "dirgrp", "region", "teacher",
    "scoren", "scored", "zin", "zout", "zlvl", "zreset", "magbtn", "maphint",
    "viewport", "canvas", "mapimg", "overlay", "panel", "lens", "live",
    "sofar", "tohub", "reggrp"], true);

  /* The page's own markup for the things it reaches into. boot() only makes
     empty divs, so the pieces that must be real elements are built here. */
  byId(body, "modeseg").innerHTML =
    '<button data-mode="match" aria-pressed="true">Matching</button>' +
    '<button data-mode="mc" aria-pressed="false">Multiple choice</button>' +
    '<button data-mode="type" aria-pressed="false">Type it</button>' +
    '<button data-mode="region" aria-pressed="false">Regions</button>';
  /* the map is a real img, because the teacher toggle swaps its src */
  byId(body, "mapimg").kids = [];
  byId(body, "mapimg").tagName = "img";
  byId(body, "mapimg").setAttribute("src", "latin_america_quiz_map.png");
  /* the way back starts hidden in the markup, as it does in the file */
  byId(body, "tohub").hidden = true;
  doc.referrer = referrer || "";
  byId(body, "dirseg").innerHTML =
    '<button data-dir="n2m" aria-pressed="true">Name to Map</button>' +
    '<button data-dir="m2n" aria-pressed="false">Map to Name</button>';

  const geom = { width: 700, height: 726, left: 0, top: 0, right: 700, bottom: 726 };
  [byId(body, "viewport"), byId(body, "canvas"), byId(body, "mapimg")].forEach(el => {
    el.getBoundingClientRect = () => geom;
    el.clientWidth = geom.width; el.clientHeight = geom.height;
    el.offsetWidth = geom.width; el.offsetHeight = geom.height;
  });

  const ctx = {
    document: doc, console,
    innerWidth: 1200, innerHeight: 900,
    /* no referrer: the double-clicked case, where the way back must stay hidden */
    addEventListener() {}, removeEventListener() {}, scrollTo() {},
    matchMedia: () => ({ matches: false }),
    setTimeout: fn => { fn(); return 0; }, clearTimeout() {},
    Math, JSON, Date, Number, String, Object, Array, Set, Map,
    isFinite, RegExp, Intl, parseInt, parseFloat,
  };
  ctx.window = ctx;
  vm.createContext(ctx);
  const code = HTML.match(/<script>([\s\S]*?)<\/script>/)[1];
  vm.runInContext(code, ctx, { timeout: 20000 });
  /* The page declares everything with const, which lands in the realm's lexical
     scope rather than on the context object — so it is read back by evaluating
     a second script in the same context, which can see those bindings. */
  const G = vm.runInContext(
    "({COUNTRIES, BY, S, GROUP, REGIONS, AREAS, AREA, UNPLACED, judgeTyped, norm})", ctx);

  return {
    ctx: G, body,
    S: G.S, C: G.COUNTRIES, BY: G.BY,
    $: id => byId(body, id),
    q: s => find(body, s),
    panel: () => byId(body, "panel").innerHTML,
    marker: n => find(body, '.mk[data-n="' + n + '"]')[0] || null,
    setMode(m) { find(byId(body, "modeseg"), 'button[data-mode="' + m + '"]')[0]
      .parentNode.onclick({ target: find(byId(body, "modeseg"), 'button[data-mode="' + m + '"]')[0],
                            preventDefault() {} }); },
    setDir(d) { const b = find(byId(body, "dirseg"), 'button[data-dir="' + d + '"]')[0];
      byId(body, "dirseg").onclick({ target: b, preventDefault() {} }); },
  };
}

/* The shim has no closest(); the two segmented controls delegate with it, so
   they are given one that walks the parents the same way. */
function withClosest(P) {
  P.q("button").concat(P.q("div"), P.q("span")).forEach(el => {
    el.closest = sel => {
      let n = el;
      while (n) {
        try { if (n.attr && matchesSel(n, sel)) return n; } catch (e) { /* not an element */ }
        n = n.parent;
      }
      return null;
    };
  });
}
function matchesSel(n, sel) {
  /* Both shapes the page delegates with: [data-mode="mc"] and the bare
     [data-dir] with no value. */
  const m = sel.match(/^([a-z]+)?\[([\w-]+)(?:="([^"]*)")?\]$/);
  if (!m) return false;
  if (m[1] && n.tagName !== m[1]) return false;
  const have = n.getAttribute(m[2]);
  if (have === undefined || have === null) return false;
  return m[3] === undefined || have === m[3];
}

/* ====================================================================== */
G("the answer key survives the trip into the page");
{
  const P = load();
  ok("all 24 countries are there", P.C.length === 24);
  ok("the numbers run 1 to 24 with no gaps",
     P.C.map(c => c.n).sort((a, b) => a - b).join() ===
     Array.from({ length: 24 }, (_, i) => i + 1).join());
  ok("every name is distinct", new Set(P.C.map(c => c.name)).size === 24);
  ok("every marker is inside the image",
     P.C.every(c => c.x > 0 && c.x < 1387 && c.y > 0 && c.y < 1438));
  const spot = { 1: "Mexico", 11: "Panama", 18: "Brazil", 24: "French Guiana" };
  ok("the numbers still name the right countries",
     Object.keys(spot).every(n => P.BY[n].name === spot[n]));

  G("the hit circles cannot answer for each other");
  let worst = null;
  P.C.forEach(a => P.C.forEach(b => {
    if (a.n >= b.n) return;
    const d = Math.hypot(a.x - b.x, a.y - b.y);
    const over = a.hit + b.hit - d;
    if (!worst || over > worst.over) worst = { a, b, d, over };
  }));
  ok("no two hit circles overlap", worst.over <= 0,
     "closest pair " + worst.a.n + "/" + worst.b.n + " gap " + Math.round(worst.d) +
     "px, radii " + Math.round(worst.a.hit) + "+" + Math.round(worst.b.hit));
  ok("none is smaller than the printed circle", P.C.every(c => c.hit >= 22));
  ok("the roomy ones are properly big", P.BY[18].hit >= 50 && P.BY[1].hit >= 50);

  G("the regions account for every country exactly once");
  const groups = ["mca", "car", "nsa", "ssa"];
  const seen = P.C.map(c => c.n).map(n => P.ctx.GROUP[n]);
  ok("every country is in one of the four", seen.every(g => groups.indexOf(g) !== -1));
  const counts = {}; seen.forEach(g => { counts[g] = (counts[g] || 0) + 1; });
  ok("the four add up to 24 (" + groups.map(g => counts[g]).join("+") + ")",
     groups.reduce((s, g) => s + counts[g], 0) === 24);
}

/* ====================================================================== */
G("matching, name to map");
{
  const P = load(); withClosest(P);
  ok("it opens in matching mode", P.S.mode === "match" && P.S.dir === "n2m");
  ok("all 24 are in play", P.S.pool.length === 24);
  ok("a marker exists for every one", P.q(".mk").length === 24);
  ok("the prompt names a country, not a number",
     /Find <em>[A-Z]/.test(P.panel()));
  ok("the list hides the numbers — they are the answer",
     P.q(".name").length === 24 && P.q(".name .num").length === 0);
  ok("nothing on the map is ringed yet", P.q(".ring").length === 0);

  const target = P.S.current;
  const wrong = P.S.pool.find(n => n !== target);

  P.marker(wrong).onclick();
  ok("a wrong marker does not match anything", P.S.matched.size === 0);
  ok("...and it counts as a try", P.S.tries[target] === 1);
  ok("...and it says so plainly, not as a tally of tries",
     /Incorrect\. Try again/.test(P.panel()) && !/1 try/.test(P.panel()));
  ok("...and nothing is revealed", !new RegExp(P.BY[wrong].name + "</span>[^<]*<span class=\"num\"").test(P.panel()));
  ok("...and the question has not moved on", P.S.current === target);

  P.marker(target).onclick();
  ok("the right marker matches", P.S.matched.has(target));
  ok("...but a second-try match is not a first-try score", P.S.gotFirst.size === 0);
  ok("...and the round moves on", P.S.current !== target);
  ok("...and that marker is now locked",
     P.marker(target).classList.contains("locked"));
  ok("...and its name is greyed out in the list",
     P.q(".name.done").length === 1);

  const second = P.S.current;
  P.marker(second).onclick();
  ok("a first-try match does score", P.S.gotFirst.has(second));
  ok("the score readout agrees", P.$("scoren").textContent === "1");

  G("...and it plays through to the end");
  let guard = 0;
  while (P.S.current != null && guard++ < 60) P.marker(P.S.current).onclick();
  ok("every pair gets matched", P.S.matched.size === 24, "matched " + P.S.matched.size);
  ok("the round is over", P.S.done === true);
  ok("the results appear", !!P.$("results"));
  /* one was answered on the second try, the other 23 first time */
  ok("23 of 24 on the first try", P.S.gotFirst.size === 23, "got " + P.S.gotFirst.size);
  ok("the percentage is right (96%)", /\b96%/.test(P.$("results").innerHTML));
  ok("the one that took two goes is listed",
     P.$("results").innerHTML.indexOf(P.BY[target].name) !== -1);
  ok("...and only that one", P.q(".missed li").length === 1);

  G("retry missed only");
  P.$("retry").onclick();
  ok("the new round is just the missed one", P.S.pool.length === 1 && P.S.pool[0] === target);
  ok("the map only offers that marker", P.q(".mk").length === 1);
  ok("the score is back to zero of one", P.$("scoren").textContent === "0");
  ok("the results sheet is gone", !P.$("results"));
}

/* ====================================================================== */
G("the student picks what to work on");
{
  const P = load(); withClosest(P);

  G("...from the list, in Name to Map");
  const offered = P.S.current;
  const wanted = P.S.pool.find(n => n !== offered);
  ok("the list is tappable, not just readable",
     P.q('.name[data-n="' + wanted + '"]')[0].disabled === false);
  P.q('.name[data-n="' + wanted + '"]')[0].onclick();
  ok("tapping a country makes it the question", P.S.current === wanted);
  ok("...and the prompt says so", P.panel().indexOf(P.BY[wanted].name) !== -1);
  ok("...and it is the row highlighted", P.q(".name.on").length === 1 &&
     +P.q(".name.on")[0].getAttribute("data-n") === wanted);
  ok("choosing costs nothing", (P.S.tries[wanted] || 0) === 0 &&
     (P.S.tries[offered] || 0) === 0 && P.S.matched.size === 0);
  ok("...and gives nothing away — still no numbers in the list",
     P.q(".name .num").length === 0);
  ok("...and nothing is ringed on the map", P.q(".ring").length === 0);
  P.marker(wanted).onclick();
  ok("the one the student picked is the one that gets matched",
     P.S.matched.has(wanted) && P.S.gotFirst.has(wanted));
  ok("the one the program had offered is untouched",
     !P.S.matched.has(offered) && (P.S.tries[offered] || 0) === 0);

  G("...and from the map, in Map to Name");
  const Q = load(); withClosest(Q);
  Q.setDir("m2n");
  const shown = Q.S.current;
  const pick = Q.S.pool.find(n => n !== shown);
  Q.marker(pick).onclick();
  ok("tapping a marker makes it the question", Q.S.current === pick);
  ok("...and the ring moves to it", Q.q(".ring").length === 1);
  ok("...and it is not treated as an answer",
     Q.S.matched.size === 0 && (Q.S.tries[shown] || 0) === 0 && (Q.S.tries[pick] || 0) === 0);
  ok("...and the prompt asks for that number",
     new RegExp("number <em>" + pick + "</em>").test(Q.panel()));
  ok("no row in the list is singled out, so the answer is still hidden",
     Q.q(".name.on").length === 0);
  Q.q('.name[data-n="' + pick + '"]')[0].onclick();
  ok("answering in the list matches the one that was picked",
     Q.S.matched.has(pick) && Q.S.gotFirst.has(pick));

  G("...but an answered one cannot be picked again");
  const settled = Q.S.current;
  ok("a matched marker is locked", Q.marker(pick).classList.contains("locked"));
  Q.marker(pick).onclick();
  ok("...and tapping it changes nothing", Q.S.current === settled);
  ok("...and its row is greyed and disabled",
     Q.q('.name[data-n="' + pick + '"]')[0].disabled === true);
}

/* ====================================================================== */
G("matching, map to name");
{
  const P = load(); withClosest(P);
  P.setDir("m2n");
  ok("the direction took", P.S.dir === "m2n");
  ok("the prompt names a number now", /number <em>\d+<\/em>/.test(P.panel()));
  ok("the marker being asked about is ringed", P.q(".ring").length === 1);
  ok("the list shows its numbers now", P.q(".name .num").length === 24);
  /* The map is live here, but for choosing which number to identify — never
     for answering. Answering in this direction happens in the list. */
  ok("the map is touchable", P.$("overlay").classList.contains("live"));
  ok("...but tapping a marker never answers anything",
     (P.marker(P.S.pool.find(n => n !== P.S.current)).onclick(),
      P.S.matched.size === 0 && Object.values(P.S.tries).every(t => !t)));

  const target = P.S.current;
  const wrong = P.S.pool.find(n => n !== target);
  P.q('.name[data-n="' + wrong + '"]')[0].onclick();
  ok("a wrong name does not match", P.S.matched.size === 0);
  ok("...and it counts", P.S.tries[target] === 1);
  ok("...and it says Incorrect against the question",
     /Incorrect\. Try again/.test(P.panel()));

  /* The reason the count sits against the question and not in the list. Only
     the open question ever carries attempts, so a per-row badge would have
     appeared on exactly one row — the one holding the answer. */
  const shape = el => el.children.map(k => k.attr.class || k.tagName).join("|");
  ok("every row in the list is built the same, so none is singled out",
     new Set(P.q(".name").map(shape)).size === 1,
     [...new Set(P.q(".name").map(shape))].join("  vs  "));
  ok("and no row mentions a try or a miss",
     P.q(".name").every(el => !/Incorrect|\btr(y|ies)\b/i.test(el.innerHTML)));
  P.q('.name[data-n="' + target + '"]')[0].onclick();
  G("...and the list stays where it was left");
  /* The list is long enough to scroll and is redrawn after every answer. If the
     redraw loses the scroll position, a child who tapped a name near the bottom
     is thrown back to the top and has to find their place again. */
  P.q(".list")[0].scrollTop = 420;
  const wrong2 = P.S.pool.find(n => n !== P.S.current);
  P.q('.name[data-n="' + wrong2 + '"]')[0].onclick();
  ok("a wrong answer does not scroll it back to the top",
     P.q(".list")[0].scrollTop === 420, "at " + P.q(".list")[0].scrollTop);

  P.q(".list")[0].scrollTop = 260;
  ok("the right name matches",
     (P.q('.name[data-n="' + target + '"]')[0].onclick(), P.S.matched.has(target)));
  ok("...and a right answer does not either",
     P.q(".list")[0].scrollTop === 260, "at " + P.q(".list")[0].scrollTop);
  ok("...and the ring has moved to the next marker", P.q(".ring").length === 1);
}

/* ====================================================================== */
G("multiple choice");
{
  const P = load(); withClosest(P);
  P.setMode("mc");
  ok("the mode took", P.S.mode === "mc");
  ok("the direction toggle is put away", P.$("dirgrp").hidden === true);
  ok("four options are offered", P.q(".opt").length === 4);
  ok("the marker is ringed", P.q(".ring").length === 1);
  ok("no marker is locked in a quiz round", P.q(".mk.locked").length === 0);

  const target = P.S.current;
  const names = P.q(".opt").map(o => o.textContent);
  ok("the right answer is among them", names.indexOf(P.BY[target].name) !== -1);
  ok("no option is repeated", new Set(names).size === 4);
  const sameRegion = P.q(".opt")
    .map(o => P.C.find(c => c.name === o.textContent))
    .filter(c => c && P.ctx.GROUP[c.n] === P.ctx.GROUP[target]).length;
  ok("the wrong ones come from the same region where there are enough",
     sameRegion === 4 || P.ctx.REGIONS.find(r => r.key === P.ctx.GROUP[target]).ns.length < 4,
     sameRegion + " of 4 from " + P.ctx.GROUP[target]);

  const bad = P.q(".opt").find(o => o.textContent !== P.BY[target].name);
  bad.onclick();
  ok("answering wrong gives the answer straight away",
     /Not quite/.test(P.panel()) && P.panel().indexOf(P.BY[target].name) !== -1);
  ok("...and it is not scored", !P.S.gotFirst.has(target));
  ok("...and the options lock", P.q(".opt").every(o => o.disabled === true));

  /* The fault this whole suite exists for. */
  P.$("next").onclick();
  ok("a question answered wrong does NOT come round again", P.S.current !== target,
     "still on " + target);

  G("...and it plays through to the end");
  let guard = 0;
  while (P.S.current != null && guard++ < 60) {
    const right = P.q(".opt").find(o => o.textContent === P.BY[P.S.current].name);
    right.onclick();
    const nx = P.$("next"); if (!nx) break;
    nx.onclick();
  }
  ok("every number was asked exactly once", P.S.matched.size === 24);
  ok("the round finishes", P.S.done === true && !!P.$("results"));
  ok("23 of 24, the one deliberately fumbled missing", P.S.gotFirst.size === 23);
  ok("that one is the only thing listed as missed", P.q(".missed li").length === 1);
  ok("...and it is named", P.$("results").innerHTML.indexOf(P.BY[target].name) !== -1);
}

/* ====================================================================== */
G("typing, and how forgiving it is");
{
  const P = load(); withClosest(P);
  P.setMode("type");
  const judge = P.ctx.judgeTyped, BY = P.BY;
  const yes = (typed, n) => ok('"' + typed + '" is accepted for ' + BY[n].name,
                               judge(typed, BY[n]) === true);
  const no  = (typed, n) => ok('"' + typed + '" is refused for ' + BY[n].name,
                               judge(typed, BY[n]) === false);

  yes("brazil", 18); yes("BRAZIL", 18); yes("  Brazil ", 18); yes("brasil", 18);
  yes("mexico", 1); yes("México", 1);
  yes("Dominican Republic", 4); yes("dr", 4); yes("D.R.", 4); yes("dominican rep", 4);
  yes("El Salvador", 8); yes("salvador", 8); yes("el salvador", 8);
  yes("Peru", 16); yes("Perú", 16);
  yes("Panamá", 11);
  yes("Haïti", 3);
  yes("puerto rico", 5); yes("PR", 5);
  yes("suriname", 23); yes("surinam", 23);
  yes("french guiana", 24); yes("guyane", 24); yes("French Guyana", 24);
  yes("guyana", 13);
  yes("columbia", 14);            /* the spelling half of America uses */
  yes("nicaragau", 9);            /* one letter out, and nothing else is close */

  no("guyana", 24);               /* Guyana is not French Guiana */
  no("french guiana", 13);
  no("chile", 21); no("brazil", 18 === 18 ? 21 : 21);
  no("", 18); no("south america", 18); no("bra", 18);
  no("salvador", 6);              /* an alias only counts for its own country */

  G("...and a typed round runs");
  const target = P.S.current;
  P.$("answer").value = BY[target].name;
  P.$("check").onclick();
  ok("a right answer is taken", P.S.gotFirst.has(target));
  ok("the feedback names the country", P.panel().indexOf(BY[target].name) !== -1);
  P.$("next").onclick();
  ok("it moves on", P.S.current !== target);
  const t2 = P.S.current;
  P.$("answer").value = "not a country at all";
  P.$("check").onclick();
  ok("a wrong answer is not scored", !P.S.gotFirst.has(t2));
  ok("...and the right one is shown", /Not quite/.test(P.panel()));
  P.$("next").onclick();
  ok("...and it does not come round again", P.S.current !== t2);
}

/* ====================================================================== */
G("the three areas the Regions tab asks about");
{
  const P = load();
  const A = P.ctx.AREAS;
  ok("there are three", A.length === 3);
  ok("named for what a class is asked",
     A.map(a => a.label).join(", ") === "Central America, The Caribbean, South America",
     A.map(a => a.label).join(", "));
  const all = A.flatMap(a => a.ns);
  ok("no country is in two areas at once", new Set(all).size === all.length);
  ok("...and none invented", all.every(n => !!P.BY[n]));

  /* There is no North America sweep: Mexico would be the only country in it,
     which makes the question answer itself. It is the leftover instead, and
     being the leftover is what makes it the trap in all three sweeps. */
  ok("no area is a single country that answers itself", A.every(a => a.ns.length > 1));
  ok("Mexico is the one country in none of them",
     P.ctx.UNPLACED.join() === "1" && P.BY[1].name === "Mexico");
  ok("the three plus Mexico account for all 24",
     all.length + P.ctx.UNPLACED.length === 24);
  ok("Central America is the six below it, and does not include Mexico",
     P.ctx.AREA.ca.ns.join() === "6,7,8,9,10,11" &&
     P.ctx.AREA.ca.ns.indexOf(1) === -1);
  ok("the Caribbean is the four islands", P.ctx.AREA.car.ns.join() === "2,3,4,5");
  ok("South America is the other thirteen", P.ctx.AREA.sa.ns.length === 13 &&
     P.ctx.AREA.sa.ns.indexOf(11) === -1 && P.ctx.AREA.sa.ns.indexOf(12) !== -1);
  ok("these are not the practice filter's groups, which split South America",
     P.ctx.REGIONS.some(r => r.key === "nsa") &&
     !A.some(a => /Northern|Southern/.test(a.label)));
}

/* ====================================================================== */
G("sweeping an area on the map");
{
  const P = load(); withClosest(P);
  P.setMode("region");
  ok("the mode took", P.S.mode === "region");
  ok("the round is the three areas", P.S.pool.length === 3);
  ok("the whole map is drawn, not just one area's countries", P.q(".mk").length === 24);
  ok("no single marker is ringed — the question is an area", P.q(".ring").length === 0);
  ok("the region filter is put away", P.$("reggrp").hidden === true);
  ok("the direction toggle stays away too", P.$("dirgrp").hidden === true);
  ok("the map is touchable", P.$("overlay").classList.contains("live"));

  /* work the areas in a fixed order so the assertions can name them */
  P.q('.name[data-area="ca"]')[0].onclick();
  ok("an area can be picked from the list", P.S.current === "ca");
  ok("the prompt asks for it by name", /Tap every country in <em>Central America<\/em>/.test(P.panel()));
  ok("...and says how many", /Six of them/.test(P.panel()));
  ok("...and warns that not everything belongs",
     /Not every country on the map belongs/.test(P.panel()));
  ok("Check starts disabled with nothing chosen", P.$("go").disabled === true);
  ok("...and it says where the names will appear",
     /Tap the numbers on the map and they will be listed here by name/.test(P.panel()));

  G("...what has been tapped is listed by name");
  /* The map prints numbers and nothing else. Read back as "6, 7, 8" a sweep
     tells a child nothing about whether those countries are in the area. */
  P.marker(6).onclick();
  ok("tapping a marker names the country in the panel",
     P.q(".chip").length === 1 && P.q(".chip")[0].textContent.indexOf("Guatemala") !== -1,
     P.q(".chip").map(c => c.textContent).join(" | "));
  ok("...with its number beside it", /<b>6<\/b>/.test(P.panel()));
  P.marker(7).onclick();
  P.marker(8).onclick();
  ok("three tapped, three named", P.q(".chip").length === 3);
  ok("...and they are the right three",
     P.q(".chip").map(c => c.textContent).join(",").indexOf("Honduras") !== -1 &&
     P.q(".chip").map(c => c.textContent).join(",").indexOf("El Salvador") !== -1);
  ok("...listed in number order",
     P.q(".chip").map(c => +c.getAttribute("data-pick")).join() === "6,7,8");
  P.q('.chip[data-pick="7"]')[0].onclick();
  ok("a name taps off again without hunting for its marker on the map",
     P.S.picked.size === 2 && !P.S.picked.has(7) && P.q(".chip").length === 2);
  ok("...and the marker stops showing as chosen",
     !P.marker(7).classList.contains("pick"));
  P.marker(7).onclick();

  G("...the trap: Mexico is not Central America");
  [1, 9, 10, 11].forEach(n => P.marker(n).onclick());
  ok("seven chosen", P.S.picked.size === 7);
  ok("the chosen markers show it", P.q(".mk.pick").length === 7);
  ok("...and Mexico is named in the list, so the mistake is visible",
     P.q(".chip").map(c => c.textContent).join(",").indexOf("Mexico") !== -1);
  ok("...and the counter says so", /Chosen &mdash; 7 of 6 wanted/.test(P.panel()));
  P.$("go").onclick();
  ok("including Mexico is wrong", !P.S.matched.has("ca"));
  /* The verdict counts, it does not name. Mexico is on screen — in the list of
     what the student chose, which is theirs already — but the message that says
     something is wrong must not point at it. */
  ok("...and it says how many, never which",
     /one you tapped does not belong/i.test(P.q(".wrongnote")[0].textContent) &&
     P.q(".wrongnote")[0].textContent.indexOf("Mexico") === -1,
     P.q(".wrongnote")[0].textContent);
  ok("...and the choice is left alone so it can be adjusted", P.S.picked.size === 7);
  ok("...and it counts as an attempt", P.S.tries.ca === 1);

  P.marker(1).onclick();
  ok("un-tapping Mexico leaves six", P.S.picked.size === 6);
  ok("...and clears the message", !/wrongnote/.test(P.panel()));
  P.$("go").onclick();
  ok("the six on their own are right", P.S.matched.has("ca"));
  ok("...but not a first-try score", !P.S.gotFirst.has("ca"));
  ok("...and it says so", /That is Central America/.test(P.panel()));
  ok("...and the area's countries grey out on the map",
     [6, 7, 8, 9, 10, 11].every(n => P.marker(n).classList.contains("locked")) &&
     !P.marker(1).classList.contains("locked"));
  ok("...and the map is locked until the next area is asked for",
     !P.$("overlay").classList.contains("live"));

  G("...leaving one out is as wrong as putting one in");
  P.$("next").onclick();
  ok("the sweep is cleared for the next area", P.S.picked.size === 0);
  P.q('.name[data-area="car"]')[0].onclick();
  [2, 3, 4].forEach(n => P.marker(n).onclick());
  P.$("go").onclick();
  ok("three of the four Caribbean islands is not right", !P.S.matched.has("car"));
  ok("...and it says one is missing, without naming it",
     /one is still missing/i.test(P.q(".wrongnote")[0].textContent) &&
     P.panel().indexOf("Puerto Rico") === -1);
  P.marker(5).onclick();
  P.$("go").onclick();
  ok("all four is right", P.S.matched.has("car"));

  G("...and a solved area cannot be swept again");
  P.$("next").onclick();
  const before = P.S.current;
  P.marker(3).onclick();
  ok("tapping a country already placed does nothing", P.S.picked.size === 0);
  ok("...and does not change the question", P.S.current === before);

  G("...through to the results");
  let guard = 0;
  while (P.S.current != null && guard++ < 12) {
    P.ctx.AREA[P.S.current].ns.forEach(n => P.marker(n).onclick());
    P.$("go").onclick();
    const nx = P.$("next"); if (!nx) break;
    nx.onclick();
  }
  ok("all three areas are done", P.S.matched.size === 3);
  ok("the round finishes", P.S.done === true && !!P.$("results"));
  ok("one of three on the first try — the other two were fumbled",
     /1 of 3 on the first try/.test(P.$("results").innerHTML),
     (P.$("results").innerHTML.match(/\d+ of \d+ on the first try/) || [])[0]);
  ok("the results list the areas that were missed, not countries",
     P.q(".missed li").map(li => li.textContent).join(",").indexOf("Central America") !== -1 &&
     P.q(".missed li").map(li => li.textContent).join(",").indexOf("Brazil") === -1);
  /* Only now, when it can no longer give a sweep away. */
  ok("and the round ends by saying where Mexico belongs",
     /Mexico belongs to none of the three\. It is in North America/
       .test(P.$("results").innerHTML));
  ok("Retry missed only comes back with the two areas",
     (P.$("retry").onclick(), P.S.pool.length === 2 && P.S.pool.every(k => !!P.ctx.AREA[k])));
}

/* ====================================================================== */
G("regions");
{
  const P = load(); withClosest(P);
  const sel = P.$("region");
  ok("five choices, All 24 first", sel.kids.length === 5);
  P.ctx.S.region = "car";
  sel.onchange({ target: { value: "car" } });
  ok("the Caribbean round is four countries", P.S.pool.length === 4);
  ok("...and they are 2, 3, 4, 5", P.S.pool.slice().sort((a, b) => a - b).join() === "2,3,4,5");
  ok("...and only four markers are drawn", P.q(".mk").length === 4);
  ok("the score line counts to four", P.$("scored").textContent.indexOf("/ 4") === 0);
}

/* ====================================================================== */
G("checking the answers so far");
{
  const P = load(); withClosest(P);

  P.$("sofar").onclick();
  ok("it can be asked before anything is answered", !!P.$("results"));
  ok("...and says so rather than showing an empty list",
     /Nothing answered yet/.test(P.$("results").innerHTML));
  ok("...and names nothing", P.q(".missed li").length === 0);
  ok("...and says how many are still to come",
     /24 still to go/.test(P.$("results").innerHTML));
  P.$("keep").onclick();
  ok("Keep going puts it away", !P.$("results"));
  ok("...and the round carries on", P.S.done === false && P.S.current != null);

  /* one question, answered on the second try */
  const first = P.S.current;
  P.marker(P.S.pool.find(n => n !== first)).onclick();
  P.marker(first).onclick();

  P.$("sofar").onclick();
  ok("after a single question it reports on that one", P.q(".missed li").length === 1);
  const sheet1 = P.$("results").innerHTML;
  ok("...naming it, since it is already known", sheet1.indexOf(P.BY[first].name) !== -1);
  ok("...and saying it took two goes", /2 tries/.test(sheet1));
  ok("...and scoring 0% of the one settled", /\b0%/.test(sheet1));
  ok("...and 23 still to go", /23 still to go/.test(sheet1));

  /* the point of the whole exercise: it must not leak what has not been asked */
  const shown = P.C.filter(c => sheet1.indexOf(c.name) !== -1).map(c => c.n);
  ok("no country still in play is named", shown.length === 1 && shown[0] === first,
     "named " + shown.join(","));
  ok("the answer to the open question is not given away",
     sheet1.indexOf(">" + P.S.current + "<") === -1);
  ok("it offers a way to stop early", !!P.$("stop"));

  P.$("keep").onclick();
  const second = P.S.current;
  P.marker(second).onclick();
  P.$("sofar").onclick();
  ok("a first-try answer is marked as one", /first try/.test(P.$("results").innerHTML));
  ok("...and the running figure is 1 of 2", /1 of 2 answered so far/.test(P.$("results").innerHTML));
  ok("...and it is 50%", /\b50%/.test(P.$("results").innerHTML));

  G("...and Finish now ends it there");
  P.$("stop").onclick();
  ok("the round is over", P.S.done === true);
  ok("the real results are up", /Retry missed only/.test(P.$("results").innerHTML));
  ok("the score is out of all 24, not out of the two answered",
     /1 of 24 on the first try/.test(P.$("results").innerHTML));
  ok("the 22 never reached are listed as unanswered",
     (P.$("results").innerHTML.match(/not answered/g) || []).length === 22);
  ok("Retry missed only then takes back all 23", (P.$("retry").onclick(), P.S.pool.length === 23));

  G("...and after the round it shows the real results");
  const Q = load(); withClosest(Q);
  let guard = 0;
  while (Q.S.current != null && guard++ < 60) Q.marker(Q.S.current).onclick();
  Q.$("close").onclick();
  ok("the sheet can be dismissed", !Q.$("results"));
  Q.$("sofar").onclick();
  ok("asking again brings the finished results back, not an interim one",
     /Retry missed only|Run it again/.test(Q.$("results").innerHTML) &&
     !/How it is going/.test(Q.$("results").innerHTML));
}

/* ====================================================================== */
G("the map, the teacher key and the zoom");
{
  const P = load(); withClosest(P);
  const mk = P.marker(18);
  ok("a marker is placed as a share of the image, not in pixels",
     mk.attr.style.indexOf("%") !== -1 && mk.attr.style.indexOf("px") === -1,
     mk.attr.style);
  const left = +mk.attr.style.match(/left:\s*([\d.]+)%/)[1];
  const top = +mk.attr.style.match(/top:\s*([\d.]+)%/)[1];
  ok("Brazil's marker lands where the key says",
     Math.abs(left - 1036 / 1387 * 100) < 0.01 && Math.abs(top - 794 / 1438 * 100) < 0.01,
     left.toFixed(2) + "% / " + top.toFixed(2) + "%");
  ok("...and its width is the hit circle, also as a share",
     Math.abs(+mk.attr.style.match(/width:\s*([\d.]+)%/)[1] - P.BY[18].hit * 2 / 1387 * 100) < 0.01);

  ok("the map starts on the quiz image",
     P.$("mapimg").getAttribute("src") === "latin_america_quiz_map.png");
  P.$("teacher").onclick();
  ok("the teacher toggle swaps in the answer key",
     P.$("mapimg").getAttribute("src") === "latin_america_answer_key.png");
  P.$("teacher").onclick();
  ok("...and swaps back", P.$("mapimg").getAttribute("src") === "latin_america_quiz_map.png");

  ok("zoom starts at 100%", P.$("zlvl").textContent === "100%");
  ok("zoom out is offered but disabled at the bottom", P.$("zout").disabled === true);
  P.$("zin").onclick();
  ok("zooming in raises it", P.$("zlvl").textContent === "150%");
  ok("...and now zoom out is live", P.$("zout").disabled === false);
  for (let i = 0; i < 10; i++) P.$("zin").onclick();
  ok("it stops at 600%", P.$("zlvl").textContent === "600%");
  P.$("zreset").onclick();
  ok("reset puts it back", P.$("zlvl").textContent === "100%");
}

/* ====================================================================== */
G("nothing is written outside the page");
{
  ok("the file never mentions localStorage or sessionStorage",
     !/localStorage|sessionStorage|indexedDB|document\.cookie/.test(HTML));
  ok("nothing is fetched from anywhere",
     !/https?:\/\/|\bfetch\(|XMLHttpRequest|<link\b/i.test(HTML));
  const srcs = [...HTML.matchAll(/\bsrc\s*=\s*"([^"]+)"/g)].map(m => m[1])
    .concat([...HTML.matchAll(/latin_america_\w+\.png/g)].map(m => m[0]));
  ok("the only files it asks for are the two maps beside it",
     srcs.every(s => s === "latin_america_quiz_map.png" || s === "latin_america_answer_key.png"),
     [...new Set(srcs)].join(", "));
  ["latin_america_quiz_map.png", "latin_america_answer_key.png"].forEach(f =>
    ok(f + " is in the folder", fs.existsSync(path.join(__dirname, f))));

  /* The hub links here, so there is a way back — but only when there was
     somewhere to come back from. Opened by double-clicking there is no
     referrer, and a link to a hub that may not have been copied across is
     worse than no link at all. */
  ok("double-clicked, the way back stays hidden", load().$("tohub").hidden === true);
  ok("...but it appears when the hub sent us here",
     load("http://x/index.html").$("tohub").hidden === false);
  ok("...and it is the only thing on the page that points outside the folder",
     (HTML.match(/href="([^"]+)"/g) || []).join() === 'href="../index.html"');
  ok("it is one file with no build step", !/type\s*=\s*"module"|require\(|import\s/.test(
     HTML.match(/<script>([\s\S]*?)<\/script>/)[1]));
}

console.log("\n" + pass + " assertions passed" + (fails.length ? ", " + fails.length + " FAILED" : ""));
process.exit(fails.length ? 1 : 0);
