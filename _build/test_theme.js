/* Exercises the theme engine's logic (hearts, tool ladder, loot, persistence)
   under a hand-rolled DOM stub. No network here, so no jsdom. */
const fs = require("fs"), pathmod = require("path");
/* runs from a folder holding theme/, or from inside study/_build/ */
const MCJS = ["theme/mc.js", pathmod.join(__dirname, "mc.js")]
  .find(p => fs.existsSync(p));
if (!MCJS) { console.log("cannot find mc.js"); process.exit(1); }

function mkEl(tag) {
  const e = {
    tagName: tag, children: [], _html: "", style: { setProperty(){}, },
    classList: { _s:new Set(),
      add(...c){c.forEach(x=>this._s.add(x));}, remove(...c){c.forEach(x=>this._s.delete(x));},
      contains(c){return this._s.has(c);}, toggle(){} },
    offsetWidth: 100, offsetHeight: 70, offsetParent: {},
    appendChild(c){ this.children.push(c); c.parentNode=this; return c; },
    removeChild(c){ this.children = this.children.filter(x=>x!==c); },
    insertBefore(c){ this.children.unshift(c); c.parentNode=this; return c; },
    insertAdjacentHTML(_,h){ this._html += h; },
    addEventListener(ev,fn){ (this._ev||(this._ev={}))[ev]=fn; },
    querySelector(sel){
      if(sel==="#mc-hearts") return this._hearts || (this._hearts = mkEl("div"));
      if(sel==="#mc-bar")    return this._bar    || (this._bar    = mkEl("div"));
      if(sel===".mc-lid")    return this._lid    || (this._lid    = mkEl("img"));
      if(sel===".mc-loot")   return this._loot   || (this._loot   = mkEl("div"));
      if(sel===".mc-cap")    return this._cap    || (this._cap    = mkEl("div"));
      return null;
    },
    setAttribute(){},
    querySelectorAll(sel){
      /* good enough for the picker: count what innerHTML declared */
      const cls = sel.replace(".","");
      const n = (e._html.match(new RegExp('class="'+cls,"g"))||[]).length;
      return Array.from({length:n}, ()=>mkEl("button"));
    },
  };
  Object.defineProperty(e, "innerHTML", {
    get(){ return e._html; },
    set(v){ e._html = v;
      // hearts row: rebuild children so index lookups work
      const n = (v.match(/class="mc-heart"/g)||[]).length;
      if(n) e.children = Array.from({length:n}, ()=>mkEl("img"));
    }
  });
  return e;
}

const store = {};
global.localStorage = {
  getItem: k => (k in store ? store[k] : null),
  setItem: (k,v) => { store[k]=String(v); },
};
global.window = { addEventListener(){}, __MC_PREFIX__:"../../assets/", __MC_HAS_BOSS__:false };
global.document = {
  body: mkEl("body"),
  documentElement: { clientWidth: 380, style:{ setProperty(){} } },
  createElement: mkEl,
  querySelector: () => null,
  addEventListener(){},
};
global.setTimeout = () => 0;

// ---------------------------------------------------------------- run
function fresh(){ for(const k in store) delete store[k]; delete global.MC; delete require.cache; }

function load(){
  new Function("window","document","localStorage","setTimeout",
    fs.readFileSync(MCJS,"utf8"))(window, document, localStorage, setTimeout);
  return window.MC;
}

let fails = 0;
const ok = (name, cond, extra="") => {
  if(!cond){ fails++; console.log("  FAIL " + name + " " + extra); }
  else console.log("  ok   " + name);
};

console.log("hearts");
let MC = load();
MC.config({app:"science", shake:null});
MC.begin();
for(let i=0;i<5;i++) MC.wrong("q"+i);
let r = MC.clear("m1", 100, {});
ok("5 misses = 2.5 hearts gone", r.hearts === 7.5, "got "+r.hearts);
ok("loot shrinks to 3", r.loot === 3, "got "+r.loot);

// no death: hammer it well past 20 halves
MC.begin();
for(let i=0;i<40;i++) MC.wrong("x");
r = MC.clear("m2", 100, {});
ok("floors at zero, never negative", r.hearts === 0, "got "+r.hearts);
ok("still awards loot at zero hearts", r.loot === 1, "got "+r.loot);

MC.begin();
r = MC.clear("m3", 100, {});
ok("begin() refills to 10", r.hearts === 10, "got "+r.hearts);
ok("clean run = full haul", r.loot === 4, "got "+r.loot);

console.log("\ntool ladder");
fails += 0;
// wipe and start over
for(const k in store) delete store[k];
MC = load(); MC.config({app:"science", shake:null});
const got = [];
MC.begin(); got.push(MC.clear("m1", 100, {}).tool);
MC.begin(); got.push(MC.clear("m2", 80,  {}).tool);
MC.begin(); got.push(MC.clear("m3", 60,  {}).tool);   // under 75 — no award
MC.begin(); got.push(MC.clear("m1", 90,  {}).tool);   // repeat — no award
ok("1st clear -> tool 1", got[0] === 1, "got "+got[0]);
ok("2nd clear -> tool 2", got[1] === 2, "got "+got[1]);
ok("under 75% awards nothing", got[2] === null, "got "+got[2]);
ok("repeating a cleared level awards nothing", got[3] === null, "got "+got[3]);

MC.config({app:"spelling", shake:"#card"});
MC.begin();
const nine = MC.clear("l7", 100, {});
ok("Challenge 2 -> elytra (tool 9)", nine.tool === 9, "got "+nine.tool);

console.log("\nthe End stays shut until the tool set is complete");
ok("a perfect run before nine tools does not slay anything",
   MC.clear("l7", 100, {}).boss === false);
ok("...and it says so, rather than going quiet",
   MC.clear("l7", 100, {}).portalShut === true);
ok("...and it counts what is still missing",
   MC.clear("l7", 100, {}).toolsLeft > 0);

/* Hand him the full bar without touching any id another test measures: eight
   clears in a namespace of their own, and the elytra flag set directly. */
function arm(){
  localStorage.setItem("mc.study.v1", JSON.stringify({
    cleared: {"armoury:a":80,"armoury:b":80,"armoury:c":80,"armoury:d":80,
              "armoury:e":80,"armoury:f":80,"armoury:g":80,"armoury:h":80},
    misses: {}, tool9: true, ore: {}, gem: {}, dragon: 0
  }));
  return load();
}
MC = arm();
MC.config({app:"spelling", shake:"#card", dragon:["l7"]});
MC.begin();
ok("with all nine tools the portal opens", MC.clear("l7", 100, {}).boss === true);
MC.begin();
ok("...and the shut-portal notice is gone",
   MC.clear("l7", 100, {}).portalShut === false);

console.log("\ndragon: spelling is restricted to Challenge 2");
MC.config({app:"spelling", shake:"#card", dragon:["l7"]});
MC.begin();
ok("perfect Challenge 2 slays it", MC.clear("l7", 100, {}).boss === true);
MC.begin();
ok("perfect level 1 does NOT", MC.clear("l1", 100, {}).boss === false);
MC.begin();
ok("perfect Challenge (l6) does NOT either", MC.clear("l6", 100, {}).boss === false);
MC.begin();
ok("99% on Challenge 2 does not", MC.clear("l7", 99, {}).boss === false);
MC.begin(); MC.wrong("x");
ok("100% on l7 after a miss does not", MC.clear("l7", 100, {}).boss === false);

console.log("\ndragon: one per subject, on its toughest run");
MC.config({app:"science", shake:null, dragon:["m4"]});
MC.begin();
ok("perfect capstone (m4) slays it", MC.clear("m4", 100, {}).boss === true);
MC.begin();
ok("perfect m2 does NOT", MC.clear("m2", 100, {}).boss === false);
MC.begin();
ok("...but perfect m2 still lands NETHERITE", MC.clear("m2b", 100, {}).tier === "NETHERITE");
MC.config({app:"vocabulary", shake:"#sheet", dragon:["sheet"]});
MC.begin();
ok("perfect vocabulary sheet slays it", MC.clear("sheet", 100, {}).boss === true);
MC.config({app:"history", shake:"#stela", dragon:null});
MC.begin();
ok("history sets are parallel forms, so any perfect one slays it",
   MC.clear("set2", 100, {}).boss === true);
MC.begin(); MC.note("x");
ok("a recorded note alone does not block it", MC.clear("set3", 100, {}).boss === true);
MC.config({app:"spelling", shake:"#card", dragon:["l7"]});

// tools 1-8 cap
MC.config({app:"history", shake:"#stela"});
for(let i=0;i<12;i++){ MC.begin(); MC.clear("set"+i, 100, {}); }
const st = MC.state();
ok("tools 1-8 cap at 8", st.tools.count === 8, "got "+st.tools.count);
ok("elytra persists alongside", st.tools.nine === true);

console.log("\nnote() costs nothing");
for(const k in store) delete store[k];
MC = load(); MC.config({app:"vocabulary", shake:"#sheet"});
MC.begin();
MC.note("lofty"); MC.note("clasp"); MC.note("appeal"); MC.wrong();
let nr = MC.clear("sheet", 100, {});
ok("3 notes + 1 wrong = one half-heart", nr.hearts === 9.5, "got "+nr.hearts);
ok("notes still recorded", Object.keys(MC.state().misses.vocabulary).length === 3);

console.log("\nachievement tiers");
for(const k in store) delete store[k];
MC = arm(); MC.config({app:"science", shake:null, dragon:null});
const tier = (pct, hits=0) => { MC.begin(); for(let i=0;i<hits;i++) MC.wrong("q"+i);
  return MC.clear("t"+pct+"_"+hits, pct, {}); };
ok("100% clean -> DRAGON SLAIN", tier(100).tier === "DRAGON SLAIN", tier(100).tier);
ok("92% -> DIAMOND", tier(92,1).tier === "DIAMOND", tier(92,1).tier);
ok("80% -> IRON",    tier(80,2).tier === "IRON",    tier(80,2).tier);
ok("60% -> STONE",   tier(60,3).tier === "STONE",   tier(60,3).tier);
ok("30% -> WOOD",    tier(30,6).tier === "WOOD",    tier(30,6).tier);
ok("every tier has encouraging copy",
   [100,92,80,60,30].every((p,i)=>tier(p,[0,1,2,3,6][i]).blurb.length > 12));
MC.config({app:"spelling", shake:"#card", dragon:["l7"]});
MC.begin();
ok("perfect but dragon not allowed here -> NETHERITE, still a top tier",
   MC.clear("l1", 100, {}).tier === "NETHERITE");

console.log("\ncorrections");
MC.config({app:"science", shake:null, dragon:null});
MC.begin(); MC.wrong("q1"); MC.right("q1"); MC.wrong("q2"); MC.right("q2");
let cr = MC.clear("c1", 70, {});
ok("fixing two earns the comeback badge", cr.fixed === 2 &&
   cr.badges.some(b=>/TURNED 2 AROUND/.test(b)), JSON.stringify(cr.badges));
MC.begin(); MC.wrong("q1");
ok("a miss never fixed earns nothing", MC.clear("c2", 70, {}).fixed === 0);
MC.begin(); MC.credit("q9");
ok("credit() on an unmissed key is a no-op", MC.clear("c3", 70, {}).fixed === 0);

console.log("\ncorrection rounds (spelling rerun)");
MC.config({app:"spelling", shake:"#card", dragon:["l7"]});
MC.begin(); MC.clear("l7", 60, {});                 // first attempt, 60%
let rr = (MC.begin({partial:true}), MC.clear("l7", 100, {}));
ok("rerun tier is CORRECTIONS", rr.tier === "CORRECTIONS", rr.tier);
ok("rerun cannot summon the dragon", rr.boss === false);
ok("rerun awards no tool", rr.tool === null);
ok("rerun does not overwrite the best score",
   MC.state().cleared["spelling:l7"] === 60, MC.state().cleared["spelling:l7"]);
MC.begin(); const better = MC.clear("l7", 90, {});
ok("a real rerun of the whole level does count", MC.state().cleared["spelling:l7"] === 90);
ok("beating your old score earns NEW BEST",
   better.badges.some(b=>/NEW BEST/.test(b)), JSON.stringify(better.badges));
ok("and FIRST CLEAR the first time past 75",
   better.badges.some(b=>/FIRST CLEAR/.test(b)));

console.log("\npersistence + misses");
for(const k in store) delete store[k];
MC = load(); MC.config({app:"vocabulary", shake:"#sheet"});
MC.begin(); MC.wrong("lofty"); MC.wrong("lofty"); MC.wrong("clasp");
MC.begin(); MC.clear("sheet", 100, {});          // earn one tool to check it persists
const saved = store["mc.study.v1"];
ok("writes to localStorage", !!saved);
const MC2 = load();                       // simulate a new session
const m = MC2.state().misses.vocabulary;
ok("misses survive reload", m && m.lofty === 2 && m.clasp === 1, JSON.stringify(m));
ok("tools survive reload", MC2.state().tools.count === 1, "got "+MC2.state().tools.count);

console.log("\nbests() for level pickers");
for(const k in store) delete store[k];
MC = arm(); MC.config({app:"science", shake:null, dragon:["m4"]});
MC.begin(); MC.clear("m1", 100, {});
MC.begin(); MC.clear("m2", 60,  {});
MC.begin(); MC.clear("m2", 85,  {});          // improves
MC.config({app:"spelling", shake:"#card", dragon:["l7"]});
MC.begin(); MC.clear("l4", 90, {});
MC.config({app:"science", shake:null, dragon:["m4"]});
const bs = MC.bests();
ok("bests() is keyed by bare id", bs.m1 === 100 && bs.m2 === 85, JSON.stringify(bs));
ok("bests() keeps the highest, not the latest", bs.m2 === 85);
ok("bests() does not leak other apps", bs.l4 === undefined && Object.keys(bs).length === 2);
const MC4 = load();
MC4.config({app:"science", shake:null});
ok("bests() survives a reload", MC4.bests().m1 === 100, JSON.stringify(MC4.bests()));
MC4.config({app:"reading", shake:null});
ok("an app with no history gets an empty object",
   Object.keys(MC4.bests()).length === 0);

console.log("\npicker chips");
for(const k in store) delete store[k];
MC = arm(); MC.config({app:"history", shake:"#stela", dragon:null});
MC.begin(); MC.clear("set0", 100, {});
MC.begin(); MC.clear("set2", 55,  {});
const host = mkEl("div");
let picked = null;
MC.picker(host, [0,1,2,3,4].map(i=>({id:"set"+i,label:String(i+1)})), "set1", id=>{picked=id;});
const html = host.innerHTML;
ok("renders one chip per set", (html.match(/data-id="set/g)||[]).length === 5,
   String((html.match(/data-id="set/g)||[]).length));
ok("cleared set is green", /data-id="set0"/.test(html) && /mc-chip mc-cleared/.test(html));
ok("attempted set is amber", /mc-chip mc-tried/.test(html));
ok("current set is marked", /mc-now/.test(html) && /aria-pressed="true"/.test(html));
ok("untried sets show a dash", (html.match(/&mdash;/g)||[]).length === 3,
   String((html.match(/&mdash;/g)||[]).length));
ok("scores are shown on the chips", /100%/.test(html) && /55%/.test(html));
ok("a missing host is a no-op", (MC.picker(null,[],"x",()=>{}), true));

console.log("\ncorrupt store");
store["mc.study.v1"] = "{not json";
const MC3 = load();
ok("bad JSON does not throw", MC3.state().tools.count === 0);



/* ---------- the mine ---------- */
console.log("\nthe mine: nothing is dug until the tools are all his");
/* a genuinely empty store -- earlier sections left the bar full */
localStorage.setItem("mc.study.v1", JSON.stringify({cleared:{},misses:{},tool9:false}));
MC = load();
MC.config({app:"science", shake:null, dragon:null});
MC.begin();
let mr = MC.clear("m1", 100, {});
ok("a perfect run before nine tools mines nothing", mr.mined.length === 0);
ok("...and reports the mine shut", mr.mineOpen === false);

MC = arm();
MC.config({app:"science", shake:null, dragon:null});
MC.begin();
mr = MC.clear("m1", 100, {});
ok("mine open once the bar is full", mr.mineOpen === true);
const dug = mr.mined.map(m=>m.k);
ok("a flawless 100% yields coal, copper, iron, gold, redstone and a diamond",
   ["coal","copper","iron","gold","redstone","diamond"].every(k=>dug.includes(k)),
   dug.join(","));

MC.begin();
ok("the diamond is once per activity, so the same one again does not repay it",
   MC.clear("m1", 100, {}).mined.map(m=>m.k).indexOf("diamond") === -1);
MC.begin();
ok("...but a different activity does",
   MC.clear("m2", 100, {}).mined.map(m=>m.k).indexOf("diamond") !== -1);

MC.begin();
ok("a 78% pass digs coal and nothing richer",
   MC.clear("m3", 78, {}).mined.map(m=>m.k).join(",") === "coal,redstone");
MC.begin(); MC.wrong("x");
ok("losing a heart costs the redstone",
   MC.clear("m5", 88, {}).mined.map(m=>m.k).join(",") === "coal,copper");
MC.begin(); MC.wrong("x");
ok("...and the diamond, even at 100%",
   MC.clear("m6", 100, {}).mined.map(m=>m.k).indexOf("diamond") === -1);

MC.begin({partial:true});
ok("a correction round that fixes everything yields lapis",
   MC.clear("m1", 100, {partial:true}).mined.map(m=>m.k).join(",") === "lapis");
MC.begin({partial:true});
ok("...and an unfinished one yields nothing",
   MC.clear("m1", 60, {partial:true}).mined.length === 0);

console.log("\nthe mine: emeralds and the beacon");
MC.config({app:"spelling", shake:"#card", dragon:["l7"]});
MC.begin();
mr = MC.clear("l7", 100, {});
ok("slaying the dragon yields an emerald", mr.mined.map(m=>m.k).indexOf("emerald") !== -1);
ok("the beacon wants iron, gold, diamond and emerald",
   mr.beacon.need.map(b=>b.k).join(",") === "iron,gold,diamond,emerald");
ok("nine of a mineral makes one block",
   mr.beacon.need.every(b => b.blocks === Math.floor(b.have / 9)));
ok("the beacon is not lit on day one", mr.beacon.lit === false);

console.log("\nthe mine: state reaches the hub");
const hubState = MC.state();
ok("ore totals are exposed", typeof hubState.ore.coal === "number" && hubState.ore.coal > 0);
ok("the eight minerals are named", hubState.oreKinds.length === 8);
ok("dragon count is exposed", hubState.dragons >= 1);
ok("beacon progress is exposed", hubState.beacon.needs.length === 4);
ok("reset clears the ore too", (MC.reset(), MC.state().ore.coal === undefined
   || MC.state().ore.coal === 0));

/* Every attempt is kept, not just the best. `cleared` is what the game rewards;
   this is what a parent reads to decide whether something needs another look. */
console.log("\nevery try is recorded, for the parent");
MC.reset();
MC.begin("rr"); MC.clear("rr", 90);
MC.begin("rr"); MC.clear("rr", 55);
MC.begin("rr"); MC.clear("rr", 70);
const runs = MC.runs("rr");
ok("one entry per try, in order", runs.length === 3);
ok("each try keeps its own percentage", runs.map(r => r.p).join(",") === "90,55,70");
ok("a later worse try does not overwrite an earlier better one",
   runs[0].p === 90 && runs[2].p === 70);
ok("the best score is still the best", MC.bests()["rr"] === 90);
ok("every try carries a date", runs.every(r => typeof r.t === "number" && r.t > 0));
ok("the history reaches the hub", (MC.state().runs["spelling:rr"] || []).length === 3);
ok("an untried activity has no history", MC.runs("never-touched").length === 0);
MC.reset();
ok("reset clears the history too", MC.runs("rr").length === 0);
for (let i = 0; i < 40; i++) { MC.begin("cap"); MC.clear("cap", 80); }
ok("history is capped so it cannot grow without bound", MC.runs("cap").length === 25);
MC.reset();

/* Sound. There is no Audio in this stub, so what is checked here is the part
   that must hold regardless of the speaker: the preference is saved with the
   rest of the state, it survives a reset, and asking for a sound never throws
   in an environment that cannot make one. */
console.log("\nsound");
ok("sound is on to begin with", MC.mute() === false);
ok("muting reports back", MC.mute(true) === true && MC.mute() === true);
ok("a right answer is silent when muted, and still does not throw",
   (() => { try { MC.begin("q"); MC.right("k"); return true; } catch (e) { return false; } })());
ok("unmuting reports back", MC.mute(false) === false);
ok("a right answer with no Audio available does not throw",
   (() => { try { MC.right("k2"); return true; } catch (e) { return false; } })());
ok("earning a tool does not throw either",
   (() => { try { MC.begin("t"); MC.clear("t", 100); return true; } catch (e) { return false; } })());
MC.mute(true);
MC.reset();
ok("reset clears progress but keeps the sound preference", MC.mute() === true);
MC.mute(false);
MC.reset();


console.log(fails ? "\n" + fails + " FAILURES" : "\nall green");
process.exit(fails ? 1 : 0);
