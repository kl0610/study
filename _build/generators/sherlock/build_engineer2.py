# -*- coding: utf-8 -*-
"""Append the second block of The Engineer's Thumb to sections_engineer.json:
pages 95 to 103, the night Colonel Lysander Stark walks into the office.

Eleven questions, single multiple choice throughout. This block is almost all
one long conversation, and the craft in it is a pile of small wrong notes that
Hatherley notices one at a time and talks himself out of: a man who will not say
who recommended him but knows he is an orphan; a fee ten times the asking price;
an appointment at midnight seven miles from a station; and a press that cannot
do the job it is said to do. So the questions lean on inference more than the
first block did -- five of the eleven cannot be answered by remembering a
sentence -- and the two words the reader glosses, shakedown and fuller's earth,
are each asked about and each defined in the passage behind the question.
"""
import io
import json
import os
import re
import sys

ROOT = r"C:\Users\kl\projects\study"
GEN = os.path.join(ROOT, "_build", "generators")
PDF = os.path.join(ROOT, "_source", "reading", "CC_SherlockHolmes_Reader_W1.pdf")

import pypdf

# printed = PDF - 12, off the printer's mark at the foot of each page. The
# running head, the page number glued to it, the picture captions and the
# glossary boxes all land in the middle of sentences that run over a page break.
FURNITURE = re.compile(
    r"SHERLOCK HOLMES/\d+/\d+\s+[\d/]+\s+[\d:]+\s+Page \d+"
    r"|\d{0,3}\s*(?:SELECTED ADVENTURES OF SHERLOCK HOLMES"
    # typeset with a space before the apostrophe: "ENGINEER \u2019S THUMB"
    r"|THE ADVENTURE OF THE ENGINEER\s*\u2019\s*S THUMB)"
    r"|COLONEL LYSANDER STARK"
    r"|\u201cNOT A WORD TO A SOUL\s*!\u201d"
    r"|SHAKEDOWN A makeshift bed\."
    r"|FULLER\u2019S EARTH A clay used in manufacturing processes\.")

_r = pypdf.PdfReader(PDF)
_pages = []
for _p in _r.pages[106:117]:                        # printed 94 to 104
    _t = re.sub(r"-\s*\n\s*", "", _p.extract_text() or "")
    _t = FURNITURE.sub(" ", " ".join(_t.split()))
    _pages.append(re.sub(r"\s+\d{1,3}\s*$", " ", _t).strip())
FLAT = " ".join(_pages)


def bare(s):
    return re.sub(r"[^a-z0-9]", "", s.lower())


NUDE = bare(FLAT)


def P(title, cite, text, vocab=None):
    return {"title": title, "cite": cite, "vocab": vocab or [], "text": text}


def pick(p, hi, q, opts, a, why):
    return {"type": "pick", "p": p, "hi": hi, "q": q, "opts": opts, "a": a,
            "why": why, "cite": "Reader, pages 95\u2013103"}


PASSAGES = {
 "den": P("Two years in a little den", "Reader, page 96", [
   "During two years I have had only three consultations and one small job. Every day, from nine in the morning until four in the afternoon, I waited in my little den, until my heart began to sink, and I came to think I should never have any practice at all.",
   "\u201cYesterday, however, my clerk entered to say there was a gentleman waiting to see me upon business. He brought a card, too, with the name of \u2018Colonel Lysander Stark\u2019 engraved upon it. At his heels came the Colonel himself. I do not think that I have ever seen so thin a man. His whole face sharpened away into nose and chin. Yet this thinness seemed to be natural, and due to no disease, for his eye was bright, his step brisk, and his bearing assured. He was plainly but neatly dressed, and his age, I judge, would be near forty.\u201d",
 ]),
 "secret": P("The promise", "Reader, pages 96\u201397", [
   "\u201c\u2018You have been recommended to me as a man who is not only proficient in his profession, but is also capable of preserving a secret.\u2019\u201d",
   "\u201cI bowed, feeling as flattered as any young man would at such a greeting. \u2018May I ask who it was who gave me so good a reference?\u2019 I asked. \u2018Well, perhaps it is better that I should not tell you just at this moment. I have it from the same source that you are both an orphan and a bachelor, and you are residing alone in London.\u2019\u201d",
   "\u201c\u2018I have a professional commission for you, but absolute secrecy is essential \u2013 absolute secrecy, you understand, and of course we may expect that more from a man who lives alone than from one who lives in the bosom of his family.\u2019\u201d",
   "\u201cHe looked hard at me as I spoke, and I have never seen so suspicious and questioning an eye. \u2018Absolute and complete silence, before, during, and after? No reference to the matter at all, either in word or writing?\u2019\u201d",
 ]),
 "offer": P("Fifty guineas", "Reader, page 98", [
   "\u201cA feeling of repulsion and fear had begun to rise within me at the antics of this fleshless man.\u201d",
   "\u201c\u2018How would fifty guineas for a night\u2019s work suit you?\u2019 he asked. \u2018Most admirably.\u2019 \u2018I say a night\u2019s work. But an hour\u2019s would be nearer the mark. I simply want your opinion about a hydraulic stamping machine that has gotten out of gear. If you show us what is wrong, we shall set it right ourselves. What do you think?\u2019 \u2018The work appears to be light, and the pay generous.\u2019\u201d",
   "\u201c\u2018We shall want you to come tonight by the last train to Eyford, in Berkshire. It is a little place near the borders of Oxfordshire. There is a train from Paddington that would bring you in there at about eleven fifteen. I shall come down in a carriage to meet you.\u2019\u201d",
 ]),
 "night": P("Why so late", "Reader, page 99", [
   "\u201c\u2018Yes, our little place is in the country. It is a good seven miles from Eyford station.\u2019 \u2018Then we can hardly get there before midnight. I suppose there would be no chance of a train back. I should be forced to stop for the night.\u2019 \u2018Yes, we could easily give you a shakedown.\u2019\u201d",
   "\u201c\u2018We judge it best that you should come late. It is to recompense you for any inconvenience that we are paying you, an unknown man, a fee that would buy an opinion from the very heads of your profession. Of course, if you would like to get out of this business, there is time to do so.\u2019\u201d",
   "\u201cI thought of the fifty guineas, and of how very useful they would be to me. \u2018Not at all,\u2019 said I; \u2018I should like, however, to understand a little more clearly what it is that you wish me to do.\u2019\u201d",
 ], [["shakedown", "A makeshift bed."]]),
 "earth": P("Fuller\u2019s earth", "Reader, pages 100\u2013101", [
   "\u201c\u2018You may be aware that fuller\u2019s earth is a valuable product, and that it is only found in one or two places in England?\u2019\u201d",
   "\u201c\u2018Some little time ago I bought a small place within ten miles of Reading. I was fortunate to discover that there was a deposit of fuller\u2019s earth in one of my fields. On examining it, however, I found that this deposit formed a link between two very much larger ones \u2013 both of them in the grounds of my neighbors. These good people did not know that their land contained that which was quite as valuable as a gold mine. Naturally, it was to my interest to buy their land before they discovered its true value; but I had no money by which I could do this.\u2019\u201d",
   "\u201c\u2018I took a few of my friends into the secret, however, and they suggested that we should secretly work our own little deposit, and in this way earn the money to buy the neighboring fields. This we have now been doing for some time, and to help us in our operations we erected a hydraulic press. This press, as I have already explained, has gotten out of order, and we wish your advice.\u2019\u201d",
 ], [["fuller\u2019s earth", "A clay used in manufacturing processes."]]),
 "press": P("A mere detail", "Reader, page 101", [
   "\u201c\u2018The only point that I could not quite understand,\u2019 said I, \u2018was what use you could make of a hydraulic press in excavating fuller\u2019s earth, which, as I understand, is dug out from a pit.\u2019\u201d",
   "\u201c\u2018Ah!\u2019 said he carelessly, \u2018we have our own process. We compress the earth into bricks, so as to remove them without revealing what they are. But that is a mere detail. I have taken you fully into my confidence, now, Mr. Hatherley, and I have shown you how I trust you.\u2019 He rose as he spoke. \u2018I shall expect you, then, at Eyford, at 11:15.\u2019 \u2018I shall certainly be there.\u2019 \u2018And not a word to a soul.\u2019 He looked at me with a last long, questioning gaze, and then he hurried from the room.\u201d",
 ]),
 "weigh": P("Throwing his fears to the winds", "Reader, page 103", [
   "\u201cOn the one hand, of course, I was glad, for the fee was at least ten times what I should have asked had I set a price on my own services, and this order might lead to other ones. On the other hand, my patron had made an unpleasant impression upon me, and I could not think that his explanation was sufficient to explain the necessity for my coming at midnight, and his extreme anxiety least I should tell anyone of my errand.\u201d",
   "\u201cHowever, I threw my fears to the winds, ate a hearty supper, drove to Paddington, and started off, having obeyed to the letter the order to hold my tongue.\u201d",
 ]),
 "arrival": P("The carriage at Eyford", "Reader, page 103", [
   "\u201cI was in time for the last train to Eyford, and I reached the little station after eleven o\u2019clock. I was the only passenger who got out there, and there was no one upon the platform. As I passed out the gate, however, I found my acquaintance of the morning waiting in the shadow. Without a word he grasped my arm and hurried me into a carriage. He drew up the windows on either side and away we went, as hard as the horse could go.\u201d",
   "\u201cOne horse?\u201d interjected Holmes. \u201cYes, only one.\u201d \u201cDid you observe the color?\u201d \u201cYes, it was a chestnut.\u201d",
 ]),
}

ITEMS = [
 pick("den",
      "During two years I have had only three consultations and one small job",
      "Hatherley begins by telling Holmes how little work he has had in two years. Why start there?",
      ["It explains why he took a job he did not like the look of",
       "It explains why he was still at his desk so late that evening",
       "It explains why he had never heard of Colonel Lysander Stark",
       "It explains why he had no clerk to send out on the errand"],
      0,
      "Three consultations and one small job in two years, and a heart that sank a little further every afternoon. Fifty guineas is not a temptation to a busy man. Hatherley is telling Holmes what the money meant to him before he tells him what he did for it."),

 pick("den",
      "this thinness seemed to be natural, and due to no disease, for his eye was bright, his step brisk, and his bearing assured",
      "Hatherley says he never saw so thin a man, but that the thinness was natural and not from illness. What made him sure of that?",
      ["A bright eye, a brisk step and an assured bearing",
       "The Colonel said so himself when he introduced his business",
       "The good cut and quality of the clothes he was wearing",
       "He was too young for any serious illness to have taken hold"],
      0,
      "Hatherley is a careful observer, which is what makes him a good witness later. A sick man is dull-eyed and slow; this one was bright, brisk and assured, so the thinness had to be his ordinary build."),

 pick("secret",
      "we may expect that more from a man who lives alone than from one who lives in the bosom of his family",
      "Stark knows Hatherley is an orphan, a bachelor, and living alone. What reason does he give for caring about that?",
      ["A man who lives alone can keep a secret better than one with a family",
       "A man who lives alone can travel at short notice without explaining",
       "A man who lives alone will work for less than one with a family",
       "A man who lives alone has no one to worry if he is out all night"],
      0,
      "That is the reason he gives, and it sounds almost reasonable. Notice what sits either side of it: he will not say who recommended Hatherley, but that same unnamed source told him exactly who has nobody at home. He came knowing."),

 pick("secret",
      "Absolute and complete silence, before, during, and after? No reference to the matter at all, either in word or writing?",
      "Stark asks for silence \u201cbefore, during, and after \u2026 either in word or writing.\u201d Which part of that is the odd one?",
      ["After \u2014 once a machine is mended there is nothing left to hide",
       "Before \u2014 nobody could tell a secret they had not yet been told",
       "In word \u2014 a spoken promise cannot be checked either way",
       "In writing \u2014 an engineer must keep notes to do the work at all"],
      0,
      "Before and during protect a business secret, and a jealously guarded deposit is a fair thing to protect. Afterwards is different: once the press is mended there is nothing left to give away, unless what needs covering is not the fuller\u2019s earth but the evening itself. And no reference in writing means no record anywhere that he ever went."),

 pick("offer",
      "I simply want your opinion about a hydraulic stamping machine that has gotten out of gear",
      "What is the work Stark actually asks for?",
      ["An opinion on a hydraulic stamping machine that is out of gear",
       "The repair of a hydraulic press that has broken down",
       "The design of a new machine for a business in the country",
       "A survey of a field to value the clay lying under it"],
      0,
      "An opinion, not a repair: \u201cIf you show us what is wrong, we shall set it right ourselves.\u201d An hour\u2019s work, by Stark\u2019s own reckoning. Fifty guineas for an hour of talking is the first figure in this story that does not add up."),

 pick("offer",
      "There is a train from Paddington that would bring you in there at about eleven fifteen",
      "What travelling does Stark ask him to do?",
      ["The last train to Eyford, arriving about a quarter past eleven",
       "The first train to Reading, arriving early the next morning",
       "A carriage the whole way from London, leaving after supper",
       "The last train to Oxford, where a carriage would be waiting"],
      0,
      "Eyford, in Berkshire, on the last train from Paddington, in at about 11:15, with Stark meeting the train in a carriage. Hold on to the time and the place \u2014 Holmes will want both, and so will you."),

 pick("night",
      "Yes, we could easily give you a shakedown.",
      "Stark offers Hatherley a shakedown for the night. What is a shakedown?",
      ["A makeshift bed", "A hot meal before the journey home",
       "A ride back to the station at dawn", "An extra payment for the trouble"],
      0,
      "A makeshift bed \u2014 something thrown together on the floor rather than a proper guest room. Hatherley has just worked out that he cannot get back to London that night, and the offer is made easily, as though it had been expected."),

 pick("night",
      "We judge it best that you should come late.",
      "Hatherley asks whether he could come at a more convenient hour. What does Stark actually give as his reason for the late arrival?",
      ["None \u2014 he says only that they judge it best, then mentions the fee",
       "That the machine can only be stopped once the day\u2019s work is done",
       "That the neighbours would see a stranger arriving in daylight",
       "That the last train is the only one that stops at Eyford at all"],
      0,
      "He gives no reason at all. \u201cWe judge it best that you should come late\u201d \u2014 and then straight on to the money, and to the offer of a way out if he does not like it. The third answer above is a reason Stark could have given and did not; brushing past the question is the point."),

 pick("earth",
      "These good people did not know that their land contained that which was quite as valuable as a gold mine.",
      "Why does Stark say he wants to work his own small deposit of fuller\u2019s earth in secret?",
      ["To buy his neighbours\u2019 land before they learn its value",
       "To avoid paying the tax that is owed on a working clay pit",
       "To keep a rival company from opening a pit of its own nearby",
       "To stop his friends from claiming a larger share of the profits"],
      0,
      "Fuller\u2019s earth is a clay used in manufacturing, and it is found in only one or two places in England. Stark\u2019s field links two much larger deposits on either side, and the neighbours do not know what they are standing on. He tells this part readily enough, and it is not a flattering story to tell about himself."),

 pick("press",
      "was what use you could make of a hydraulic press in excavating fuller\u2019s earth, which, as I understand, is dug out from a pit",
      "Hatherley asks what use a hydraulic press could be in digging clay out of a pit. Why is that such a good question?",
      ["A press squeezes things; it is no use for digging them up",
       "A press would be far too expensive for so small a business",
       "A press cannot be worked without a much larger water supply",
       "A press would crack the clay and spoil it before it was sold"],
      0,
      "It is the one question an engineer would ask and a liar would not expect, because the tool does not fit the job. Watch how it is answered: \u201cAh!\u201d said he carelessly \u2014 bricks, to carry the stuff away unrecognised \u2014 \u201cbut that is a mere detail.\u201d The only thing in the whole account that does not hold together is waved off as a detail, and Stark stands up and leaves before it can be asked again."),

 pick("weigh",
      ["I could not think that his explanation was sufficient to explain the necessity for my coming at midnight",
       "However, I threw my fears to the winds"],
      "By the end of the evening Hatherley has worked out for himself that the story does not hold. What does he do about it?",
      ["Nothing \u2014 he puts his fears aside and goes",
       "He writes the address down and leaves it with his clerk",
       "He decides to go, but to ask for half the fee in advance",
       "He calls at the police station on his way to Paddington"],
      0,
      "He lists the very doubts a reader has been collecting \u2014 the unpleasant impression, the midnight hour, the anxiety about his telling anyone \u2014 and then throws them to the winds, eats a hearty supper and catches the train. He also keeps the promise to the letter, so not one person knows where he has gone. That is the sentence to remember when you read on."),

 pick("arrival",
      ["I was the only passenger who got out there, and there was no one upon the platform",
       "He drew up the windows on either side and away we went"],
      "At Eyford, Stark takes his arm without a word and at once draws up the windows on both sides of the carriage. What is the likeliest reason?",
      ["So that Hatherley cannot see where he is being taken",
       "So that the night air does not chill a tired traveller",
       "So that nobody on the road can recognise the Colonel",
       "So that the noise of the wheels does not drown their talk"],
      0,
      "He was the only passenger to get off, the platform was empty, and Stark was waiting in the shadow rather than in the light. Then the windows go up before a word is spoken. A closed carriage on a dark road means Hatherley cannot say afterwards where he went \u2014 which is exactly why Holmes starts asking about the horse."),
]

SECTION = {
    "slug": "sherlock-engineer-2",
    "title": "Fifty Guineas and a Promise",
    "pages": "95\u2013103",
    "bigQuestion": "Colonel Lysander Stark offers an hour\u2019s work for fifty guineas. What is he really paying for \u2014 and what does Hatherley notice but go anyway?",
    "mission": {
        "name": "Pages 95 to 103",
        "tag": "12 questions \u00b7 about 9 minutes",
        "blurb": "A quick check that tonight\u2019s reading landed \u2014 not a test.",
    },
    "passages": PASSAGES,
    "items": ITEMS,
}

# ------------------------------------------------------------------ checks
bad, checked = [], 0
for key, p in PASSAGES.items():
    for para in p["text"]:
        for sent in [x for x in re.split(r"(?<=[.!?\u201d])\s+", para) if x.strip()]:
            checked += 1
            if bare(sent) not in NUDE:
                bad.append("%s: not in the reader \u2014 %s" % (key, sent[:64]))
for i, it in enumerate(ITEMS, 1):
    body = " ".join(PASSAGES[it["p"]]["text"])
    body += " " + " ".join(v[1] for v in PASSAGES[it["p"]]["vocab"])
    for h in (it["hi"] if isinstance(it["hi"], list) else [it["hi"]]):
        if h not in body:
            bad.append("q%d: the highlight is not in passage %r \u2014 %s" % (i, it["p"], h[:56]))
    L = [len(o) for o in it["opts"]]
    if L[it["a"]] == max(L) and max(L) - sorted(L)[-2] >= 6:
        bad.append("q%d: the right answer is the longest by %d" % (i, max(L) - sorted(L)[-2]))
    if len(it["opts"]) != 4 or len(set(it["opts"])) != 4:
        bad.append("q%d: options are not four distinct choices" % i)
    if re.search(r"</?[a-z][^>]*>|&[a-z]+;", it["q"]):
        # the question is printed through esc(), so markup would show as text
        if not re.fullmatch(r"[^<>&]*(<b>[^<>]*</b>|<i>[^<>]*</i>)[^<>&]*", it["q"]):
            bad.append("q%d: the question carries markup the page will escape" % i)
if bad:
    raise SystemExit("  refusing to write:\n    " + "\n    ".join(bad))

path = os.path.join(GEN, "sections_engineer.json")
sections = json.load(io.open(path, encoding="utf-8"))
sections = [s for s in sections if s["slug"] != SECTION["slug"]] + [SECTION]
io.open(path, "w", encoding="utf-8", newline="\n").write(
    json.dumps(sections, ensure_ascii=False, indent=1) + "\n")
print("  sections_engineer.json  %d sections, newest is %s (%d questions, %d passages)"
      % (len(sections), SECTION["slug"], len(ITEMS), len(PASSAGES)))
print("  %d quoted sentences checked against the reader" % checked)
print("  every highlight found, no answer the longest, four distinct options each")
