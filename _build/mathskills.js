/* Saxon Course 2 — practice generators, one per lesson skill.
 *
 * The book numbers every written-practice problem with the lesson it reviews:
 * "* 14. (3) w - 98 = 432" means problem 14 practises Lesson 3. That tag is the
 * hinge of the whole thing — it turns "I missed number 14" into "he needs the
 * Lesson 3 skill", which is something a program can act on.
 *
 * So a generator here is keyed by the lesson that TEACHES a skill, not by the
 * lesson whose homework it turned up in. gen(3) makes unknown-number questions
 * whether they were missed on Lesson 7's homework or Lesson 40's.
 *
 * Every generator returns a question with fresh numbers each call. Nothing is
 * ever a repeat of the homework, which is the point: it is practice on the
 * skill, not a second attempt at the same problem. It also keeps the book out
 * of the repo, since none of its problems are reproduced anywhere.
 *
 * Each returns { q, opts, a, why, cite, ex, skill } where `ex` names a worked
 * example the app can open, and `a` indexes the correct option AFTER shuffling.
 *
 * Lessons 1-10 are built. Everything past that returns null, and the app says
 * so out loud rather than quietly producing nothing.
 */
(function (root) {
  "use strict";

  /* ---------- dice ---------- */
  function rnd(n) { return Math.floor(Math.random() * n); }
  function between(lo, hi) { return lo + rnd(hi - lo + 1); }
  function pick(a) { return a[rnd(a.length)]; }
  function shuffle(a) {
    a = a.slice();
    for (var i = a.length - 1; i > 0; i--) { var j = rnd(i + 1); var t = a[i]; a[i] = a[j]; a[j] = t; }
    return a;
  }

  /* Four options from one right answer and a list of wrong ones, shuffled, with
     the correct index reported back. Duplicates are dropped before the count is
     checked, because a distractor that happens to equal the answer is the one
     bug in a generated question that a child cannot argue with. */
  function opts(right, wrongs) {
    var seen = {}, out = [];
    seen[String(right)] = true;
    for (var i = 0; i < wrongs.length && out.length < 3; i++) {
      var w = String(wrongs[i]);
      if (!seen[w]) { seen[w] = true; out.push(wrongs[i]); }
    }
    if (out.length < 3) return null;          // caller retries with new numbers
    var all = shuffle([right].concat(out)).map(String);
    return { opts: all, a: all.indexOf(String(right)) };
  }

  /* Wraps a generator body that may fail to find three distinct distractors.
     Retrying with new numbers is cheaper and clearer than contorting the
     distractor rules to guarantee distinctness for every input. */
  function tries(fn) {
    for (var i = 0; i < 40; i++) { var q = fn(); if (q) return q; }
    return null;
  }

  function money(n) { return "$" + n.toFixed(2); }
  function commas(n) { return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ","); }
  function gcd(a, b) { while (b) { var t = b; b = a % b; a = t; } return a; }
  function factors(n) {
    var out = [];
    for (var i = 1; i <= n; i++) if (n % i === 0) out.push(i);
    return out;
  }
  function frac(n, d) { return n + "/" + d; }

  var CITE = function (n, what) { return "Saxon Math Course 2, Lesson " + n + " — " + what; };

  /* ================================================================== L1
     Arithmetic with whole numbers and money, variables and evaluation.
     The most-drawn-on skill in the first ten lessons by a distance: 108 of the
     problems point here. */
  function L1() {
    return tries(function () {
      var kind = pick(["add", "sub", "mul", "div", "eval", "wordsum"]);

      if (kind === "add") {
        var a = between(10000, 89999), b = between(10000, 89999), r = a + b;
        var o = opts(commas(r), [commas(r + 1000), commas(r - 900), commas(r + 10)]);
        if (!o) return null;
        return { q: "Add: <b>" + commas(a) + " + " + commas(b) + "</b>", opts: o.opts, a: o.a,
                 why: commas(a) + " + " + commas(b) + " = " + commas(r) + ". Line the numbers up by place value and carry where a column goes past nine.",
                 cite: CITE(1, "whole numbers"), ex: "column", skill: 1 };
      }
      if (kind === "sub") {
        var big = between(20, 99) + between(0, 99) / 100;
        var small = between(1, Math.floor(big) - 1) + between(0, 99) / 100;
        big = Math.round(big * 100) / 100; small = Math.round(small * 100) / 100;
        var d = Math.round((big - small) * 100) / 100;
        var o2 = opts(money(d), [money(Math.round((big - small + 1) * 100) / 100),
                                 money(Math.round((big - small - 0.1) * 100) / 100),
                                 money(Math.round((big + small) * 100) / 100)]);
        if (!o2) return null;
        return { q: "Subtract: <b>" + money(big) + " − " + money(small) + "</b>", opts: o2.opts, a: o2.a,
                 why: money(big) + " − " + money(small) + " = " + money(d) + ". Keep the decimal points in a line and borrow across the point the same way you would across any other column.",
                 cite: CITE(1, "money"), ex: "column", skill: 1 };
      }
      if (kind === "mul") {
        var m = between(120, 899), n = between(12, 49), p = m * n;
        var o3 = opts(commas(p), [commas(p + m), commas(p - n), commas(m * (n % 10) * 10)]);
        if (!o3) return null;
        return { q: "Multiply: <b>" + m + " × " + n + "</b>", opts: o3.opts, a: o3.a,
                 why: m + " × " + n + " = " + commas(p) + ". Multiply by the ones digit, then by the tens digit shifted one place left, then add the two rows.",
                 cite: CITE(1, "whole numbers"), ex: "column", skill: 1 };
      }
      if (kind === "div") {
        var q1 = between(3, 40), dv = pick([4, 5, 8, 20, 25, 40]), tot = q1 * dv;
        var o4 = opts(money(q1), [money(q1 * 10), money(q1 / 2), money(q1 + dv)]);
        if (!o4) return null;
        return { q: "Divide: <b>" + money(tot) + " ÷ " + dv + "</b>", opts: o4.opts, a: o4.a,
                 why: money(tot) + " ÷ " + dv + " = " + money(q1) + ". Check by multiplying back: " + money(q1) + " × " + dv + " = " + money(tot) + ".",
                 cite: CITE(1, "money"), ex: "column", skill: 1 };
      }
      if (kind === "eval") {
        var A = pick([100, 200, 300, 400, 600]), B = A * pick([2, 3, 4]);
        var which = pick(["ab", "b-a", "b/a", "a+b"]);
        var val = which === "ab" ? A * B : which === "b-a" ? B - A : which === "b/a" ? B / A : A + B;
        var label = which === "ab" ? "ab" : which === "b-a" ? "b − a" : which === "b/a" ? "b ÷ a" : "a + b";
        var o5 = opts(commas(val), [commas(A + B), commas(B - A), commas(A * B), commas(B / A)]
                                     .filter(function (x) { return x !== commas(val); }));
        if (!o5) return null;
        return { q: "Evaluate <b>" + label + "</b> when a = " + A + " and b = " + B + ".",
                 opts: o5.opts, a: o5.a,
                 why: "A variable stands for a number, so put the numbers in and work it out: " + label.replace("a", A).replace("b", B) + " = " + commas(val) + ". Two letters written together, like ab, means multiply.",
                 cite: CITE(1, "variables and evaluation"), ex: "evaluate", skill: 1 };
      }
      // wordsum
      var f1 = between(2, 9), f2 = between(2, 9);
      if (f1 * f2 < 12) return null;
      var prod = f1 * f2, sum = f1 + f2;
      var o6 = opts(sum, [prod, Math.abs(f1 - f2), sum + 2, f1 * 2]);
      if (!o6) return null;
      return { q: "The product of two one-digit whole numbers is <b>" + prod + "</b>. What is the sum of the same two numbers?",
               opts: o6.opts, a: o6.a,
               why: "The two numbers are " + f1 + " and " + f2 + ", because " + f1 + " × " + f2 + " = " + prod + ". Their sum is " + f1 + " + " + f2 + " = " + sum + ". Product means multiply; sum means add.",
               cite: CITE(1, "whole numbers"), ex: "evaluate", skill: 1 };
    });
  }

  /* ================================================================== L2
     Properties of operations. */
  var PROPS = [
    { name: "Commutative Property of Addition", show: function () { var a = between(2, 30), b = between(2, 30); return a + " + " + b + " = " + b + " + " + a; },
      why: "The order of the addends changed and the sum did not. That is the commutative property." },
    { name: "Commutative Property of Multiplication", show: function () { var a = between(2, 12), b = between(2, 12); return a + " · " + b + " = " + b + " · " + a; },
      why: "The order of the factors changed and the product did not. That is the commutative property." },
    { name: "Associative Property of Addition", show: function () { var a = between(2, 9), b = between(2, 9), c = between(2, 9); return "(" + a + " + " + b + ") + " + c + " = " + a + " + (" + b + " + " + c + ")"; },
      why: "The grouping changed and the sum did not. That is the associative property — associate means group." },
    { name: "Associative Property of Multiplication", show: function () { var a = between(2, 6), b = between(2, 6), c = between(2, 6); return "(" + a + " · " + b + ") · " + c + " = " + a + " · (" + b + " · " + c + ")"; },
      why: "The grouping changed and the product did not. That is the associative property." },
    { name: "Identity Property of Addition", show: function () { var a = between(2, 60); return a + " + 0 = " + a; },
      why: "Adding zero leaves a number exactly as it was, so zero is the identity for addition." },
    { name: "Identity Property of Multiplication", show: function () { var a = between(2, 60); return a + " · 1 = " + a; },
      why: "Multiplying by one leaves a number exactly as it was, so one is the identity for multiplication." },
    { name: "Zero Property of Multiplication", show: function () { var a = between(2, 60); return a + " · 0 = 0"; },
      why: "Anything multiplied by zero is zero. Nothing else in the table does that." },
  ];

  function L2() {
    return tries(function () {
      var kind = pick(["name", "unequal", "mental"]);

      if (kind === "name") {
        var p = pick(PROPS);
        var wrong = shuffle(PROPS.filter(function (x) { return x.name !== p.name; })).slice(0, 3);
        var o = opts(p.name, wrong.map(function (x) { return x.name; }));
        if (!o) return null;
        return { q: "Name the property shown by this equation:<br><b>" + p.show() + "</b>",
                 opts: o.opts, a: o.a, why: p.why,
                 cite: CITE(2, "properties of operations"), ex: "grouping", skill: 2 };
      }

      if (kind === "unequal") {
        /* Division is not associative and that is the whole point of the
           question, so the odd one out is always a division pair and the other
           three are always multiplication or addition. */
        var a = between(2, 9) * between(2, 6), b = pick([2, 3, 4, 6]), c = pick([2, 3]);
        var big = a * b * c;
        var right = big + " ÷ (" + (b * c) + " ÷ " + c + ") and (" + big + " ÷ " + (b * c) + ") ÷ " + c;
        var w = [];
        for (var i = 0; i < 3; i++) {
          var x = between(2, 9), y = between(2, 9), z = between(2, 9);
          w.push(i === 0 ? "(" + x + " + " + y + ") + " + z + " and " + x + " + (" + y + " + " + z + ")"
                         : "(" + x + " × " + y + ") × " + z + " and " + x + " × (" + y + " × " + z + ")");
        }
        var o2 = opts(right, w);
        if (!o2) return null;
        return { q: "Which pair is <b>not</b> equal?", opts: o2.opts, a: o2.a,
                 why: "Division is not associative: " + big + " ÷ (" + (b * c) + " ÷ " + c + ") = " + big + " ÷ " + b + " = " + (big / b) + ", but (" + big + " ÷ " + (b * c) + ") ÷ " + c + " = " + (big / (b * c)) + " ÷ " + c + " = " + (big / (b * c) / c) + ". Addition and multiplication are associative, so the other three pairs match.",
                 cite: CITE(2, "properties of operations"), ex: "grouping", skill: 2 };
      }

      // mental: reorder to make it easy
      var f = pick([[8, 7, 5], [4, 9, 25], [2, 17, 50], [5, 13, 20], [4, 23, 25]]);
      var prod = f[0] * f[1] * f[2];
      var easy = f[0] * f[2] === 100 || f[0] * f[2] === 40 || f[0] * f[2] === 100 ? [f[0], f[2]] : [f[0], f[2]];
      var o3 = opts("Multiply " + f[0] + " × " + f[2] + " first, then multiply by " + f[1],
                    ["Multiply " + f[0] + " × " + f[1] + " first, then multiply by " + f[2],
                     "Add " + f[0] + " + " + f[2] + " first, then multiply by " + f[1],
                     "Multiply " + f[1] + " × " + f[2] + " first, then multiply by " + f[0]]);
      if (!o3) return null;
      return { q: "<b>" + f[0] + " · " + f[1] + " · " + f[2] + "</b> — which order makes this easiest to do in your head?",
               opts: o3.opts, a: o3.a,
               why: f[0] + " × " + f[2] + " = " + (f[0] * f[2]) + ", which is an easy number to multiply by. " + (f[0] * f[2]) + " × " + f[1] + " = " + commas(prod) + ". The commutative and associative properties let you reorder and regroup factors freely, and the answer is the same whichever way round you do it.",
               cite: CITE(2, "properties of operations"), ex: "grouping", skill: 2 };
    });
  }

  /* ================================================================== L3
     Unknown numbers in addition, subtraction, multiplication and division.
     Built first, from a real night's misses: two of the six were the right idea
     with the inverse operation, so the question asks which move is needed
     rather than what the answer is. */
  var MOVES = [
    { form: function (v, n, r) { return v + " − " + n + " = " + r; }, val: function (n, r) { return r + n; },
      move: "Add", ex: "minus",
      why: function (v, n, r) { return n + " was subtracted from " + v + ", so adding " + n + " undoes it: " + v + " = " + r + " + " + n + " = " + (r + n) + ". Check: " + (r + n) + " − " + n + " = " + r + ". ✓"; } },
    { form: function (v, n, r) { return v + " + " + n + " = " + r; }, val: function (n, r) { return r - n; },
      move: "Subtract", ex: "plus",
      why: function (v, n, r) { return n + " was added to " + v + ", so subtracting " + n + " undoes it: " + v + " = " + r + " − " + n + " = " + (r - n) + ". Check: " + (r - n) + " + " + n + " = " + r + ". ✓"; } },
    { form: function (v, n, r) { return n + v + " = " + r; }, val: function (n, r) { return r / n; },
      move: "Divide by", ex: "times",
      why: function (v, n, r) { return n + v + " means " + n + " × " + v + ", so dividing by " + n + " undoes it: " + v + " = " + r + " ÷ " + n + " = " + (r / n) + ". Check: " + n + " × " + (r / n) + " = " + r + ". ✓"; } },
    { form: function (v, n, r) { return v + " ÷ " + n + " = " + r; }, val: function (n, r) { return r * n; },
      move: "Multiply by", ex: "divide",
      why: function (v, n, r) { return v + " was divided by " + n + ", so multiplying by " + n + " undoes it: " + v + " = " + r + " × " + n + " = " + (r * n) + ". Check: " + (r * n) + " ÷ " + n + " = " + r + ". ✓"; } },
  ];

  function L3() {
    return tries(function () {
      var kind = pick(["move", "move", "backwards", "value"]);
      var v = pick(["m", "n", "w", "k", "p", "x", "y"]);

      if (kind === "move" || kind === "value") {
        var f = pick(MOVES);
        var n, r;
        if (f.move === "Divide by") { n = between(3, 15); r = n * between(4, 30); }
        else if (f.move === "Multiply by") { n = between(3, 25); r = between(5, 60); }
        else { n = between(12, 99); r = between(100, 600); }
        var val = f.val(n, r);
        if (val <= 0 || !Number.isInteger(val)) return null;

        if (kind === "move") {
          var right = f.move + " " + n;
          var o = opts(right, shuffle(MOVES.filter(function (m) { return m.move !== f.move; })
                                          .map(function (m) { return m.move + " " + n; })));
          if (!o) return null;
          return { q: "<b>" + f.form(v, n, r) + ".</b> What should you do to both sides to find " + v + "?",
                   opts: o.opts, a: o.a, why: f.why(v, n, r),
                   cite: CITE(3, "unknown numbers"), ex: f.ex, skill: 3 };
        }
        var o2 = opts(commas(val), [commas(f.move === "Add" ? r - n : r + n),
                                    commas(r * n), commas(Math.round(r / n))]
                                     .filter(function (x) { return x !== commas(val); }));
        if (!o2) return null;
        return { q: "Find " + v + ": <b>" + f.form(v, n, r) + "</b>", opts: o2.opts, a: o2.a,
                 why: f.why(v, n, r), cite: CITE(3, "unknown numbers"), ex: f.ex, skill: 3 };
      }

      // backwards: the variable is the subtrahend, or the divisor
      if (pick([0, 1])) {
        var top = between(30, 90), left = between(5, top - 5), taken = top - left;
        var o3 = opts(v + " = " + top + " − " + left,
                      [v + " = " + top + " + " + left, v + " = " + left + " − " + top,
                       v + " = " + top + " ÷ " + left]);
        if (!o3) return null;
        return { q: "<b>" + top + " − " + v + " = " + left + ".</b> Which of these finds " + v + "?",
                 opts: o3.opts, a: o3.a,
                 why: "Read it as a story: " + top + ", take away " + v + ", leaves " + left + ". So " + v + " is the part taken away — the difference between them. " + v + " = " + top + " − " + left + " = " + taken + ". Check: " + top + " − " + taken + " = " + left + ". ✓",
                 cite: CITE(3, "unknown numbers"), ex: "backwards", skill: 3 };
      }
      var qq = between(3, 15), dd = between(3, 20), nn = qq * dd;
      var o4 = opts(v + " = " + nn + " ÷ " + qq,
                    [v + " = " + nn + " × " + qq, v + " = " + qq + " ÷ " + nn,
                     v + " = " + nn + " + " + qq]);
      if (!o4) return null;
      return { q: "<b>" + nn + " ÷ " + v + " = " + qq + ".</b> Which of these finds " + v + "?",
               opts: o4.opts, a: o4.a,
               why: nn + " shared into " + v + " groups puts " + qq + " in each group, so " + v + " is how many " + qq + "s fit into " + nn + ": " + v + " = " + nn + " ÷ " + qq + " = " + dd + ". Check: " + nn + " ÷ " + dd + " = " + qq + ". ✓ The move is division even though the variable is underneath.",
               cite: CITE(3, "unknown numbers"), ex: "backwards", skill: 3 };
    });
  }

  /* ================================================================== L4
     Number line sequences. Perfect squares live here, which is where the term
     comes from that caused a miss on the first night this was built for. */
  function L4() {
    return tries(function () {
      var kind = pick(["squares", "squares", "arith", "name", "missing"]);

      if (kind === "squares") {
        var s = between(5, 11);
        var seen = [s * s, (s + 1) * (s + 1), (s + 2) * (s + 2), (s + 3) * (s + 3)];
        var next = [(s + 4) * (s + 4), (s + 5) * (s + 5), (s + 6) * (s + 6)];
        var right = "Perfect squares — " + next.join(", ");
        var o = opts(right, [
          "Perfect squares — " + [next[0], next[1] - 1, next[2] - 4].join(", "),
          "Adding " + (seen[3] - seen[2]) + " each time — " + [seen[3] + (seen[3] - seen[2]), seen[3] + 2 * (seen[3] - seen[2]), seen[3] + 3 * (seen[3] - seen[2])].join(", "),
          "Perfect squares — " + [next[0] - 2, next[1] - 3, next[2] - 5].join(", ")]);
        if (!o) return null;
        return { q: "Describe this sequence and give the next three numbers:<br><b>…, " + seen.join(", ") + ", …</b>",
                 opts: o.opts, a: o.a,
                 why: "These are " + s + " × " + s + ", " + (s + 1) + " × " + (s + 1) + ", " + (s + 2) + " × " + (s + 2) + " and " + (s + 3) + " × " + (s + 3) + " — perfect squares. The next three are " + (s + 4) + " × " + (s + 4) + " = " + next[0] + ", " + (s + 5) + " × " + (s + 5) + " = " + next[1] + " and " + (s + 6) + " × " + (s + 6) + " = " + next[2] + ". The gaps grow each time, so nothing is being added over and over.",
                 cite: CITE(4, "sequences"), ex: "squares", skill: 4 };
      }

      if (kind === "arith") {
        var st = between(3, 30), step = pick([3, 4, 6, 7, 8, 9, 11, 12, 15, 25]);
        var terms = [st, st + step, st + 2 * step, st + 3 * step];
        var nxt = [st + 4 * step, st + 5 * step, st + 6 * step];
        var o2 = opts(nxt.join(", "), [
          [st + 4 * step, st + 5 * step + 1, st + 6 * step + 2].join(", "),
          [st + 4 * step + step, st + 5 * step + step, st + 6 * step + step].join(", "),
          [st + 3 * step + 1, st + 3 * step + 2, st + 3 * step + 3].join(", ")]);
        if (!o2) return null;
        return { q: "What are the next three numbers?<br><b>" + terms.join(", ") + ", …</b>",
                 opts: o2.opts, a: o2.a,
                 why: "The same number is added each time: " + terms[1] + " − " + terms[0] + " = " + step + ". Keep adding " + step + " and the next three are " + nxt.join(", ") + ".",
                 cite: CITE(4, "sequences"), ex: "squares", skill: 4 };
      }

      if (kind === "name") {
        var base = between(2, 7);
        var sq = [base * base, (base + 1) * (base + 1), (base + 2) * (base + 2), (base + 3) * (base + 3)];
        var o3 = opts("Perfect squares", ["Prime numbers", "Multiples of " + base, "Even numbers"]);
        if (!o3) return null;
        return { q: "What are the numbers <b>" + sq.join(", ") + "</b> called?",
                 opts: o3.opts, a: o3.a,
                 why: "A perfect square is a whole number multiplied by itself: " + base + " × " + base + " = " + sq[0] + ", " + (base + 1) + " × " + (base + 1) + " = " + sq[1] + ", and so on. They are called squares because that many tiles will make a square.",
                 cite: CITE(4, "sequences"), ex: "squares", skill: 4 };
      }

      // missing term
      var s0 = between(2, 20), sp = pick([4, 5, 6, 7, 8, 9, 10, 12]);
      var run = [s0, s0 + sp, s0 + 2 * sp, s0 + 3 * sp, s0 + 4 * sp];
      var hole = between(1, 3);
      var shown = run.slice();
      shown[hole] = "?";
      var o4 = opts(run[hole], [run[hole] + 1, run[hole] - sp, run[hole] + sp]);
      if (!o4) return null;
      return { q: "What number belongs where the <b>?</b> is?<br><b>" + shown.join(", ") + "</b>",
               opts: o4.opts, a: o4.a,
               why: "The sequence counts up by " + sp + " each time, so the missing term is " + run[hole - 1] + " + " + sp + " = " + run[hole] + ". Check it from the other side too: " + run[hole + 1] + " − " + sp + " = " + run[hole] + ".",
               cite: CITE(4, "sequences"), ex: "squares", skill: 4 };
    });
  }

  /* ================================================================== L5
     Place value through hundred trillions; reading and writing whole numbers. */
  var PLACES = ["ones", "tens", "hundreds", "thousands", "ten thousands",
                "hundred thousands", "millions", "ten millions", "hundred millions",
                "billions", "ten billions", "hundred billions", "trillions"];
  var SCALE = [["thousand", 1e3], ["million", 1e6], ["billion", 1e9], ["trillion", 1e12]];

  function L5() {
    return tries(function () {
      var kind = pick(["digits", "place", "compare"]);

      if (kind === "digits") {
        var sc = pick(SCALE), n = between(2, 999);
        var val = n * sc[1];
        var o = opts(commas(val), [commas(val * 10), commas(val / 10), commas(val + sc[1])]);
        if (!o) return null;
        return { q: "Use digits and commas to write <b>" + n + " " + sc[0] + "</b>.",
                 opts: o.opts, a: o.a,
                 why: n + " " + sc[0] + " is " + commas(val) + ". Each comma marks off three places, so " + sc[0] + " sits " + (String(sc[1]).length - 1) + " zeros up from the ones place.",
                 cite: CITE(5, "place value"), ex: "place", skill: 5 };
      }

      if (kind === "place") {
        var digits = between(4, 9), num = "";
        for (var i = 0; i < digits; i++) num += (i === 0 ? between(1, 9) : between(0, 9));
        var at = between(0, digits - 1);              // 0 = leftmost
        var d = num[at];
        var placeIdx = digits - 1 - at;
        var right = PLACES[placeIdx];
        var wrong = [PLACES[placeIdx + 1], PLACES[Math.max(0, placeIdx - 1)], PLACES[placeIdx + 2]]
                      .filter(function (x) { return x && x !== right; });
        var o2 = opts(right, wrong);
        if (!o2) return null;
        return { q: "In <b>" + commas(Number(num)) + "</b>, which place is the digit <b>" + d + "</b> in?" +
                    (num.split(d).length > 2 ? " (the one " + (at === 0 ? "furthest left" : at === digits - 1 ? "furthest right" : "in position " + (at + 1) + " from the left") + ")" : ""),
                 opts: o2.opts, a: o2.a,
                 why: "Counting from the ones place on the right, that digit is " + placeIdx + " place" + (placeIdx === 1 ? "" : "s") + " along, which is the " + right + " place. So it is worth " + commas(Number(d) * Math.pow(10, placeIdx)) + ".",
                 cite: CITE(5, "place value"), ex: "place", skill: 5 };
      }

      // compare
      var a = between(1e6, 9e8), b = a + between(1, 900) * pick([1, 10, 100]);
      if (a === b) return null;
      var o3 = opts(commas(Math.max(a, b)) + " is greater",
                    [commas(Math.min(a, b)) + " is greater", "They are equal",
                     "There is no way to tell"]);
      if (!o3) return null;
      return { q: "Which is greater, <b>" + commas(a) + "</b> or <b>" + commas(b) + "</b>?",
               opts: o3.opts, a: o3.a,
               why: "Both have the same number of digits, so compare place by place from the left. The first place where they differ decides it: " + commas(Math.max(a, b)) + " is the greater.",
               cite: CITE(5, "place value"), ex: "place", skill: 5 };
    });
  }

  /* ================================================================== L6
     Factors and divisibility. The divisibility tests are the lesson's own
     shortcut and the fast route to a single-digit-factor question. */
  function L6() {
    return tries(function () {
      var kind = pick(["single", "common", "gcf", "divis"]);

      if (kind === "single") {
        var n = between(2, 6) * between(2, 6) * pick([7, 11, 13, 17, 19, 23]);
        var sd = factors(n).filter(function (f) { return f < 10; });
        if (sd.length < 3 || sd.length > 7) return null;
        var all = factors(n);
        var o = opts(sd.join(", "),
                     [sd.concat(all.filter(function (f) { return f >= 10; }).slice(0, 2)).join(", "),
                      sd.slice(0, -1).join(", "),
                      sd.filter(function (f) { return f !== sd[1]; }).join(", ")]);
        if (!o) return null;
        return { q: "List the <b>single-digit</b> factors of " + n + ".", opts: o.opts, a: o.a,
                 why: "The factors of " + n + " are " + all.join(", ") + ". Only " + sd.length + " of those are single digits: " + sd.join(", ") + ". The rest are still factors — they were just not what was asked for.",
                 cite: CITE(6, "factors"), ex: "single", skill: 6 };
      }

      if (kind === "common" || kind === "gcf") {
        var x = between(2, 8) * pick([2, 3, 5, 7]), y = between(2, 9) * pick([2, 3, 5, 7]);
        if (x === y || x < 10 || y < 10) return null;
        var com = factors(x).filter(function (f) { return y % f === 0; });
        if (com.length < 3) return null;
        var g = com[com.length - 1];
        var onlyX = factors(x).filter(function (f) { return y % f !== 0; })[0];
        var onlyY = factors(y).filter(function (f) { return x % f !== 0; })[0];
        if (!onlyX || !onlyY) return null;

        if (kind === "gcf") {
          var o2 = opts(g, [com[com.length - 2], x * y / g, onlyX]);
          if (!o2) return null;
          return { q: "What is the <b>greatest common factor</b> of " + x + " and " + y + "?",
                   opts: o2.opts, a: o2.a,
                   why: "Factors of " + x + ": " + factors(x).join(", ") + ". Factors of " + y + ": " + factors(y).join(", ") + ". They share " + com.join(", ") + ", and the greatest of those is " + g + ".",
                   cite: CITE(6, "greatest common factor"), ex: "common", skill: 6 };
        }
        var o3 = opts(com.join(", "),
                      [com.concat([onlyX]).sort(function (p, q) { return p - q; }).join(", "),
                       com.concat([onlyY]).sort(function (p, q) { return p - q; }).join(", "),
                       com.slice(1).join(", ")]);
        if (!o3) return null;
        return { q: "List the <b>common factors</b> of " + x + " and " + y + ".", opts: o3.opts, a: o3.a,
                 why: "Factors of " + x + ": " + factors(x).join(", ") + ". Factors of " + y + ": " + factors(y).join(", ") + ". The common factors are the ones on both lists: " + com.join(", ") + ". " + onlyX + " divides " + x + " but not " + y + ", and " + onlyY + " divides " + y + " but not " + x + ". The greatest common factor is " + g + ".",
                 cite: CITE(6, "common factors"), ex: "common", skill: 6 };
      }

      // divisibility
      var d = pick([2, 3, 4, 5, 6, 9, 10]);
      var num = between(1000, 9999);
      var yes = num % d === 0;
      var TEST = { 2: "the last digit is even", 3: "the digits add up to a multiple of 3",
                   4: "the last two digits divide by 4", 5: "the last digit is 0 or 5",
                   6: "it passes the test for 2 and the test for 3",
                   9: "the digits add up to a multiple of 9", 10: "the last digit is 0" };
      var o4 = opts(yes ? "Yes" : "No", ["Yes", "No", "Only if you divide and check",
                                         "There is no way to tell without dividing"]
                                          .filter(function (t) { return t !== (yes ? "Yes" : "No"); }));
      if (!o4) return null;
      var sum = String(num).split("").reduce(function (t, c) { return t + Number(c); }, 0);
      return { q: "Is <b>" + commas(num) + "</b> divisible by <b>" + d + "</b>?", opts: o4.opts, a: o4.a,
               why: "A number divides by " + d + " if " + TEST[d] + ". Here the digits add to " + sum + " and the number ends in " + String(num).slice(-1) + ", so the answer is " + (yes ? "yes" : "no") + ": " + commas(num) + " ÷ " + d + (yes ? " = " + commas(num / d) : " leaves a remainder of " + (num % d)) + ".",
               cite: CITE(6, "divisibility"), ex: "single", skill: 6 };
    });
  }

  /* ================================================================== L7
     Lines, angles and planes. */
  var ANGLES = [
    { name: "Right angle", desc: "exactly 90°, the square corner" },
    { name: "Acute angle", desc: "smaller than a right angle" },
    { name: "Obtuse angle", desc: "bigger than a right angle but not a straight line" },
    { name: "Straight angle", desc: "exactly 180°, a straight line" },
  ];

  function L7() {
    return tries(function () {
      var kind = pick(["angle", "segment", "lines", "count"]);

      if (kind === "angle") {
        var deg = between(1, 179);
        var right = deg === 90 ? ANGLES[0] : deg < 90 ? ANGLES[1] : ANGLES[2];
        var o = opts(right.name, shuffle(ANGLES.filter(function (x) { return x.name !== right.name; }))
                                   .map(function (x) { return x.name; }));
        if (!o) return null;
        return { q: "An angle measures <b>" + deg + "°</b>. What kind of angle is it?",
                 opts: o.opts, a: o.a,
                 why: deg + "° is " + right.desc + ", so it is " + right.name.toLowerCase() + ". A right angle is exactly 90°, a straight angle exactly 180°; anything below 90° is acute and anything between 90° and 180° is obtuse.",
                 cite: CITE(7, "angles"), ex: "angles", skill: 7 };
      }

      if (kind === "segment") {
        var ab = between(2, 14), bc = between(2, 14), ac = ab + bc;
        var ask = pick(["BC", "AB", "AC"]);
        var val = ask === "BC" ? bc : ask === "AB" ? ab : ac;
        var known = ask === "AC" ? "AB is " + ab + " cm and BC is " + bc + " cm"
                                 : (ask === "BC" ? "AB is " + ab : "BC is " + bc) + " cm and AC is " + ac + " cm";
        var o2 = opts(val + " cm", [(val + 2) + " cm", (ac + ab) + " cm", Math.abs(ab - bc) + " cm"]);
        if (!o2) return null;
        return { q: "Point B is between A and C on a line. " + known + ". Find <b>" + ask + "</b>.",
                 opts: o2.opts, a: o2.a,
                 why: "When B is between A and C, the two short segments make the long one: AB + BC = AC, so " + ab + " + " + bc + " = " + ac + ". That gives " + ask + " = " + val + " cm.",
                 cite: CITE(7, "segments"), ex: "angles", skill: 7 };
      }

      if (kind === "lines") {
        var which = pick([
          { q: "Two lines in the same plane cross and make square corners. What are they called?",
            a: "Perpendicular", w: ["Parallel", "Oblique", "Skew"],
            why: "Lines that intersect and form square corners are perpendicular, written with the ⊥ symbol. Four right angles are made where they cross." },
          { q: "Two lines in the same plane never meet, however far they are extended. What are they called?",
            a: "Parallel", w: ["Perpendicular", "Oblique", "Intersecting"],
            why: "Lines in the same plane that never intersect stay the same distance apart and are parallel, written with the ∥ symbol." },
          { q: "Two lines in the same plane cross but do not make square corners. What are they called?",
            a: "Oblique", w: ["Parallel", "Perpendicular", "Skew"],
            why: "Lines in a plane that are neither parallel nor perpendicular are oblique. They do cross — just not at a right angle." },
          { q: "Two lines are in different planes and never meet. What are they called?",
            a: "Skew", w: ["Parallel", "Perpendicular", "Oblique"],
            why: "Parallel lines are in the same plane. Lines in different planes that never meet are skew — the ceiling edge and a floor edge running the other way, for instance." },
        ]);
        var o3 = opts(which.a, which.w);
        if (!o3) return null;
        return { q: which.q, opts: o3.opts, a: o3.a, why: which.why,
                 cite: CITE(7, "lines and planes"), ex: "angles", skill: 7 };
      }

      var o4 = opts("Four", ["Two", "One", "Eight"]);
      if (!o4) return null;
      return { q: "How many <b>right angles</b> are made where two perpendicular lines cross?",
               opts: o4.opts, a: o4.a,
               why: "Two crossing lines make four angles. If one of them is a right angle then all four are, because the angles on a straight line add to 180°. So perpendicular lines make four right angles.",
               cite: CITE(7, "angles"), ex: "angles", skill: 7 };
    });
  }

  /* ================================================================== L8
     Fractions and percents. */
  var FP = [[1, 2, 50], [1, 4, 25], [3, 4, 75], [1, 5, 20], [2, 5, 40], [3, 5, 60],
            [4, 5, 80], [1, 10, 10], [3, 10, 30], [7, 10, 70], [9, 10, 90],
            [1, 20, 5], [1, 100, 1], [1, 3, null], [2, 3, null]];

  function L8() {
    return tries(function () {
      var kind = pick(["topct", "tofrac", "ruler"]);
      var row = pick(FP.filter(function (r) { return r[2] !== null; }));
      var n = row[0], d = row[1], p = row[2];

      if (kind === "topct") {
        var o = opts(p + "%", [(p + 10) + "%", (d * 10) + "%", (n * 10) + "%", (100 - p) + "%"]);
        if (!o) return null;
        return { q: "Write <b>" + frac(n, d) + "</b> as a percent.", opts: o.opts, a: o.a,
                 why: "Percent means out of a hundred, so scale the fraction to have 100 underneath: " + frac(n, d) + " = " + frac(n * (100 / d), 100) + " = " + p + "%. Or divide: " + n + " ÷ " + d + " = " + (n / d) + ", and " + (n / d) + " × 100 = " + p + ".",
                 cite: CITE(8, "fractions and percents"), ex: "percent", skill: 8 };
      }

      if (kind === "tofrac") {
        var g = gcd(p, 100);
        var right = frac(p / g, 100 / g);
        var o2 = opts(right, [frac(p, 10), frac(100 / g, p / g), frac(p, 100)]);
        if (!o2) return null;
        return { q: "Write <b>" + p + "%</b> as a fraction in lowest terms.", opts: o2.opts, a: o2.a,
                 why: p + "% means " + p + " out of 100, so it starts as " + frac(p, 100) + ". Both parts divide by " + g + ", which gives " + right + ".",
                 cite: CITE(8, "fractions and percents"), ex: "percent", skill: 8 };
      }

      // ruler: eighths of an inch
      var eighths = between(1, 15);
      var gg = gcd(eighths, 8);
      var right2 = eighths % 8 === 0 ? String(eighths / 8)
        : eighths > 8 ? (Math.floor(eighths / 8) + " " + frac((eighths % 8) / gcd(eighths % 8, 8), 8 / gcd(eighths % 8, 8)))
                      : frac(eighths / gg, 8 / gg);
      var o3 = opts(right2 + " in.", [frac(eighths, 8) + " in.", frac(eighths, 16) + " in.",
                                      (eighths / 8).toFixed(2) + " in."]);
      if (!o3) return null;
      return { q: "A ruler is marked in eighths of an inch. A line ends <b>" + eighths + " marks</b> past the start. How long is it, in lowest terms?",
               opts: o3.opts, a: o3.a,
               why: eighths + " eighths is " + frac(eighths, 8) + ". In lowest terms that is " + right2 + " inches. On an inch ruler the longest marks are halves, then quarters, then eighths.",
               cite: CITE(8, "the inch ruler"), ex: "percent", skill: 8 };
    });
  }

  /* ================================================================== L9
     Adding, subtracting and multiplying fractions; reciprocals. */
  function L9() {
    return tries(function () {
      var kind = pick(["add", "sub", "mul", "recip"]);
      var d = pick([3, 4, 5, 6, 8, 9, 10, 12]);

      if (kind === "add" || kind === "sub") {
        var a = between(1, d - 1), b = between(1, d - 1);
        var num = kind === "add" ? a + b : Math.abs(a - b);
        if (num === 0) return null;
        var g = gcd(num, d);
        var right = num > d ? (Math.floor(num / d) + " " + frac((num % d) / gcd(num % d, d), d / gcd(num % d, d)))
                            : (num === d ? "1" : frac(num / g, d / g));
        var hi = Math.max(a, b), lo = Math.min(a, b);
        var o = opts(right, [frac(num, d * 2), frac(kind === "add" ? a + b : hi - lo, d) + " (not reduced)",
                             frac(a * b, d)]);
        if (!o) return null;
        return { q: (kind === "add" ? "Add" : "Subtract") + ": <b>" + frac(hi, d) + (kind === "add" ? " + " : " − ") + frac(lo, d) + "</b>",
                 opts: o.opts, a: o.a,
                 why: "The denominators already match, so " + (kind === "add" ? "add" : "subtract") + " the numerators and leave the denominator alone: " + frac(hi, d) + (kind === "add" ? " + " : " − ") + frac(lo, d) + " = " + frac(num, d) + (right !== frac(num, d) ? ", which reduces to " + right : "") + ".",
                 cite: CITE(9, "adding and subtracting fractions"), ex: "fractions", skill: 9 };
      }

      if (kind === "mul") {
        var n1 = between(1, 5), d1 = between(n1 + 1, 9);
        var n2 = between(1, 5), d2 = between(n2 + 1, 9);
        var pn = n1 * n2, pd = d1 * d2, g2 = gcd(pn, pd);
        var o2 = opts(frac(pn / g2, pd / g2), [frac(pn, pd) + " (not reduced)",
                                               frac(n1 + n2, d1 + d2), frac(n1 * d2, d1 * n2)]);
        if (!o2) return null;
        return { q: "Multiply: <b>" + frac(n1, d1) + " × " + frac(n2, d2) + "</b>", opts: o2.opts, a: o2.a,
                 why: "Multiply the numerators together and the denominators together: " + (n1 + " × " + n2) + " = " + pn + " over " + (d1 + " × " + d2) + " = " + pd + ", so " + frac(pn, pd) + (g2 > 1 ? ", which reduces to " + frac(pn / g2, pd / g2) : "") + ". No common denominator is needed to multiply — that is only for adding and subtracting.",
                 cite: CITE(9, "multiplying fractions"), ex: "fractions", skill: 9 };
      }

      // reciprocal
      var rn = between(2, 9), rd = between(2, 9);
      if (rn === rd) return null;
      var o3 = opts(frac(rd, rn), [frac(rn, rd), frac(-rn, rd), frac(rd + 1, rn)]);
      if (!o3) return null;
      return { q: "What is the <b>reciprocal</b> of " + frac(rn, rd) + "?", opts: o3.opts, a: o3.a,
               why: "The reciprocal of a fraction is that fraction turned upside down, so the reciprocal of " + frac(rn, rd) + " is " + frac(rd, rn) + ". A number times its reciprocal is always 1: " + frac(rn, rd) + " × " + frac(rd, rn) + " = " + frac(rn * rd, rd * rn) + " = 1.",
               cite: CITE(9, "reciprocals"), ex: "fractions", skill: 9 };
    });
  }

  /* ================================================================== L10
     Division answers as mixed numbers; improper fractions. */
  function L10() {
    return tries(function () {
      var kind = pick(["divide", "toMixed", "toImproper"]);

      if (kind === "divide") {
        var d = between(3, 9), w = between(2, 20), r = between(1, d - 1), n = w * d + r;
        var g = gcd(r, d);
        var right = w + " " + frac(r / g, d / g);
        var o = opts(right, [w + " r" + r, (w + 1) + " " + frac(r / g, d / g),
                             w + " " + frac(d / g, r / g)]);
        if (!o) return null;
        return { q: "Divide and write the answer as a <b>mixed number</b>: <b>" + n + " ÷ " + d + "</b>",
                 opts: o.opts, a: o.a,
                 why: n + " ÷ " + d + " is " + w + " with " + r + " left over. The remainder becomes the numerator over the divisor, so the answer is " + right + ". Check: " + w + " × " + d + " + " + r + " = " + n + ".",
                 cite: CITE(10, "mixed numbers"), ex: "mixed", skill: 10 };
      }

      if (kind === "toMixed") {
        var dd = between(3, 9), ww = between(2, 12), rr = between(1, dd - 1);
        var imp = ww * dd + rr, gg = gcd(rr, dd);
        var right2 = ww + " " + frac(rr / gg, dd / gg);
        var o2 = opts(right2, [(ww + 1) + " " + frac(rr / gg, dd / gg),
                               ww + " " + frac(dd / gg, rr / gg), (ww - 1) + " " + frac(rr / gg, dd / gg)]);
        if (!o2) return null;
        return { q: "Write <b>" + frac(imp, dd) + "</b> as a mixed number.", opts: o2.opts, a: o2.a,
                 why: "An improper fraction is a division waiting to happen: " + imp + " ÷ " + dd + " = " + ww + " remainder " + rr + ", so " + frac(imp, dd) + " = " + right2 + ".",
                 cite: CITE(10, "improper fractions"), ex: "mixed", skill: 10 };
      }

      var d3 = between(3, 9), w3 = between(2, 12), r3 = between(1, d3 - 1);
      var imp3 = w3 * d3 + r3;
      var o3 = opts(frac(imp3, d3), [frac(w3 * d3, d3), frac(w3 + r3, d3), frac(imp3 + 1, d3)]);
      if (!o3) return null;
      return { q: "Write <b>" + w3 + " " + frac(r3, d3) + "</b> as an improper fraction.",
               opts: o3.opts, a: o3.a,
               why: "Multiply the whole number by the denominator and add the numerator: " + w3 + " × " + d3 + " = " + (w3 * d3) + ", plus " + r3 + " is " + imp3 + ". Keep the same denominator, so " + w3 + " " + frac(r3, d3) + " = " + frac(imp3, d3) + ".",
               cite: CITE(10, "improper fractions"), ex: "mixed", skill: 10 };
    });
  }

  var GEN = { 1: L1, 2: L2, 3: L3, 4: L4, 5: L5, 6: L6, 7: L7, 8: L8, 9: L9, 10: L10 };

  var NAMES = {
    1: "Whole numbers, money and variables",
    2: "Properties of operations",
    3: "Finding an unknown number",
    4: "Number line sequences",
    5: "Place value",
    6: "Factors and divisibility",
    7: "Lines, angles and planes",
    8: "Fractions and percents",
    9: "Adding, subtracting and multiplying fractions",
    10: "Mixed numbers and improper fractions",
  };

  var API = {
    /* Which lesson skills can be practised. Everything past this returns null
       from gen(), and the app says so rather than showing an empty set. */
    built: Object.keys(GEN).map(Number).sort(function (a, b) { return a - b; }),
    name: function (n) { return NAMES[n] || ("Lesson " + n); },
    has: function (n) { return !!GEN[n]; },

    /* One question for the skill taught in lesson n. Null if not built yet. */
    gen: function (n) { return GEN[n] ? GEN[n]() : null; },

    /* `count` questions for a problem, avoiding an immediate repeat of the same
       question text. A problem may review more than one lesson — Saxon writes
       that as (2, 4) — so the skills are dealt round-robin. */
    forProblem: function (skills, count) {
      var out = [], seen = {}, guard = 0;
      skills = skills.filter(function (s) { return GEN[s]; });
      if (!skills.length) return out;
      while (out.length < count && guard++ < count * 30) {
        var q = GEN[skills[out.length % skills.length]]();
        if (!q || seen[q.q]) continue;
        seen[q.q] = true;
        out.push(q);
      }
      return out;
    },
  };

  if (typeof module === "object" && module.exports) module.exports = API;
  else root.MATH = API;
})(typeof window !== "undefined" ? window : this);
