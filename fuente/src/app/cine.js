/* Capa visual «corporativa»: marca con la clase hc-neg los elementos cuyo texto es una cifra negativa (−1.200 €, -3 %)
   para pintarlos en el único rojo permitido. Puramente cosmético: no toca textos ni estructura; agrupa el trabajo en un
   requestAnimationFrame y solo mira lo que cambia. */
(function () {
  if (!window.MutationObserver || !document.createTreeWalker) return;
  var RE = /^[\u2212\u2013-]\s?(?:[€$]\s?)?\d[\d.,\u00a0\u202f ]*(?:\s?(?:€|%|‰|k€|M€))?$/;
  var DIG = /\d/;
  var pend = [], full = true, tick = false;
  function own(el) { var t = "", c = el.firstChild; for (; c; c = c.nextSibling) { if (c.nodeType === 3) t += c.nodeValue; else if (c.nodeType === 1 && c.classList && c.classList.contains("cur")) t += c.textContent; else return null; } return t.replace(/\s+/g, " ").trim(); }
  function mark(el) {
    if (!el || el.nodeType !== 1 || el.closest("script,style,textarea,input,select,option,svg,[contenteditable]")) return;
    var t = own(el), neg = !!(t && t.length < 32 && RE.test(t));
    if (neg !== el.classList.contains("hc-neg")) el.classList.toggle("hc-neg", neg);
  }
  function scanText(root) {
    var w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT), n, seen = new Set();
    while ((n = w.nextNode())) { var p = n.parentElement; if (p && !seen.has(p) && DIG.test(n.nodeValue)) { seen.add(p); mark(p); } }
  }
  function run() {
    tick = false;
    if (full) { full = false; pend = []; scanText(document.body); return; }
    var q = pend; pend = [];
    for (var i = 0; i < q.length; i++) { var x = q[i]; if (!x.isConnected) continue; if (x.nodeType === 3) mark(x.parentElement); else { if (x.classList && x.classList.contains("hc-neg")) mark(x); scanText(x); } }
  }
  function sched() { if (!tick) { tick = true; requestAnimationFrame(run); } }
  new MutationObserver(function (ms) {
    for (var i = 0; i < ms.length; i++) {
      var m = ms[i];
      if (m.type === "characterData") pend.push(m.target);
      else { if (m.target.nodeType === 1 && m.target.classList.contains("hc-neg")) pend.push(m.target); for (var j = 0; j < m.addedNodes.length; j++) pend.push(m.addedNodes[j]); }
    }
    if (pend.length > 4000) { full = true; pend = []; }
    sched();
  }).observe(document.documentElement, { childList: true, subtree: true, characterData: true });
  if (document.body) sched(); else document.addEventListener("DOMContentLoaded", sched);
})();
