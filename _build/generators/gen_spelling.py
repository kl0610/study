"""Build a weekly spelling app from List 2's shell.

    python gen_spelling.py spelling_list4.json list4

The seven levels are a fixed ladder -- warm up, definitions, in a sentence, step
up, test day, and two challenges -- and they work for any word list, so a new
week is the word data and nothing else. Only the words, the rule, the week
label and the root change.

The last level asks him to write his own sentence, which is the one place on the
site he produces language rather than picking it. That is deliberate; keep it.

WHAT THIS FIXES. Until now this generator replaced DATA and the <title> and
nothing else, so every week inherited List 2's rule layer word for word. List 3
shipped headed "Spelling . Week 2 / List 2 / Rule: syllabication with double
consonants", counted twelve words when it had fourteen, said the pink letters
were doubled consonants when they were ie/ei pairs, stamped List 2's root
(AGR = FIELD) on List 3's flam words, and grouped its study chart by doubled
pairs -- a rule that week's list does not have. DATA.title, DATA.rule, DATA.week
and DATA.root were written into the file and then read by nothing at all.

So the rule layer is data now too. A week's spec says what its rule is, which
letters in each word the rule turns on (`mark`), which bucket of the study chart
each word sits in (`group`), and what to say when a word is revealed. The shell
computed doubled letters from the spelling, which works for exactly one rule;
ie/ei and a Latin plural ending cannot be computed, so each word carries its own
mark and the page looks it up.
"""
import io, json, os, re, sys

ROOT = r"C:\Users\kl\projects\study"
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(ROOT, "_build"))
MINE = sys.argv[1:]
sys.argv = ["x"]
import build_theme as B


def data_span(html):
    i = html.index("const DATA = ")
    b = html.index("{", i)
    d = 0
    for j in range(b, len(html)):
        if html[j] == "{":
            d += 1
        elif html[j] == "}":
            d -= 1
            if not d:
                return b, j + 1
    raise SystemExit("unbalanced DATA")


# The ladder, lifted from List 2 and held here rather than read back out of it.
# List 2's DATA is a JS object literal with unquoted keys, so it is not JSON and
# cannot be parsed as such -- and keeping the ladder here means a new week does
# not depend on an older week's file still existing.
LEVELS = [
    {"id": "l1", "name": "Warm up", "prompt": "def", "input": "boxes",
     "clue": "syllable", "wide": True, "tag": "Syllable by syllable",
     "blurb": "The boxes are split into syllable chunks with a gap between each one, "
              "and every chunk starts you off with its first letter."},
    {"id": "l2", "name": "Definitions", "prompt": "def", "input": "boxes",
     "clue": "first", "tag": "Meaning \u00b7 first letter",
     "blurb": "Same syllable chunks, but now only the very first letter of the "
              "whole word is given."},
    {"id": "l3", "name": "In a sentence", "prompt": "sent", "input": "boxes",
     "clue": "first", "tag": "Sentence \u00b7 first letter",
     "blurb": "A sentence with the word missing. Work out which word fits, then spell it."},
    {"id": "l4", "name": "Step up", "prompt": "both", "input": "free",
     "tag": "Listen \u00b7 meaning and sentence",
     "blurb": "Hear the word. Meaning and sentence to lean on, but no boxes and no letters."},
    {"id": "l5", "name": "Test day", "prompt": "none", "input": "free",
     "tag": "Listen \u00b7 nothing else",
     "blurb": "Dictation, the way Friday works. Hear the word, spell it. "
              "Nothing else on screen."},
    {"id": "l6", "name": "Challenge", "prompt": "none", "input": "free",
     "dictate": "def", "boss": True, "tag": "Hear the meaning \u00b7 name the word",
     "blurb": "You hear the definition read out loud \u2014 not the word \u2014 and you "
              "work out which word it is and spell it from nothing."},
    {"id": "l7", "name": "Challenge 2", "prompt": "word", "input": "sentence",
     "boss": True, "tag": "Write your own sentence",
     "blurb": "You get the word. Write a sentence that uses it properly. Miss twice "
              "and you will see one that works."},
]

NEED = ("title", "n", "rule", "ruleLine", "weekLabel", "test", "root",
        "chartBtn", "chartSub", "chartTail", "tips", "chart", "words")


def check(spec):
    """Refuse to build a list that would misbehave in the app rather than
    finding out from a ten-year-old on Friday morning."""
    bad = [("the spec has no %r" % k) for k in NEED if k not in spec]
    if bad:
        raise SystemExit("  refusing to build:\n    " + "\n    ".join(bad))

    for k in ("listen", "boxes", "reveal", "plain"):
        if not spec["tips"].get(k):
            bad.append("tips has no %r" % k)

    # The button reads "See the " + chartBtn, so chartBtn has to be a phrase that
    # follows an article. List 6 shipped reading "See the every way this list
    # spells the schwa" because nothing checked.
    first = spec["chartBtn"].split()[0].lower() if spec.get("chartBtn") else ""
    if first in ("the", "a", "an", "every", "all", "each", "some", "this", "these"):
        bad.append('chartBtn starts with %r, so the button would read '
                   '"See the %s"' % (first, spec["chartBtn"]))

    groups = set()
    for g in spec["chart"]:
        if g["key"] in groups:
            bad.append("two chart groups keyed %r" % g["key"])
        groups.add(g["key"])
        # chhead is written straight into the HTML; chnote goes through esc(),
        # so a tag in a note arrives on the screen as &lt;i&gt;. Found by
        # rendering the page, not by any test.
        if re.search(r"</?[a-zA-Z]+ ?/?>", g.get("note", "")):
            bad.append("chart group %r has markup in its note, which is escaped"
                       % g["key"])
        if g["dot"] not in ("two", "one", "none"):
            bad.append("chart group %r has dot %r, which has no style"
                       % (g["key"], g["dot"]))

    words = set(w["w"] for w in spec["words"])
    for w in spec["words"]:
        s = w["w"]
        if "".join(w["syl"]) != s:
            bad.append("%s: syllables spell %r" % (s, "".join(w["syl"])))
        if "___" not in w["sent"]:
            bad.append("%s: sentence has no ___ blank" % s)
        if s.lower() in w["sent"].lower().replace("___", ""):
            bad.append("%s: the sentence gives the word away" % s)
        if not w["def"] or not w["pos"]:
            bad.append("%s: missing definition or part of speech" % s)
        # The pill has its own colour for v and adj; everything else falls back
        # to the default sky pill, which is what n and adv have always used. A
        # preposition is a real part of speech on these lists -- "toward" is one
        # -- and refusing it only pushed the sheet into labelling it wrongly.
        if w["pos"] not in ("n", "v", "adj", "adv", "prep", "pron", "conj"):
            bad.append("%s: part of speech %r has no pill style" % (s, w["pos"]))
        # The mark is what the page paints pink, so it has to land inside the
        # word. An off-by-one here paints the wrong letters and teaches the
        # wrong rule, which is worse than painting nothing at all.
        if "mark" in w:
            a, n = w["mark"]
            if a < 0 or n < 1 or a + n > len(s):
                bad.append("%s: mark %r falls outside the word" % (s, w["mark"]))
        if w.get("group") not in groups:
            bad.append("%s: group %r is not one of the chart's" % (s, w.get("group")))
        # A partner shown on the study chart that is not on the list is a dead end.
        if w.get("pair") and w["pair"] not in words:
            bad.append("%s: paired with %r, which is not on this list" % (s, w["pair"]))
    if bad:
        raise SystemExit("  refusing to build:\n    " + "\n    ".join(bad))


# A part of speech only has a pill if there is a rule painting it. n and adv
# share the default sky pill; v and adj have their own. "toward" is a
# preposition and the sheet says so, so prep gets one too rather than being
# mislabelled as something it is not.
POS_CSS_OLD = '.postag[data-p="adj"]{background:var(--rose)}'
POS_CSS_NEW = ('.postag[data-p="adj"]{background:var(--rose)}\n'
               '.postag[data-p="prep"]{background:var(--lime);color:var(--ink)}')


def sub(s, old, new, what):
    """Replace exactly one occurrence, or stop. build_theme.py exits 0 whether
    or not a patch lands, and a silently skipped patch is how List 2's rule
    ended up printed across the top of List 3."""
    n = s.count(old)
    if n != 1:
        raise SystemExit("  patch %r matched %d times, wanted 1:\n    %s"
                         % (what, n, old.split("\n")[0][:100]))
    return s.replace(old, new, 1)


# ---------------------------------------------------------------- the rule layer
MARKS_JS = """/* The letters this week's rule turns on, looked up by word. List 2's rule was
   doubled consonants, which can be computed from the spelling; ie/ei and a
   Latin plural ending cannot, so each word carries its own mark and this is the
   lookup. A word with no mark -- a root or teacher's-choice word -- gets an
   empty set, and nothing is painted. */
const MARKS={};
DATA.words.forEach(x=>{ const s=new Set();
  if(x.mark) for(let i=0;i<x.mark[1];i++) s.add(x.mark[0]+i);
  MARKS[x.w]=s; });
const marked = w => MARKS[w] || new Set();
const ROOTLAB = DATA.root.stem+" = "+DATA.root.means;"""

CHART_JS = """function chart(){
  const card=(x)=>{
    const d=marked(x.w);
    const html=[...x.w].map((ch,i)=>d.has(i)?`<b>${ch}</b>`:ch).join("");   /* whole word, no breaks */
    const chips=[];
    if(x.mark) chips.push(x.w.slice(x.mark[0],x.mark[0]+x.mark[1]));
    if(x.pair) chips.push("\\u2194 "+x.pair);
    return `<div class="chw"><div class="chword">${html}</div>
      ${chips.length?`<div class="chpairs">${chips.map(q=>`<span>${esc(q)}</span>`).join("")}</div>`:""}
      <div class="chdef">${esc(x.def)}</div></div>`;};

  $("chbody").innerHTML = DATA.chart.map(g=>{
    const list=DATA.words.filter(x=>x.group===g.key);"""

OLD_CHART = """function pairsIn(w){                       /* how many doubled pairs the word contains */
  const out=[]; for(let i=0;i<w.length-1;i++) if(w[i]===w[i+1]){ out.push(w[i]+w[i+1]); i++; }
  return out;
}
function chart(){
  const card=(x)=>{
    const d=doubles(x.w);
    const html=[...x.w].map((ch,i)=>d.has(i)?`<b>${ch}</b>`:ch).join("");   /* whole word, no breaks */
    const p=pairsIn(x.w);
    return `<div class="chw"><div class="chword">${html}</div>
      ${p.length?`<div class="chpairs">${p.map(q=>`<span>${q}</span>`).join("")}</div>`:""}
      <div class="chdef">${esc(x.def)}</div></div>`;};

  const groups=[
    { n:2, head:"Two pairs", note:"two doubled letters in the same word", dot:"two" },
    { n:1, head:"One pair",  note:"a single doubled letter",              dot:"one" },
    { n:0, head:"No pairs",  note:"the agr root words",                   dot:"none" }
  ];
  $("chbody").innerHTML = groups.map(g=>{
    const list=DATA.words.filter(x=>pairsIn(x.w).length===g.n);"""


def rule_layer(out, spec):
    n, N = spec["n"], len(spec["words"])

    # Idempotent: the shell is List 2's, which has no prep on it, so this lands
    # once. A list that is rebuilt from an already-patched shell would not match
    # and sub() would say so rather than painting it twice.
    if POS_CSS_NEW not in out:
        out = sub(out, POS_CSS_OLD, POS_CSS_NEW, "the part-of-speech pills")

    out = sub(out,
              '    <div class="eyebrow" style="margin-top:14px">Spelling &middot; Week 2</div>\n'
              '    <h1>List <em>2</em></h1>\n'
              '    <div class="rule">Rule: <b>syllabication with double consonants</b>'
              ' &mdash; ten of these twelve words hide a doubled letter.</div>',
              '    <div class="eyebrow" style="margin-top:14px">Spelling &middot; %s</div>\n'
              '    <h1>List <em>%d</em></h1>\n'
              '    <div class="rule">Rule: <b>%s</b> &mdash; %s</div>'
              % (spec["weekLabel"], n, spec["rule"], spec["ruleLine"]), "header")

    out = sub(out,
              '  <button class="listbtn" id="showlist">Study the twelve words first</button>\n'
              '  <button class="listbtn" id="chart1" style="margin-top:9px">'
              'See the doubled letters side by side</button>\n'
              '  <footer>Twelve words, three ways. Test Friday, Aug 28.</footer>',
              '  <button class="listbtn" id="showlist">Study the %d words first</button>\n'
              '  <button class="listbtn" id="chart1" style="margin-top:9px">'
              'See the %s</button>\n'
              '  <footer>%d words, three ways. Test %s.</footer>'
              % (N, spec["chartBtn"], N, spec["test"]), "home buttons")

    out = sub(out,
              '<div class="t"><strong>All twelve words</strong>'
              '<span>Doubled letters in pink</span></div>',
              '<div class="t"><strong>All %d words</strong><span>%s</span></div>'
              % (N, spec["chartSub"]), "chart heading")

    out = sub(out,
              '    <div class="eyebrow">Spelling List 2</div>\n'
              '    <h3>All twelve words</h3>',
              '    <div class="eyebrow">Spelling List %d</div>\n'
              '    <h3>All %d words</h3>' % (n, N), "drawer heading")

    out = sub(out,
              r'<button class="btn o" id="chart2">See all 12 words \u2014 doubles in pink</button>',
              r'<button class="btn o" id="chart2">See all %d words \u2014 %s</button>'
              % (N, spec["chartTail"]), "results chart button")

    out = sub(out,
              '/* Spelling List 2 \u2014 Week 2, 8/24\u20138/28. Test Friday 8/28/26.\n'
              '   Rule: Syllabication with Double Consonants.',
              '/* %s \u2014 %s. Test %s.\n   Rule: %s.'
              % (spec["title"], spec["weekLabel"], spec["test"], spec["rule"]),
              "file comment")

    out = sub(out,
              '/* positions that are part of a doubled letter */\n'
              'function doubles(w){const s=new Set();for(let i=0;i<w.length-1;i++)'
              ' if(w[i]===w[i+1]){s.add(i);s.add(i+1);}return s;}',
              MARKS_JS, "marks lookup")

    out = sub(out,
              '  const d=doubles(w), out=new Set();          '
              '/* scatter: never a doubled letter */',
              '  const d=marked(w), out=new Set();           '
              '/* scatter: never a letter the rule is about */', "clueSet scatter")

    out = sub(out,
              '<span class="rootpill">ROOT AGR = FIELD</span>',
              '<span class="rootpill">ROOT ${esc(ROOTLAB.toUpperCase())}</span>',
              "root pill")

    out = sub(out, '  const dbl=doubles(w.w).size>0;',
              '  const dbl=marked(w.w).size>0;', "dbl in checkNow")

    out = sub(out,
              r'      dbl && tries===1?" Listen for the doubled letter \u2014'
              r' that is the rule this week.":""',
              '      dbl && tries===1?DATA.tips.listen:""', "listening tip")

    out = sub(out,
              r'    }${dbl && tries===1?" Remember the rule \u2014'
              r' this word has a doubled letter.":""}</div>`;',
              '    }${dbl && tries===1?DATA.tips.boxes:""}</div>`;', "boxes tip")

    out = sub(out, '  const d=doubles(w.w);\n  let i=0;',
              '  const d=marked(w.w);\n  let i=0;', "good() marks")

    out = sub(out,
              r'  }</strong>${d.size?"The doubled letters are in pink.'
              r' That is the part the test is looking for.":"No double consonant in this one'
              r' \u2014 it is a root word."}</div>',
              '  }</strong>${d.size?DATA.tips.reveal:DATA.tips.plain}</div>', "reveal line")

    out = sub(out, r'${w.root?" \u00b7 agr = field":""}',
              r'${w.root?" \u00b7 "+ROOTLAB:""}', "reveal caption root")

    out = sub(out, OLD_CHART, CHART_JS, "chart groups")

    out = sub(out, '    const d=doubles(w.w); let i=0;',
              '    const d=marked(w.w); let i=0;', "word list marks")

    out = sub(out, r'${w.root?`<span class="s">agr = field</span>`:""}',
              r'${w.root?`<span class="s">${esc(ROOTLAB)}</span>`:""}', "word list root")

    # Nothing of List 2's rule may survive into another week's file. Every one
    # of these shipped in List 3 and was on screen for a week.
    leftovers = ["doubles(", "pairsIn(", "agr = field", "AGR = FIELD",
                 "doubled letter", "double consonant", "twelve words",
                 "Test Friday, Aug 28"]
    if n != 2:
        leftovers += ["Spelling List 2", "Week 2"]
    still = [x for x in leftovers if x in out]
    if still:
        raise SystemExit("  List 2's rule is still in the file: " + ", ".join(still))
    return out


# ------------------------------------------------------------------- the drill
# A missed word does not slide past any more. He writes it out three times with
# the spelling in front of him, then once more with it hidden and only the word
# read aloud. Copying with the eyes switched off is easy and teaches nothing, so
# the hidden go is the part that counts: fail it and three fresh copies start
# over. Nothing in here costs a heart. The miss was already paid for when it
# happened, and charging twice for one mistake teaches a ten-year-old to dread
# the round rather than to learn the word.
# The three write-outs are the instruction, so they are on the screen as three
# things to be ticked off rather than as three thin bars he has to decode. A
# bar that fills is a progress indicator; a list that says "First time done" is
# a set of instructions, and that is what a ten-year-old needs here.
CSS_OLD = '.chdot.none{background:#4E5D75}'
DRILL_CSS = """
.dtitle{font-weight:800;font-size:16.5px;color:var(--ink);margin:2px 0 9px;letter-spacing:.2px}
.dsteps{display:flex;flex-direction:column;gap:7px;margin:0 0 15px}
.dstep{display:flex;align-items:center;gap:11px;padding:10px 13px;border-radius:12px;
  background:#F1EADB;color:#9A8F7A;font-weight:700;font-size:15.5px;line-height:1.2}
.dstep .dnum{width:25px;height:25px;border-radius:50%;flex:none;display:flex;
  align-items:center;justify-content:center;background:#D6CDBB;color:#FFF;
  font-size:13.5px;font-weight:800}
.dstep.done{background:#E4F2DF;color:#3E7A2D}
.dstep.done .dnum{background:#63BE7B}
.dstep.now{background:#FCE4ED;color:#AF3862}
.dstep.now .dnum{background:#E0709A}"""

DRILL_JS = r"""/* ---------- the correction drill ----------
   Three copies with the word in view, then one go with it hidden. The copies
   build the habit; the hidden go is the only part that proves anything, which
   is why failing it sends him back to the copies rather than waving him
   through. A right one at the end calls MC.right, so putting a miss straight
   pays exactly as every other fix on the site pays. Miss the hidden go twice
   and he is offered a way out, because a ten-year-old stuck in a loop at nine
   at night has stopped learning. */
const STEPS = ["First time", "Second time", "Third time"];
const DREPS = STEPS.length;
function drillStart(w, done){
  let rep = 0, phase = "copy", fails = 0, val = "";

  const pretty = () => { const d = marked(w.w); let i = 0;
    return w.syl.map(s => [...s].map(ch => {
      const p = i++; return d.has(p) ? `<b>${ch}</b>` : ch; }).join("")).join("<i>·</i>"); };

  function renderD(){
    val = "";
    const copy = phase === "copy";
    /* The word itself never appears on the hidden go -- not in the heading,
       not in the placeholder, nowhere. That was the point of hiding it. */
    $("card").innerHTML = `
      <div class="meta">
        <span class="qn">Word ${idx + 1} of ${order.length}</span>
        <span class="qn" style="color:#E0709A">${copy ? "Write it out · " + (rep + 1) + " of " + DREPS
                                                      : "Now with it hidden"}</span>
      </div>
      <div class="dtitle">${copy ? "Write it three times" : "Now spell it with it hidden"}</div>
      <div class="dsteps">${STEPS.map((label, i) => {
        const done = i < rep, here = i === rep && copy;
        return `<div class="dstep ${done ? "done" : (here ? "now" : "")}">` +
               `<span class="dnum">${done ? "✓" : (i + 1)}</span>` +
               `${label}${done ? " done" : ""}</div>`; }).join("")}</div>
      ${copy ? `<div class="reveal"><div class="word">${pretty()}</div>
                  <div class="cap">copy it exactly · ${w.syl.length} syllables</div></div>`
             : `<div class="listen">
                  <button class="big" id="dsay" aria-label="Hear the word">
                    <svg viewBox="0 0 24 24" stroke-linecap="round" stroke-linejoin="round"><path d="M11 5L6 9H2v6h4l5 4V5z"/><path d="M15.5 8.5a5 5 0 010 7"/><path d="M19 5a9 9 0 010 14"/></svg>
                  </button>
                  <span class="lab">Tap to hear it again</span>
                </div>`}
      <div class="freewrap">
        <input class="freein" id="dtyped" type="text" inputmode="text" autocomplete="off"
               autocapitalize="off" autocorrect="off" spellcheck="false"
               placeholder="${copy ? "write it here" : "spell it from memory"}" aria-label="Type the word">
      </div>
      <div class="act"><button class="btn p" id="dgo" disabled>${copy ? "That is one" : "Check it"}</button></div>
      <div id="dfb"></div>`;
    const inp = $("dtyped");
    inp.addEventListener("input", () => {
      val = inp.value.toLowerCase().replace(/[^a-z]/g, "");
      inp.value = val;
      inp.classList.remove("bad");
      $("dfb").innerHTML = "";
      $("dgo").disabled = copy ? val.length !== w.w.length : val.length < 2;
    });
    inp.addEventListener("keydown", e => { if (e.key === "Enter" && !$("dgo").disabled) checkD(); });
    $("dgo").onclick = checkD;
    if (!copy){ $("dsay").onclick = () => speak(w.w); setTimeout(() => speak(w.w), 320); }
    setTimeout(() => inp.focus(), 80);
    window.scrollTo(0, 0);
  }

  function checkD(){
    const inp = $("dtyped");
    if (val === w.w){
      if (phase === "copy"){
        rep++;
        if (rep < DREPS){ renderD(); return; }
        phase = "test"; renderD(); return;
      }
      MC.right(w.w);
      inp.readOnly = true; inp.classList.add("good"); inp.blur();
      $("card").querySelector(".act").innerHTML =
        `<button class="btn g" id="dnext">Got it — next word</button>`;
      /* The last thing he sees is the spelling with the rule painted on it,
         the same way every other right answer on the site ends. Leaving it at
         what he typed means the prefix is never pointed at on the one word he
         got wrong, which is the word that most needed it. */
      $("dfb").innerHTML = `<div class="fb yes"><strong>That is the one.</strong>` +
        `Three times with it in front of you, then once with nothing to look at. ` +
        `That last one is the bit that sticks.</div>
        <div class="reveal"><div class="word">${pretty()}</div>
          <div class="cap">${DATA.tips.reveal}</div></div>`;
      $("dnext").onclick = done;
      return;
    }

    inp.classList.add("bad");
    const off = val.length === w.w.length
      ? [...val].filter((c, i) => c !== w.w[i]).length : 0;

    if (phase === "copy"){
      $("dfb").innerHTML = `<div class="fb no"><strong>Not a copy yet.</strong>` +
        (off ? (off === 1 ? "One letter is different from the word above. "
                          : off + " letters are different from the word above. ") : "") +
        `Read it across, letter by letter.</div>`;
      setTimeout(() => { val = ""; inp.value = ""; inp.classList.remove("bad");
                         $("dgo").disabled = true; inp.focus(); }, 900);
      return;
    }

    /* The hidden go, missed. No heart, no buzzer -- just round again. */
    fails++;
    $("dfb").innerHTML = `<div class="fb no"><strong>Not yet.</strong>` +
      `Back to writing it out — three more, then try it hidden again.</div>`;
    if (fails >= 2){
      inp.readOnly = true; inp.blur();
      $("card").querySelector(".act").innerHTML =
        `<button class="btn p" id="dagain">Write it out again</button>
         <button class="btn o" id="dlater">Come back to this one later</button>`;
      $("dagain").onclick = () => { phase = "copy"; rep = 0; renderD(); };
      $("dlater").onclick = done;
      return;
    }
    phase = "copy"; rep = 0;
    setTimeout(renderD, 1500);
  }

  renderD();
}

"""


def drill_layer(out):
    """Send every missed word through the drill before the next one."""
    out = sub(out, "function finish(){", DRILL_JS + "function finish(){", "drill body")

    out = sub(out, CSS_OLD, CSS_OLD + DRILL_CSS, "drill styles")

    # A miss ends the question. There is no second guess anywhere and no "show
    # me the word" button left to press: the word comes up and he writes it
    # out. This replaces the whole tail of checkNow, reveal button and all,
    # rather than returning early in front of it -- code that can no longer be
    # reached is code the next person has to work out is dead.
    out = sub(out,
              '  const act=$("card").querySelector(".act");\n'
              '  if(tries>=2 && !$("show")) act.insertAdjacentHTML("beforeend",\n'
              '    `<button class="btn o" id="show">Show me the word</button>`);\n'
              '  if($("show")) $("show").onclick=()=>{ shown=true; good(true); };\n'
              '  setTimeout(()=>{ typed=""; const t=$("typed");'
              ' if(t){ t.value=""; t.classList.remove("bad"); }\n'
              '                   paint(); if(t) t.focus(); }, free?1400:900);',
              '  /* One miss ends the question, on every level. Guessing again is\n'
              '     the habit Friday punishes, so the word comes up instead and he\n'
              '     writes it out. */\n'
              '  log[idx]=false;\n'
              '  const ti=$("typed"); if(ti){ ti.readOnly=true; ti.blur(); }\n'
              '  $("card").querySelector(".act").innerHTML="";\n'
              '  const advance=()=>{ if(idx===order.length-1) finish();'
              ' else { idx++; render(); window.scrollTo(0,0);} };\n'
              '  setTimeout(()=>drillStart(w,advance),1500);',
              "one miss ends the question")

    # Both wrong-answer messages now say what is about to happen instead of
    # inviting another go. The rule tip stays: it is the last thing he reads
    # before the word appears, and it is the reason the word looks as it does.
    out = sub(out, "Not quite.</strong>Tap the speaker and listen again.",
              "Not quite.</strong>Here comes the word to write out.",
              "free miss message")
    out = sub(out,
              '    setTimeout(()=>speak(LVL().dictate==="def"?w.def:w.w),260);\n',
              '', "re-speak on a miss")
    out = sub(out,
              '      wrong===1?"One letter is off.":wrong+" letters are off."\n'
              '    }${dbl && tries===1?DATA.tips.boxes:""}</div>`;',
              '      wrong===1?"One letter is off.":wrong+" letters are off."\n'
              '    } Here comes the word to write out.'
              '${dbl?DATA.tips.boxes:""}</div>`;',
              "boxes miss message")

    # The drill is the point of this build. A patch that lands in the wrong
    # order, or an anchor that has drifted, must stop the build rather than
    # ship a file where a missed word quietly walks on to the next one.
    # One way in and one way only: a miss in checkNow. If the reveal button is
    # still anywhere in the file then the old two-guesses path survived, which
    # is the exact thing this build removes.
    for need, n in (("function drillStart(", 1),
                    ("drillStart(w,advance),1500", 1),
                    ("drillStart(", 2),
                    ('id="dtyped"', 1), ('phase = "test"', 1),
                    ("Show me the word", 0), ('id="show"', 0),
                    ('tries>=2 && !$("show")', 0),
                    # l7 writes a sentence rather than spelling a word, so its
                    # second try and its worked example stay exactly as they
                    # were. A bare count of tries>=2 would have called that a
                    # leftover and sent someone deleting the wrong thing.
                    ('tries>=2 && !$("egbtn")', 1),
                    ("drillNow", 0),
                    ('class="dsteps"', 1), ("First time", 1)):
        if out.count(need) != n:
            raise SystemExit("  the drill did not land: %r appears %d times, wanted %d"
                             % (need, out.count(need), n))
    # The whole value of the hidden go is that the spelling is off the screen.
    # Anything that prints w.w while phase is "test" quietly turns it back into
    # a copying exercise, so the branch is read out and checked here.
    # Both anchors are searched from inside the drill, not from the top of the
    # file. The main card has a freewrap too, and it sits earlier, so searching
    # from zero gave an empty slice -- a check that passed by inspecting
    # nothing at all. It let a deliberate leak straight through once.
    top = out.index("function drillStart(")
    a = out.index('             : `<div class="listen">', top)
    b = out.index('      <div class="freewrap">', a)
    hidden = out[a:b]
    if len(hidden) < 200:
        raise SystemExit("  the hidden-go check is reading %d characters, so it "
                         "is not reading the branch" % len(hidden))
    if "w.w" in hidden:
        raise SystemExit("  the hidden go prints the word: %r" % hidden[:160])
    return out


def main():
    spec_name = MINE[0] if MINE else "spelling_list4.json"
    out_dir = MINE[1] if len(MINE) > 1 else "list4"
    spec = json.load(io.open(os.path.join(HERE, spec_name), encoding="utf-8"))
    check(spec)

    src = io.open(os.path.join(ROOT, "spelling", "list2", "index.html"),
                  encoding="utf-8").read()
    shell = B.strip_theme(src)
    if shell is None:
        raise SystemExit("could not strip the theme off List 2")

    b, e = data_span(shell)

    data = {
        "title": spec["title"],
        "n": spec["n"],
        "rule": spec["rule"],
        "weekLabel": spec["weekLabel"],
        "test": spec["test"],
        "root": spec["root"],
        "tips": spec["tips"],
        "chart": spec["chart"],
        "words": spec["words"],
        "levels": LEVELS,
    }
    out = shell[:b] + json.dumps(data, ensure_ascii=False, indent=1) + shell[e:]
    out = re.sub(r"<title>.*?</title>",
                 "<title>%s \u2014 %s</title>" % (spec["title"], spec["rule"]),
                 out, count=1)
    out = rule_layer(out, spec)
    out = drill_layer(out)

    d = os.path.join(ROOT, "spelling", out_dir)
    os.makedirs(d, exist_ok=True)
    io.open(os.path.join(d, "index.html"), "w", encoding="utf-8",
            newline="\r\n").write(out)
    print("  spelling/%s  %d words, %d levels  %.1f KB"
          % (out_dir, len(data["words"]), len(data["levels"]), len(out) / 1024))
    print("  rule: %s   root: %s = %s   test: %s"
          % (spec["rule"], spec["root"]["stem"], spec["root"]["means"], spec["test"]))
    print("  miss a word and it costs %d copies plus one go with it hidden"
          % 3)
    for g in spec["chart"]:
        ws = [w["w"] for w in spec["words"] if w.get("group") == g["key"]]
        print("    %-28s %s" % (g["head"], ", ".join(ws)))


main()
