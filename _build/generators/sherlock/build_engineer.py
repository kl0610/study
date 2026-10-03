# -*- coding: utf-8 -*-
"""Write sections_engineer.json: The Adventure of the Engineer's Thumb, the
first block of it, pages 87 to 94.

Eight questions, every one a single multiple choice with four options and one
right answer. They run across the whole of tonight's reading rather than
clustering at the front, which is what a quiz tomorrow needs: two on the setup,
two on the man who arrives, two on the wound, two on what happens once they
reach Baker Street.

Every passage is quoted from the reader and checked against the PDF before
anything is written. The comparison ignores spaces, because pypdf drops the
space after most punctuation in this book -- it extracts "Mr.Hatherley" and
"him.He" -- and quoting that would put the extraction's faults on the screen.
"""
import io
import json
import os
import re
import sys

ROOT = r"C:\Users\kl\projects\study"
GEN = os.path.join(ROOT, "_build", "generators")
PDF = os.path.join(ROOT, "_source", "reading", "CC_SherlockHolmes_Reader_W1.pdf")

# printed = PDF - 12, read off the printer's own mark at the foot of every page
# ("Page 87"). CLAUDE.md said 13, which is wrong by one; the apps built so far
# cite the right pages because their text was located rather than calculated.
OFFSET = 12

import pypdf

# The running footer sits between the last word of one page and the first word
# of the next, so a sentence carried over a page break comes out of pypdf with
# "SELECTED ADVENTURES OF SHERLOCK HOLMES SHERLOCK HOLMES/12/00 ... Page 87"
# wedged into the middle of it. Stripped before anything is compared.
# The page number is printed hard against the running head, sometimes with a
# space and sometimes without ("91THE ADVENTURE OF..."), so it comes away with
# it. Leaving it behind would put "paddington87station" in the middle of a
# sentence that runs over the page break.
FURNITURE = re.compile(
    r"SHERLOCK HOLMES/\d+/\d+\s+[\d/]+\s+[\d:]+\s+Page \d+"
    r"|\d{0,3}\s*(?:SELECTED ADVENTURES OF SHERLOCK HOLMES"
    r"|THE ADVENTURE OF THE ENGINEER’S THUMB"
    r"|CHAPTER TITLE GOES HERE)"
    r"|HE UNWOUND THE HANDKERCHIEF AND HELD OUT HIS HAND\s*\."
    r"|HE SETTLED OUR NEW ACQUAINTANCE ON THE SOFA\s*\.")

_r = pypdf.PdfReader(PDF)
_pages = []
for _p in _r.pages[99:108]:                         # printed 87 to 95
    _t = re.sub(r"-\s*\n\s*", "", _p.extract_text() or "")
    _t = FURNITURE.sub(" ", " ".join(_t.split()))
    _pages.append(re.sub(r"\s+\d{1,3}\s*$", " ", _t).strip())
FLAT = " ".join(_pages)


def bare(s):
    return re.sub(r"[^a-z0-9]", "", s.lower())


NUDE = bare(FLAT)


def P(title, cite, text):
    return {"title": title, "cite": cite, "text": text}


def pick(p, hi, q, opts, a, why):
    return {"type": "pick", "p": p, "hi": hi, "q": q, "opts": opts, "a": a,
            "why": why, "cite": "Reader, pages 87\u201394"}


PASSAGES = {
 "practice": P("Watson, two years on", "Reader, page 87", [
   "Of all the problems submitted to Sherlock Holmes, that of Mr. Hatherley\u2019s thumb was so strange as to rank among the more remarkable \u2014 even if it gave my friend fewer opportunities for those deductive methods of reasoning by which he achieved such remarkable results.",
   "It was in the summer of \u201989, not long after my marriage, that the events occurred that I am about to summarize. I had returned to my practice and had abandoned Holmes in his Baker Street rooms, although I continually visited him.",
   "My practice had steadily increased, and as I happened to live close to Paddington Station, I got a few patients from among the officials. One of these, whom I had cured of a painful and lingering disease, was constantly advertising my virtues.",
 ]),
 "waiting": P("Two men from Paddington", "Reader, pages 88\u201389", [
   "One morning, I was awakened by the maid tapping at the door, announcing that two men had come from Paddington and were waiting in the consulting room. I dressed hurriedly, for I knew by experience that railway cases were seldom trivial, and hastened downstairs.",
   "\u201cI\u2019ve got him here,\u201d he whispered, jerking his thumb over his shoulder. \u201cHe\u2019s all right. I thought I\u2019d bring him round myself; then he couldn\u2019t slip away. There he is, all safe and sound.\u201d",
   "I entered my consulting-room and found a gentleman seated by the table. Round one of his hands he had a handkerchief wrapped, which was mottled all over with bloodstains. He was young, with a strong face, but he was exceedingly pale and looked like he was suffering from agitation.",
   "\u201cI am sorry to wake you, Doctor,\u201d said he. \u201cBut I have had a very serious accident during the night. I came in by train this morning, and on inquiring as to where I might find a doctor, a worthy fellow escorted me here.\u201d",
 ]),
 "card": P("The card, and the laugh", "Reader, page 89", [
   "I glanced at it. \u201cMr. Victor Hatherley, hydraulic engineer, 16A Victoria Street (3rd floor).\u201d",
   "\u201cI regret that I have kept you waiting,\u201d said I, sitting down. \u201cA night journey is a monotonous occupation.\u201d \u201cMy night could not be called monotonous,\u201d said he. He laughed very heartily, with a ringing note, leaning back in his chair and shaking his sides. All my medical instincts rose up against that laugh.",
   "It was useless, however. He was off in one of those hysterical outbursts that come upon a strong nature when some great crisis is over. Presently he came to himself, very weary and blushing hotly.",
 ]),
 "thumb": P("Where the thumb used to be", "Reader, pages 90\u201391", [
   "\u201cAnd now, Doctor, perhaps you would kindly attend to my thumb, or rather to the place where my thumb used to be.\u201d He unwound the handkerchief and held out his hand.",
   "There were four fingers and a horrid red spongy surface where the thumb should have been. It had been hacked or torn right out from the roots.",
   "\u201cYes, it did. I fainted when it was done; and I think I must have been senseless for a long time. When I came to, I found that it was still bleeding, so I tied one end of my handkerchief very tightly round the wrist and braced it up with a twig.\u201d \u201cExcellent! You should have been a surgeon.\u201d \u201cIt is a question of hydraulics, you see, and came within my own specialty.\u201d",
   "\u201cThis has been done,\u201d said I, examining the wound, \u201cby a very heavy and sharp instrument.\u201d \u201cA thing like a cleaver,\u201d said he. \u201cAn accident, I presume?\u201d \u201cBy no means.\u201d \u201cWhat, a murderous attack!\u201d \u201cVery murderous indeed.\u201d",
 ]),
 "baker": P("To Baker Street", "Reader, pages 92\u201394", [
   "\u201cI shall have to tell my tale to the police; but, if it were not for the evidence of this wound, I should be surprised if they believed my story, for it is very extraordinary, and I have not much proof with which to back it up. Even if they believe me, the clues I can give them are so vague that I doubt justice will ever be done.\u201d",
   "\u201cIf it is a problem that you desire to solve, I strongly recommend you come to my friend Mr. Sherlock Holmes before you go to the police.\u201d",
   "Sherlock Holmes was, as I expected, lounging about his sitting room in his dressing gown. He received us in his quietly genial fashion, ordered eggs, and joined us in a hearty meal. When it was concluded, he settled our new acquaintance upon the sofa and set a glass of brandy within his reach.",
   "“It is easy to see that your experience has been no common one, Mr. Hatherley,” said he. “Pray lie down there and make yourself at home. Tell us what you can, but stop when you are tired.”",
   "\u201cI am an orphan and a bachelor, residing alone in lodgings in London. By profession I am a hydraulic engineer, with considerable experience during the seven years that I was apprenticed to Venner & Matheson, the well-known firm. Two years ago, having come into a fair sum of money through my poor father\u2019s death, I decided to start in business for myself.\u201d",
 ]),
}

ITEMS = [
 pick("practice",
      "I had returned to my practice and had abandoned Holmes in his Baker Street rooms",
      "By the summer of \u201989 Watson is no longer living at Baker Street. Why not?",
      ["He had married, and had gone back to his own medical practice",
       "He had quarrelled with Holmes over the ending of a case",
       "Holmes had asked him to leave while he worked alone",
       "He had gone abroad for a year and had only just returned"],
      0,
      "It was the summer of \u201989, not long after Watson\u2019s marriage. He had returned to his practice and left Holmes in the Baker Street rooms \u2014 though he says he continually visited him, which is why he can still take a patient round there."),

 pick("practice",
      "as I happened to live close to Paddington Station, I got a few patients from among the officials",
      "Why did Watson have patients who worked for the railway?",
      ["He lived close to Paddington Station",
       "He had once worked as a railway surgeon himself",
       "The railway company paid him to treat its men",
       "Holmes had sent the railway officials to him"],
      0,
      "He lived close to Paddington Station, so he picked up a few patients from among the officials there. One of them, cured of a painful and lingering disease, was constantly advertising Watson\u2019s virtues \u2014 which is how a railway guard came to bring Hatherley to his door."),

 pick("waiting",
      "I dressed hurriedly, for I knew by experience that railway cases were seldom trivial",
      "The maid says two men have come from Paddington. Why does Watson dress in a hurry rather than take his time?",
      ["He had learnt that railway cases were seldom trivial",
       "The maid had told him that one of the men was bleeding",
       "He was expecting Sherlock Holmes to call that morning",
       "The guard had warned him that the man might slip away"],
      0,
      "Watson dressed hurriedly because he knew by experience that railway cases were seldom trivial. He had not seen the man or heard anything about him yet \u2014 the guard\u2019s remark about slipping away comes later, on the stairs."),

 pick("waiting",
      "I have had a very serious accident during the night. I came in by train this morning",
      "He was hurt during the night and came in by train this morning. What does that tell you about where it happened?",
      ["Well outside London, and hours before he found help",
       "Somewhere in London, since he reached a doctor by the morning",
       "At Paddington Station, which is why a railway guard brought him in",
       "At his own lodgings, before he set out on the night train"],
      0,
      "Nothing in these pages says where he was. But he was hurt in the night, he fainted and lay senseless a long time, and he still had a train journey in front of him \u2014 so it happened well outside London, and hours passed before anyone looked at the wound. Holmes will want both of those facts."),

 pick("card",
      "Mr. Victor Hatherley, hydraulic engineer, 16A Victoria Street (3rd floor).",
      "What does the card the visitor left with the maid say he is?",
      ["A hydraulic engineer", "A railway guard", "A surgeon", "A watchmaker"],
      0,
      "The card reads: Mr. Victor Hatherley, hydraulic engineer, 16A Victoria Street (3rd floor). His trade matters twice over in these pages \u2014 it is how he explains his own first aid, and it is what the story turns on later."),

 pick("card",
      "He was off in one of those hysterical outbursts that come upon a strong nature when some great crisis is over.",
      "Watson says \u201cA night journey is a monotonous occupation,\u201d and Hatherley laughs until Watson shouts at him to stop. What does Watson say the laughing really was?",
      ["A hysterical outburst, after a great crisis",
       "A sign that he had invented the whole story",
       "The effect of the brandy Watson had given him",
       "A joke he had been saving up for the doctor"],
      0,
      "Watson calls it one of those hysterical outbursts that come upon a strong nature when some great crisis is over \u2014 so the laugh is evidence of what he has been through, not of high spirits. The brandy comes afterwards, to bring his colour back."),

 pick("thumb",
      ["I tied one end of my handkerchief very tightly round the wrist and braced it up with a twig",
       "It is a question of hydraulics, you see, and came within my own specialty."],
      "Hatherley fainted, and when he came round the wound was still bleeding. What had he done about it by the time he reached Watson?",
      ["Tied his handkerchief round the wrist, tightened with a twig",
       "Held his hand above his head for the whole journey to London",
       "Packed the wound with cloth torn from his own coat",
       "Nothing at all, until the railway guard bound it for him"],
      0,
      "He made a tourniquet: the handkerchief tied tightly round the wrist and braced up with a twig. Watson says he should have been a surgeon, and Hatherley answers that it is a question of hydraulics and came within his own specialty \u2014 he solved it as an engineer."),

 pick("thumb",
      "It is a question of hydraulics, you see, and came within my own specialty.",
      "Watson says he should have been a surgeon. Hatherley answers that it was \u201ca question of hydraulics \u2026 within my own specialty.\u201d What does he mean by that?",
      ["Stopping blood is the same problem as stopping flow in a pipe",
       "He had been taught first aid as part of his engineering training",
       "He had worked as a surgeon before he turned to engineering",
       "He had read about tourniquets in an engineering journal once"],
      0,
      "A hydraulic engineer\u2019s whole trade is controlling something that flows through a narrow space under pressure. He did not need medical training to know that squeezing the pipe above the leak would stop it \u2014 he already knew the shape of that problem, and the shape is the same whether the pipe is a hose or an arm."),

 pick("thumb",
      ["\u201cAn accident, I presume?\u201d \u201cBy no means.\u201d \u201cWhat, a murderous attack!\u201d \u201cVery murderous indeed.\u201d"],
      "Watson assumes the thumb was lost in an accident. What does Hatherley tell him?",
      ["That it was a murderous attack",
       "That a machine had caught his hand",
       "That it happened while he was asleep",
       "That he cannot remember how it happened"],
      0,
      "\u201cAn accident, I presume?\u201d \u201cBy no means.\u201d \u201cWhat, a murderous attack!\u201d \u201cVery murderous indeed.\u201d Watson had already worked out that the wound was made by a very heavy and sharp instrument, and Hatherley names it: a thing like a cleaver."),

 pick("baker",
      "the clues I can give them are so vague that I doubt justice will ever be done",
      "Hatherley means to go to the police as well as to Holmes. What is he afraid the police will not manage?",
      ["The clues he can give are too vague for justice to be done",
       "They will blame him for bringing the injury on himself",
       "They will stop him from going back to his own work",
       "They will hand his name straight to the newspapers"],
      0,
      "Without the wound he doubts they would believe him at all, and even if they do, the clues he can give are so vague that he doubts justice will ever be done. That is the gap Holmes is for \u2014 and Holmes settles him on the sofa with brandy and tells him to stop when he is tired."),

 pick("baker",
      ["he settled our new acquaintance upon the sofa and set a glass of brandy within his reach",
       "Tell us what you can, but stop when you are tired."],
      "Holmes orders breakfast, settles Hatherley on the sofa with brandy, and tells him to stop when he is tired \u2014 all before hearing a word. Why go to that trouble first?",
      ["A steadied man tells it better, and Holmes wants the story straight",
       "Holmes is hungry, and will not be interrupted before he has eaten",
       "Holmes has already guessed the story and is in no hurry to hear it",
       "Holmes is waiting for the police to arrive before anything is said"],
      0,
      "This is the same man who was laughing hysterically at Watson\u2019s door an hour ago. Holmes wants evidence, and evidence out of an exhausted witness comes out muddled \u2014 so he feeds him, lies him down, puts the brandy where he can reach it, and tells him he may stop. It looks like kindness, and it is, but it is also how you get a clean account."),
]

SECTION = {
    "slug": "sherlock-engineer-1",
    "title": "The Thumb at the Door",
    "pages": "87\u201394",
    "bigQuestion": "A stranger arrives at Watson\u2019s door before breakfast with his thumb cut off. What does he want, and why does Watson take him to Holmes?",
    "mission": {
        "name": "Pages 87 to 94",
        "tag": "8 questions \u00b7 about 7 minutes",
        "blurb": "A quick check that tonight\u2019s reading landed \u2014 not a test.",
    },
    "passages": PASSAGES,
    "items": ITEMS,
}

# ------------------------------------------------------------------ checks
bad, checked = [], 0
for key, p in PASSAGES.items():
    for para in p["text"]:
        for sent in [s for s in re.split(r"(?<=[.!?\u201d])\s+", para) if s.strip()]:
            checked += 1
            if bare(sent) not in NUDE:
                bad.append("%s: not in the reader \u2014 %s" % (key, sent[:64]))
for i, it in enumerate(ITEMS, 1):
    body = " ".join(PASSAGES[it["p"]]["text"])
    for h in (it["hi"] if isinstance(it["hi"], list) else [it["hi"]]):
        if h not in body:
            bad.append("q%d: the highlight is not in passage %r \u2014 %s" % (i, it["p"], h[:56]))
    L = [len(o) for o in it["opts"]]
    if L[it["a"]] == max(L) and max(L) - sorted(L)[-2] >= 6:
        bad.append("q%d: the right answer is the longest by %d" % (i, max(L) - sorted(L)[-2]))
    if len(it["opts"]) != 4 or len(set(it["opts"])) != 4:
        bad.append("q%d: options are not four distinct choices" % i)
    if re.search(r"</?[a-z][^>]*>|&[a-z]+;", it["q"]):
        bad.append("q%d: the question carries markup, which the page escapes" % i)
if bad:
    raise SystemExit("  refusing to write:\n    " + "\n    ".join(bad))

out = os.path.join(GEN, "sections_engineer.json")
io.open(out, "w", encoding="utf-8", newline="\n").write(
    json.dumps([SECTION], ensure_ascii=False, indent=1) + "\n")
print("  sections_engineer.json  1 section, %d questions, %d passages"
      % (len(ITEMS), len(PASSAGES)))
print("  %d quoted sentences checked against the reader, pages 87 to 95" % checked)
print("  every highlight found in the passage it points at, no answer the longest")
