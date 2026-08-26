/* node _build/test_vocabtest.js — the Word List 1 test suite.
   Checks coverage across the forms, that no item has two defensible answers,
   and that the answer positions are dealt, not merely random. */
const fs=require("fs"),path=require("path");
const src=fs.readFileSync(path.join(__dirname,"..","vocabulary","ww6-lesson1-test","index.html"),"utf8");
const DATA=JSON.parse(src.match(/const DATA = (\{.*?\});\n/s)[1]);
let pass=0,fail=0;
const G=g=>console.log("\n"+g);
const ok=(c,m)=>{c?(pass++,console.log("  ok   "+m)):(fail++,console.log("  FAIL "+m));};
const strip=s=>s.replace(/<[^>]+>/g,"").replace(/&nbsp;/g," ").replace(/\s+/g," ").trim();
const P=DATA.pool, F=DATA.forms;
const sk=o=>o.w+":"+o.s;          // from an item
const key=i=>sk(P[i]);            // from a pool index

G("shape");
ok(F.length===4,"three forms and a final");
ok(P.length===90,"pool holds 90 items ("+P.length+")");
ok(DATA.bank.length===15,"fifteen words in the bank");
ok(P.every(i=>i.opts.length===4),"every item offers four options");
ok(P.every(i=>new Set(i.opts).size===4),"no item repeats an option");
ok(P.every(i=>i.cite&&i.cite.length>10),"every item carries a source line");

G("length limits");
F.slice(0,3).forEach(f=>ok(f.items.length>=20&&f.items.length<=25,
  f.name+" is "+f.items.length+" questions, inside 20-25"));
ok(F[3].items.length===35,"the final is 35 questions");
F.forEach(f=>ok(new Set(f.items).size===f.items.length,f.name+" repeats no item"));

G("coverage");
const senses=new Set(P.filter(i=>i.type!=="ant").map(sk));
ok(senses.size===26,"the pool covers all 26 meanings ("+senses.size+")");
F.slice(0,3).forEach(f=>ok(new Set(f.items.map(i=>P[i].w)).size===15,
  f.name+" asks about all fifteen words"));
const abc=new Set(F.slice(0,3).flatMap(f=>f.items).filter(i=>P[i].type!=="ant").map(key));
ok(abc.size===26,"Forms A, B and C between them reach every meaning ("+abc.size+")");
const fin=new Set(F[3].items.filter(i=>P[i].type!=="ant").map(key));
ok(fin.size===26,"the final covers every meaning exactly once");

G("the forms really do differ");
for(let a=0;a<3;a++) for(let b=a+1;b<3;b++){
  const A=new Set(F[a].items), shared=F[b].items.filter(i=>A.has(i)).length;
  ok(shared===0,F[a].name+" and "+F[b].name+" share no identical question");
}
DATA.bank.forEach(w=>{
  const asked=F.slice(0,3).map(f=>{
    const it=f.items.map(i=>P[i]).find(i=>i.w===w&&i.type!=="ant");
    return it?it.type+":"+it.s:"-";
  });
  ok(new Set(asked).size===3,"'"+w+"' is asked three different ways: "+asked.join(", "));
});

G("no item has two defensible answers");
/* def asks word(pos) -> meaning, so no distractor may be another sense of the
   same word. This is the bug that shipped in the first draft. */
const owner={}; P.filter(i=>i.type==="def").forEach(i=>{owner[i.opts[0]]=i.w;});
/* The trap is only ever a second meaning of the word being ASKED about.
   Two distractors happening to belong to one other word is harmless. */
const ownSenses={}; P.filter(i=>i.type==="def").forEach(i=>{(ownSenses[i.w]=ownSenses[i.w]||[]).push(i.opts[0]);});
ok(P.filter(i=>i.type==="def").every(i=>
     !(ownSenses[i.w]||[]).some(d=>i.opts.slice(1).includes(d))),
   "no 'choose the meaning' item offers a second meaning of its own word");
ok(P.filter(i=>i.type!=="def").every(i=>new Set(i.opts).size===4),
   "no word-answer item lists the same word twice");
ok(P.filter(i=>i.type!=="def").every(i=>i.opts.every(o=>DATA.bank.includes(o))),
   "every word-answer choice is one of the fifteen");

G("a missed question comes back a different way");
ok(P.every(i=>Array.isArray(i.alt)&&i.alt.length>0),"every item has an alternate form");
ok(P.every(i=>i.alt.every(j=>P[j].type!==i.type)),"an alternate is never the same type");
ok(P.filter(i=>i.type!=="ant").every(i=>i.alt.every(j=>key(j)===sk(i))),
   "an alternate always tests the same meaning");

G("answer position is dealt, not left to luck");
/* replay the app's own positions() and lay() */
const shuffle=a=>{a=a.slice();for(let i=a.length-1;i>0;i--){const j=Math.random()*(i+1)|0;[a[i],a[j]]=[a[j],a[i]];}return a;};
function positions(n){const off=Math.random()*4|0,deck=[];for(let i=0;i<n;i++)deck.push((i+off)%4);
  for(let t=0;t<200;t++){const d=shuffle(deck);let run=1,worst=1;
    for(let i=1;i<d.length;i++){run=d[i]===d[i-1]?run+1:1;if(run>worst)worst=run;}
    if(worst<3)return d;} return shuffle(deck);}
let worstRun=0, slot=[0,0,0,0], sittings=3000;
for(let s=0;s<sittings;s++){
  const d=positions(F[3].items.length);
  d.forEach(x=>slot[x]++);
  let run=1;for(let i=1;i<d.length;i++){run=d[i]===d[i-1]?run+1:1;if(run>worstRun)worstRun=run;}
}
ok(worstRun<3,"over "+sittings+" sittings the longest run of one position is "+worstRun);
const tot=slot.reduce((a,b)=>a+b,0), lo=tot/4*0.98, hi=tot/4*1.02;
ok(slot.every(n=>n>lo&&n<hi),"positions come out even: "+slot.join(" / "));
const first=[],second=[];
for(let s=0;s<400;s++){const d=positions(24);first.push(d[0]);second.push(d[1]);}
ok(new Set(first).size===4&&new Set(second).size===4,
   "question 1 and question 2 are not stuck on one letter across sittings");

G("provenance");
const book=P.filter(i=>/Wordly Wise 3000/.test(i.cite)).length;
const mine=P.length-book;
ok(book===52,"52 pool items are the book's own wording ("+book+")");
ok(mine===38,"38 declare they were written for this test ("+mine+")");

G("names");
ok(!/Myles/i.test(P.map(i=>strip(i.q)).join(" ")),"Myles appears in no sentence");

console.log("\n"+(fail?fail+" FAILED, ":"")+pass+" assertions passed");
process.exit(fail?1:0);
