/* The meaning check on the written answers, in both directions.
 *
 *   node _build/test_sense.js
 *
 * The app can tell him a sentence works mechanically and still says nothing.
 * That check is sense.js, and it can fail in two opposite ways, each as bad
 * as the other:
 *
 *   too soft  -- it waves through "The expedition went on an expedition",
 *                and he marks rubbish as right because the app agreed.
 *   too hard  -- it nags at a sentence better than the word list it is being
 *                judged against, and he learns to ignore it.
 *
 * So this file holds sentences, not rules: ones that must be let through and
 * ones that must be stopped. The first run of the sweep below flagged five of
 * twenty-seven perfectly good sentences, which is how the word lists got
 * fixed. Nothing else noticed, and nothing else could have.
 *
 * Adding a week: put three or four good sentences and two bad ones in TRIALS
 * under the new spec. The count at the bottom says how many written answers
 * have nobody vouching for them, so a week that skips this says so out loud.
 */
"use strict";
const fs = require("fs");
const path = require("path");

const GEN = path.join(__dirname, "generators");
const S = require(path.join(GEN, "sense.js"));

let pass = 0;
const fails = [];
const ok = (what, cond, extra) => {
  if (cond) { pass++; console.log("  ok   " + what); }
  else { fails.push(what); console.log("  FAIL " + what + (extra ? " — " + extra : "")); }
};
const G = g => console.log("\n" + g);
const flat = d => d.map(x => x.replace(/<[^>]+>/g, "")).join(" / ");

/* Every spec in the generators folder that holds written answers, found by
   looking inside rather than by a list of names: a list goes quiet the week a
   new spec arrives, and this file is the one that must not go quiet. */
const SPECS = fs.readdirSync(GEN).filter(f => /\.json$/.test(f)).map(f => {
  let spec;
  try { spec = JSON.parse(fs.readFileSync(path.join(GEN, f), "utf8")); }
  catch (e) { return null; }
  if (!spec || !Array.isArray(spec.parts)) return null;
  const items = [];
  spec.parts.forEach(p => p.type === "say" && (p.items || []).forEach(it => items.push(it)));
  return items.length ? { file: f, lesson: spec.lesson, items: items } : null;
}).filter(Boolean);

const find = (file, first) => {
  const s = SPECS.find(x => x.file === file);
  return s && s.items.find(it => it.need && it.need[0] === first);
};

G("what carries a meaning check");
ok(SPECS.length + " spec(s) with written answers: " +
   SPECS.map(s => s.file + " (" + s.items.length + ")").join(", "), SPECS.length >= 1);

/* ---------- the shape, and the model answers ---------- */
SPECS.forEach(s => {
  G(s.lesson + "  (" + s.file + ")");
  s.items.forEach(it => {
    const who = (it.need || []).join("+");
    const f = S.faults(it);
    ok(who + ": carries a meaning check its own model answer passes",
       !f.length, f.join("; "));
  });

  /* A sense block can be written so loosely that nothing could ever fail it,
     and nobody would ever know. So every one of them is shown a sentence
     built to say nothing, and has to object to it. */
  const FILLER = " sat near the table yesterday and a dog walked past the window.";
  s.items.forEach(it => {
    const junk = "The " + (it.need || []).join(" and the ") + FILLER;
    const d = S.doubts(it, junk);
    ok("..." + (it.need || []).join("+") + " objects to a sentence that says nothing",
       d.length > 0, "waved through: " + junk);
  });
});

/* ---------- sentences that must be let through, and stopped ---------- */
const TRIALS = [
  /* [spec, first needed word, good sentences, bad sentences] */
  ["sentences_l8.json", "expedition",
   ["Our expedition walked for three days over an expanse of long grass that never seemed to end.",
    "The expedition sailed east until there was nothing but an expanse of grey water on every side."],
   ["The expedition went on an expedition with another expedition.",
    "My expedition was very good and the expanse was nice too."]],

  ["sentences_l8.json", "captive",
   ["The knight rode up to the tower to retrieve the captive princess who had been locked in there for a year.",
    "Two guards held the captive in a cold cell, and his brother swore he would retrieve him before winter."],
   ["The captive was a captive and I will retrieve the captive tomorrow."]],

  ["sentences_l8.json", "convenient",
   ["Eating chips every night is convenient because they are quick, but a salad is beneficial even though it takes longer to make."],
   ["The shop on the corner is convenient and it is also beneficial."]],

  ["sentences_l8.json", "inept",
   ["My drawing of the castle was inept and lopsided, but the photograph my uncle lent me was invaluable and I started again."],
   ["My brother was inept and my sister was invaluable at the weekend."]],

  ["sentences_l8.json", "accompany",
   ["I will accompany my sister on the guitar while she sings at the school assembly.",
    "Mrs Patel can accompany anybody on the piano, even if they forget which verse they are on."],
   ["My dad is going to accompany me to the shop on Saturday morning."]],

  ["sentences_l8.json", "ecstasy",
   ["When the letter came to say he had got into the team, my cousin was in absolute ecstasy."],
   ["Ecstasy means that you are feeling very, very happy indeed."]],

  ["sentences_l8.json", "interpret",
   ["It is hard to interpret a cat's expression, because a cat looks annoyed whatever it is thinking.",
    "The scientists had to interpret the numbers on the chart before they could say whether the ice was melting."],
   ["I had to interpret the letter from Spanish into English for my mum."]],

  ["sentences_l8.json", "linger",
   ["The echo of the last note lingers in the empty hall for a moment after the choir stops singing.",
    "A feeling of sadness lingers in the house for days after my grandmother goes back home."],
   ["To linger is when you stay somewhere longer than you should."]],

  ["wwtest_l8.json", "expedition",
   ["The expedition spent a fortnight crossing an expanse of sand with nothing growing on it."],
   ["The expedition was an expedition and the expanse was an expanse."]],
  ["wwtest_l8.json", "captive",
   ["A captive is the prisoner himself, but captivity is the life he has to live while he is locked up."],
   []],
  ["wwtest_l8.json", "convenient",
   ["The microwave is convenient because I can heat up my dinner myself without waiting for anybody."],
   []],
  ["wwtest_l8.json", "inept",
   ["An inept remark is clumsy and lands badly, so it can hurt somebody who would have been fine if you had kept quiet."],
   []],
  ["wwtest_l8.json", "interpret",
   ["You can interpret a French letter into English, or you can interpret a dog's growl as a warning."],
   []],

  ["wwtest_l5.json", "diligent",
   ["A diligent pianist practises for an hour every evening, so the scales she hated in September are easy by Christmas."],
   []],
  ["wwtest_l5.json", "innate",
   ["A dog's innate sense of smell is there from birth, but a sheepdog has to be trained to use it on the hills."],
   []],
  ["wwtest_l5.json", "shroud",
   ["A shroud of thick fog hid the tranquil harbour until the ferry's horn broke the quiet."],
   []],
  ["wwtest_l5.json", "tentative",
   ["A tentative date for the trip is still useful, because everybody can book the day off and change it later if the coach is full."],
   []],
  ["wwtest_l5.json", "versatile",
   ["A versatile scarf can be a hat, a bag or a blanket, so it is the first thing I pack for any trip."],
   []],

  ["wwtest_l7.json", "brawl",
   ["A brawl is a fight that angry people start on purpose, while a stampede is a crowd running away from something that frightened them."],
   []],
  ["wwtest_l7.json", "monotonous",
   ["Washing up is monotonous because every plate is exactly like the last one, and your mind goes somewhere else."],
   []],
  ["wwtest_l7.json", "hardy",
   ["Hardy mountain sheep stay out in the snow all winter, but that same cold would exhaust an ordinary lamb in a night."],
   []],
  ["wwtest_l7.json", "veteran",
   ["A nurse who has worked on the same ward for forty years is a veteran of the hospital, not of any war."],
   []],
  ["wwtest_l7.json", "realistic",
   ["Being realistic about the garden means admitting it will take two weekends, so I allow the time instead of hoping."],
   []]
];

G("sentences it must let through");
const vouched = new Set();
let good = 0, bad = 0;
TRIALS.forEach(([file, first, goods, bads]) => {
  const it = find(file, first);
  if (!it) { ok(file + " has an item for " + first, false); return; }
  vouched.add(file + ":" + first);
  goods.forEach(t => {
    good++;
    const d = S.doubts(it, t);
    ok(first + ": “" + t.slice(0, 54) + "…” is left alone", !d.length, flat(d));
  });
});

G("sentences it must stop");
TRIALS.forEach(([file, first, goods, bads]) => {
  const it = find(file, first);
  if (!it) return;
  bads.forEach(t => {
    bad++;
    const d = S.doubts(it, t);
    ok(first + ": “" + t.slice(0, 54) + "…” is turned back", d.length > 0,
       "nothing came back");
  });
});

G("who is vouching for what");
const unvouched = [];
SPECS.forEach(s => s.items.forEach(it => {
  if (!vouched.has(s.file + ":" + (it.need || [])[0])) unvouched.push(s.file + " " + it.need);
}));
console.log("  " + good + " good sentences and " + bad + " bad ones, over " +
            vouched.size + " of the written answers");
ok("every written answer has a sentence vouching for it",
   !unvouched.length, unvouched.join(", "));

console.log("\n" + pass + " assertions passed" + (fails.length ? ", " + fails.length + " FAILED" : ""));
process.exit(fails.length ? 1 : 0);
