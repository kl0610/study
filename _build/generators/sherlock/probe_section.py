# -*- coding: utf-8 -*-
"""Play a reading section in a real browser, twice, and see whether it changes.

    python _build/generators/sherlock/probe_section.py sherlock-carbuncle-3

The suites can prove that five versions exist in the data. They cannot prove that
running the thing again actually reaches the second one -- that depends on
localStorage, on the order start() and finish() touch it, and on the rerun button
going through fullRun(). So this sits section one twice in a row, getting every
question wrong on purpose the first time, and compares the two lists of wordings.

Every fault that mattered on this project was a rendering fault and no suite
caught one of them: the escaped markup, the HUD over the button, the panel that
would not open. So the last check is always the page itself.

Timings are not arbitrary. miss() opens the drawer on a 420ms delay, so a check
at 400ms catches nothing and reports a fault that is not there. The last
question's Next button finishes the run rather than advancing idx, so the loop
watches for the results card instead of waiting for idx to reach the end.
"""
import io
import json
import os
import subprocess
import sys
import tempfile
import time

ROOT = r"C:\Users\kl\projects\study"
SLUG = sys.argv[1] if len(sys.argv) > 1 else "sherlock-carbuncle-3"
APP = os.path.join(ROOT, "reading", SLUG)
PROBE = os.path.join(APP, "_probe.html")
CHROME = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
if not os.path.exists(CHROME):
    CHROME = r"C:\Program Files (x86)\Google\Chrome\Application\chrome.exe"
# Outside the repo: a Chrome profile is megabytes of cache nobody wants
# committed, and this script lives in the tree now.
PROFILE = os.path.join(tempfile.gettempdir(), "studycraft-probe-profile")
PORT = "8765"

JS = r"""
<script>
(function(){
  var out = {runs: [], excerptsSeen: 0, excerptsOurs: 0, missed: 0,
             papers: [], notes: []};
  var said = false;
  function say(){
    if (said) return;
    said = true;
    var d = document.createElement("pre");
    d.id = "PROBE"; d.textContent = JSON.stringify(out, null, 1);
    document.body.appendChild(d);
  }
  /* A watchdog, so a probe that gets stuck reports how far it got rather than
     reporting nothing at all. */
  setTimeout(function(){ out.notes.push("watchdog fired"); say(); }, 90000);
  window.addEventListener("error", function(e){
    out.error = String(e.message) + " @" + e.lineno;
  });
  function q(s){ return document.querySelector(s); }
  function all(s){ return [].slice.call(document.querySelectorAll(s)); }
  function text(){ return document.body.innerText.replace(/\s+/g, " "); }
  try { localStorage.removeItem("sc.paper"); } catch(e){}

  var own = "";
  function ownText(){
    own = Object.keys(DATA.passages).map(function(k){
      return (DATA.passages[k].text || []).join(" ");
    }).join(" ").replace(/\s+/g, " ");
  }

  function step(fns, done){
    (function next(i){
      if (i >= fns.length) return done();
      var wait = fns[i]();
      setTimeout(function(){ next(i + 1); }, wait === undefined ? 250 : wait);
    })(0);
  }

  function answer(wrongFirst, asked, after){
    var it = view(M.items[RUN[idx]]);
    var o = all(".opt").filter(function(b){ return !b.disabled; });
    if (!o.length) { out.notes.push("no options at " + idx); return after(); }
    /* Record the wording every time, not only on the pass that answers wrongly
       -- the point of the second sitting is to compare the two lists, and an
       empty list compares equal to nothing. */
    asked.push((q(".q") || {textContent:""}).textContent.trim());
    /* rPick shuffles, so the button holding the answer is found by its words and
       not by the index the data gives it. Going by index made a quarter of the
       deliberate misses land on the right answer. */
    var want = it.opts[it.a].replace(/\s+/g, " ").trim();
    var isRight = function(b){
      return b.textContent.replace(/\s+/g, " ").indexOf(want) !== -1;
    };
    var pick = wrongFirst
      ? (o.filter(function(b){ return !isRight(b); })[0] || o[0])
      : (o.filter(isRight)[0] || o[0]);
    if (wrongFirst && isRight(pick)) out.notes.push("no wrong option left at " + idx);
    step([
      function(){ pick.click(); return 120; },
      function(){ var g = q("#go"); if (g) g.click(); return wrongFirst ? 900 : 650; },
      function(){
        if (!wrongFirst) return 0;
        if (/Not yet\./.test(text())) out.missed++;
        var dr = q("#drawer"), box = q("#dbody");
        if (dr && dr.classList.contains("on") && box.getClientRects().length) {
          out.excerptsSeen++;
          var exn = q("#dbody .ex");
          var body = (exn || box).innerText.replace(/\s+/g, " ");
          if (!exn) out.notes.push("no quoted excerpt at " + idx);
          var line = (body.match(/[A-Za-z][^.!?]{25,}[.!?]/) || [""])[0].trim();
          if (line && own.indexOf(line.slice(0, 25)) !== -1) out.excerptsOurs++;
          else out.notes.push("excerpt not ours: " + line.slice(0, 50));
        } else {
          out.notes.push("the book did not open at " + idx);
        }
        var g = q("#dgo"); if (g) g.click();
        return 320;
      },
    ], after);
  }

  function onResults(){
    var d = q("#done");
    return !!(d && d.getClientRects().length);
  }
  function play(wrongFirst, asked, done){
    var guard = 0;
    (function one(){
      if (onResults() || ++guard > 40) return done();
      answer(wrongFirst, asked, function(){
        if (!wrongFirst) { var n = q("#navnext"); if (n) n.click();
                           return setTimeout(one, 300); }
        answer(false, asked, function(){
          var n = q("#navnext"); if (n) n.click();
          setTimeout(one, 300);
        });
      });
    })();
  }

  function sitting(first, done){
    var asked = [];
    play(first, asked, function(){
      setTimeout(function(){
        var t = text();
        var m = /That was paper (\d+) of (\d+)/.exec(t);
        out.papers.push(m ? m[1] + " of " + m[2] : "no paper line");
        out.runs.push(asked);
        if (first) {
          out.retakeMissed = /I missed/.test(t);
          out.retakeRunUp = /with the run-up/.test(t);
        }
        done();
      }, 700);
    });
  }

  setTimeout(function(){
    try {
      ownText();
      out.missions = DATA.missions.map(function(m){ return m.name; });
      var m = all(".mission");
      out.missionButtons = m.length;
      m[0].click();
      setTimeout(function(){
        out.started = !!q(".opt");
        out.sectionQs = RUN.length;
        out.papersHere = verCount();
        out.verAtStart = VER;
        sitting(true, function(){
          var again = q("#again");
          if (!again) { out.notes.push("no rerun button"); return say(); }
          again.click();
          setTimeout(function(){
            out.verOnSecondRun = VER;
            sitting(false, function(){ say(); });
          }, 500);
        });
      }, 500);
    } catch (e) { out.error = String(e) + " " + (e.stack || "").slice(0, 200); say(); }
  }, 400);
})();
</script>
"""


def main():
    if not os.path.isdir(APP):
        print("  no such app: reading/%s" % SLUG)
        return 1
    src = io.open(os.path.join(APP, "index.html"), encoding="utf-8", newline="").read()
    io.open(PROBE, "w", encoding="utf-8", newline="").write(
        src.replace("</body>", JS + "</body>", 1))
    srv = subprocess.Popen([sys.executable, "-m", "http.server", PORT],
                           cwd=ROOT, stdout=subprocess.DEVNULL,
                           stderr=subprocess.DEVNULL)
    try:
        time.sleep(1.2)
        url = "http://127.0.0.1:%s/reading/%s/_probe.html" % (PORT, SLUG)
        r = subprocess.run([CHROME, "--headless=new", "--disable-gpu",
                            "--user-data-dir=" + PROFILE,
                            "--virtual-time-budget=180000", "--dump-dom", url],
                           capture_output=True, timeout=420)
        dom = r.stdout.decode("utf-8", "replace")
        i = dom.find('<pre id="PROBE">')
        if i < 0:
            print("  the probe never reported.")
            print("  " + (r.stderr or b"").decode("utf-8", "replace")[:600])
            return 1
        blob = dom[i + len('<pre id="PROBE">'):dom.index("</pre>", i)]
        for ent, ch in (("&lt;", "<"), ("&gt;", ">"), ("&quot;", '"'), ("&amp;", "&")):
            blob = blob.replace(ent, ch)
        got = json.loads(blob)

        for k in sorted(got):
            if k == "runs":
                continue
            print("  %-16s %s" % (k, json.dumps(got[k], ensure_ascii=False)[:190]))
        runs = [list(dict.fromkeys(r)) for r in got.get("runs", [])]   # each once
        for n, asked in enumerate(runs, 1):
            print("\n  run %d asked:" % n)
            for s in asked:
                print("    " + s[:96])

        n = got.get("sectionQs")
        bad = []
        if not got.get("started"):
            bad.append("the mission never started")
        if got.get("missed") != n:
            bad.append("marked wrong %s of %s" % (got.get("missed"), n))
        if got.get("excerptsSeen") != n:
            bad.append("the book opened %s of %s times" % (got.get("excerptsSeen"), n))
        if got.get("excerptsOurs") != got.get("excerptsSeen"):
            bad.append("an excerpt was not from this story")
        if not got.get("retakeMissed") or not got.get("retakeRunUp"):
            bad.append("the two ways back were not offered")
        if got.get("papers")[:1] != ["1 of 5"]:
            bad.append("the card did not say paper 1 of 5 (%s)" % got.get("papers"))
        if got.get("verOnSecondRun") != 1:
            bad.append("the rerun was still on paper %s" % got.get("verOnSecondRun"))
        if len(runs) == 2:
            if not runs[1]:
                bad.append("the second run recorded no questions")
            elif runs[0] == runs[1]:
                bad.append("the second run asked exactly the same questions")
            elif set(runs[0]) & set(runs[1]):
                bad.append("%d questions repeated word for word"
                           % len(set(runs[0]) & set(runs[1])))
        else:
            bad.append("only %d runs completed" % len(runs))
        if got.get("notes"):
            bad.append("notes: " + "; ".join(got["notes"][:3]))
        print("\n  " + ("all good" if not bad else "PROBLEM: " + "; ".join(bad)))
        return 1 if bad else 0
    finally:
        srv.terminate()
        if os.path.exists(PROBE):
            os.remove(PROBE)


sys.exit(main())
