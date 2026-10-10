// ───────────────────── {{MARCA}} · modo reunión y carpeta para la familia (Piloto 7) ─────────────────────
// Modo reunión: secuencia de pantallas a pantalla completa para explicar la herencia a la familia en la primera reunión.
// Carpeta: archivo HTML autónomo que la familia se queda en el móvil (plantilla src/carpeta.html, inyectada como CARPETA_HTML).
// Prefijo de identificadores: rn / RN_. No toca render(): la capa se cuelga de document.body y se quita al salir.

const RN_DER = { pleno: "propiedad", usufructo: "usufructo", nuda: "nuda propiedad" };
const rnR = (n) => Math.round((Number(n) || 0) * 100) / 100;
const rnApellido = (nombre) => { const w = String(nombre || "").trim().split(/\s+/).filter(Boolean); return !w.length ? "herencia" : w.length >= 3 ? w.slice(-2).join(" ") : w[w.length - 1]; };
const rnRel = (h, x) => { const p = (x.personas || []).find((q) => q.id === h.id); return p && typeof gnRel === "function" ? gnCap(gnRel(p)) : RELACIONES[h.relacion]?.label || ""; };
// Adjudicación y compensaciones de un heredero en lenguaje llano (cuadro único)
const rnAdjTxt = (h, cif = true) => [h.seQueda.length ? `Se queda ${h.seQueda.join(", ")} entero${h.seQueda.length > 1 ? "s" : ""}` : "", h.compensa.length ? `compensa en dinero a ${h.compensa.map((c) => c.nombre + (cif ? ` (${eur0(c.importe)})` : "")).join(" y ")}` : "", h.cobra.length ? `recibe en dinero de ${h.cobra.map((c) => c.nombre + (cif ? ` (${eur0(c.importe)})` : "")).join(" y ")}` : ""].filter(Boolean).join(" y ");
const rnNom = (x, id) => { const p = (x.personas || []).find((q) => q.id === id); return p ? p.nombre || RELACIONES[p.relacion]?.label || "—" : "—"; };

// ── Modelo común: lo que la familia necesita entender, sacado del cálculo y de la partición ──
function rnPasos(x, R, n = 5) {
  let L = [];
  if (typeof tramitesExp === "function" && typeof cerrado === "function") {
    // Solo pasos para la familia (P10, H25): sin tareas internas del despacho ni plazos ya superados. Los impuestos
    // pendientes de un plazo vencido se muestran como «cuanto antes», sin la palabra «vencido».
    const h = hoy(), interno = (t) => /^(abogado|despacho)/i.test(String(t.quien || "")), deuda = (t) => /^(isd|plusvalia)/.test(t.id);
    const T = tramitesExp(x, R).filter((t) => !cerrado(t) && !interno(t) && !t.informativo);
    const conPlazo = T.filter((t) => t.limite && t.limite >= h).sort((a, b) => a.limite.localeCompare(b.limite));
    const atrasados = T.filter((t) => t.limite && t.limite < h && deuda(t)).map((t) => ({ ...t, limite: "" }));
    const urgentes = T.filter((t) => !t.limite && t.fase === "urgente");
    L = [...atrasados, ...conPlazo, ...urgentes].map((t) => ({ id: t.id, titulo: t.titulo, fecha: t.limite || "", desde: t.desde || "", organismo: t.organismo || t.quien || "", recomendado: !!t.recomendado }));
  } else {
    L = (R.plazos || []).filter((p) => p.limite && !p.informativo && !x.tareas?.[p.id] && p.limite >= hoy()).sort((a, b) => a.limite.localeCompare(b.limite)).map((p) => ({ id: p.id, titulo: p.nombre, fecha: p.limite, desde: "", organismo: p.organismo || "", recomendado: !!p.recomendado }));
  }
  return L.slice(0, n);
}
function rnFalta(x) {
  if (typeof docsNecesarios !== "function") return [];
  return docsNecesarios(x).filter(([id]) => !x.despacho?.docs?.[id]).map(([id, titulo, donde]) => ({ id, titulo, donde: donde || "" }));
}
function rnDatos(x, R) {
  R = R || calcular(x); if (!R) return null;
  const D = despachoCfg(), ab = typeof abogado === "function" ? abogado(x.responsable) : null;
  let PT = null; try { PT = particion(x, R); } catch (e) { PT = null; }
  const pp = typeof plusPorHeredero === "function" ? plusPorHeredero(R) : {};
  const der = R.isd.derechos || {};
  // Adjudicaciones, compensaciones y coste del exceso: del cuadro único (cuadroParticion), igual que Partición y el paquete notarial
  const C = typeof cuadroParticion === "function" ? cuadroParticion(x, R) : null;
  const herederos = R.isd.herederos.map((h) => {
    const H = PT && PT.H.find((q) => q.p.id === h.id);
    const recibe = H ? H.haber + H.legados : h.valorAdquirido || 0;
    const isd = h.aIngresar || 0, plus = pp[h.nombre] || 0, eC = C && C.excesos.find((q) => q.id === h.id), exc = eC ? eC.trib.coste : 0;
    const seQueda = C ? C.adjudicaciones.filter((a) => a.aId === h.id && a.tipo === "adjudicado").map((a) => a.b.descripcion || TIPO_BIEN[a.b.tipo][0]) : [];
    const compensa = C ? C.compensaciones.filter((c) => c.de.id === h.id).map((c) => ({ nombre: c.aNombre, importe: c.importe })) : [];
    const cobra = C ? C.compensaciones.filter((c) => c.a.id === h.id).map((c) => ({ nombre: c.deNombre, importe: c.importe })) : [];
    return { id: h.id, nombre: h.nombre, relacion: h.relacion, rel: rnRel(h, x), derechos: (der[h.id] || []).filter((d) => d.fraccion > 0).map((d) => ({ tipo: d.tipo, fraccion: d.fraccion, txt: typeof derTxt === "function" ? derTxt(d) : RN_DER[d.tipo], usufructuario: d.tipo === "nuda" && d.usufructuarioId ? rnNom(x, d.usufructuarioId) : "" })), share: H ? H.share : 0, legado: H ? H.legados : 0, recibe, isd, plus, exceso: exc, excesoTxt: eC ? eC.txtCoste : "", seQueda, compensa, cobra, neto: recibe - isd - plus - exc };
  });
  const renuncias = (x.personas || []).filter((p) => p.renuncia).map((p) => ({ nombre: p.nombre || RELACIONES[p.relacion]?.label || "—", rel: RELACIONES[p.relacion]?.label || "" }));
  const bienes = PT ? PT.B.map((q) => ({ id: q.b.id, nombre: q.b.descripcion || TIPO_BIEN[q.b.tipo][0], tipo: q.b.tipo, tipoLabel: TIPO_BIEN[q.b.tipo][0], total: q.total, v: q.v, nota: q.b.titularidad === "ganancial" ? "la mitad es del cónyuge viudo" : q.b.titularidad === "proindiviso" ? `el ${grp(q.cc * 100, 0)} % era del fallecido` : "", leg: q.leg ? rnNom(x, q.leg) : "", adj: q.adj ? rnNom(x, q.adj) : "" })) : [];
  const m = R.isd.masa, pl = (R.plazos || []).find((p) => p.id === "isd");
  const nota = ((R.isd.notasReparto || [])[0] || "").replace(/\s*\((?:[^()]*\b(?:art|arts|CC|Ley|LISD|RISD)\b[^()]*)\)/g, "").replace(/\s+([.,;:])/g, "$1").trim();
  return { x, R, PT, C, D, ab, herederos, renuncias, totalExceso: C ? C.coste : 0, bienes, m, pasos: rnPasos(x, R, 5), falta: rnFalta(x), enlace: typeof familiaEnlace === "function" && !x.familia ? familiaEnlace(x) : "", limiteISD: pl ? pl.limite : "", territorio: R.isd.territorio || "", totalISD: R.isd.total || 0, totalPlus: R.totalPlus || 0, hayGananciales: (m.gananciales || 0) > 0, notaReparto: nota.length <= 170 ? nota : "", hayInmuebles: (x.bienes || []).some((b) => b.tipo === "vivienda" || b.tipo === "inmueble") };
}

// ── Modo reunión ──
const RN = { el: null, i: 0, n: 0, ocultar: false, x0: 0, y0: 0, t0: 0, prevFocus: null, overflow: "" };
const rnE = (n) => `<span class="rn-eur">${eur0(n)}</span>`;
function rnSlides(Dt) {
  const x = Dt.x, D = Dt.D, m = Dt.m, S = [];
  const cab = (kick, tit, lead) => `<p class="rn-kick rn-a" style="--i:0">${kick}</p><h2 class="rn-h2 rn-a" style="--i:1">${tit}</h2>${lead ? `<p class="rn-lead rn-a" style="--i:2">${lead}</p>` : ""}`;
  // 1. Portada
  S.push({ id: "portada", html: `<div class="rn-in rn-center"><p class="rn-kick rn-a" style="--i:0">${esc(D.nombre || "{{MARCA}}")}${x.despacho?.ref ? ` · ${esc(x.despacho.ref)}` : ""}</p><h1 class="rn-h1 rn-a" style="--i:1">La herencia de<br>${esc(x.nombre || "—")}</h1>${x.fecha ? `<p class="rn-sub rn-a" style="--i:2">Falleció el ${fechaLarga(x.fecha)}</p>` : ""}<p class="rn-meta rn-a" style="--i:3">Reunión del ${fechaLarga(hoy())}${Dt.ab ? ` · ${esc(Dt.ab.nombre)}` : ""}</p></div>` });
  // 2. Quién hereda
  if (Dt.herederos.length) {
    const hayUsu = Dt.herederos.some((h) => h.derechos.some((d) => d.tipo === "usufructo")), hayNuda = Dt.herederos.some((h) => h.derechos.some((d) => d.tipo === "nuda"));
    S.push({ id: "quien", html: `<div class="rn-in">${cab("Quién hereda", "Quién hereda y en qué proporción", Dt.notaReparto ? esc(Dt.notaReparto) : x.testamento === "no" || x.testamento === "nose" ? "Sin testamento, la ley señala quién hereda y en qué orden." : x.testamento === "usufructo" ? "El testamento deja el usufructo de todo al cónyuge y la propiedad a los hijos." : "Según el testamento.")}
      <div class="rn-cards rn-a" style="--i:3">${Dt.herederos.map((h, k) => `<div class="rn-card" style="--k:${k}"><div class="rn-card-n">${esc(h.nombre)}</div><div class="rn-card-r">${esc(h.rel)}</div><div class="rn-card-d">${h.derechos.map((d) => `<span class="rn-chip ${d.tipo}">${esc(d.txt)}</span>`).join("")}${h.legado ? `<span class="rn-chip leg">Legado</span>` : ""}</div><div class="rn-card-v">${rnE(h.recibe)}<small>${h.share > 0 ? `${grp(h.share * 100, h.share * 100 % 1 ? 1 : 0)} % de lo que se reparte` : "valor que recibe"}</small></div>${h.seQueda.length || h.compensa.length || h.cobra.length ? `<p class="rn-card-a">${esc(gnCap(rnAdjTxt(h)))}.</p>` : ""}</div>`).join("")}</div>
      ${hayUsu || hayNuda || Dt.renuncias.length ? `<div class="rn-notes rn-a" style="--i:4">${hayUsu ? `<p><b>Usufructo:</b> usar los bienes y cobrar sus rentas de por vida, sin poder venderlos por su cuenta.</p>` : ""}${hayNuda ? `<p><b>Nuda propiedad:</b> ser el dueño, aunque lo use quien tiene el usufructo; cuando este termina, se tiene el bien por completo.</p>` : ""}${Dt.renuncias.length ? `<p><b>Renuncia:</b> ${Dt.renuncias.map((r) => esc(r.nombre)).join(", ")} renuncia${Dt.renuncias.length > 1 ? "n" : ""} a la herencia y no recibe${Dt.renuncias.length > 1 ? "n" : ""} nada.</p>` : ""}</div>` : ""}</div>` });
  }
  // 3. Qué hay
  if (Dt.bienes.length) {
    S.push({ id: "quehay", html: `<div class="rn-in">${cab("Qué hay", "Qué forma la herencia", Dt.hayGananciales ? "De los bienes del matrimonio, la mitad es del cónyuge viudo y no entra en la herencia." : "Solo entra en la herencia la parte que era de la persona fallecida.")}
      <div class="rn-split rn-a" style="--i:3"><div class="rn-tiles">${Dt.bienes.map((b, k) => `<div class="rn-tile" style="--k:${k}"><span class="rn-tile-i">${TIPO_BIEN[b.tipo] ? TIPO_BIEN[b.tipo][1] : ""}</span><b>${esc(b.nombre)}</b><small>${esc(b.tipoLabel)}${b.nota ? " · " + esc(b.nota) : ""}${b.leg ? " · legado a " + esc(b.leg) : ""}</small><span class="rn-tile-v">${rnE(b.v)}</span></div>`).join("")}</div>
      <div class="rn-formula"><div><span>Bienes del fallecido</span><b>${rnE(m.bruto)}</b></div>${m.deudas ? `<div class="neg"><span>Deudas</span><b>− ${rnE(m.deudas)}</b></div>` : ""}${m.gastos ? `<div class="neg"><span>Funeral y última enfermedad</span><b>− ${rnE(m.gastos)}</b></div>` : ""}${m.legados ? `<div class="neg"><span>Legados</span><b>− ${rnE(m.legados)}</b></div>` : ""}<div class="tot"><span>Lo que queda para repartir</span><b>${rnE(m.legados ? m.netoReparto : m.neto)}</b></div></div></div></div>` });
  }
  // 4. Qué paga cada uno
  const hs = Dt.herederos.filter((h) => h.recibe > 0 || h.isd > 0 || h.plus > 0 || h.exceso > 0);
  if (hs.length) {
    S.push({ id: "paga", html: `<div class="rn-in">${cab("Impuestos", "Qué paga cada uno y qué le queda", `El Impuesto sobre Sucesiones se paga por lo que recibe cada uno${Dt.territorio ? ` (${esc(Dt.territorio)})` : ""}; la plusvalía municipal, quienes reciben una vivienda o un local. En total, ${rnE(Dt.totalISD)} de Sucesiones${Dt.totalExceso ? `, ${rnE(Dt.totalPlus)} de plusvalía y ${rnE(Dt.totalExceso)} por el exceso de adjudicación` : ` y ${rnE(Dt.totalPlus)} de plusvalía`}.`)}
      <div class="rn-pays rn-a" style="--i:3">${hs.map((h, k) => { const r = h.recibe, a = h.isd, p = h.plus, e = h.exceso || 0, g = Math.max(0, r - a - p - e), w = (v) => (r > 0 ? Math.min(100, v / r * 100) : 0), pct = r > 0 ? Math.round((a + p + e) / r * 100) : 0;
        return `<div class="rn-pay" style="--k:${k}"><div class="rn-pay-h"><b>${esc(h.nombre)}</b><span>recibe ${rnE(r)}</span></div><div class="rn-pbar"><i class="g" style="width:${w(g)}%"></i><i class="a" style="width:${w(a)}%"></i><i class="p" style="width:${w(p)}%"></i>${e ? `<i class="x" style="width:${w(e)}%"></i>` : ""}</div><div class="rn-pay-f"><span class="g"><small>Le queda</small>${rnE(g)}</span><span class="a"><small>Sucesiones</small>${rnE(a)}</span><span class="p"><small>Plusvalía</small>${rnE(p)}</span>${e ? `<span class="x"><small>Exceso de adjudicación</small>${rnE(e)}</span>` : ""}</div>${r > 0 ? `<p class="rn-pay-s">De cada 100 € que recibe ${esc(h.nombre.split(" ")[0])}, paga <span class="rn-eur">${pct}</span>.${e ? ` El exceso se paga por quedarse ${esc(h.seQueda.join(", ") || "un bien")} entero.` : ""}</p>` : ""}</div>`; }).join("")}</div>
      ${!Dt.R.plus.length && Dt.hayInmuebles ? `<p class="rn-foot-s rn-a" style="--i:4">La plusvalía se calculará cuando tengamos los datos catastrales de los inmuebles.</p>` : hs.some((h) => h.isd + h.plus < 0.5) ? `<p class="rn-foot-s rn-a" style="--i:4">Los impuestos se presentan aunque salgan a pagar 0 €.</p>` : ""}</div>` });
  }
  // 5. Qué parte de cada bien
  const PT = Dt.PT;
  if (PT && PT.cols.length && PT.B.length) {
    S.push({ id: "reparto", html: `<div class="rn-in">${cab("Reparto", "Qué parte de cada bien corresponde a cada uno", PT.B.some((q) => q.adj) ? "Con las adjudicaciones previstas. Quien recibe de más compensa en dinero a los demás." : "Por defecto, cada bien queda en común según las cuotas; en la partición se decide quién se queda cada uno.")}
      <div class="rn-scroll rn-a" style="--i:3"><table class="rn-tbl"><thead><tr><th>Bien</th>${PT.cols.map((p) => `<th>${esc(rnNom(x, p.id))}</th>`).join("")}</tr></thead><tbody>
      ${PT.B.map((q) => `<tr><td><b>${esc(q.b.descripcion || TIPO_BIEN[q.b.tipo][0])}</b><small>${rnE(q.v)}</small></td>${PT.cols.map((p) => { const c = PT.cell[q.b.id][p.id]; return `<td>${c ? `${rnE(c.v)}<small>${esc(c.lab)}</small>` : `<span class="nil">—</span>`}</td>`; }).join("")}</tr>`).join("")}
      ${PT.DG > 0.5 ? `<tr class="neg"><td><b>Deudas y gastos</b><small>por su cuota</small></td>${PT.H.map((h) => `<td>${h.cargas > 0.5 ? `− ${rnE(h.cargas)}` : `<span class="nil">—</span>`}</td>`).join("")}</tr>` : ""}
      ${PT.H.some((h) => Math.abs(h.dif) >= 1) ? `<tr class="rn-cmp"><td><b>Compensación en dinero</b><small>${esc(Dt.C ? cpTxtCompensaciones(Dt.C, false) : "")}</small></td>${PT.H.map((h) => `<td>${Math.abs(h.dif) >= 1 ? `${h.dif > 0 ? "− " : "+ "}${rnE(Math.abs(h.dif))}<small>${h.dif > 0 ? "paga" : "recibe"}</small>` : `<span class="nil">—</span>`}</td>`).join("")}</tr>` : ""}
      </tbody><tfoot><tr><td>Total</td>${PT.H.map((h) => `<td>${rnE(h.haber + h.legados)}</td>`).join("")}</tr></tfoot></table></div></div>` });
  }
  // 6. Qué hacemos ahora
  if (Dt.pasos.length) {
    S.push({ id: "pasos", html: `<div class="rn-in">${cab("Próximos pasos", "Qué hacemos ahora", "Nosotros llevamos el calendario. Os avisaremos cuando haga falta vuestra firma o algún documento.")}
      <ol class="rn-steps rn-a" style="--i:3">${Dt.pasos.map((p, k) => { const q = p.fecha ? dias(hoy(), p.fecha) : null; const chip = q == null || q < 0 ? (p.desde && p.desde > hoy() ? `desde el ${fechaCorta(p.desde)}` : "cuanto antes") : q === 0 ? "hoy" : `en ${plural(q, "día")}`;
        return `<li style="--k:${k}"><span class="rn-step-n">${k + 1}</span><span class="rn-step-t"><b>${esc(p.titulo)}</b><small>${p.fecha ? `${p.recomendado ? "Recomendable antes del" : "Antes del"} ${fechaLarga(p.fecha)}` : p.desde ? `Se puede hacer desde el ${fechaLarga(p.desde)}` : "En cuanto sea posible"}${p.organismo ? " · " + esc(p.organismo) : ""}</small></span><span class="rn-step-c ${q != null && q >= 0 && q <= 30 ? "soon" : ""}">${chip}</span></li>`; }).join("")}</ol></div>` });
  }
  // 7. Qué necesitamos de vosotros
  if (Dt.falta.length || Dt.enlace) {
    const L = Dt.falta.slice(0, 8), resto = Dt.falta.length - L.length;
    S.push({ id: "docs", html: `<div class="rn-in">${cab("Documentos", "Qué necesitamos de vosotros", "Valen fotos legibles o escaneados. Si alguno cuesta conseguirlo, lo pedimos nosotros.")}
      ${L.length ? `<ul class="rn-docs rn-a" style="--i:3">${L.map((d, k) => `<li style="--k:${k}"><i></i><span><b>${esc(d.titulo)}</b>${d.donde ? `<small>${esc(d.donde)}</small>` : ""}</span></li>`).join("")}</ul>${resto > 0 ? `<p class="rn-foot-s rn-a" style="--i:4">Y ${plural(resto, "documento más", "documentos más")}, que os iremos pidiendo uno a uno.</p>` : ""}` : ""}
      ${Dt.enlace ? `<div class="rn-link rn-a" style="--i:5"><b>Cuestionario de la familia</b><span>${esc(Dt.enlace.replace(/#.*/, ""))}</span><small>Se rellena desde el móvil en unos diez minutos.</small></div>` : ""}</div>` });
  }
  // 8. Cierre
  const contacto = [D.tel, D.email, D.web, D.direccion].filter(Boolean);
  S.push({ id: "cierre", html: `<div class="rn-in rn-center"><p class="rn-kick rn-a" style="--i:0">Gracias por vuestra confianza</p><h1 class="rn-h1 rn-a" style="--i:1">${esc(D.nombre || "{{MARCA}}")}</h1><p class="rn-sub rn-a" style="--i:2">${esc([D.colegio, D.localidad].filter(Boolean).join(" · "))}</p>${Dt.ab ? `<p class="rn-meta rn-a" style="--i:3">${esc(Dt.ab.nombre)}${Dt.ab.rol ? ` · ${esc(gnRol(Dt.ab))}` : ""}${x.despacho?.ref ? ` · expediente ${esc(x.despacho.ref)}` : ""}</p>` : ""}${contacto.length ? `<p class="rn-meta rn-a" style="--i:4">${contacto.map(esc).join(" · ")}</p>` : ""}<p class="rn-made rn-a" style="--i:5">Preparado con {{MARCA}} · cifras estimadas con los datos disponibles hoy</p></div>` });
  return S;
}
function rnPintar() {
  const el = RN.el; if (!el) return;
  el.querySelectorAll(".rn-slide").forEach((s, k) => { s.classList.toggle("on", k === RN.i); s.classList.toggle("prev", k < RN.i); s.setAttribute("aria-hidden", k === RN.i ? "false" : "true"); if (k === RN.i) s.scrollTop = 0; });
  el.querySelector(".rn-prog i").style.width = `${(RN.i + 1) / RN.n * 100}%`;
  el.querySelector(".rn-n").textContent = `${RN.i + 1} / ${RN.n}`;
  el.querySelector('[data-rn="prev"]').disabled = RN.i === 0;
  el.querySelector('[data-rn="next"]').disabled = RN.i === RN.n - 1;
  el.classList.toggle("rn-blur", RN.ocultar);
  const b = el.querySelector('[data-rn="ocultar"]'); b.setAttribute("aria-pressed", String(RN.ocultar)); b.textContent = RN.ocultar ? "Mostrar cifras" : "Ocultar cifras";
  if (typeof ui === "object" && ui.reunion) { ui.reunion.i = RN.i; ui.reunion.ocultar = RN.ocultar; }
}
function rnIr(k) { const n = Math.max(0, Math.min(RN.n - 1, k)); if (n === RN.i) return; RN.el.dataset.dir = n > RN.i ? "next" : "prev"; RN.i = n; rnPintar(); }
function rnKey(e) {
  if (!RN.el) return;
  const k = e.key;
  if (k === "Escape") { e.preventDefault(); e.stopPropagation(); reunionCerrar(); return; }
  if (["ArrowRight", "ArrowDown", "PageDown", " ", "Enter"].includes(k) && !(k === "Enter" && e.target && e.target.tagName === "BUTTON")) { e.preventDefault(); e.stopPropagation(); rnIr(RN.i + 1); return; }
  if (["ArrowLeft", "ArrowUp", "PageUp", "Backspace"].includes(k)) { e.preventDefault(); e.stopPropagation(); rnIr(RN.i - 1); return; }
  if (k === "Home") { e.preventDefault(); e.stopPropagation(); rnIr(0); return; }
  if (k === "End") { e.preventDefault(); e.stopPropagation(); rnIr(RN.n - 1); return; }
  if ((e.metaKey || e.ctrlKey) && k.toLowerCase() === "k") e.stopPropagation();
}
function rnClick(e) {
  const b = e.target.closest("[data-rn]");
  if (b) { const a = b.dataset.rn; if (a === "salir") reunionCerrar(); else if (a === "prev") rnIr(RN.i - 1); else if (a === "next") rnIr(RN.i + 1); else if (a === "ocultar") { RN.ocultar = !RN.ocultar; rnPintar(); } return; }
  const st = e.target.closest(".rn-stage"); if (!st || e.target.closest("a,button,table")) return;
  const r = st.getBoundingClientRect(), f = (e.clientX - r.left) / r.width;
  if (f < 0.2) rnIr(RN.i - 1); else if (f > 0.8) rnIr(RN.i + 1);
}
function rnMove(e) { const st = RN.el && RN.el.querySelector(".rn-stage"); if (!st) return; const r = st.getBoundingClientRect(), f = (e.clientX - r.left) / r.width; st.dataset.zone = e.clientY < r.top || e.clientY > r.bottom ? "" : f < 0.2 && RN.i > 0 ? "l" : f > 0.8 && RN.i < RN.n - 1 ? "r" : ""; }
function rnTouchStart(e) { const t = e.changedTouches[0]; RN.x0 = t.clientX; RN.y0 = t.clientY; RN.t0 = Date.now(); RN.enScroll = !!(e.target && e.target.closest && e.target.closest(".rn-scroll")); }
function rnTouchEnd(e) { if (RN.enScroll) return; const t = e.changedTouches[0], dx = t.clientX - RN.x0, dy = t.clientY - RN.y0; if (Date.now() - RN.t0 < 800 && Math.abs(dx) > 50 && Math.abs(dy) < Math.abs(dx) * 0.6) rnIr(RN.i + (dx < 0 ? 1 : -1)); }
function reunionAbrir(x, opts = {}) {
  if (RN.el) reunionCerrar();
  const Dt = x && rnDatos(x); if (!Dt) { toast("Faltan datos para calcular"); return false; }
  if (typeof ui === "object" && ui.sheet) { ui.sheet = null; render(); }
  const S = rnSlides(Dt);
  RN.i = 0; RN.n = S.length; RN.ocultar = !!opts.ocultar; RN.prevFocus = document.activeElement;
  const el = document.createElement("div"); el.className = "rn-over"; el.setAttribute("role", "dialog"); el.setAttribute("aria-modal", "true"); el.setAttribute("aria-label", "Modo reunión"); el.tabIndex = -1;
  el.innerHTML = `<div class="rn-prog" aria-hidden="true"><i></i></div>
    <header class="rn-bar"><span class="rn-brand">${esc(Dt.D.nombre || "{{MARCA}}")}<span class="rn-sep"> · </span><span class="rn-brand-c">La herencia de ${esc(x.nombre || "—")}</span></span><span class="rn-tools"><button type="button" class="rn-btn" data-rn="ocultar" aria-pressed="false">Ocultar cifras</button><button type="button" class="rn-btn rn-salir" data-rn="salir">Salir</button></span></header>
    <div class="rn-stage">${S.map((s, k) => `<section class="rn-slide rn-s-${s.id}" data-k="${k}" aria-hidden="true">${s.html}</section>`).join("")}</div>
    <footer class="rn-foot"><button type="button" class="rn-nav" data-rn="prev" aria-label="Anterior"><svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5l-7 7 7 7"/></svg></button><span class="rn-n">1 / ${S.length}</span><button type="button" class="rn-nav" data-rn="next" aria-label="Siguiente"><svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 5l7 7-7 7"/></svg></button></footer>`;
  RN.el = el; document.body.appendChild(el);
  RN.overflow = document.documentElement.style.overflow; document.documentElement.style.overflow = "hidden";
  el.addEventListener("click", rnClick); el.addEventListener("mousemove", rnMove, { passive: true }); el.addEventListener("touchstart", rnTouchStart, { passive: true }); el.addEventListener("touchend", rnTouchEnd, { passive: true });
  document.addEventListener("keydown", rnKey, true);
  if (typeof ui === "object") ui.reunion = { id: x.id, i: 0, ocultar: RN.ocultar };
  rnPintar(); requestAnimationFrame(() => { el.classList.add("rn-vis"); el.focus({ preventScroll: true }); });
  if (typeof anotar === "function") { anotar(x, "Modo reunión abierto", "sistema"); if (typeof guardar === "function") guardar(); }
  return true;
}
function reunionCerrar() {
  const el = RN.el; if (!el) return;
  document.removeEventListener("keydown", rnKey, true);
  el.remove(); RN.el = null; RN.n = 0;
  document.documentElement.style.overflow = typeof ui === "object" && ui.sheet ? "hidden" : RN.overflow || "";
  if (typeof ui === "object") ui.reunion = null;
  try { if (RN.prevFocus && RN.prevFocus.focus && document.contains(RN.prevFocus)) RN.prevFocus.focus({ preventScroll: true }); } catch (e) {}
  RN.prevFocus = null;
}

// ── Carpeta para la familia (archivo HTML autónomo) ──
const RN_OPC_DEF = { sinCifras: false, incluirImpuestos: true, incluirReparto: true };
function rnOpciones(x) {
  const o = { ...RN_OPC_DEF, ...((x && x.carpetaOpc) || {}) };
  for (const k of Object.keys(RN_OPC_DEF)) { const n = document.getElementById("rn-" + k); if (n) o[k] = !!n.checked; }
  return o;
}
function carpetaDatos(x, R, o) {
  const Dt = rnDatos(x, R); if (!Dt) return null;
  const cif = !o.sinCifras, D = Dt.D;
  const her = Dt.herederos.map((h) => {
    const r = { nombre: h.nombre, relacion: h.rel };
    if (o.incluirReparto && (h.seQueda.length || h.compensa.length || h.cobra.length)) r.adjudicacion = gnCap(rnAdjTxt(h, cif));
    if (o.incluirReparto) { r.derechos = h.derechos.map((d) => ({ tipo: d.tipo, txt: d.txt, usufructuario: d.usufructuario || undefined })); if (cif) { r.recibe = rnR(h.recibe); if (h.legado) r.legado = rnR(h.legado); } else if (h.legado) r.legado = true; }
    if (o.incluirImpuestos) { r.pagaISD = h.isd > 0; r.pagaPlus = h.plus > 0; r.pagaExceso = h.exceso > 0; if (h.exceso > 0) r.excesoMotivo = `por quedarse ${h.seQueda.join(", ") || "un bien"} entero (exceso de adjudicación)`; if (cif) { r.isd = rnR(h.isd); r.plus = rnR(h.plus); r.exceso = rnR(h.exceso); if (r.recibe == null) r.recibe = rnR(h.recibe); } }
    return r;
  }).concat(Dt.renuncias.map((r) => ({ nombre: r.nombre, relacion: r.rel, renuncia: true })));
  const data = {
    marca: "{{MARCA}}", generado: hoy(), ref: x.despacho?.ref || "",
    despacho: (() => { const K = despachoContacto(); return { nombre: K.nombre || D.nombre || "", colegio: D.colegio || "", localidad: K.localidad || "", responsable: Dt.ab ? Dt.ab.nombre : "", rol: Dt.ab && Dt.ab.rol ? gnRol(Dt.ab) : "", tel: K.tel, email: K.email, direccion: K.postal, web: K.web }; })(),
    causante: { nombre: x.nombre || "", fecha: x.fecha || "" },
    opciones: { sinCifras: !cif, incluirImpuestos: !!o.incluirImpuestos, incluirReparto: !!o.incluirReparto },
    notaReparto: Dt.notaReparto || "",
    herederos: her,
    pasos: Dt.pasos.map((p) => ({ titulo: p.titulo, fecha: p.fecha, desde: p.desde, organismo: p.organismo, recomendado: p.recomendado })),
    documentos: Dt.falta.map((d) => ({ id: d.id, titulo: d.titulo, donde: d.donde })),
    enlaceFamilia: Dt.enlace || "",
  };
  if (o.incluirReparto) {
    data.bienes = Dt.bienes.map((b) => { const q = { nombre: b.nombre, tipo: b.tipoLabel, nota: [b.nota, b.leg ? "legado a " + b.leg : "", b.adj ? "se lo queda " + b.adj : ""].filter(Boolean).join(" · ") }; if (cif) q.v = rnR(b.v); return q; });
    data.resumen = cif ? { bruto: rnR(Dt.m.bruto), deudas: rnR(Dt.m.deudas), gastos: rnR(Dt.m.gastos), neto: rnR(Dt.m.legados ? Dt.m.netoReparto : Dt.m.neto), hayGananciales: Dt.hayGananciales } : { hayGananciales: Dt.hayGananciales };
  }
  if (o.incluirImpuestos) {
    data.impuestos = { territorio: Dt.territorio, limite: Dt.limiteISD, nota: !Dt.R.plus.length && Dt.hayInmuebles ? "La plusvalía municipal se calculará cuando tengamos los datos catastrales de los inmuebles." : Dt.R.plus.length ? "Las rebajas de la plusvalía hay que pedirlas al ayuntamiento dentro del plazo; nos encargamos nosotros." : "" };
    if (cif) { data.impuestos.totalISD = rnR(Dt.totalISD); data.impuestos.totalPlus = rnR(Dt.totalPlus); data.impuestos.totalExceso = rnR(Dt.totalExceso); }
  }
  return data;
}
function carpetaHTML(x, R, opts = {}) {
  const tpl = typeof CARPETA_HTML === "string" ? CARPETA_HTML : "";
  if (!tpl) return "";
  const o = { ...RN_OPC_DEF, ...opts };
  const data = carpetaDatos(x, R, o); if (!data) return "";
  return tpl.replace("/*__CARPETA_DATA__*/", () => "const D = " + JSON.stringify(data).replace(/</g, "\\u003c").replace(/[\u2028\u2029]/g, " ") + ";");
}
function carpetaFamilia(x, R, opts = {}) {
  R = R || calcular(x);
  if (!R) { toast("Faltan datos para calcular"); return false; }
  const html = carpetaHTML(x, R, opts);
  if (!html) { toast(typeof CARPETA_HTML === "string" ? "No se pudo preparar la carpeta" : "Falta la plantilla de la carpeta"); return false; }
  const D = despachoCfg();
  descargar(`Carpeta ${rnApellido(x.nombre)} - ${D.nombre || "{{MARCA}}"}.html`.replace(/[\\/:*?"<>|]/g, ""), new Blob([html], { type: "text/html" }));
  return true;
}
function carpetaDescargar(x) {
  if (!x) return;
  const o = rnOpciones(x);
  if (carpetaFamilia(x, calcular(x), o)) { x.carpetaOpc = o; x.carpetaFecha = hoy(); if (typeof anotar === "function") anotar(x, `Carpeta para la familia descargada${o.sinCifras ? " (sin cifras)" : ""}`, "doc"); if (typeof guardar === "function") guardar(); toast("Carpeta descargada"); }
}
function rnSheetCarpeta(x) {
  if (!x) return "";
  const R = calcular(x), o = { ...RN_OPC_DEF, ...(x.carpetaOpc || {}) };
  const fila = (k, t, s) => `<div class="row toggle"><span class="t"><b>${t}</b><small>${s}</small></span><label class="switch"><input type="checkbox" id="rn-${k}" data-rn-opt="${k}" ${o[k] ? "checked" : ""}><span></span></label></div>`;
  return sheetHTML("Para la familia", `<p class="lead">Dos maneras de explicar la herencia a la familia: en la reunión, a pantalla completa; y después, una página que se quedan en el móvil con lo esencial.</p>
    ${!R ? `<div class="infobar" style="margin-bottom:14px"><span class="ico orange">${I.info}</span><span>Faltan datos para calcular: fecha, comunidad, al menos una persona y un bien.</span></div>` : ""}
    <div class="sectitle">En la reunión</div>
    <div class="group" style="--inset:60px"><button class="row" data-act="reunion" ${R ? "" : "disabled"}><span class="ico blue">${I.brief}</span><span class="t"><b>Abrir modo reunión</b><small>Pantalla completa: quién hereda, qué hay, qué paga cada uno, próximos pasos. Flechas o toques para avanzar, Esc para salir.</small></span>${I.chev}</button></div>
    <div class="sectitle">Carpeta para la familia</div>
    <div class="group">${fila("incluirReparto", "Incluir el reparto", "Qué parte recibe cada uno y qué bienes forman la herencia")}${fila("incluirImpuestos", "Incluir los impuestos previstos", "Sucesiones y plusvalía por heredero, y el plazo")}${fila("sinCifras", "Sin cifras", "Quién hereda, pasos y documentos, pero sin importes: útil si un heredero no debe ver lo de los demás")}</div>
    <div class="rn-acts"><button class="btn" data-act="carpetaDescargar" ${R ? "" : "disabled"}>${I.dl}Descargar carpeta</button>${x.carpetaFecha ? `<span class="caption">Última descarga: ${fechaCorta(x.carpetaFecha)}</span>` : ""}</div>
    <p class="group-foot">Un archivo HTML que se abre en cualquier móvil sin instalar nada y no envía datos a ningún sitio. Lleva la lista de documentos con casillas que la familia va marcando y cinco preguntas frecuentes en lenguaje llano. Se puede enviar por WhatsApp o correo.</p>`, "Cerrar");
}
