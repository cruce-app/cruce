/* Cruce landing: intro, sounds, reveals and the interactive demos. No dependencies. */
(() => {
  "use strict";

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const pesos = (n) => "$" + Math.round(Math.abs(n)).toLocaleString("es-CO");
  const store = {
    get(key) { try { return localStorage.getItem(key); } catch { return null; } },
    set(key, value) { try { localStorage.setItem(key, value); } catch { /* private mode */ } },
  };

  /* ---------- Sounds (same files and moments as the app) ---------- */
  const SOUNDS = {
    "gasto-guardado": "Gasto guardado",
    "pago-anotado": "Pago anotado",
    "paz-y-salvo": "Paz y salvo",
    "gasto-borrado": "Gasto borrado",
    "error": "Error",
    "parche-cerrado": "Parche cerrado",
  };
  const players = {};
  const toggle = $("#sound-toggle");
  let soundOn = store.get("cruce-sonidos") !== "0";
  toggle.setAttribute("aria-pressed", String(soundOn));

  function player(name) {
    if (!players[name]) {
      const audio = new Audio(`assets/sounds/${name}.mp3`);
      audio.preload = "auto";
      players[name] = audio;
    }
    return players[name];
  }

  let eqTimer;
  function play(name, { force = false } = {}) {
    if (!soundOn && !force) return;
    const audio = player(name);
    audio.currentTime = 0;
    audio.play().catch(() => {});
    toggle.classList.add("is-playing");
    clearTimeout(eqTimer);
    eqTimer = setTimeout(() => toggle.classList.remove("is-playing"), 900);
  }

  // Warm the cache on the first interaction so the first sound is instant.
  window.addEventListener("pointerdown", () => Object.keys(SOUNDS).forEach(player), { once: true });

  toggle.addEventListener("click", () => {
    soundOn = !soundOn;
    toggle.setAttribute("aria-pressed", String(soundOn));
    store.set("cruce-sonidos", soundOn ? "1" : "0");
    if (soundOn) play("pago-anotado");
    toast(soundOn ? "Sonidos encendidos" : "Sonidos apagados");
  });

  const soundRow = $("#sound-row");
  Object.entries(SOUNDS).forEach(([name, label]) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.innerHTML = `<svg aria-hidden="true"><use href="#i-play"/></svg>${label}`;
    btn.addEventListener("click", () => {
      play(name, { force: true });
      btn.classList.add("is-playing");
      setTimeout(() => btn.classList.remove("is-playing"), 700);
    });
    soundRow.append(btn);
  });

  /* ---------- Toast ---------- */
  const toastEl = $("#toast");
  let toastTimer;
  function toast(text) {
    toastEl.textContent = text;
    toastEl.classList.add("is-on");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove("is-on"), 2200);
  }

  /* ---------- Intro "Choque" (port of LaunchSplash.swift) ---------- */
  function runIntro() {
    const intro = $("#intro");
    let seen = null;
    try { seen = sessionStorage.getItem("cruce-intro"); } catch { /* storage blocked */ }
    if (reduceMotion || seen || !intro.animate) {
      intro.classList.add("is-done");
      return Promise.resolve();
    }
    try { sessionStorage.setItem("cruce-intro", "1"); } catch { /* ignore */ }
    document.body.classList.add("is-intro");

    const logo = $(".intro__logo", intro);
    const a = $(".intro__half--a", intro);
    const b = $(".intro__half--b", intro);
    const ring = $(".intro__ring", intro);
    const stage = $(".intro__stage", intro);
    const doorL = $(".intro__door--l", intro);
    const doorR = $(".intro__door--r", intro);
    const total = 1750;
    const o = (ms) => ms / total;
    const opts = { duration: total, fill: "forwards" };

    logo.animate([
      { offset: 0, opacity: 1, transform: "scale(1)" },
      { offset: o(160), opacity: 1, transform: "scale(1)" },
      { offset: o(320), opacity: 0, transform: "scale(0.9)" },
      { offset: o(860), opacity: 0, transform: "scale(1.3, 0.72)" },
      { offset: o(870), opacity: 1, transform: "scale(1.3, 0.72)", easing: "cubic-bezier(.34,1.56,.64,1)" },
      { offset: o(1080), opacity: 1, transform: "scale(0.94, 1.08) rotate(-4deg)" },
      { offset: o(1220), opacity: 1, transform: "scale(1)" },
      { offset: o(1300), opacity: 1, transform: "scale(1)" },
      { offset: o(1500), opacity: 0, transform: "scale(0.6)" },
      { offset: 1, opacity: 0, transform: "scale(0.6)" },
    ], opts);

    const half = (dir) => [
      { offset: 0, opacity: 0, transform: "translateX(0) rotate(0)" },
      { offset: o(240), opacity: 0, transform: "translateX(0) rotate(0)" },
      { offset: o(300), opacity: 1, transform: "translateX(0) rotate(0)", easing: "cubic-bezier(.22,1,.36,1)" },
      { offset: o(620), opacity: 1, transform: `translateX(${dir * 110}px) rotate(${dir * 20}deg)`, easing: "cubic-bezier(.55,0,1,.45)" },
      { offset: o(860), opacity: 1, transform: `translateX(${dir * 4}px) rotate(0)` },
      { offset: o(880), opacity: 0, transform: "translateX(0) rotate(0)" },
      { offset: 1, opacity: 0, transform: "translateX(0) rotate(0)" },
    ];
    a.animate(half(-1), opts);
    b.animate(half(1), opts);

    ring.animate([
      { offset: 0, opacity: 0, transform: "scale(0.6)" },
      { offset: o(860), opacity: 0, transform: "scale(0.6)" },
      { offset: o(880), opacity: 1, transform: "scale(0.7)", easing: "cubic-bezier(.22,1,.36,1)" },
      { offset: o(1250), opacity: 0, transform: "scale(2.6)" },
      { offset: 1, opacity: 0, transform: "scale(2.6)" },
    ], opts);

    stage.animate([
      { offset: 0, transform: "translate(0,0)" },
      { offset: o(870), transform: "translate(0,0)" },
      { offset: o(910), transform: "translate(-7px,4px)" },
      { offset: o(950), transform: "translate(6px,-4px)" },
      { offset: o(990), transform: "translate(-4px,2px)" },
      { offset: o(1030), transform: "translate(0,0)" },
      { offset: 1, transform: "translate(0,0)" },
    ], opts);

    const door = (dir, el) => el.animate([
      { offset: 0, transform: "translateX(0)", borderColor: "transparent" },
      { offset: o(1280), transform: "translateX(0)", borderColor: "#111" },
      { offset: 1, transform: `translateX(${dir * 104}%)`, borderColor: "#111" },
    ], { ...opts, easing: "cubic-bezier(.65,0,.35,1)" });
    door(-1, doorL);
    const last = door(1, doorR);

    return last.finished.then(() => {
      intro.classList.add("is-done");
      document.body.classList.remove("is-intro");
    });
  }

  /* ---------- Reveal on scroll + counters ---------- */
  function animateCount(el) {
    const target = parseFloat(el.dataset.count);
    const decimals = parseInt(el.dataset.decimals || "0", 10);
    const fmt = (n) => n.toLocaleString("es-CO", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
    if (reduceMotion) { el.textContent = fmt(target); return; }
    const duration = 1400;
    const start = performance.now();
    const tick = (now) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      el.textContent = fmt(target * eased);
      if (t < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  function startReveals() {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-in");
        $$("[data-count]", entry.target).forEach(animateCount);
        if (entry.target.matches("[data-count]")) animateCount(entry.target);
        io.unobserve(entry.target);
      });
    }, { threshold: 0.18, rootMargin: "0px 0px -6% 0px" });
    $$("[data-reveal]").forEach((el) => io.observe(el));
  }

  /* ---------- Marquees: repeat items until the loop is seamless ---------- */
  $$("[data-marquee]").forEach((track) => {
    const items = [...track.children];
    while (track.scrollWidth < window.innerWidth * 1.2) items.forEach((i) => track.append(i.cloneNode(true)));
    [...track.children].forEach((i) => track.append(i.cloneNode(true)));
  });

  /* ---------- Nav ---------- */
  const nav = $("#nav");
  const onScroll = () => nav.classList.toggle("is-stuck", window.scrollY > 12);
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  /* ---------- Parallax ---------- */
  if (!reduceMotion && window.matchMedia("(pointer: fine)").matches) {
    const hero = $("[data-parallax]");
    const layers = $$("[data-depth]", hero);
    let raf;
    hero.closest(".hero").addEventListener("pointermove", (e) => {
      const r = hero.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - 0.5;
      const y = (e.clientY - r.top) / r.height - 0.5;
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => layers.forEach((l) => {
        const d = parseFloat(l.dataset.depth);
        l.style.translate = `${x * d * -14}px ${y * d * -14}px`;
      }));
    });
  }
  if (!reduceMotion) {
    const shapes = $$(".final [data-depth]");
    const final = $(".final");
    window.addEventListener("scroll", () => {
      const r = final.getBoundingClientRect();
      if (r.top > window.innerHeight || r.bottom < 0) return;
      const p = (r.top - window.innerHeight / 2) / window.innerHeight;
      shapes.forEach((s) => { s.style.translate = `0 ${p * parseFloat(s.dataset.depth) * 60}px`; });
    }, { passive: true });
  }

  /* ---------- Confetti ---------- */
  const confettiEl = $("#confetti");
  const COLORS = ["#FFD12E", "#8B6CFF", "#3DCB4A", "#FF5C8A", "#B5E33B", "#FFE19A"];
  function confetti(count = 70) {
    if (reduceMotion) return;
    for (let i = 0; i < count; i++) {
      const p = document.createElement("i");
      const size = 8 + Math.random() * 12;
      p.style.left = `${Math.random() * 100}vw`;
      p.style.width = `${size}px`;
      p.style.height = `${size * (Math.random() > 0.5 ? 1 : 0.5)}px`;
      p.style.background = COLORS[i % COLORS.length];
      p.style.borderRadius = Math.random() > 0.7 ? "50%" : "3px";
      confettiEl.append(p);
      const drift = (Math.random() - 0.5) * 240;
      const anim = p.animate([
        { transform: "translate(0,0) rotate(0)", opacity: 1 },
        { transform: `translate(${drift}px, ${window.innerHeight + 60}px) rotate(${Math.random() * 720 - 360}deg)`, opacity: 1 },
      ], { duration: 1600 + Math.random() * 1400, delay: Math.random() * 300, easing: "cubic-bezier(.25,.6,.4,1)" });
      anim.onfinish = () => p.remove();
    }
  }

  /* ---------- Celebration dialog ---------- */
  const celebrate = $("#celebrate");
  const celebrateClose = $("#celebrate-close");
  let lastFocus;
  function openCelebrate(text) {
    $("#celebrate-text").textContent = text;
    lastFocus = document.activeElement;
    celebrate.classList.add("is-open");
    play("paz-y-salvo");
    confetti();
    setTimeout(() => celebrateClose.focus(), 50);
  }
  function closeCelebrate() {
    celebrate.classList.remove("is-open");
    lastFocus?.focus();
  }
  celebrateClose.addEventListener("click", closeCelebrate);
  celebrate.addEventListener("click", (e) => { if (e.target === celebrate) closeCelebrate(); });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && celebrate.classList.contains("is-open")) closeCelebrate(); });

  /* ---------- The idea: two lists -> one number ---------- */
  const ideaStage = $("#idea-stage");
  const crossBtn = $("#cross-btn");
  const crossReset = $("#cross-reset");
  function setCrossed(crossed, withSound) {
    ideaStage.classList.toggle("is-crossed", crossed);
    crossBtn.hidden = crossed;
    crossReset.hidden = !crossed;
    if (crossed && withSound) play("pago-anotado");
  }
  crossBtn.addEventListener("click", () => { setCrossed(true, true); crossReset.focus(); });
  crossReset.addEventListener("click", () => { setCrossed(false); crossBtn.focus(); });
  new IntersectionObserver(([entry], obs) => {
    if (!entry.isIntersecting) return;
    obs.disconnect();
    setTimeout(() => setCrossed(true, false), reduceMotion ? 0 : 1300);
  }, { threshold: 0.6 }).observe(ideaStage);

  /* ---------- Interactive cruce ---------- */
  // delta > 0: Jesús owes you; delta < 0: you owe Jesús.
  const PRESETS = [
    { title: "Almuerzo corrientazo", sub: "Pagaste $36.000 · 50/50", icon: "i-food", cat: "", delta: 18000 },
    { title: "Mercado Éxito", sub: "Jesús pagó $100.000 · 50/50", icon: "i-cart", cat: "cat--green", delta: -50000 },
    { title: "Uber al concierto", sub: "Pagaste $24.000 · todo es de Jesús", icon: "i-bus", cat: "cat--peach", delta: 24000 },
    { title: "Boletas del concierto", sub: "Pagaste $180.000 · 60/40", icon: "i-bag", cat: "cat--violet", delta: 72000 },
    { title: "Domicilio Rappi", sub: "Jesús pagó $22.000 · 50/50", icon: "i-food", cat: "", delta: -11000 },
  ];
  const presetsEl = $("#presets");
  const movesEl = $("#moves-list");
  const balanceEl = $("#balance");
  const amtEl = $("#balance-amt");
  const phraseEl = $("#balance-phrase");
  const dirEl = $("#balance-dir");
  const illEl = $("#balance-ill");
  const settleBtn = $("#settle-btn");
  let moves = [];
  let shown = 0;
  let seq = 0;

  PRESETS.forEach((p, i) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "preset";
    btn.innerHTML = `<span class="cat ${p.cat}"><svg aria-hidden="true"><use href="#${p.icon}"/></svg></span>
      <span><b>${p.title}</b><small>${p.sub}</small></span>
      <span class="plus" aria-hidden="true"><svg><use href="#i-plus"/></svg></span>`;
    btn.setAttribute("aria-label", `Anotar ${p.title}: ${p.sub}`);
    btn.addEventListener("click", () => addMove(i));
    presetsEl.append(btn);
  });

  function addMove(i) {
    const p = PRESETS[i];
    moves.unshift({ id: ++seq, ...p, kind: "expense" });
    play("gasto-guardado");
    render(true);
  }

  function net() { return moves.reduce((sum, m) => sum + m.delta, 0); }

  function countTo(target) {
    const from = shown;
    shown = target;
    if (reduceMotion) { amtEl.textContent = pesos(target); return; }
    const start = performance.now();
    const step = (now) => {
      const t = Math.min(1, (now - start) / 520);
      const eased = 1 - Math.pow(1 - t, 3);
      amtEl.textContent = pesos(from + (target - from) * eased);
      if (t < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  function render(bump) {
    const n = net();
    const state = n > 0 ? "theyOwe" : n < 0 ? "owe" : "settled";
    balanceEl.dataset.state = state;
    phraseEl.textContent = { theyOwe: "Jesús te debe", owe: "Le debes a Jesús", settled: "Están a paz y salvo" }[state];
    const count = moves.length;
    dirEl.textContent = count === 0
      ? "Sin movimientos todavía"
      : `${state === "owe" ? "Tú → Jesús" : state === "theyOwe" ? "Jesús → tú" : "$0"} · ${count} ${count === 1 ? "movimiento" : "movimientos"}`;
    const ill = { theyOwe: "il-04-te-deben-verde", owe: "il-05-debes-rosa", settled: "il-07-paz-y-salvo" }[state];
    if (!illEl.src.endsWith(`${ill}.webp`)) illEl.src = `assets/img/ill/${ill}.webp`;
    settleBtn.disabled = n === 0;
    settleBtn.lastChild.textContent = n === 0 ? " Saldar" : ` Saldar ${pesos(n)}`;
    countTo(Math.abs(n));
    if (bump && !reduceMotion) {
      balanceEl.classList.remove("is-bump");
      void balanceEl.offsetWidth;
      balanceEl.classList.add("is-bump");
    }
    renderMoves();
  }

  function renderMoves() {
    if (moves.length === 0) {
      movesEl.innerHTML = `<div class="moves__empty">Aquí aparecen los gastos que anotes.</div>`;
      return;
    }
    const existing = new Map($$(".move", movesEl).map((el) => [Number(el.dataset.id), el]));
    const frag = document.createDocumentFragment();
    moves.forEach((m) => {
      let el = existing.get(m.id);
      if (!el) {
        el = document.createElement("div");
        el.className = "move";
        el.dataset.id = m.id;
        const favor = m.delta > 0 ? "a tu favor" : "a favor de Jesús";
        const sign = m.delta > 0 ? "+" : "−";
        const icon = m.kind === "payment" ? "i-check" : m.icon;
        const cat = m.kind === "payment" ? "cat--lime" : m.cat;
        el.innerHTML = `<span class="cat ${cat}"><svg aria-hidden="true"><use href="#${icon}"/></svg></span>
          <span><b>${m.title}</b><small>${m.sub}</small></span>
          <span class="amt">${sign}${pesos(m.delta)}<small>${favor}</small></span>
          <button class="del" type="button" aria-label="Borrar ${m.title}"><svg aria-hidden="true"><use href="#i-x"/></svg></button>`;
        $(".del", el).addEventListener("click", () => removeMove(m.id, el));
      }
      frag.append(el);
    });
    movesEl.replaceChildren(frag);
  }

  function removeMove(id, el) {
    play("gasto-borrado");
    el.classList.add("is-out");
    setTimeout(() => {
      moves = moves.filter((m) => m.id !== id);
      render(true);
    }, reduceMotion ? 0 : 260);
  }

  settleBtn.addEventListener("click", () => {
    const n = net();
    if (n === 0) return;
    const text = n > 0
      ? `Jesús te pagó ${pesos(n)} por Nequi. El saldo quedó en $0.`
      : `Le pagaste ${pesos(n)} a Jesús por Nequi. El saldo quedó en $0.`;
    moves.unshift({
      id: ++seq,
      kind: "payment",
      title: n > 0 ? "Jesús te pagó" : "Le pagaste a Jesús",
      sub: "Pago por Nequi · Hoy",
      delta: -n,
    });
    render(true);
    openCelebrate(text);
  });

  $("#reset-btn").addEventListener("click", () => {
    if (moves.length) play("gasto-borrado");
    moves = [];
    render(false);
  });

  $("#hero-try").addEventListener("click", () => {
    setTimeout(() => { if (moves.length === 0) addMove(0); }, reduceMotion ? 0 : 750);
  });

  render(false);

  /* ---------- Parche graph: 6 debts -> 2 transfers ---------- */
  const NODES = {
    je: { x: 80, y: 74, name: "Jesús", c: "#8B6CFF", bal: "+$160.000" },
    jo: { x: 320, y: 74, name: "Joan", c: "#FFD12E", bal: "$0" },
    an: { x: 80, y: 226, name: "Ana", c: "#B5E33B", bal: "−$20.000" },
    ca: { x: 320, y: 226, name: "Carlos", c: "#FFE19A", bal: "−$140.000" },
  };
  const OPEN = [
    ["jo", "je", 40000], ["an", "je", 45000], ["ca", "je", 75000],
    ["an", "jo", 5000], ["ca", "jo", 35000], ["ca", "an", 30000, 0.5],
  ];
  const CLOSED = [["ca", "je", 140000], ["an", "je", 20000]];
  const svg = $("#graph-svg");
  const NS = "http://www.w3.org/2000/svg";
  const R = 30;
  const el = (tag, attrs = {}) => {
    const node = document.createElementNS(NS, tag);
    Object.entries(attrs).forEach(([k, v]) => node.setAttribute(k, v));
    return node;
  };
  const defs = el("defs");
  const marker = el("marker", { id: "arrowhead", viewBox: "0 0 10 10", refX: "8", refY: "5", markerWidth: "7", markerHeight: "7", orient: "auto-start-reverse" });
  marker.append(el("path", { d: "M1 1 9 5 1 9", fill: "none", stroke: "#111", "stroke-width": "2", "stroke-linecap": "round", "stroke-linejoin": "round" }));
  defs.append(marker);
  svg.append(defs);
  const edgesLayer = el("g");
  svg.append(edgesLayer);

  function drawEdges(list, closed) {
    const group = el("g", { class: closed ? "edges edges--closed" : "edges" });
    list.forEach(([from, to, amount, tLabel]) => {
      const a = NODES[from];
      const b = NODES[to];
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const len = Math.hypot(dx, dy);
      const ux = dx / len;
      const uy = dy / len;
      const x1 = a.x + ux * (R + 4);
      const y1 = a.y + uy * (R + 4);
      const x2 = b.x - ux * (R + 8);
      const y2 = b.y - uy * (R + 8);
      const line = el("line", { x1, y1, x2, y2, class: "edge", "marker-end": "url(#arrowhead)" });
      if (closed) line.setAttribute("stroke-width", "3.5");
      const t = tLabel ?? (Math.abs(dx) > 0 && Math.abs(dy) > 0 ? 0.32 : 0.5);
      const lx = a.x + dx * t;
      const ly = a.y + dy * t;
      const text = pesos(amount);
      const w = text.length * 7.6 + 14;
      const label = el("g", { class: "edge-label" });
      const rect = el("rect", { x: lx - w / 2, y: ly - 12, width: w, height: 24, rx: 7 });
      if (closed) rect.style.fill = "#B5E33B";
      const tx = el("text", { x: lx, y: ly + 4.5, "text-anchor": "middle" });
      tx.textContent = text;
      label.append(rect, tx);
      group.append(line, label);
    });
    edgesLayer.replaceChildren(group);
    if (!reduceMotion) {
      $$("line", group).forEach((line, i) => {
        const length = line.getTotalLength ? line.getTotalLength() : 200;
        line.style.strokeDasharray = length;
        line.animate([{ strokeDashoffset: length }, { strokeDashoffset: 0 }], { duration: 520, delay: i * 90, easing: "cubic-bezier(.22,1,.36,1)", fill: "backwards" });
      });
      $$(".edge-label", group).forEach((lab, i) => {
        lab.animate([{ opacity: 0, transform: "scale(.6)" }, { opacity: 1, transform: "scale(1)" }], { duration: 380, delay: 260 + i * 90, easing: "cubic-bezier(.34,1.56,.64,1)", fill: "backwards" });
        lab.style.transformBox = "fill-box";
        lab.style.transformOrigin = "center";
      });
    }
  }

  const nodesLayer = el("g");
  Object.values(NODES).forEach((n) => {
    const g = el("g", { class: "node" });
    g.append(el("circle", { cx: n.x, cy: n.y, r: R, fill: n.c }));
    const initials = el("text", { x: n.x, y: n.y + 6, "text-anchor": "middle", "font-size": "17" });
    initials.textContent = n.name.slice(0, 2);
    const top = n.y < 150;
    const name = el("text", { x: n.x, y: top ? n.y - R - 24 : n.y + R + 20, "text-anchor": "middle", class: "name" });
    name.textContent = n.name;
    const bal = el("text", { x: n.x, y: top ? n.y - R - 9 : n.y + R + 35, "text-anchor": "middle", class: "bal" });
    bal.textContent = n.bal;
    g.append(initials, name, bal);
    nodesLayer.append(g);
  });
  svg.append(nodesLayer);
  svg.setAttribute("viewBox", "0 -6 400 312");
  drawEdges(OPEN, false);

  const graph = $("#graph");
  const closeBtn = $("#close-parche");
  let parcheClosed = false;
  closeBtn.addEventListener("click", () => {
    parcheClosed = !parcheClosed;
    graph.classList.toggle("is-closed", parcheClosed);
    $("#graph-n").textContent = parcheClosed ? "2" : "6";
    $("#graph-count").lastChild.textContent = parcheClosed ? " transferencias" : " deudas";
    closeBtn.innerHTML = parcheClosed
      ? `<svg aria-hidden="true"><use href="#i-swap"/></svg> Ver las deudas otra vez`
      : `<svg aria-hidden="true"><use href="#i-check"/></svg> Cerrar el parche`;
    drawEdges(parcheClosed ? CLOSED : OPEN, parcheClosed);
    if (parcheClosed) {
      play("parche-cerrado");
      toast("Parche cerrado: 2 transferencias y todos a paz y salvo");
    }
  });

  /* ---------- Bento interactions ---------- */
  $("#copy-btn").addEventListener("click", async () => {
    try { await navigator.clipboard.writeText("3001234567"); } catch { /* clipboard blocked: still show the toast */ }
    toast("Nequi copiado: 300 123 4567");
  });

  const pill = $("#offline-pill");
  pill.addEventListener("click", () => {
    if (pill.classList.contains("is-online")) return;
    pill.classList.add("is-online");
    pill.lastChild.textContent = "Conectado · todo al día";
    setTimeout(() => {
      pill.classList.remove("is-online");
      pill.lastChild.textContent = "Sin conexión · 1 pendiente";
    }, 3200);
  });

  const confirmBox = $("#confirm");
  const confirmBtn = $("#confirm-btn");
  confirmBtn.addEventListener("click", () => {
    confirmBox.classList.add("is-done");
    $("#confirm-text").textContent = "Confirmado · $50.000";
    confirmBtn.hidden = true;
    play("pago-anotado");
    setTimeout(() => {
      confirmBox.classList.remove("is-done");
      $("#confirm-text").textContent = "Carlos te pagó $50.000";
      confirmBtn.hidden = false;
    }, 3600);
  });

  /* ---------- Gallery ---------- */
  const SHOTS = [
    ["04-inicio", "Inicio", "Tu saldo con cada amigo"],
    ["05-nuevo-gasto", "Anotar", "Con su propio teclado de montos"],
    ["08-saldar", "Saldar", "El antes y el después"],
    ["09-paz-y-salvo", "¡A paz y salvo!", "El mejor momento"],
    ["10-tus-cruces", "Tus cruces", "Uno por cada amigo"],
    ["12-parche-detalle", "Un parche", "Quién le paga a quién"],
    ["13-parche-por-consumo", "Por consumo", "Cada quien lo suyo"],
    ["14-parche-pasar-al-cruce", "Pasar al cruce", "Lo que queda entre dos"],
    ["16-ticket-del-parche", "Ticket del parche", "Para compartir en el grupo"],
    ["21-tu-perfil", "Tu perfil", "Tu Nequi o llave Bre-B"],
  ];
  const gallery = $("#gallery");
  SHOTS.forEach(([file, title, sub]) => {
    const fig = document.createElement("figure");
    fig.className = "shot";
    fig.style.margin = "0";
    fig.innerHTML = `<div class="phone"><img src="assets/img/screens/${file}.webp" alt="Pantalla ${title} de Cruce" loading="lazy" width="620" height="1348" draggable="false"></div>
      <figcaption>${title}<small>${sub}</small></figcaption>`;
    gallery.append(fig);
  });
  $$("[data-gallery]").forEach((btn) => btn.addEventListener("click", () => {
    const step = gallery.querySelector(".shot").offsetWidth + 28;
    gallery.scrollBy({ left: Number(btn.dataset.gallery) * step, behavior: reduceMotion ? "auto" : "smooth" });
  }));
  // Mouse drag to scroll (touch already scrolls natively).
  let drag = null;
  gallery.addEventListener("pointerdown", (e) => {
    if (e.pointerType !== "mouse") return;
    drag = { x: e.clientX, left: gallery.scrollLeft, moved: false };
    gallery.setPointerCapture(e.pointerId);
  });
  gallery.addEventListener("pointermove", (e) => {
    if (!drag) return;
    const dx = e.clientX - drag.x;
    if (Math.abs(dx) > 4) { drag.moved = true; gallery.classList.add("is-dragging"); }
    gallery.scrollLeft = drag.left - dx;
  });
  const endDrag = () => { drag = null; gallery.classList.remove("is-dragging"); };
  gallery.addEventListener("pointerup", endDrag);
  gallery.addEventListener("pointercancel", endDrag);

  /* ---------- Final CTA ---------- */
  $("#final-btn").addEventListener("click", () => {
    play("paz-y-salvo");
    confetti(110);
  });

  /* ---------- Boot ---------- */
  runIntro().then(startReveals);
})();
