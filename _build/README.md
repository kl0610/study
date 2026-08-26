# _build — the Minecraft theme source

Lives in the repo so it survives between sessions. Nothing in here is served;
GitHub Pages ignores it apart from serving the raw files, which is harmless.

```
mc.css          the theme's styles
mc.js           the theme engine — hearts, hotbar, sprites, chest, localStorage
build_theme.py  injects both into the four apps and patches their call sites
test_theme.js   node test for the engine's logic (no browser needed)
test_reading.js reads DATA back out of the built Sherlock app and checks it
test_vocabtest.js  the same, for the Word List 1 test suite
```

## Rebuilding

```
cd study/_build
python3 build_theme.py          # sprites linked from ../../assets/
python3 build_theme.py --inline # sprites base64'd in, +~360 KB per app
node test_theme.js              # 22 assertions on hearts / tools / persistence
node test_reading.js            # 34 assertions on the Sherlock app's content
node test_vocabtest.js          # 50 assertions on the vocabulary test suite
```

The script is idempotent — running it on already-themed files reports
"already themed" and writes nothing. To rebuild after editing `mc.js`, restore
the four `index.html` files from git first (`git checkout -- .`), then re-run.

## How the injection works

`build_theme.py` inlines `mc.css` before `</head>`, inlines `mc.js` right after
`<body>`, then makes a handful of exact-match string patches at each app's
existing seams:

| app | correct | wrong | level start | results |
|---|---|---|---|---|
| science | `win()` | `miss()` | `start()` | `finish()` |
| spelling | `good()` | 3 branches in `checkNow()` | `start()` | `finish()` |
| vocabulary | `$("go")` handler | same handler | `build()` | `win()` |
| history | `solved()` | `sendToReader()` | boot + both replay buttons | `renderSummary()` |

The hub (`index.html`) is handled separately: the engine is inlined in place of
its `<script src="_build/mc.js">` tag, with the prefix set to `assets/` and
`hud:false`, so the hub reads `MC.state()` for gear and progress without
growing a HUD of its own. That also means the published site never fetches
anything out of `_build/` at runtime.

Every patch is exact-match and single-occurrence. If an anchor moves because an
app was edited by hand, the build **fails loudly and writes nothing** for that
app rather than silently skipping the hook — the error names the anchor it
couldn't find.

**Don't hand-edit the theme inside an app's `index.html`.** Four copies drift.
Edit `mc.js` / `mc.css` and rebuild.

## Engine contract

```js
MC.config({app, shake, lift})  // once, injected automatically
MC.begin()                     // entering a level — refills hearts to 10
MC.right()                     // win sprite bursts
MC.wrong(missKey)              // bad sprite + shake + half a heart, records the miss
MC.note(missKey)               // records a miss with no heart cost
MC.chest(el, pct, {id})        // paints the results reveal, may award a tool
MC.state()                     // { tools, cleared, misses } — for the hub
```

`shake` is a selector for the element to shake on a wrong answer; science passes
`null` because it already shakes its own card. `lift` is a selector for a fixed
bottom bar the HUD must sit above — only vocabulary needs it, and a
ResizeObserver keeps up as that bar grows.

## The dragon

`boss: pct >= 100 && halves === 20` in `clear()`. Any level, played perfectly —
full score and not a single heart lost — drops the ender dragon into the chest
reveal. It repeats every time it's earned; it is not a one-time unlock and it is
not tied to specific levels. The `{boss:true}` arguments still sitting at some
call sites are vestigial and ignored.

If you add an app, check what a zero-mistake run actually scores before trusting
this. The vocabulary app scored a flawless sheet at 25% because its `tries`
counter only moved on wrong answers — see the fix in `build_theme.py`.

## Storage

One key, `mc.study.v1`, shared across all four apps because they're one origin:

```json
{ "cleared": { "spelling:l1": 100 }, "misses": { "spelling": { "committee": 2 } }, "tool9": false }
```

Corrupt or absent JSON falls back to an empty state rather than throwing.
`MC.reset()` clears it from the console.

## Extracting the Core Classics reader

Worth writing down, because it took a session to get right and the same book
holds four more stories.

`pdftotext -raw` is the only mode whose **spacing** survives this book: the
kerning is tight enough that `-layout` and pdfplumber both emit `ofthe` and
`Moran.These`, and the page-6 margin glossary gets spliced straight into the
body lines. Two cleanups are still needed on the raw output — rejoin words
broken across lines at a hyphen, and re-insert the space after `.,;!?` where
it was eaten.

`-raw` gives no **paragraph breaks**, though, and indentation is not a safe
substitute: the glossary box shoves ordinary body lines into the same x range
as a real indent. Font is safe. The body face is **VendettaMedium at 14pt**,
so filtering on it alone drops the running heads (VendettaBold), the
small-caps illustration captions (VendettaBold 8.2pt) and the glossary
(Frutiger 9pt). Among what is left, a paragraph opens at **x0 ≈ 145** against
a body margin of **x0 = 109** — but treat that as a band, not a floor: the
drop cap on page 1 wraps at x0 = 161, and the drop cap glyph itself is a
separate 80pt word that has to be glued back onto the first line ("O" + "f
the many cases"). Belt and braces: only accept an indent as a paragraph break
when the previous line ended a sentence.

Match the pdfplumber markers into the raw text with **whitespace stripped from
both sides**, so pdfplumber's own dropped spaces cannot break the join.

Book page 1 is **PDF page 14**. Page 8 is entirely illustration and yields no
body text at all, which is correct, not a bug.

## Preparing sprites

The delivered art arrives as large lossy renders on a solid colour field, not as
clean transparent PNGs. `boss-defeated.png` needed this treatment and any
replacement will too:

1. **Find the native grid.** Measure horizontal runs of similar colour — they
   cluster at the block size (6px for the boss, so 474×340 was really 79×57).
2. **Snap to it,** taking the *median* colour of each block's interior. This is
   what kills the compression noise; a plain resize keeps it.
3. **Key out the background** on the snapped image, generous tolerance. The
   subjects are dark and the fields are bright, so they're far apart in colour
   space — but keying the *raw* file leaves fringing, because the noise smears
   the background across thousands of near-shades.
4. **Quantize** the result to ~20 colours, despeckle orphaned pixels, crop to
   the bounding box, and upscale nearest-neighbour to an integer multiple.

The current boss came in at 256×92 with 3,861 colours and 1,131 antialiased edge
pixels — real transparency this time, but still "pixel-art look" rather than a
clean integer upscale, so block scoring found no sharp minimum and block-2 was
the faithful read. Cleaned to 125×44 native → 2× → 250×88, 24 colours, 5 KB.
