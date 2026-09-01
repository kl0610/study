#!/usr/bin/env python3
"""
Injects the Minecraft theme layer (theme/mc.css + theme/mc.js) into all four
study apps and patches their call sites.

    python3 build_theme.py [--inline]

Default links sprites by relative path (../../assets/) so the 264 KB of art is
downloaded once and browser-cached across all four apps. --inline base64s the
sprites into each file instead, which keeps every app a single offline file at
a cost of roughly +360 KB each.

Idempotent: re-running on already-themed files is a no-op for the injection and
the patches are all exact-match, so a second run reports "already themed".
"""

import base64, json, pathlib, re, sys

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
import review

# Runs either from a folder holding study/ + theme/, or from inside study/_build/.
HERE   = pathlib.Path(__file__).resolve().parent
if (HERE / "study").is_dir():
    STUDY, THEME = HERE / "study", HERE / "theme"
elif HERE.name == "_build":
    STUDY, THEME = HERE.parent, HERE
else:
    sys.exit("run me from the folder holding study/, or from study/_build/")
ASSETS = STUDY / "assets"

INLINE  = "--inline" in sys.argv
RETHEME = "--retheme" in sys.argv

# ---------------------------------------------------------------- call sites

def mission_app(s, name):
    """Science Ch1, Science Ch2 and the Sherlock passage are one program with
    three data files, so they take one set of hooks: persisted best badges on
    the picker, a heart refill entering a mission, a right/wrong beat per item,
    and the chest above the score ring.

    Only Ch1 was ever wired. Ch2 and the reading app were handed the engine and
    a config but no call sites at all, so nothing they did reached MC — no ore,
    no chest, no dragon, whatever the dragon target said. Routing all three
    through here is what fixes that, and stops them drifting apart again."""
    p = Patcher(s, name)
    # the picker's "best X%" badges were in-memory only and forgot everything
    # on reload; MC has been persisting the same numbers all along
    p.at('const best = {};', after__raw='const best = MC.bests();')
    p.at('<button class="mission" style="--c:${COLORS[i]}" data-m="${i}"',
         after__raw='<button class="mission ${best[m.id]==null?\'\':'
                    '(best[m.id]>=75?\'mc-cleared\':\'mc-tried\')}"'
                    ' style="--c:${COLORS[i]}" data-m="${i}"')
    p.at('${best[m.id]!=null?`<span class="badge">best ${best[m.id]}%</span>`:""}',
         after__raw='${best[m.id]!=null?`<span class="badge mc-best'
                    '${best[m.id]>=75?" mc-done":""}">${best[m.id]>=75?"CLEARED &middot; ":""}'
                    'best ${best[m.id]}%</span>`:""}')
    p.at('function start(i){\n  M = DATA.missions[i]; idx=0; log=[];',
         after='\n  MC.begin();')
    p.at('function miss(it,msg){\n',
         after='  MC.wrong(M.id+"-"+idx);\n')
    p.at('function win(it){\n',
         after='  MC.right(M.id+"-"+idx);\n')
    # results: chest goes in above the score ring
    p.at('  $("pick").onclick=home;\n  show("done");',
         before='  MC.chest($("scorebox"), pct, {id:M.id,\n'
                '    boss: DATA.missions.indexOf(M)===DATA.missions.length-1});\n')
    return p


def sci(s):
    return mission_app(s, "science")


def spell(s):
    p = Patcher(s, "spelling")
    p.at('const best={};', after__raw='const best = MC.bests();')
    # ring the card itself, so status survives a glance mid-scroll
    p.at('<button class="lv" style="--c:${COLORS[i]}" data-l="${i}">',
         after__raw='<button class="lv ${best[l.id]==null?\'\':'
                    '(best[l.id]>=75?\'mc-cleared\':\'mc-tried\')}"'
                    ' style="--c:${COLORS[i]}" data-l="${i}">')
    # the badge only ever said "best X%" — say plainly whether it is cleared
    p.at('${best[l.id]!=null?`<span class="badge">best ${best[l.id]}%</span>`:""}',
         after__raw='${best[l.id]!=null?`<span class="badge mc-best'
                    '${best[l.id]>=75?" mc-done":""}">${best[l.id]>=75?"CLEARED &middot; ":""}'
                    'best ${best[l.id]}%</span>`:""}')
    p.at('function start(l,subset){\n  LV=l;',
         after='\n  MC.begin({partial: !!(subset && subset.length)});')
    p.at('function good(revealed){\n  const w=DATA.words[order[idx]];\n'
         '  log[idx] = revealed ? false : (tries===1);',
         after='\n  if(revealed) MC.note(w.w); else MC.right(w.w);')
    # the three wrong-answer branches inside checkNow
    p.at('    if(problem){\n      $("typed").classList.add("bad");',
         after='\n      MC.wrong(w.w);')
    p.at('  if(free){\n    /* say nothing about length',
         after__raw='  if(free){\n    MC.wrong(w.w);\n'
                    '    /* say nothing about length')
    p.at('  } else {\n    const wrong=[...typed].filter((c,i)=>c!==w.w[i]).length;',
         after='\n    MC.wrong(w.w);')
    p.at('  $("chart2").onclick=()=>{ lastScreen="done"; chart(); };',
         before='  MC.chest($("scorebox"), pct, {id:LVL().id, boss: !!LVL().boss});\n')
    return p


def vocab(s):
    p = Patcher(s, "vocabulary")
    p.at('function build(){\n  tries=0; hinted=false;',
         after__raw='function build(){\n  MC.begin();\n  tries=0; hinted=false;')
    p.at('  if(!w.length && done===all){ win(); return; }',
         after__raw='  if(!w.length && done===all){'
                    ' slots.forEach(s=>MC.credit(s.word)); MC.right(); win(); return; }')
    p.at('  if(!w.length){                       /* everything finished so far is right */',
         after='\n    MC.right();')
    # one wrong check = one miss, however many lines it covers
    p.at('  tries++;\n  $("fb").innerHTML=`<div class="fb no">',
         after__raw='  tries++;\n'
                    '  w.forEach(n=>{const s=slots.find(x=>x.n===n); if(s) MC.note(s.word);});\n'
                    '  MC.wrong();\n'
                    '  $("fb").innerHTML=`<div class="fb no">')
    # BUG FIX: tries only increments on a *wrong* check, so a flawless sheet
    # ends on tries===0 and falls through the chain to 25%. Floor it at 1.
    p.at('  const pts = hinted?25:(tries===1?100:tries===2?75:tries===3?50:25);',
         after__raw='  const _t = Math.max(1, tries);\n'
                    '  const pts = hinted?25:(_t===1?100:_t===2?75:_t===3?50:25);')
    p.at('  $("again").onclick=build;\n  $("list2").onclick=openList;',
         before='  MC.chest($("scorebox"), pts, {id:"sheet", boss:true});\n')
    return p


def sci2(s):
    """CKSci Chapter 2 — the same program as Ch1, so the same hooks."""
    return mission_app(s, "science2")


def sci3(s):
    """CKSci Chapter 3 — same program again. It had never been built at all:
    no engine, no config, no call sites, so it was the one chapter with no HUD
    of any kind rather than a HUD nothing drove."""
    return mission_app(s, "science3")


def sci4(s):
    """CKSci Chapter 4 — generated from Ch3's shell, so its call sites came
    across already patched. Config only, like hist2/hist3."""
    return Patcher(s, "science4")


def vtest(s):
    """Wordly Wise List 1 unit test — theme-aware; config only. It runs with
    hud:false, because a test should not have hearts draining while it is being
    taken: nothing is marked until Finish. Misses go in through MC.note(), so
    they still land in the shared miss log, and a clean sheet still leaves
    halves at 20 — which is exactly the condition the dragon wants."""
    return Patcher(s, "vocabtest")


def hist4(s):
    """CKHG Chapter 4 — generated from Ch3's shell, so its call sites came
    across already patched. Config only, like hist2/hist3."""
    return Patcher(s, "history4")


def math7(s):
    """Saxon Course 2 Lesson 7 — built on the history shell by gen_math.py, so
    its call sites came across already patched. Config only."""
    return Patcher(s, "math7")


def spell3(s):
    """Spelling List 3 — generated from List 2's shell, so its call sites came
    across already patched. Config only."""
    return Patcher(s, "spelling3")


def vocab2(s):
    """Word List 2 sheet — generated from the List 1 sheet's shell, so its call
    sites came across already patched. Config only."""
    return Patcher(s, "vocabulary2")


def vtest2(s):
    """Wordly Wise List 2 unit test — generated from the List 1 test's shell, so
    its call sites came across already patched. Config only, and hud:false for
    the same reason as List 1."""
    return Patcher(s, "vocabtest2")


def reads(name):
    """The Speckled Band is one story cut into sections, each its own app
    generated from the shell of the section that came before it. The generator
    copies that app *after* its call sites were patched, so every hook is
    already in the source — these need the config and nothing else, exactly
    like hist2/hist3. Running mission_app over them would hunt for anchors the
    first pass has already rewritten."""
    return lambda s: Patcher(s, name)


def read(s):
    """Sherlock, The Speckled Band — the same program as the science chapters,
    so the same hooks. Its one mission is also its last, so the chest asks for
    the boss there, which is exactly what dragon=["m1"] waits on."""
    return mission_app(s, "reading")


def hist2(s):
    """CKHG Chapter 2 — written already knowing about the theme, so it needs
    only the config; every hook is in the source."""
    return Patcher(s, "history2")


def hist3(s):
    """CKHG Chapter 3 — theme-aware like Ch2: MC.begin, MC.right/wrong and
    MC.chest are all already in the source, so this is config only."""
    return Patcher(s, "history3")


def hist(s):
    p = Patcher(s, "history")
    # without viewport-fit=cover, env(safe-area-inset-*) resolves to 0, so the
    # HUD's bottom padding does nothing on a notched iPhone
    p.at('content="width=device-width, initial-scale=1"',
         after__raw='content="width=device-width, initial-scale=1, viewport-fit=cover"')
    p.at('S.set = Math.random()*DATA.sets.length|0;\nrender();',
         after__raw='S.set = Math.random()*DATA.sets.length|0;\nMC.begin();\nrender();')
    p.at('  next.onclick = ()=>{ S.set=(S.set+1)%DATA.sets.length; S.idx=0; S.results=[]; render(); };',
         after__raw='  next.onclick = ()=>{ S.set=(S.set+1)%DATA.sets.length; S.idx=0; S.results=[];'
                    ' MC.begin(); render(); };')
    p.at('  again.onclick = ()=>{ S.idx=0; S.results=[]; render(); };',
         after__raw='  again.onclick = ()=>{ S.idx=0; S.results=[]; MC.begin();'
                    ' paintPicker(); render(); };')
    p.at('function solved(text, extra){\n',
         after='  MC.right(DATA.sets[S.set].label+"-"+S.idx);\n')
    p.at('function sendToReader(it, note){\n',
         after='  MC.wrong(DATA.sets[S.set].label+"-"+S.idx);\n')
    # a strip of the five practice sets, above the stairway — history dealt one
    # at random and never showed the other four or which were cleared
    p.at('    <div class="stairs" id="stairs" role="img"',
         before='    <div id="setpick"></div>\n')
    p.at('S.set = Math.random()*DATA.sets.length|0;\nMC.begin();\nrender();',
         after__raw='S.set = Math.random()*DATA.sets.length|0;\n'
                    'function paintPicker(){\n'
                    '  MC.picker(document.getElementById("setpick"),\n'
                    '    DATA.sets.map((s,i)=>({id:"set"+i, label:String(i+1)})),\n'
                    '    "set"+S.set,\n'
                    '    id=>{ const n=+id.slice(3); if(n===S.set) return;\n'
                    '          S.set=n; S.idx=0; S.results=[]; MC.begin();\n'
                    '          paintPicker(); render();\n'
                    '          window.scrollTo({top:0,behavior:"smooth"}); });\n'
                    '}\nMC.begin();\npaintPicker();\nrender();')
    p.at('  st.appendChild(el("p","hint", advice));',
         after='\n  MC.chest(st, pct, {id:"set"+S.set, boss: S.set===DATA.sets.length-1});'
               '\n  paintPicker();')
    return p


# `dragon` lists the activities whose perfect run can summon the ender dragon.
# One per subject: its toughest run. History is the exception — its five sets
# are parallel forms of the same seven-item test, not a difficulty ramp, so any
# of them being perfect is the full challenge.
APPS = {
    # The chapter has a single mission, m1 — the old "m4" target never matched
    # the id MC.chest() reports, so the dragon could not fire here.
    "science/g5-matter-ch1":  (sci,   dict(app="science",    shake=None,      lift=None,
                                           dragon=["m1"])),
    "spelling/list2":         (spell, dict(app="spelling",   shake="#card",   lift=None,
                                                   dragon=["l7"])),
    # A new list each week, same seven-level ladder. l7 is where he writes his
    # own sentence, so that is where the dragon sits.
    "spelling/list3":         (spell3, dict(app="spelling3",  shake="#card",   lift=None,
                                           dragon=["l7"])),
    "vocabulary/ww6-lesson1": (vocab, dict(app="vocabulary", shake="#sheet",  lift=".bar",
                                           dragon=["sheet"])),
    "history/g5-maya-ch1":    (hist,  dict(app="history",    shake="#stela",  lift=None,
                                           dragon=None)),
    # Ch2's three sets are distinct sections of the chapter, not parallel forms,
    # so the dragon sits on the last one — the hardest run.
    "history/g5-maya-ch2":    (hist2, dict(app="history2",   shake="#card",   lift=None,
                                           dragon=["s3"])),
    # The forms are a, b, c and final; "p2" matched none of them. The final is
    # the capstone, so the dragon belongs there.
    "vocabulary/ww6-lesson1-test": (vtest, dict(app="vocabtest", shake=None, lift=None,
                                           hud=False, dragon=["final"])),
    # The List 2 sheet: every word matched to every meaning it carries. The
    # study tool, so the dragon sits on it the same way it does for List 1.
    "vocabulary/ww6-lesson2":      (vocab2, dict(app="vocabulary2", shake="#sheet",
                                           lift=".bar", dragon=["sheet"])),
    # List 2 runs across the week: a Sunday warm-up, forms A-C, then Thursday's
    # final before the Friday test. The dragon sits on the final, as in List 1.
    "vocabulary/ww6-lesson2-test": (vtest2, dict(app="vocabtest2", shake=None, lift=None,
                                           hud=False, dragon=["final"])),
    # The passage is one mission, m1 — the old "s3" target predates that shape.
    "reading/sherlock-speckled-1": (read, dict(app="reading", shake="#card", lift=None,
                                           dragon=["m1"])),
    # Ch2 also has a single mission, m1; "m4" never matched.
    "science/g5-matter-ch2":  (sci2,  dict(app="science2",   shake="#card",   lift=None,
                                           dragon=["m1"])),
    "history/g5-maya-ch3":    (hist3, dict(app="history3",   shake="#card",   lift=None,
                                           dragon=["s3"])),
    "history/g5-maya-ch4":    (hist4, dict(app="history4",   shake="#card",   lift=None,
                                           dragon=["s3"])),
    # Ch3's single mission is m1, the same shape as Ch1 and Ch2.
    "science/g5-matter-ch3":  (sci3,  dict(app="science3",   shake="#card",   lift=None,
                                           dragon=["m1"])),
    "science/g5-matter-ch4":  (sci4,  dict(app="science4",   shake="#card",   lift=None,
                                           dragon=["m1"])),
    # Math is not a chapter to cover but the misses from one night's homework.
    # The dragon sits on s2, "Which Move?", because that is the set built from
    # the two misses that were the right idea with the wrong operation.
    "math/saxon-c2-l7":       (math7, dict(app="math7",      shake="#card",   lift=None,
                                           dragon=["s2"])),
    # The Speckled Band, pages 1-44, cut into sections. Each is one mission, m1,
    # which is also its last — so every section can summon the dragon on a
    # flawless first run, the same as the section that came before it.
    "reading/sherlock-speckled-1a": (reads("reading1a"),
                                     dict(app="reading1a", shake="#card", lift=None,
                                          dragon=["m1"])),
    "reading/sherlock-speckled-1b": (reads("reading1b"),
                                     dict(app="reading1b", shake="#card", lift=None,
                                          dragon=["m1"])),
    "reading/sherlock-speckled-2":  (reads("reading2"),
                                     dict(app="reading2",  shake="#card", lift=None,
                                          dragon=["m1"])),
    "reading/sherlock-speckled-3":  (reads("reading3"),
                                     dict(app="reading3",  shake="#card", lift=None,
                                          dragon=["m1"])),
    "reading/sherlock-speckled-4":  (reads("reading4"),
                                     dict(app="reading4",  shake="#card", lift=None,
                                          dragon=["m1"])),
    "reading/sherlock-speckled-5":  (reads("reading5"),
                                     dict(app="reading5",  shake="#card", lift=None,
                                          dragon=["m1"])),
}

# ---------------------------------------------------------------- machinery

class Patcher:
    """Exact-match string patching that shouts instead of silently missing."""
    def __init__(self, text, name):
        self.out, self.name, self.misses = text, name, []

    def at(self, anchor, after=None, before=None, after__raw=None):
        if anchor not in self.out:
            self.misses.append(anchor.split("\n")[0][:60])
            return
        if self.out.count(anchor) != 1:
            self.misses.append("AMBIGUOUS: " + anchor.split("\n")[0][:60])
            return
        if after__raw is not None:
            rep = after__raw
        elif after is not None:
            rep = anchor + after
        else:
            rep = before + anchor
        self.out = self.out.replace(anchor, rep, 1)


def sounds_map():
    """The three effects, base64 as data URIs.

    Sprites are inlined only under --inline, because there are forty of them and
    they are large. These three come to about 18 KB of base64 together, so they
    go in on every build: an app that has to fetch a sound is not one file any
    more.

    Every answer makes a noise, right or wrong. The wrong note is the quietest
    and softest of the three on purpose — it should mark the moment, not scold.
    """
    out = {}
    for stem, name in (("tool", "sfx-tool"), ("correct", "sfx-correct"),
                       ("wrong", "sfx-wrong")):
        p = ASSETS / (name + ".mp3")
        if p.exists():
            out[stem] = "data:audio/mpeg;base64," + base64.b64encode(p.read_bytes()).decode()
    return out


MUTE_OPEN = "/* MC-MUTE-CSS: generated by build_theme.py, do not hand-edit */"
MUTE_SHUT = "/* /MC-MUTE-CSS */"


def mute_css(src):
    """Give the hub just the sound-toggle rules from mc.css.

    Apps get the whole stylesheet injected; the hub has its own and needs only
    this one control. The block is delimited in mc.css rather than matched by
    selector, because the switch is built from several classes and a
    selector-based grab silently dropped the ones it did not know about.
    Bounded by markers here too, so a re-theme replaces rather than appends.
    """
    css = (THEME / "mc.css").read_text(encoding="utf-8")
    m = re.search(r"/\* MC-TOGGLE-CSS-START.*?\*/(.*?)/\* MC-TOGGLE-CSS-END \*/", css, re.S)
    if not m:
        return src
    block = "%s\n%s\n%s\n" % (MUTE_OPEN, m.group(1).strip(), MUTE_SHUT)
    old = re.search(re.escape(MUTE_OPEN) + r".*?" + re.escape(MUTE_SHUT) + r"\n?", src, re.S)
    if old:
        return src[:old.start()] + block + src[old.end():]
    return src.replace("</style>", block + "</style>", 1)


def sfx_line(src):
    """Put window.__MC_SFX__ into a page that already carries the engine.

    Idempotent: rewrites the line if it is there, otherwise inserts it after the
    boss flag, so a re-theme refreshes the clips instead of stacking copies.
    """
    line = "window.__MC_SFX__=" + json.dumps(sounds_map()) + ";"
    m = re.search(r"window\.__MC_SFX__=\{.*?\};", src, re.S)
    if m:
        return src[:m.start()] + line + src[m.end():]
    m = re.search(r"window\.__MC_HAS_BOSS__=(?:true|false);", src)
    if not m:
        return src
    return src[:m.end()] + "\n" + line + src[m.end():]


def assets_map():
    out = {}
    for f in sorted(ASSETS.glob("*.png")):
        out[f.stem] = "data:image/png;base64," + base64.b64encode(f.read_bytes()).decode()
    return out


# Markers, so the engine can be swapped without regenerating an app from a
# source we may no longer have. Everything between a pair is generated.
JS_OPEN  = "<!-- MC-THEME-JS: generated by build_theme.py, do not hand-edit -->"
JS_SHUT  = "<!-- /MC-THEME-JS -->"
CSS_OPEN = "<!-- MC-THEME-CSS: generated by build_theme.py, do not hand-edit -->"
CSS_SHUT = "<!-- /MC-THEME-CSS -->"


LEGACY_JS = "<!-- Minecraft theme layer"


def strip_theme(html):
    """Remove a previously injected theme, whether it carries the markers or
    predates them. The pre-marker form is bounded by its own comment and by the
    MC.config() call that always closes the block, and its stylesheet is the
    one <style> that defines .mc-hud."""
    if JS_OPEN in html and JS_SHUT in html:
        i, j = html.index(JS_OPEN), html.index(JS_SHUT) + len(JS_SHUT)
        html = html[:i].rstrip("\n") + "\n" + html[j:].lstrip("\n")
    elif LEGACY_JS in html:
        i = html.index(LEGACY_JS)
        m = re.compile(r"<script>MC\.config\(.*?\);</script>\n?", re.S).search(html, i)
        if not m:
            return None
        html = html[:i].rstrip("\n") + "\n" + html[m.end():].lstrip("\n")
    else:
        return None

    if CSS_OPEN in html and CSS_SHUT in html:
        i, j = html.index(CSS_OPEN), html.index(CSS_SHUT) + len(CSS_SHUT)
        return html[:i].rstrip("\n") + "\n" + html[j:].lstrip("\n")
    for m in re.finditer(r"<style>\n?(.*?)</style>\n?", html, re.S):
        if ".mc-hud" in m.group(1):
            return html[:m.start()].rstrip("\n") + "\n" + html[m.end():].lstrip("\n")
    return None


def inject(html, cfg):
    css = (THEME / "mc.css").read_text(encoding="utf-8")
    js  = (THEME / "mc.js").read_text(encoding="utf-8")
    has_boss = (ASSETS / "boss-defeated.png").exists()

    if INLINE:
        head = "window.__MC_INLINE__=" + json.dumps(assets_map()) + ";"
    else:
        head = 'window.__MC_PREFIX__="../../assets/";'
    head += "\nwindow.__MC_HAS_BOSS__=%s;" % ("true" if has_boss else "false")
    head += "\nwindow.__MC_SFX__=" + json.dumps(sounds_map()) + ";"

    block = (
        "\n" + JS_OPEN + "\n"
        "<script>%s</script>\n<script>%s</script>\n"
        "<script>MC.config(%s);</script>\n" % (head, js, json.dumps(cfg))
        + JS_SHUT + "\n"
    )
    style = "%s\n<style>\n%s</style>\n%s\n" % (CSS_OPEN, css, CSS_SHUT)

    if "mc-hud" in html:
        if not RETHEME:
            return None                                # already themed
        stripped = strip_theme(html)
        if stripped is None:
            return "UNMARKED"                          # cannot find it to remove
        html = stripped

    # "All subjects" pointed at the directory, which a web server quietly
    # resolves to index.html but a file:// browser renders as a directory
    # listing — so the link looked broken every time the app was opened by
    # double-clicking it. Naming the file works in both.
    html = html.replace('href="../../"', 'href="../../index.html"')

    # Review marks, a reveal after three misses, and back/skip navigation. It
    # lives in review.py because these are large blocks of JS, and threading
    # them through this file made it unreadable.
    html = review.patch(html)

    # Route the question stem through MC.ask(), so an item carrying `qv` is
    # re-worded on a fresh attempt instead of reading back word for word. Items
    # without `qv` are unaffected. Done here rather than in a patcher because
    # every app is already themed, and this has to reach all of them.
    html = html.replace("${esc(it.q)}", "${esc(MC.ask(it))}")
    html = html.replace('<div class="q">${r.it.q}</div>',
                        '<div class="q">${MC.ask(r.it)}</div>')
    html = html.replace('<div class="qq">${r.it.q}</div>',
                        '<div class="qq">${MC.ask(r.it)}</div>')

    html = html.replace("</head>", style + "</head>", 1)
    return re.sub(r"(<body[^>]*>)", lambda m: m.group(1) + block, html, count=1)


def trophy():
    """The trophy room is a site page like the hub: engine inlined, state read
    only, no HUD. Same handling, one directory down."""
    return page(STUDY / "trophy" / "index.html",
                '<script src="../_build/mc.js"></script>', "trophy")


def hub():
    return page(STUDY / "index.html", '<script src="_build/mc.js"></script>', "hub")


def page(path, tag, label):
    """The hub gets the engine inlined too, so it doesn't fetch from _build/
    at runtime — and it reads state only, with no HUD of its own."""
    if not path.exists():
        return "%-24s missing" % label
    src = path.read_text(encoding="utf-8")
    js = (THEME / "mc.js").read_text(encoding="utf-8")
    if tag not in src:
        # No script tag can mean two very different things: the engine is already
        # inlined (fine), or this hub was never themed at all (not fine, and it
        # used to be reported as a skip). The inlined engine carries a marker, so
        # its absence is a real failure rather than a no-op.
        inlined = "<script>/* ===== Minecraft theme layer" in src
        if not inlined:
            return "%-24s FAILED — never themed" % label
        if not RETHEME:
            return "%-24s already inlined — skipped" % label
        # swap the inlined engine for the current one: it is the single <script>
        # block that opens the IIFE, bounded by the marker the engine starts with
        i = src.find("<script>/* ===== Minecraft theme layer")
        j = src.find("</script>", i)
        if i < 0 or j < 0:
            return "hub                      FAILED \u2014 inlined engine not found"
        before = len(src)
        src = src[:i] + "<script>%s</script>" % js + src[j + len("</script>"):]
        src = sfx_line(src)
        src = mute_css(src)
        path.write_text(src, encoding="utf-8")
        return "%-24s re-themed  %6.1f KB -> %6.1f KB" % (label, before/1024, len(src)/1024)
    if INLINE:
        head = "window.__MC_INLINE__=" + json.dumps(assets_map()) + ";"
        src = re.sub(r'window\.__MC_PREFIX__="[^"]*";', head, src, count=1)
    src = src.replace(tag, "<script>%s</script>" % js)
    src = src.replace('window.__MC_HAS_BOSS__=true;',
                      'window.__MC_HAS_BOSS__=%s;'
                      % ("true" if (ASSETS / "boss-defeated.png").exists() else "false"))
    # The hub plays nothing, but it carries the sound toggle like every other
    # page, and the engine only mounts that when it has clips to mute.
    src = sfx_line(src)
    src = mute_css(src)
    path.write_text(src, encoding="utf-8")
    return "%-24s %6.1f KB -> %6.1f KB" % (label, len(path.read_text(encoding="utf-8"))/1024, len(src)/1024)


def main():
    if not (THEME / "mc.js").exists():
        sys.exit("theme/mc.js missing")
    print("sprites: %s\n" % ("base64-inlined" if INLINE else "linked ../../assets/"))
    bad = 0
    for rel, (patch, cfg) in APPS.items():
        path = STUDY / rel / "index.html"
        src  = path.read_text(encoding="utf-8")

        # An app that is already themed has had its call sites patched once and
        # for all; those edits live in the file. A retheme swaps the engine and
        # the stylesheet underneath them and must NOT try to patch again, or it
        # will hunt for anchors that its own first pass already rewrote.
        was_themed = "mc-hud" in src

        staged = inject(src, cfg)
        if staged is None:
            print("  %-24s already themed \u2014 skipped" % rel)
            continue
        if staged == "UNMARKED":
            bad += 1
            print("  %-24s FAILED \u2014 could not find the old theme to replace" % rel)
            continue

        if was_themed:
            path.write_text(staged, encoding="utf-8")
            print("  %-24s re-themed  %6.1f KB -> %6.1f KB"
                  % (rel, len(src) / 1024, len(staged) / 1024))
            continue

        p = patch(staged)
        if p.misses:
            bad += len(p.misses)
            print("  %-24s FAILED" % rel)
            for m in p.misses:
                print("        no anchor: %s" % m)
            continue

        path.write_text(p.out, encoding="utf-8")
        print("  %-24s %6.1f KB -> %6.1f KB" % (rel, len(src)/1024, len(p.out)/1024))

    print("  " + hub())
    print("  " + trophy())

    if bad:
        sys.exit("\n%d anchor(s) missed \u2014 nothing written for those apps." % bad)
    want = ["block-gold", "block-diamond", "block-emerald", "block-locked",
            "dragon-egg", "portal",
            "ore-coal", "ore-copper", "ore-iron", "ore-gold",
            "ore-redstone", "ore-lapis", "ore-diamond", "ore-emerald",
            "block-iron"]
    gone = [w for w in want if not (ASSETS / (w + ".png")).exists()]
    if gone:
        print("\n  optional art not present (a CSS block stands in): %s" % ", ".join(gone))
    if not (ASSETS / "boss-defeated.png").exists():
        print("\n  note: boss-defeated.png absent \u2014 a CSS banner stands in for now.")


if __name__ == "__main__":
    main()
