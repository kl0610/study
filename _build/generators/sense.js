/* Does the sentence actually mean anything? -- the one check this site had no
   answer for.
 *
 * The writing parts of the vocabulary paper used to be judged on three things
 * a machine can see: the word is in there, it runs to a sentence, it is
 * punctuated. All three can pass on a sentence that says nothing at all.
 *
 *     "The expedition went on an expedition across the expanse."
 *     "Ecstasy means being very happy."
 *     "My dad will accompany me to the shop."     <- the wrong meaning
 *
 * There is no model behind a page on github.io and there is not going to be
 * one, so this does the next honest thing: it looks for the evidence a right
 * answer cannot help leaving behind. Every prompt carries, in its own data,
 * the ideas its answer has to show -- "accompany" in the musical sense needs
 * something musical in the sentence; an "expanse" has to be an expanse OF
 * something; a prompt that asks for a difference needs both halves of it.
 * What comes back is a list of things that look missing, in words Myles can
 * act on.
 *
 * Two rules this must obey, and both are load-bearing:
 *
 *   1. It never overrules him. A doubt is shown, another try is offered, and
 *      he can keep the sentence and mark it himself. Guessing wrong about a
 *      good sentence must not cost him a right answer.
 *   2. There is one copy of this code. The app inlines this file, the test
 *      suite requires it, and the build runs it over every model answer -- so
 *      a model answer that would fail its own check cannot ship. Three
 *      hand-written copies of a rule drift, and the drift is silent.
 */
(function (root) {
  "use strict";

  /* Words that carry no content on their own. Only used for "is there
     anything in this sentence besides the word itself", so the list is
     deliberately harsh: "nice", "good" and "stuff" are padding here even
     though they are real words. */
  var STOP = ("a an the and but or nor so for to of in on at by with from as if then than "
    + "that this these those there here it its it's is am are was were be been being do does "
    + "did doing done have has had having will would shall should can could may might must "
    + "i me my mine myself you your yours he him his she her hers they them their theirs we "
    + "us our ours who whom whose which what when where why how not no none very really quite "
    + "just too also only even still yet about into onto over under up down out off again "
    + "more most much many some any all both each other another same one two first next last "
    + "thing things stuff lot lots bit good bad nice cool fun great big small okay ok like "
    + "likes liked get gets got getting go goes going went gone come comes came say says said "
    + "make makes made take takes took put puts use uses used want wants wanted know knows "
    + "knew think thinks thought see sees saw look looks looked").split(" ");

  function words(s) {
    return String(s).toLowerCase().match(/[a-z']+/g) || [];
  }

  /* An entry matches a word that is that entry plus an ending: "cross" covers
     crossed and crossing, "music" covers musical, "clums" covers clumsy.
     What it must NOT do is match any word that merely starts with it --
     "win" matched "window", "sea" matched "search" and "war" matched "warm",
     and every one of those made the check quietly agree with nonsense, which
     is the failure that cannot be seen from the outside. An entry with a
     space in it is matched as a phrase instead. */
  var TAIL = ["", "s", "es", "ed", "d", "ing", "ings", "er", "ers", "est", "ly", "y",
              "ies", "ied", "ion", "ions", "ment", "ments", "ement", "le", "al", "ful",
              "ness", "en", "ant", "ance", "ence", "ous", "ity", "'s"];

  function grown(word, stem) {
    if (word.indexOf(stem) !== 0) return false;
    if (TAIL.indexOf(word.slice(stem.length)) !== -1) return true;
    /* English doubles the last letter before an ending often enough to matter:
       admit/admitting, drop/dropped, stop/stopping, plan/planned. */
    return word.charAt(stem.length) === stem.slice(-1)
      && TAIL.indexOf(word.slice(stem.length + 1)) !== -1;
  }

  function hasAny(ws, line, of) {
    for (var i = 0; i < of.length; i++) {
      var x = of[i];
      if (x.indexOf(" ") !== -1) {
        if (line.indexOf(" " + x + " ") !== -1) return true;
      } else {
        for (var j = 0; j < ws.length; j++) {
          if (grown(ws[j], x)) return true;
        }
      }
    }
    return false;
  }

  /* The word he was told to use, and its close relations: captive/captivity,
     linger/lingered. Those do not count as content -- the question handed him
     those, so they are not evidence that he wrote anything. */
  function stems(need) {
    return (need || []).map(function (w) {
      var b = String(w).toLowerCase().replace(/[^a-z]/g, "");
      return b.slice(0, Math.max(4, Math.min(5, b.length)));
    });
  }

  /* How much of the sentence is his own. */
  function content(ws, need) {
    var st = stems(need);
    return ws.filter(function (w) {
      if (STOP.indexOf(w) !== -1) return false;
      for (var i = 0; i < st.length; i++) if (w.indexOf(st[i]) === 0) return false;
      return true;
    });
  }

  var THIN = "There is almost nothing in your sentence except the word itself. "
    + "Say what happened, or who, or where — give it something to be about.";

  /* The whole point of the file. Returns a list of plain-English doubts; an
     empty list means nothing looked missing. */
  function doubts(it, text) {
    var S = it && it.sense;
    var out = [];
    if (!S) return out;

    var ws = words(text);
    var line = " " + ws.join(" ") + " ";

    if (content(ws, it.need).length < 3) out.push(THIN);

    (S.avoid || []).forEach(function (g) {
      if (hasAny(ws, line, g.of)) out.push(g.why);
    });
    (S.show || []).forEach(function (g) {
      if (!hasAny(ws, line, g.of)) out.push(g.why);
    });
    return out;
  }

  /* Shape of a sense block, checked by the build and by the suite. A block
     with no groups in it would pass everything silently, which is the failure
     this whole file exists to stop happening quietly. */
  function faults(it) {
    var bad = [];
    var S = it && it.sense;
    if (!S) return ["has no sense block, so nothing checks whether the answer means anything"];
    if (!S.ask || String(S.ask).length < 20) bad.push("has no ask line worth reading");
    var groups = (S.show || []).concat(S.avoid || []);
    if (!(S.show || []).length) bad.push("has no show group, so no answer can ever look wrong");
    groups.forEach(function (g, i) {
      if (!g || !g.of || !g.of.length) bad.push("group " + i + " matches nothing");
      else g.of.forEach(function (x) {
        if (x !== String(x).toLowerCase()) bad.push("group " + i + " has a capital in " + x);
        if (String(x).replace(/[^a-z ]/g, "").length < 2) bad.push("group " + i + " has the stub " + x);
      });
      if (!g || !g.why || String(g.why).length < 20) bad.push("group " + i + " does not say what is missing");
    });
    /* The one that matters: he marks himself against the model, so a model the
       page would turn back is a model that teaches him the wrong lesson. */
    doubts(it, it.model || "").forEach(function (d) {
      bad.push("its own model answer is turned back — " + d);
    });
    return bad;
  }

  var SENSE = { doubts: doubts, faults: faults, words: words, content: content, STOP: STOP };

  if (typeof module !== "undefined" && module.exports) module.exports = SENSE;
  else root.SENSE = SENSE;

  /* Run over a spec from the build:  node sense.js wwtest_l8.json  */
  if (typeof module !== "undefined" && require.main === module) {
    var spec = JSON.parse(require("fs").readFileSync(process.argv[2], "utf8"));
    var bad = [], n = 0;
    (spec.parts || []).forEach(function (p) {
      if (p.type !== "say") return;
      (p.items || []).forEach(function (it) {
        n++;
        faults(it).forEach(function (f) {
          bad.push(p.id + ": " + String(it.q).replace(/<[^>]+>/g, "").slice(0, 46) + " — " + f);
        });
      });
    });
    if (bad.length) {
      console.log(bad.join("\n"));
      process.exit(1);
    }
    console.log("  " + n + " written answer" + (n === 1 ? "" : "s")
      + ", every model answer passes its own meaning check");
  }
})(typeof self !== "undefined" ? self : this);
