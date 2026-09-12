"""What a week's vocabulary spec has to be true of before anything is built.

Both generators read the same spec -- gen_sheet.py makes the study sheet and
gen_vocab.py makes the five practice forms -- so the checks belong in one place
rather than in whichever of them happens to notice.

Most of these are cheap. The one worth having is the third: a practice sentence
that contains the word it is asking for. The `blank` item blanks out "____" and
nothing else, so a word left anywhere else in the sentence is the answer printed
beside the question. Nothing downstream could have caught it and it would have
looked perfectly fine in the source.
"""

NEED = ("book", "lesson", "cite", "bank", "headwords", "senses", "rounds")


def check(spec):
    bad = [("the spec has no %r" % k) for k in NEED if k not in spec]
    if bad:
        raise SystemExit("  refusing to build:\n    " + "\n    ".join(bad))

    senses = spec["senses"]
    heads = spec["headwords"]
    forms = [s["w"] for s in senses]

    seen_key = set()
    for s in senses:
        w = s.get("w", "?")
        where = "%s (%s)" % (w, s.get("pos", "?"))
        for k in ("w", "head", "pos", "def", "sent"):
            if not s.get(k):
                bad.append("%s: no %r" % (where, k))
        if not s.get("sent") or "____" not in s.get("sent", ""):
            bad.append("%s: the sentence has no ____ blank" % where)
        # The answer must not be sitting in the sentence next to its own blank.
        elif w.lower() in s["sent"].replace("____", "").lower():
            bad.append("%s: the sentence contains the word it asks for" % where)
        if s.get("head") not in heads:
            bad.append("%s: head %r is not in headwords" % (where, s.get("head")))
        # This pair is the key gen_vocab builds each meaning under, and the one
        # the comprehensive final dedups on. Two senses sharing it means one of
        # them never reaches the final.
        key = (s.get("w"), s.get("s", 0))
        if key in seen_key:
            bad.append("%s: two senses numbered %s for %s" % (where, key[1], key[0]))
        seen_key.add(key)

        if "ant" in s:
            a = s["ant"]
            if len(a) != 4:
                bad.append("%s: %d antonym options, wanted 4" % (where, len(a)))
            if len(set(a)) != len(a):
                bad.append("%s: an antonym option is repeated" % where)
            if not (0 <= s.get("antA", -1) < len(a)):
                bad.append("%s: antA is out of range" % where)
            if w in a:
                bad.append("%s: the word is one of its own antonym options" % where)

    # A `def` question offers four meanings and marks one right. Two words
    # sharing a meaning would make a second option defensible.
    defs = {}
    for s in senses:
        defs.setdefault(s.get("def"), []).append(s.get("w"))
    for d, ws in defs.items():
        if len(ws) > 1:
            bad.append("the same meaning is given for %s" % " and ".join(ws))

    # Every headword needs exactly one first sense: the Sunday warm-up takes one
    # item per headword and takes the first it finds.
    for h in heads:
        n = sum(1 for s in senses if s.get("head") == h and s.get("first"))
        if n != 1:
            bad.append("%s has %d senses marked first, wanted 1" % (h, n))

    if sorted(set(spec["bank"])) != sorted(set(forms)):
        only_bank = sorted(set(spec["bank"]) - set(forms))
        only_sense = sorted(set(forms) - set(spec["bank"]))
        bad.append("the word bank and the senses disagree: bank only %s, senses only %s"
                   % (only_bank or "-", only_sense or "-"))

    # gen_sheet already refuses a round naming a word that is not on the list,
    # and refuses to leave a word off every round. It does not notice a word put
    # on two rounds, which would show it twice and make the totals lie.
    twice, seen = [], set()
    for r in spec["rounds"]:
        for w in r["words"]:
            if w in seen:
                twice.append(w)
            seen.add(w)
    if twice:
        bad.append("on more than one round: %s" % ", ".join(sorted(set(twice))))

    if bad:
        raise SystemExit("  refusing to build:\n    " + "\n    ".join(bad))

    return len(senses), len(set(forms)), len(heads)
