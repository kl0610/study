/* The very small DOM the runnable suites drive the real pages through.
 *
 * It was written inside test_mathrun.js and is now shared, because the
 * mission shell needs the same thing and a second copy would be a second
 * set of gaps to find. Every gap it has had so far — a missing parentNode,
 * an insertAdjacentHTML that reparsed its siblings and threw away their
 * handlers, a selector that descended past its last part — made correct
 * code look broken, so they are all documented where they were fixed.
 */
"use strict";

/* ============================ a very small DOM ============================
   Real containment, because the page assigns handlers by walking down from a
   row — el.querySelector("input"), el.querySelectorAll(".howmany button") — and
   a flat registry would wire every row's buttons to the last row. Selectors go
   as far as "tag", ".class" and ".class tag", which is everything this page
   asks for. */
const VOID = new Set(["input", "img", "br", "hr", "meta", "link", "path"]);

function Node(tag, attr) {
  const cls = new Set(String(attr.class || "").split(/\s+/).filter(Boolean));
  /* Class, id and disabled are kept on the attributes as well as in the object,
     because innerHTML is serialised back out of the tree. A page that snapshots
     a card and replays it later — which is how a question already answered is
     shown again — gets back what the tree actually holds now, marks and locks
     included, exactly as a browser would hand it over. */
  const sync = () => { if (cls.size) attr.class = [...cls].join(" "); else delete attr.class; };
  const n = {
    tagName: tag.toLowerCase(), attr, kids: [], parent: null,
    onclick: null, onchange: null, _gone: false, _html: "",
    /* style records what is set and writes it back to the style attribute, the
       way the real one does. It used to swallow everything, so a page that
       positions an overlay from JS — which is the whole of a marker's placement
       and size — left nothing behind that could be read back and checked. */
    style: styleFor(attr),
    /* dataset writes through to the attribute, as the real one does. It used to
       be a plain object, so a page that set el.dataset.n could never be found
       again by [data-n="..."] — the assignment worked and left no trace. */
    dataset: new Proxy({}, {
      get(_, k) { return typeof k === "string" ? attr["data-" + dashed(k)] : undefined; },
      set(_, k, v) { attr["data-" + dashed(k)] = String(v); return true; },
      has(_, k) { return ("data-" + dashed(k)) in attr; },
      deleteProperty(_, k) { delete attr["data-" + dashed(k)]; return true; },
    }),
    checked: "checked" in attr, hidden: "hidden" in attr,
    scrollTop: 0, scrollLeft: 0,
    classList: {
      add(...c) { c.forEach(x => cls.add(x)); sync(); },
      remove(...c) { c.forEach(x => cls.delete(x)); sync(); },
      toggle(c, on) { if (on === undefined) on = !cls.has(c); on ? cls.add(c) : cls.delete(c); sync(); },
      contains(c) { return cls.has(c); },
    },
    setAttribute(k, v) { attr[k] = v; }, getAttribute(k) { return attr[k]; },
    removeAttribute(k) { delete attr[k]; },
    appendChild(c) { c.parent = n; n.kids.push(c); return c; },
    insertBefore(c) { c.parent = n; n.kids.unshift(c); return c; },
    removeChild(c) { n.kids = n.kids.filter(x => x !== c); },
    remove() { n._gone = true; if (n.parent) n.parent.removeChild(n); },
    insertAdjacentHTML(pos, h) {
      /* Only the new markup is parsed. Re-parsing the whole element would build
         fresh objects for the children that were already there, throwing away
         the handlers on them — which is not what a browser does, and it made
         the Check button stop responding the moment any other button was
         inserted beside it. */
      const made = parse(h, n);
      made.forEach(k => { k.parent = n; });
      n.kids = pos === "beforeend" ? n.kids.concat(made) : made.concat(n.kids);
      n._html = pos === "beforeend" ? n._html + h : h + n._html;
    },
    focus() {}, scrollIntoView() {}, blur() {},
    addEventListener() {}, removeEventListener() {},
    click() {
      if (n.onclick) n.onclick({ preventDefault() {}, stopPropagation() {}, target: n });
    },
    querySelector(s) { return find(n, s)[0] || null; },
    querySelectorAll(s) { return find(n, s); },
  };
  /* nothing to seed: dataset reads straight off the attributes */
  let _id = attr.id || "", _dis = "disabled" in attr;
  Object.defineProperty(n, "id", {
    get() { return _id; },
    set(v) { _id = String(v); if (_id) attr.id = _id; else delete attr.id; },
  });
  Object.defineProperty(n, "className", {
    get() { return [...cls].join(" "); },
    set(v) { cls.clear(); String(v).split(/\s+/).filter(Boolean).forEach(c => cls.add(c)); sync(); },
  });
  Object.defineProperty(n, "disabled", {
    get() { return _dis; },
    set(v) { _dis = !!v; if (_dis) attr.disabled = ""; else delete attr.disabled; },
  });
  /* src and href mirror their attributes both ways, as they do in a browser.
     Setting img.src on a plain object left the attribute untouched, so swapping
     one picture for another was invisible to anything reading the element. */
  ["src", "href"].forEach(k => Object.defineProperty(n, k, {
    get() { return attr[k] === undefined ? "" : attr[k]; },
    set(v) { attr[k] = String(v); },
  }));
  /* value starts at the attribute and then goes its own way, which is what an
     input does once it has been typed into. */
  let _val = attr.value === undefined ? "" : attr.value;
  Object.defineProperty(n, "value", {
    get() { return _val; },
    set(v) { _val = String(v); },
  });
  /* Text is a real child, so that reading a subtree back gives the words and not
     just the tags. Without it every replayed card came back blank. */
  Object.defineProperty(n, "textContent", {
    get() { return n.kids.map(k => k.tagName === "#text" ? k.text : k.textContent).join(""); },
    set(v) { n.kids = [text(String(v), n)]; },
  });
  /* The DOM names these parentNode and nextSibling; the shim was only setting
     `parent`, so code that guards on `el.parentNode` bailed out and its work
     looked like it had never run. */
  Object.defineProperty(n, "parentNode", { get() { return n.parent; } });
  /* `children` is elements only — text is not one, and neither is anything
     already removed. */
  Object.defineProperty(n, "children", {
    get() { return n.kids.filter(k => k.tagName !== "#text" && !k._gone); },
  });
  Object.defineProperty(n, "nextSibling", {
    get() {
      if (!n.parent) return null;
      const i = n.parent.kids.indexOf(n);
      return i >= 0 ? (n.parent.kids[i + 1] || null) : null;
    },
  });
  Object.defineProperty(n, "innerHTML", {
    get() { return n.kids.map(ser).join(""); },
    set(v) { n._html = String(v); n.kids = parse(n._html, n); },
  });
  Object.defineProperty(n, "outerHTML", { get() { return ser(n); } });
  return n;
}

/* A text node. It carries no attributes and matches no selector, so it is
   invisible to everything except reading the tree back out. */
function text(s, parent) {
  return { tagName: "#text", text: s, kids: [], attr: {}, parent: parent || null,
           _gone: false, classList: { contains() { return false; } },
           getAttribute() { return null; }, textContent: s };
}

/* dataset keys are camelCase; the attribute they stand for is dashed. */
function dashed(k) { return String(k).replace(/[A-Z]/g, c => '-' + c.toLowerCase()); }
function camel(k) { return String(k).replace(/-(\w)/g, (_, c) => c.toUpperCase()); }

function styleFor(attr) {
  const props = {};
  const write = () => {
    const t = Object.keys(props).map(k => dashed(k) + ": " + props[k] + ";").join(" ");
    if (t) attr.style = t; else delete attr.style;
  };
  const api = {
    setProperty(k, v) { props[camel(k)] = String(v); write(); },
    removeProperty(k) { delete props[camel(k)]; write(); },
    getPropertyValue(k) { return props[camel(k)] || ""; },
  };
  return new Proxy(api, {
    get(t, k) {
      if (k in t) return t[k];
      if (k === "cssText") return attr.style || "";
      return props[k] === undefined ? "" : props[k];
    },
    set(t, k, v) {
      if (k === "cssText") { attr.style = String(v); return true; }
      props[k] = String(v); write(); return true;
    },
  });
}

function ser(n) {
  if (n._gone) return "";
  if (n.tagName === "#text") return n.text;
  const a = Object.keys(n.attr)
    .map(k => (n.attr[k] === "" ? " " + k : ' ' + k + '="' + n.attr[k] + '"')).join("");
  const open = "<" + n.tagName + a + ">";
  if (VOID.has(n.tagName)) return open;
  return open + n.kids.map(ser).join("") + "</" + n.tagName + ">";
}

function parse(src, parent) {
  const root = [];
  const stack = [];
  const re = /<(\/?)([a-zA-Z][\w-]*)([^>]*?)(\/?)>/g;
  let m, at = 0;
  const put = node => {
    node.parent = stack.length ? stack[stack.length - 1] : parent;
    (stack.length ? stack[stack.length - 1].kids : root).push(node);
  };
  while ((m = re.exec(src))) {
    if (m.index > at) put(text(src.slice(at, m.index)));
    at = m.index + m[0].length;
    const [, close, tag, rawAttr, selfShut] = m;
    if (close) { stack.pop(); continue; }
    const attr = {};
    for (const a of rawAttr.matchAll(/([\w-]+)(?:="([^"]*)")?/g)) {
      if (a[1]) attr[a[1]] = a[2] === undefined ? "" : a[2];
    }
    const node = Node(tag, attr);
    put(node);
    if (!selfShut && !VOID.has(tag.toLowerCase())) stack.push(node);
  }
  if (at < src.length) put(text(src.slice(at)));
  return root;
}

function walk(n, out) {
  for (const k of n.kids) {
    if (k.tagName === "#text") continue;   /* nothing selects text */
    out.push(k); walk(k, out);
  }
  return out;
}
function matches(n, sel) {
  /* "tag", ".class", several classes at once, and a trailing [attr="value"].
     The mission shell finds the option a child chose with `.opt[data-i="2"]`,
     and without the attribute part that matched nothing at all — which looks
     exactly like the page failing to wire its own buttons. */
  let want = null;
  sel = sel.replace(/\[([\w-]+)(?:=(?:"([^"]*)"|'([^']*)'|([^\]]*)))?\]$/,
    (m, k, a, b, c) => { want = [k, a !== undefined ? a : b !== undefined ? b : c]; return ""; });
  if (want) {
    const have = n.getAttribute(want[0]);
    if (have === undefined || have === null) return false;
    if (want[1] !== undefined && String(have) !== want[1]) return false;
  }
  if (!sel) return true;
  /* #id, which pages use to root a query at one region of the page —
     "#panel .opt[data-opt]". Without it that matched nothing, and the handlers
     it was meant to wire were silently never attached. */
  let id = null;
  sel = sel.replace(/#([\w-]+)/, (m, v) => { id = v; return ""; });
  if (id !== null && n.id !== id) return false;
  if (!sel) return true;
  const bits = sel.split(".");
  const tag = bits.shift();
  if (tag && n.tagName !== tag.toLowerCase()) return false;
  return bits.every(c => n.classList.contains(c));
}
function find(root, sel) {
  /* Descendant selectors, left to right. The matches for the LAST part are the
     answer — descending past it was the first version's bug, and it made
     ".howmany button" return nothing at all. */
  if (sel.indexOf(",") !== -1) {
    /* a selector list: the union of the parts, in document order */
    const hit = new Set(sel.split(",").flatMap(s => find(root, s)));
    return walk(root, []).filter(n => hit.has(n));
  }
  const parts = sel.trim().split(/\s+/);
  let pool = walk(root, []);
  for (let i = 0; i < parts.length; i++) {
    const hit = pool.filter(n => matches(n, parts[i]));
    if (i === parts.length - 1) return hit.filter(x => !x._gone);
    pool = hit.flatMap(n => walk(n, []));
  }
  return [];
}

function boot(extra, exact) {
  /* The ids the page expects to find already in the document. Each shell has
     its own set, so a caller adds to them — or, with `exact`, names them
     outright. Naming them matters: a stray placeholder is worse than a missing
     one, because the page finds it, writes into it, and the thing it was
     supposed to create never gets created. */
  const body = Node("body", {});
  const ids = exact ? [] :
              ["tolessons", "home", "decades", "foot", "play", "pname", "dots", "card",
               "nav", "skipnote", "done", "dtag", "scorebox", "picker", "readbox"];
  body.innerHTML = ids.concat(extra || []).map(i => `<div id="${i}"></div>`).join("");
  const doc = {
    documentElement: { attrs: {}, setAttribute(k, v) { this.attrs[k] = v; },
                       style: { setProperty() {} }, clientWidth: 400 },
    body, head: Node("head", {}),
    createElement: t => Node(t, {}),
    getElementById: id => byId(body, id),
    querySelector(s) { return find(body, s)[0] || null; },
    querySelectorAll(s) { return find(body, s); },
    addEventListener() {}, removeEventListener() {}, readyState: "complete",
  };
  return { doc, body };
}
function byId(root, id) {
  for (const n of walk(root, [])) if (!n._gone && n.id === id) return n;
  return null;
}


module.exports = { Node, parse, walk, find, boot, byId, VOID };
