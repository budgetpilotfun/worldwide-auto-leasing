/* Worldwide Auto Leasing — site behaviour (vanilla, no build step) */
(function () {
  "use strict";
  document.documentElement.classList.add("js");
  const $ = (s, c) => (c || document).querySelector(s);
  const $$ = (s, c) => Array.from((c || document).querySelectorAll(s));
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const money = n => "$" + Number(n).toLocaleString("en-US");

  /* ---- header ---------------------------------------------------------- */
  const header = $("#site-header"), toggle = $("#nav-toggle"), nav = $("#site-nav");
  const onScroll = () => header && header.classList.toggle("is-scrolled", window.scrollY > 8);
  onScroll(); window.addEventListener("scroll", onScroll, { passive: true });
  if (toggle && nav) {
    toggle.addEventListener("click", () => {
      const open = toggle.getAttribute("aria-expanded") !== "true";
      toggle.setAttribute("aria-expanded", String(open));
      toggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
      nav.classList.toggle("is-open", open);
    });
    document.addEventListener("keydown", e => { if (e.key === "Escape" && nav.classList.contains("is-open")) toggle.click(); });
  }

  /* ---- scroll reveal + counters ---------------------------------------- */
  const io = "IntersectionObserver" in window ? new IntersectionObserver(entries => {
    entries.forEach(en => {
      if (!en.isIntersecting) return;
      en.target.classList.add("is-visible");
      if (en.target.dataset.count) countUp(en.target);
      io.unobserve(en.target);
    });
  }, { rootMargin: "0px 0px -8% 0px", threshold: .1 }) : null;
  $$(".reveal, [data-count]").forEach(el => io ? io.observe(el) : el.classList.add("is-visible"));
  // safety net: nothing stays hidden if the observer never fires
  setTimeout(() => $$(".reveal:not(.is-visible)").forEach(el => { el.classList.add("is-visible"); if (el.dataset.count) countUp(el); }), 2500);
  function countUp(el) {
    const end = parseFloat(el.dataset.count), suffix = el.dataset.suffix || "", dec = (el.dataset.count.split(".")[1] || "").length;
    if (reduced) { el.textContent = end.toFixed(dec) + suffix; return; }
    const t0 = performance.now(), dur = 1400;
    (function tick(t) {
      const p = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - p, 3);
      el.textContent = (end * e).toFixed(dec) + suffix;
      if (p < 1) requestAnimationFrame(tick);
    })(t0);
  }

  /* ---- 3D tilt on cards ------------------------------------------------ */
  if (!reduced && window.matchMedia("(hover: hover)").matches) {
    document.addEventListener("pointermove", e => {
      const card = e.target.closest && e.target.closest(".card--tilt");
      if (!card) return;
      const r = card.getBoundingClientRect(), x = (e.clientX - r.left) / r.width - .5, y = (e.clientY - r.top) / r.height - .5;
      card.style.transform = `perspective(900px) rotateX(${(-y * 6).toFixed(2)}deg) rotateY(${(x * 8).toFixed(2)}deg) translateY(-4px)`;
    });
    document.addEventListener("pointerout", e => {
      const card = e.target.closest && e.target.closest(".card--tilt");
      if (card && !card.contains(e.relatedTarget)) card.style.transform = "";
    });
  }

  /* ---- vehicle rendering ---------------------------------------------- */
  const CAR_SVG = '<svg viewBox="0 0 320 120" aria-hidden="true"><defs><linearGradient id="g" x1="0" x2="1"><stop offset="0" stop-color="#f08080"/><stop offset=".5" stop-color="#c84038"/><stop offset="1" stop-color="#a81810"/></linearGradient></defs><path fill="url(#g)" d="M30 86c-8 0-12-6-12-14 0-9 4-14 14-16l34-6 36-26c6-5 14-8 24-8h70c12 0 22 4 30 12l24 22 36 6c10 2 16 8 16 18 0 8-5 12-13 12h-9a26 26 0 0 1-52 0H104a26 26 0 0 1-52 0H30z"/><circle cx="78" cy="88" r="16" fill="#0f0e0e"/><circle cx="78" cy="88" r="7" fill="#f6f5f5"/><circle cx="246" cy="88" r="16" fill="#0f0e0e"/><circle cx="246" cy="88" r="7" fill="#f6f5f5"/><path fill="#0f0e0e" opacity=".55" d="M112 56l30-22h30v22zm70 0V34h26c8 0 14 3 20 8l14 14z"/></svg>';
  function cardHTML(v, i) {
    const tag = v.tag ? `<span class="badge ${v.tag === "New" || v.tag === "EV" ? "badge--new" : v.tag === "Executive" ? "badge--ink" : ""}">${v.tag}</span>` : "";
    return `<article class="card card--tilt reveal${v.featured ? " card--featured" : ""}" data-delay="${(i % 3) + 1}" data-make="${v.make}" data-body="${v.body}" data-payment="${v.payment}">
      <div class="card__media">
        <div class="ph">${CAR_SVG}<span class="ph-label">${v.make}</span></div>
        <img src="img/vehicles/${v.slug}.jpg" alt="${v.year} ${v.make} ${v.model}" loading="lazy" onerror="this.remove()">
        <div class="card__body-tag">${tag}</div>
      </div>
      <div class="card__body">
        <h3 class="card__title">${v.year} ${v.make} ${v.model}</h3>
        <p class="card__meta">${v.color} · ${v.notes} · MSRP ${money(v.msrp)}</p>
        <div class="offer"><span class="offer__price price">${money(v.payment)}</span><span class="offer__per">/ mo</span>
          <span class="offer__terms">${v.term} mo · ${(v.miles / 1000)}k mi/yr · ${v.das === 0 ? "$0 due at signing" : money(v.das) + " due at signing"}</span></div>
        <div class="card__footer"><span class="badge badge--line">${v.body}</span>
          <a class="btn btn--primary btn--sm" href="custom-quote.html?vehicle=${encodeURIComponent(v.year + " " + v.make + " " + v.model)}">Get this deal</a></div>
      </div></article>`;
  }
  function renderCards(target, list) {
    target.innerHTML = list.length ? list.map(cardHTML).join("") : '<div class="empty">No vehicles match those filters. Clear a filter or <a href="custom-quote.html">request a custom quote</a> and we will source it.</div>';
    $$(".reveal", target).forEach(el => io ? io.observe(el) : el.classList.add("is-visible"));
  }
  const data = window.WWAL_VEHICLES || [];
  const featured = $("#featured-grid");
  if (featured) renderCards(featured, data.filter(v => v.featured).slice(0, 6));
  const specials = $("#specials-grid");
  if (specials) renderCards(specials, data.slice().sort((a, b) => a.payment - b.payment));

  /* ---- vehicles page: filters --------------------------------------- */
  const grid = $("#vehicle-grid");
  if (grid) {
    const params = new URLSearchParams(location.search);
    const state = { body: params.get("body") || "All", make: params.get("make") || "", max: 1200, sort: "payment" };
    const makeSel = $("#f-make"), maxIn = $("#f-max"), maxOut = $("#f-max-out"), sortSel = $("#f-sort"), count = $("#f-count");
    [...new Set(data.map(v => v.make))].sort().forEach(m => makeSel.insertAdjacentHTML("beforeend", `<option${m === state.make ? " selected" : ""}>${m}</option>`));
    $$("#f-body .chip").forEach(ch => {
      ch.setAttribute("aria-pressed", String(ch.dataset.body === state.body));
      ch.addEventListener("click", () => { state.body = ch.dataset.body; $$("#f-body .chip").forEach(c => c.setAttribute("aria-pressed", String(c === ch))); apply(); });
    });
    makeSel.addEventListener("change", () => { state.make = makeSel.value; apply(); });
    maxIn.addEventListener("input", () => { state.max = +maxIn.value; maxOut.textContent = state.max >= 1200 ? "Any" : money(state.max) + "/mo"; apply(); });
    sortSel.addEventListener("change", () => { state.sort = sortSel.value; apply(); });
    $("#f-clear").addEventListener("click", () => { state.body = "All"; state.make = ""; state.max = 1200; makeSel.value = ""; maxIn.value = 1200; maxOut.textContent = "Any"; $$("#f-body .chip").forEach(c => c.setAttribute("aria-pressed", String(c.dataset.body === "All"))); apply(); });
    function apply() {
      let list = data.filter(v => (state.body === "All" || v.body === state.body || (state.body === "Luxury" && v.tier === "Luxury")) && (!state.make || v.make === state.make) && v.payment <= state.max);
      list.sort(state.sort === "payment" ? (a, b) => a.payment - b.payment : state.sort === "payment-desc" ? (a, b) => b.payment - a.payment : (a, b) => (a.make + a.model).localeCompare(b.make + b.model));
      count.textContent = `${list.length} of ${data.length} vehicles`;
      renderCards(grid, list);
      const q = new URLSearchParams(); if (state.body !== "All") q.set("body", state.body); if (state.make) q.set("make", state.make);
      history.replaceState(null, "", location.pathname + (q.toString() ? "?" + q : ""));
    }
    apply();
  }

  /* ---- forms: validation, 10DLC consent proof, JSON submit ------------ */
  const toast = document.createElement("div"); toast.className = "toast"; toast.setAttribute("role", "status"); document.body.appendChild(toast);
  function say(msg) { toast.textContent = msg; toast.classList.add("is-on"); clearTimeout(say.t); say.t = setTimeout(() => toast.classList.remove("is-on"), 4500); }

  $$("form[data-lead]").forEach(form => {
    // pre-fill vehicle from ?vehicle=
    const want = new URLSearchParams(location.search).get("vehicle"), vf = form.querySelector("[name=vehicle]");
    if (want && vf && !vf.value) vf.value = want;
    const phone = form.querySelector("[name=phone]");
    if (phone) phone.addEventListener("input", () => { const d = phone.value.replace(/\D/g, "").slice(0, 10); phone.value = d.length > 6 ? `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}` : d.length > 3 ? `(${d.slice(0, 3)}) ${d.slice(3)}` : d; });

    form.addEventListener("submit", async e => {
      e.preventDefault();
      let ok = true;
      $$("[required]", form).forEach(f => {
        const field = f.closest(".field") || f.closest(".consent");
        const valid = f.type === "checkbox" ? f.checked : f.type === "email" ? /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(f.value) : f.name === "phone" ? f.value.replace(/\D/g, "").length === 10 : f.value.trim().length > 0;
        if (field) field.classList.toggle("field--error", !valid);
        if (!valid) ok = false;
      });
      if (!ok) { say("Please complete the highlighted fields."); return; }
      if (form.querySelector("[name=_honey]") && form.querySelector("[name=_honey]").value) return; // bot

      const fd = new FormData(form), payload = {};
      fd.forEach((v, k) => { if (!k.startsWith("_")) payload[k] = v; });
      const sms = form.querySelector("[name=sms_consent]");
      payload.sms_consent = sms && sms.checked ? "YES" : "NO";
      if (sms && sms.checked) {                       // proof of consent for 10DLC audits
        payload.sms_consent_text = sms.closest(".consent").textContent.replace(/\s+/g, " ").trim();
        payload.sms_consent_timestamp = new Date().toISOString();
        payload.sms_consent_page = location.href;
        payload.sms_consent_user_agent = navigator.userAgent;
      }
      payload._subject = `${window.WWAL.BRAND}: ${form.dataset.lead} from ${payload.name || "website"}`;
      payload._template = "table";

      const btn = form.querySelector("[type=submit]"), label = btn.textContent;
      btn.disabled = true; btn.textContent = "Sending…";
      try {
        const res = await fetch(window.WWAL.FORM_ENDPOINT, { method: "POST", headers: { "Content-Type": "application/json", "Accept": "application/json" }, body: JSON.stringify(payload) });
        if (!res.ok) throw new Error("HTTP " + res.status);
        location.href = window.WWAL.THANK_YOU_URL + (payload.sms_consent === "YES" ? "?sms=1" : "");
      } catch (err) {
        btn.disabled = false; btn.textContent = label;
        say("We could not send that. Please call " + window.WWAL.PHONE + " or try again.");
        console.error(err);
      }
    });
  });

  /* ---- credit app embed (xDesk link goes in config) ------------------- */
  const appFrame = $("#xdesk-app");
  if (appFrame && window.WWAL.CREDIT_APP_URL) {
    appFrame.innerHTML = `<iframe src="${window.WWAL.CREDIT_APP_URL}" title="Secure credit application" loading="lazy" allow="payment"></iframe>`;
  }
})();
