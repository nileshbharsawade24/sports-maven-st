/* ==========================================================================
   Sports Maven - site engine.
   Reads window.SITE (assets/js/data.js) and renders the page named in
   <body data-page="home | store | academy">. Plain JavaScript, no build step.
   ========================================================================== */
(() => {
  'use strict';

  const S = window.SITE;
  const C = S.contact;
  const B = document.body;
  const ROOT = B.dataset.root || '.';
  const PAGE = B.dataset.page;
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const FINE = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const REDUCE = matchMedia('(prefers-reduced-motion: reduce)').matches;

  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const url = p => `${ROOT}/${p}`;
  const waLink = (num, text) => `https://wa.me/${num}?text=${encodeURIComponent(text)}`;
  const mailLink = (to, subject, body = '') => `mailto:${to}?subject=${encodeURIComponent(subject)}${body ? '&body=' + encodeURIComponent(body) : ''}`;
  const showNum = num => (num === C.whatsapp ? C.phone : '+' + num);
  const sports = S.sports;
  const fullName = a => (a.kind ? `${a.name} ${a.kind}` : a.name);
  const BRAND = S.brand.name;

  /* ---------------------------------------------------------------- icons */
  const SPORT = {
    cricket: '<g transform="rotate(40 32 32)"><rect x="25" y="4" width="14" height="34" rx="3"/><path d="M29 38v14M35 38v14"/><rect x="28" y="52" width="8" height="8" rx="2"/></g><circle cx="47" cy="47" r="7"/><path d="M44 42.5c2.4 2.6 2.4 6.4 0 9M50 42.5c-2.4 2.6-2.4 6.4 0 9"/>',
    football: '<circle cx="32" cy="32" r="24"/><path d="M32 22l9.5 6.9-3.6 11.1H26.1l-3.6-11.1zM32 22V8M41.5 28.9 54 24M37.9 40 45 52M26.1 40 19 52M22.5 28.9 10 24"/>',
    badminton: '<circle cx="32" cy="53" r="6"/><path d="M26 49 16 12q16-6 32 0L38 49"/><path d="M22 14l6.5 35M32 10v39M42 14l-6.5 35M19 26q13 4 26 0"/>',
    swimming: '<circle cx="43" cy="17" r="5"/><path d="M10 36c6-14 18-20 31-14"/><path d="M2 46c3-4 7-4 10 0s7 4 10 0 7-4 10 0 7 4 10 0 7-4 10 0"/><path d="M2 56c3-4 7-4 10 0s7 4 10 0 7-4 10 0 7 4 10 0 7-4 10 0"/>',
    tennis: '<circle cx="32" cy="32" r="24"/><path d="M18.2 12.3C30 22 30 42 18.2 51.7M45.8 12.3C34 22 34 42 45.8 51.7"/>',
    martial: '<circle cx="26" cy="11" r="5"/><path d="M26 17l4 17M28 24l-12 5M28 24l15-6M30 34l16-4 12-8M30 34l-6 18h-8"/>',
    tabletennis: '<g transform="rotate(-28 32 34)"><path d="M26.5 42.8A19 19 0 1 1 37.5 42.8L38.6 55q.4 4-3.6 4h-6q-4 0-3.6-4z"/><path d="M19 21q3-9 14-9"/></g><circle cx="53" cy="17" r="5.5"/><path d="M46 10l-4-4M51 8l-1-5M59 11l4-3"/>',
    pickleball: '<g transform="rotate(-38 32 34)"><rect x="19" y="8" width="26" height="30" rx="11"/><rect x="28" y="38" width="8" height="16" rx="2"/><path d="M27 18h.01M32 18h.01M37 18h.01M27 24h.01M32 24h.01M37 24h.01M30 30h.01M34 30h.01"/></g><circle cx="49" cy="14" r="7"/><path d="M46 12h.01M52 12h.01M49 17h.01M46 16h.01"/>',
    gymnastics: '<circle cx="30" cy="11" r="5"/><path d="M30 17v17M30 22 17 13M30 22l13-9M30 34 20 54M30 34l12 20"/><path d="M43 13c9-5 15 3 9 8s-12 4-7 12"/>',
    dumbbell: '<rect x="3" y="24" width="8" height="16" rx="2"/><rect x="11" y="19" width="7" height="26" rx="2"/><rect x="46" y="19" width="7" height="26" rx="2"/><rect x="53" y="24" width="8" height="16" rx="2"/><path d="M18 32h28"/>',
    more: '<circle cx="14" cy="32" r="4"/><circle cx="32" cy="32" r="4"/><circle cx="50" cy="32" r="4"/>',
    stopwatch: '<circle cx="32" cy="36" r="20"/><path d="M32 36V23M26 8h12M32 8v8M50 17l4-4M32 20v2M52 36h-2M12 36h2"/>',
    trophy: '<path d="M20 10h24v14a12 12 0 0 1-24 0z"/><path d="M20 14h-8c0 10 4 14 10 15M44 14h8c0 10-4 14-10 15M32 36v10M22 56h20M26 46h12v10H26z"/>',
    medal: '<circle cx="32" cy="39" r="14"/><path d="M22 6l8 18M42 6l-8 18M32 32l2.6 5.2 5.7.8-4.1 4 1 5.7-5.2-2.7-5.2 2.7 1-5.7-4.1-4 5.7-.8z"/>'
  };
  const UI = {
    arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
    mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>',
    phone: '<path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z"/>',
    pin: '<path d="M12 21s7-6.2 7-11a7 7 0 1 0-14 0c0 4.8 7 11 7 11z"/><circle cx="12" cy="10" r="2.5"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
    close: '<path d="M6 6l12 12M18 6 6 18"/>',
    check: '<path d="m5 12 5 5 9-10"/>',
    bolt: '<path d="M13 2 4 14h7l-1 8 9-12h-7z"/>',
    users: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c.6-3.6 3.2-5.5 6.5-5.5s5.9 1.9 6.5 5.5"/><circle cx="17" cy="9" r="2.5"/><path d="M17 14c2.5 0 4 1.4 4.5 4"/>',
    tag: '<path d="M3 12V4h8l10 10-8 8z"/><circle cx="7.5" cy="8.5" r="1.3"/>',
    prev: '<path d="m15 6-6 6 6 6"/>',
    next: '<path d="m9 6 6 6-6 6"/>',
    chat: '<path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z"/>',
    instagram: '<rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r=".6"/>',
    star: '<path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z"/>'
  };
  const WA_PATH = 'M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z';
  const ui = n => `<svg class="ico" viewBox="0 0 24 24" aria-hidden="true">${UI[n]}</svg>`;
  const wa = () => `<svg class="ico fill" viewBox="0 0 24 24" aria-hidden="true"><path d="${WA_PATH}"/></svg>`;
  const sport = (n, cls = '') => `<svg class="${cls}" viewBox="0 0 64 64" aria-hidden="true">${SPORT[n] || SPORT.football}</svg>`;

  /* ----------------------------------------------- generated art + photos */
  // Every card shows generated artwork; a real photo (when the academy has `photos: true`) is laid over it.
  function art(hue, ic, seed = 0) {
    const a = 120 + (seed * 47) % 120, ax = 10 + (seed * 29) % 70, ay = 5 + (seed * 17) % 50, r = ((seed * 13) % 30) - 15;
    const ox = ((seed * 31) % 21) - 10, oy = ((seed * 19) % 13) - 6;
    return `<div class="art" style="--h:${hue};--a:${a}deg;--ax:${ax}%;--ay:${ay}%;--r:${r}deg;--ox:${ox}%;--oy:${oy}%">${sport(ic)}</div>`;
  }
  function media(hue, ic, seed, base, alt, on) {
    const img = base && on ? `<img src="${base}.${S.photoExt}" alt="${esc(alt)}" loading="lazy" decoding="async" onload="this.dataset.ok=1" onerror="this.remove()">` : '';
    return `<div class="media">${art(hue, ic, seed)}${img}</div>`;
  }
  const photoBase = (a, n) => `${ROOT}/assets/img/academies/${a.slug}/${n}`;

  /* ------------------------------------------------------- sports balls */
  const BALL = {
    cricket: '<circle cx="32" cy="32" r="31" fill="url(#bg-cricket)"/><path d="M4 29C20 42 44 42 60 29M4 36C20 49 44 49 60 36" fill="none" stroke="#f3e6c8" stroke-width="2" stroke-dasharray="3.2 2.6" stroke-linecap="round"/>',
    football: '<circle cx="32" cy="32" r="31" fill="url(#bg-football)"/><path d="M32 20.5l10.8 7.8-4.1 12.7H25.3l-4.1-12.7z" fill="#1d1a14"/><path d="M32 20.5V3M42.8 28.3l16.5-5.4M38.7 41l10.2 14M25.3 41L15.1 55M21.2 28.3L4.7 22.9" fill="none" stroke="#1d1a14" stroke-width="2.2" stroke-linecap="round"/>',
    tennis: '<circle cx="32" cy="32" r="31" fill="url(#bg-tennis)"/><path d="M12 11C26 22 26 42 12 53M52 11C38 22 38 42 52 53" fill="none" stroke="#f8fbe4" stroke-width="2.8" stroke-linecap="round"/>',
    tabletennis: '<circle cx="32" cy="32" r="31" fill="url(#bg-tt)"/><path d="M12 24a22 22 0 0 1 14-13" fill="none" stroke="#fff" stroke-opacity=".5" stroke-width="2.4" stroke-linecap="round"/>',
    pickleball: '<circle cx="32" cy="32" r="31" fill="url(#bg-pickle)"/><g fill="#6d560e"><circle cx="32" cy="12" r="2.6"/><circle cx="18" cy="19" r="2.6"/><circle cx="46" cy="19" r="2.6"/><circle cx="11" cy="33" r="2.6"/><circle cx="53" cy="33" r="2.6"/><circle cx="26" cy="29" r="2.6"/><circle cx="39" cy="29" r="2.6"/><circle cx="32" cy="41" r="2.6"/><circle cx="19" cy="45" r="2.6"/><circle cx="45" cy="45" r="2.6"/><circle cx="32" cy="54" r="2.6"/></g>',
    shuttle: '<circle cx="32" cy="52" r="10" fill="url(#bg-cork)"/><path d="M24 47 10 6Q32-2 54 6L40 47z" fill="#f6f0e0" stroke="#cdbf9f" stroke-width="1.6" stroke-linejoin="round"/><path d="M19 8l8 38M32 4v43M45 8l-8 38M13 22q19 6 38 0" fill="none" stroke="#cdbf9f" stroke-width="1.4"/>'
  };
  const BALL_DEFS = '<svg width="0" height="0" style="position:absolute" aria-hidden="true" focusable="false"><defs>' +
    [['cricket', '#e8664a', '#b32a1a', '#6b130b'], ['football', '#ffffff', '#e9e2d2', '#b9b09c'], ['tennis', '#e6f55a', '#bcd62a', '#7e9414'], ['tt', '#ffd9a8', '#ff9f4d', '#d9641c'], ['pickle', '#f6e27a', '#d9b92f', '#9c7d12'], ['cork', '#ead0a6', '#c9a06a', '#8d6128']]
      .map(([id, a, b, c]) => '<radialGradient id="bg-' + id + '" cx=".35" cy=".3" r=".85"><stop offset="0" stop-color="' + a + '"/><stop offset=".55" stop-color="' + b + '"/><stop offset="1" stop-color="' + c + '"/></radialGradient>').join('') +
    '</defs></svg>';
  // a strip between sections: the ball drops, bounces and rolls across as you scroll past
  const playstrip = kind => `<div class="play" data-ball="${kind}" aria-hidden="true"><span class="shade"></span><span class="ball"><svg viewBox="0 0 64 64">${BALL[kind]}</svg></span></div>`;

  /* ------------------------------------------------- shuttlecock in flight */
  const TRAIL = 18;
  // open space: one shuttlecock flies from left to right in an arc, trailing fading dots, as you scroll
  const arena = () => `<div class="arena" aria-hidden="true"><div class="glowfloor"></div>${'<i class="dot"></i>'.repeat(TRAIL)}<span class="shuttle"><svg viewBox="0 0 64 64">${BALL.shuttle}</svg></span></div>`;

  /* ---------------------------------------------------------- shared shell */
  function renderShell() {
    const cur = PAGE === 'academy' ? 'academies' : PAGE;
    const links = [['home', 'Home', 'index.html'], ['academies', 'Academies', 'index.html#academies'], ['store', 'Sports Gear', 'store.html'], ['bulk', 'Bulk Orders', 'store.html#bulk'], ['contact', 'Contact', 'index.html#contact']];
    const ac = PAGE === 'academy' ? S.academies.find(x => x.slug === B.dataset.academy) : null;
    const shellNum = (ac && ac.whatsapp) || C.whatsapp;
    const hi = waLink(shellNum, `Hi ${BRAND}! I have a question.`);
    const logo = `<a class="logo" href="${url('index.html')}" aria-label="${esc(BRAND)} home"><i>${ui('bolt')}</i>${esc(BRAND)}</a>`;

    const h = $('#site-header');
    h.className = 'hdr';
    h.innerHTML = `<div class="wrap">${logo}
      <nav id="nav" aria-label="Main"><ul>${links.map(([k, t, p]) => `<li><a href="${url(p)}"${k === cur ? ' class="on" aria-current="page"' : ''}>${t}</a></li>`).join('')}</ul></nav>
      <div class="hdr-cta"><a class="btn btn-wa btn-sm" href="${hi}" target="_blank" rel="noopener">${wa()} WhatsApp</a>
      <button class="menu-btn" id="menu" aria-label="Open menu" aria-expanded="false" aria-controls="nav">${ui('menu')}</button></div></div>`;

    const f = $('#site-footer');
    f.className = 'ftr';
    const socials = [['Instagram', C.instagram], ['Facebook', C.facebook], ['YouTube', C.youtube]].filter(s => s[1]);
    f.innerHTML = `<div class="wrap"><div class="cols">
      <div>${logo}<p>${esc(S.brand.intro)}</p>${socials.length ? `<div class="socials">${socials.map(([n, u]) => `<a href="${esc(u)}" target="_blank" rel="noopener">${n}</a>`).join('')}</div>` : ''}</div>
      <div><h4>Academies</h4><ul>${S.academies.map(a => `<li><a href="${url('academies/' + a.slug + '.html')}">${esc(a.name)}</a></li>`).join('')}</ul></div>
      <div><h4>Explore</h4><ul><li><a href="${url('index.html')}">Home</a></li><li><a href="${url('store.html')}">Sports gear</a></li><li><a href="${url('store.html#bulk')}">Bulk orders</a></li><li><a href="${url('index.html#contact')}">Contact</a></li></ul></div>
      <div><h4>Say hello</h4><ul>
        ${ac ? `<li class="ico-links"><a class="btn btn-wa btn-icon" href="${hi}" target="_blank" rel="noopener" aria-label="Chat on WhatsApp">${wa()}</a>
        <a class="btn btn-ghost btn-icon" href="tel:+${shellNum}" aria-label="Call">${ui('phone')}</a>
        <a class="btn btn-ghost btn-icon" href="mailto:${esc((ac && ac.email) || C.email)}" aria-label="Email">${ui('mail')}</a>
        ${ac.instagram ? `<a class="btn btn-ghost btn-icon" href="${esc(ac.instagram)}" target="_blank" rel="noopener" aria-label="Instagram">${ui('instagram')}</a>` : ''}</li>` : `
        <li><a href="${hi}" target="_blank" rel="noopener">WhatsApp ${esc(C.phone)}</a></li>
        <li><a href="mailto:${esc(C.email)}">${esc(C.email)}</a></li>
        <li><a href="tel:+${C.whatsapp}">${esc(C.phone)}</a></li>`}
        ${C.hours ? `<li style="color:var(--muted);font-size:.9rem">${esc(C.hours)}</li>` : ''}</ul></div>
      </div><div class="bar"><span>&copy; ${new Date().getFullYear()} ${esc(BRAND)}. All rights reserved.</span><span>${esc(C.address || 'Order queries: WhatsApp or email')}</span></div></div>`;

    B.insertAdjacentHTML('beforeend', BALL_DEFS + `<a class="fab" href="${hi}" target="_blank" rel="noopener" aria-label="Chat on WhatsApp">${wa()}</a><div class="cursor-glow" aria-hidden="true"></div>`);

    const nav = $('#nav'), btn = $('#menu');
    btn.addEventListener('click', () => {
      const open = nav.classList.toggle('open');
      btn.setAttribute('aria-expanded', open);
      btn.innerHTML = ui(open ? 'close' : 'menu');
    });
    nav.addEventListener('click', e => { if (e.target.closest('a')) { nav.classList.remove('open'); btn.setAttribute('aria-expanded', false); btn.innerHTML = ui('menu'); } });
    const onScroll = () => h.classList.toggle('scrolled', scrollY > 8);
    addEventListener('scroll', onScroll, { passive: true }); onScroll();
  }

  /* ----------------------------------------------------------- components */
  const acadCard = (a, i, d = 0) => `
    <a class="acad rv" data-tilt style="--h:${a.hue};--d:${d}ms" href="${url('academies/' + a.slug + '.html')}" aria-label="${esc(fullName(a))} - ${esc(a.tagline)}">
      ${media(a.hue, a.icon, i + 1, photoBase(a, 'cover'), fullName(a), a.photos)}
      <span class="glyph">${sport(a.icon, 'ico sp')}</span>${a.soon ? '<span class="soon">Coming soon</span>' : `<span class="num">0${i + 1}</span>`}
      <div class="info">${a.kind ? `<span class="kind">${esc(a.kind)}</span>` : ''}<h3>${esc(a.name)}</h3><p class="tl">${esc(a.tagline)}</p>
        <div class="more"><div><div class="pills">${(a.facts || []).slice(0, 2).map(f => `<span class="pill">${esc(f[1])}</span>`).join('')}</div>
        ${a.soon ? '' : `<span class="go">Open academy ${ui('arrow')}</span>`}</div></div></div>
    </a>`;

  const orderBtns = (msg, subject, label) =>
    `<div class="pbtns"><a class="btn btn-wa btn-sm" href="${waLink(C.whatsapp, msg)}" target="_blank" rel="noopener">${wa()} Ask on WhatsApp</a>
     <a class="btn btn-ghost btn-sm btn-icon" href="${mailLink(C.email, subject, msg)}" aria-label="Email about ${esc(label)}">${ui('mail')}</a></div>`;

  const sportCard = (s, i, d = 0) => {
    const msg = `Hi ${BRAND}! I'm looking for ${s.name} equipment. Please share availability and price.`;
    return `<article class="prod rv" style="--h:${s.hue};--d:${d}ms">
      <div class="pimg">${art(s.hue, s.icon, i + 2)}${s.popular ? '<span class="ptag">Most asked</span>' : ''}</div>
      <div class="pbody"><h3>${esc(s.name)}</h3><ul class="tags">${s.items.map(x => `<li>${esc(x)}</li>`).join('')}</ul>
      ${orderBtns(msg, 'Order query: ' + s.name, s.name)}</div></article>`;
  };

  const moreCard = d => {
    const msg = `Hi ${BRAND}! I'm looking for some sports equipment. Can you help?`;
    return `<article class="prod more rv" style="--h:42;--d:${d}ms">
      <div class="pimg">${art(42, 'more', 11)}</div>
      <div class="pbody"><h3>And much more</h3><p class="pnote">Don't see your sport? Tell us what you need and we will reply with what we can offer.</p>
      ${orderBtns(msg, 'Order query', 'your sport')}</div></article>`;
  };

  const ccard = (cls, icon, label, value, href, ext) =>
    `<${href ? 'a' : 'div'} class="ccard ${cls}"${href ? ` href="${href}"${ext ? ' target="_blank" rel="noopener"' : ''}` : ''}><span class="ib">${icon}</span><span><small>${label}</small><strong>${value}</strong></span></${href ? 'a' : 'div'}>`;

  const enquiry = (title, topics, selected, num, mail, label) => `
    <form class="form rv" data-wa="${num}" data-mail="${esc(mail)}" data-label="${esc(label)}" onsubmit="return false">
      <h3>${esc(title)}</h3><p class="hint" style="margin-top:-6px">Opens WhatsApp or your email app with the message ready to send.</p>
      <div class="two"><label>Your name<input name="name" required autocomplete="name" placeholder="Your name"></label>
      <label>Phone (optional)<input name="phone" type="tel" autocomplete="tel" placeholder="+91 ..."></label></div>
      <label>About<select name="topic">${topics.map(t => {
        // a topic is a plain label, or { t, wa, mail } to send that topic to a different WhatsApp / email
        const o = typeof t === 'string' ? { t } : t;
        return `<option${o.t === selected ? ' selected' : ''}${o.wa ? ` data-wa="${esc(o.wa)}"` : ''}${o.mail ? ` data-mail="${esc(o.mail)}"` : ''}>${esc(o.t)}</option>`;
      }).join('')}</select></label>
      <label>Message<textarea name="msg" placeholder="Tell us what you need: sports, items, quantities, batch, age..."></textarea></label>
      <div class="btns"><button type="button" class="btn btn-wa" data-send="wa">${wa()} Send on WhatsApp</button>
      <button type="button" class="btn btn-ghost" data-send="mail">${ui('mail')} Send by email</button></div></form>`;

  const sectionHead = (eyebrow, title, text, extra = '') =>
    `<div class="sec-head${extra ? ' row' : ''} rv"><div><span class="eyebrow">${eyebrow}</span><h2 class="h2">${title}</h2>${text ? `<p>${text}</p>` : ''}</div>${extra}</div>`;

  const contactCards = (num, mail, msg, extra = '') =>
    `${ccard('wa', wa(), 'WhatsApp', esc(showNum(num)), waLink(num, msg), true)}
     ${ccard('', ui('mail'), 'Email', esc(mail), mailLink(mail, 'Enquiry', msg))}
     ${ccard('', ui('phone'), 'Call', esc(showNum(num)), 'tel:+' + num)}${extra}`;

  const bulkBlock = () => {
    const b = S.bulk, msg = `Hi ${BRAND}! I'd like a bulk order quote for our school / association.`;
    return `<section class="section light" id="bulk"><div class="wrap">
      ${sectionHead('Bulk orders', esc(b.title).replace(/(schools &amp; associations)$/, '<span class="grad">$1</span>'), esc(b.text))}
      <div class="grid3">${b.who.map((w, i) => `<div class="card rv" style="--d:${i * 90}ms"><div class="ib">${ui(w.icon)}</div><h3>${esc(w.title)}</h3><p>${esc(w.text)}</p></div>`).join('')}</div>
      <div class="steps" style="margin-top:20px">${b.steps.map((s, i) => `<div class="step rv" style="--d:${i * 90}ms"><h3>${esc(s.title)}</h3><p>${esc(s.text)}</p></div>`).join('')}</div>
      <div class="band rv" style="margin-top:22px"><div><h3>Get a bulk quote</h3><p>Send your list on WhatsApp or email.</p></div>
        <div class="cta-row" style="margin:0"><a class="btn btn-wa" href="${waLink(C.whatsapp, msg)}" target="_blank" rel="noopener">${wa()} WhatsApp</a>
        <a class="btn btn-ghost" href="${mailLink(C.email, 'Bulk order quote', msg)}">${ui('mail')} Email</a></div></div>
    </div></section>`;
  };

  const orderBlock = () => `<section class="section light" id="order"><div class="wrap">
      ${sectionHead('Order queries', 'Ask us <span class="grad">directly</span>', 'Tell us what you need. We reply on WhatsApp or email with availability and price.')}
      <div class="contact"><div class="ccards rv">${contactCards(C.whatsapp, C.email, `Hi ${BRAND}! I have an order query.`)}</div>
      ${enquiry('Send an order query', ['Order query', 'Bulk order - school', 'Bulk order - association / club', 'Something else'], 'Order query', C.whatsapp, C.email, BRAND)}</div>
    </div></section>`;

  /* ---------------------------------------------------------------- pages */
  function home() {
    const topics = ['Order query', 'Bulk order - school', 'Bulk order - association / club', ...S.academies.map(a => fullName(a)), 'Something else'];

    $('#main').innerHTML = `
    <section class="hero"><div class="floor"></div><div class="wrap">
      <div>
        <span class="badge rv"><b></b>Sport academy partners &amp; sports equipment</span>
        <h1 class="rv" style="--d:80ms">${esc(S.brand.tagline)} <span class="grad">${esc(S.brand.accent)}</span></h1>
        <p class="lead rv" style="--d:160ms">${esc(S.brand.intro)}</p>
        <div class="cta-row rv" style="--d:240ms">
          <a class="btn btn-primary" href="#academies">Sport academies ${ui('arrow')}</a>
          <a class="btn btn-ghost" href="${url('store.html')}">Sports equipment</a>
          <a class="btn btn-wa" href="${waLink(C.whatsapp, `Hi ${BRAND}! I'd like some information.`)}" target="_blank" rel="noopener">${wa()} WhatsApp us</a>
        </div>
      </div>
      <div class="hud rv" style="--d:200ms" aria-hidden="true">
        <div class="ring"></div><div class="ring r2"></div><div class="ring r3"></div>
        <div class="orb" id="orb">${sport(sports[0].icon)}</div>
        <div class="chip c1">${ui('users')}<div><b>Sport academies</b><span>Training with our partners</span></div></div>
        <div class="chip c2">${ui('tag')}<div><b>${sports.length}+ sports</b><span>Equipment for every team</span></div></div>
        <div class="chip c3">${wa()}<div><b>WhatsApp</b><span>Orders &amp; queries</span></div></div>
      </div>
    </div></section>
    ${playstrip('tabletennis')}

    <section class="section light" id="about"><div class="wrap">
      ${sectionHead('What we provide', 'Everything for your game, <span class="grad">under one roof</span>', 'Train with our academy partners, or simply ask for the equipment you need.')}
      <div class="grid3">${S.pillars.map((p, i) => `<div class="card rv" style="--d:${i * 90}ms"><div class="ib">${ui(p.icon)}</div><h3>${esc(p.title)}</h3><p>${esc(p.text)}</p><a class="lnk" href="${url(p.link[1])}">${esc(p.link[0])} ${ui('arrow')}</a></div>`).join('')}</div>
    </div></section>

    ${playstrip('pickleball')}

    <section class="section" id="academies" style="padding-top:0"><div class="wrap">
      ${sectionHead('Sport academy partners', 'Pick your sport. <span class="grad">Find your edge.</span>', '')}
      <div class="acads${S.academies.length <= 3 ? ' few' : ''}">${S.academies.map((a, i) => acadCard(a, i, (i % 3) * 90)).join('')}</div>
    </div></section>

    ${playstrip('cricket')}

    <section class="section" style="padding-top:0"><div class="wrap">
      ${sectionHead('Sports equipment', 'Sports equipment we <span class="grad">supply</span>', 'The sports people ask us for most, and much more. Tell us what you need.', `<a class="btn btn-ghost" href="${url('store.html')}">See everything ${ui('arrow')}</a>`)}
      <div class="prods teaser">${sports.filter(s => s.popular).slice(0, 4).map((s, i) => sportCard(s, sports.indexOf(s), i * 80)).join('')}</div>
      <div class="band rv" style="margin-top:22px"><div><h3>Buying for a school, association, academy or tournament?</h3><p>Bulk orders are supported. Ask for a quote.</p></div>
        <a class="btn btn-primary" href="${url('store.html#bulk')}">Bulk orders ${ui('arrow')}</a></div>
    </div></section>

    ${arena()}

    <section class="section" style="padding-top:0"><div class="wrap"><div class="stats rv">
      ${S.stats.map(s => s.text
        ? `<div class="stat"><b class="t">${esc(s.text)}</b><span>${esc(s.label)}</span></div>`
        : `<div class="stat"><b><span data-count="${s.value === 'sports' ? sports.length : s.value === 'academies' ? S.academies.length : s.value}">0</span>${esc(s.suffix || '')}</b><span>${esc(s.label)}</span></div>`).join('')}
    </div></div></section>

    <section class="section light" id="contact"><div class="wrap">
      ${sectionHead('Contact', 'Let\'s talk <span class="grad">sport</span>', 'Ask about our academy partners, an order or a bulk quote. We reply personally on WhatsApp or email.')}
      <div class="contact"><div class="ccards rv">
        ${contactCards(C.whatsapp, C.email, `Hi ${BRAND}! I'd like some information.`, C.address ? ccard('', ui('pin'), 'Visit', `${esc(C.address)}${C.hours ? `<br><span style="font:400 .88rem var(--body);color:var(--muted)">${esc(C.hours)}</span>` : ''}`) : '')}
      </div>${enquiry('Send us an enquiry', topics, topics[0], C.whatsapp, C.email, BRAND)}</div>
    </div></section>`;

    // hero orb cycles through the sports
    const orb = $('#orb'); let k = 0;
    if (!REDUCE) setInterval(() => {
      const svg = $('svg', orb); svg.classList.add('swap');
      setTimeout(() => { k = (k + 1) % sports.length; orb.innerHTML = sport(sports[k].icon, 'swap'); const n = $('svg', orb); void n.getBoundingClientRect(); n.classList.remove('swap'); }, 350);
    }, 2600);
  }

  function store() {
    $('#main').innerHTML = `
    <section class="ahero" style="--h:40"><div class="glow"></div><div class="wrap">
      <nav class="crumbs" aria-label="Breadcrumb"><a href="${url('index.html')}">Home</a><span>/</span><span>Sports gear</span></nav>
      <div class="ic">${ui('tag')}</div>
      <h1>Sports gear, <em>for every game.</em></h1>
      <p class="lead" style="margin-top:14px">Cricket, table tennis, badminton, pickleball, gymnastics and much more. These are the sports people ask us for most. Tell us what you need and we will reply with availability and the price.</p>
      <div class="facts"><span class="fact">${ui('users')} Bulk orders for schools &amp; associations</span><span class="fact">${wa()} Order queries on WhatsApp</span><span class="fact">${ui('mail')} Or by email</span></div>
      <div class="cta-row"><a class="btn btn-wa" href="${waLink(C.whatsapp, `Hi ${BRAND}! I have an order query.`)}" target="_blank" rel="noopener">${wa()} WhatsApp ${esc(C.phone)}</a>
      <a class="btn btn-ghost" href="${mailLink(C.email, 'Order query')}">${ui('mail')} ${esc(C.email)}</a></div>
    </div></section>

    ${playstrip('pickleball')}

    <section class="section" style="padding-top:0"><div class="wrap">
      ${sectionHead('What we supply', 'Sports we <span class="grad">supply</span>', 'Prices are shared on request, so you always get the current rate. Message us the item and quantity.')}
      <div class="prods">${sports.map((s, i) => sportCard(s, i, (i % 4) * 70)).join('')}${moreCard((sports.length % 4) * 70)}</div>
    </div></section>

    ${playstrip('tennis')}
    ${bulkBlock()}
    ${orderBlock()}`;
  }

  function academy() {
    const a = S.academies.find(x => x.slug === B.dataset.academy);
    const main = $('#main');
    if (!a) { main.innerHTML = `<section class="section"><div class="wrap"><h1 class="h2">Academy not found</h1><p class="lead">That academy does not exist. <a href="${url('index.html#academies')}" style="color:var(--gold)">See all academies</a>.</p></div></section>`; return; }
    document.title = `${fullName(a)} | ${BRAND}`;
    main.style.setProperty('--h', a.hue);
    const num = a.whatsapp || C.whatsapp, mail = a.email || C.email;
    const msg = a.soon
      ? `Hi ${BRAND}! Please let me know when the ${a.name} opens, and where it will be.`
      : `Hi ${BRAND}! I'd like to know more about ${fullName(a)} (batches, timings and fees).`;
    const others = S.academies.filter(x => x !== a);
    // tiles without a photo alternate between the sport icon and trophy/stopwatch/medal artwork
    const mix = [null, 'stopwatch', null, 'trophy', null, 'medal', null, 'stopwatch', 'trophy'];
    const gallery = a.gallery.map((cap, n) => ({ caption: cap, hue: a.hue + (n % 3) * 14 - 14, icon: mix[n % mix.length] || a.icon, sub: fullName(a), base: photoBase(a, n + 1) }));
    // each topic goes to the right place: this academy -> its own WhatsApp, gear and general questions -> Sports Maven
    const topics = [
      { t: fullName(a), wa: num, mail },
      ...others.map(o => ({ t: fullName(o), wa: o.whatsapp || C.whatsapp, mail: o.email || C.email })),
      { t: 'Sports gear', wa: C.whatsapp, mail: C.email },
      { t: 'Something else', wa: C.whatsapp, mail: C.email }
    ];

    const hero = `
    <section class="ahero">${media(a.hue, a.icon, 2, photoBase(a, 'cover'), fullName(a), a.photos)}<div class="glow"></div><div class="wrap">
      <nav class="crumbs" aria-label="Breadcrumb"><a href="${url('index.html')}">Home</a><span>/</span><a href="${url('index.html#academies')}">Academies</a><span>/</span><span>${esc(a.name)}</span></nav>
      <div class="ic">${sport(a.icon, 'ico sp')}</div>
      ${a.kind ? `<p class="eyebrow" style="margin-bottom:10px">${esc(a.kind)}${a.soon ? ' - coming soon' : ''}</p>` : ''}
      <h1>${esc(a.name).replace(/(\S+)$/, '<em>$1</em>')}</h1>
      <p class="lead" style="margin-top:12px;font-size:1.3rem;color:#eadfc8">${esc(a.tagline)}</p>
      <div class="facts">${(a.facts || []).map(f => `<span class="fact">${ui(f[0])} ${esc(f[1])}</span>`).join('')}</div>
      <div class="cta-row">
        <a class="btn btn-wa btn-icon" href="${waLink(num, msg)}" target="_blank" rel="noopener" aria-label="Chat on WhatsApp">${wa()}</a>
        <a class="btn btn-ghost btn-icon" href="tel:+${num}" aria-label="Call">${ui('phone')}</a>
        <a class="btn btn-ghost btn-icon" href="${mailLink(mail, 'Enquiry: ' + fullName(a), msg)}" aria-label="Email">${ui('mail')}</a>
        ${a.instagram ? `<a class="btn btn-ghost btn-icon" href="${esc(a.instagram)}" target="_blank" rel="noopener" aria-label="Instagram">${ui('instagram')}</a>` : ''}
      </div>
    </div></section>`;

    const about = `
    <section class="section light"><div class="wrap${a.highlights.length ? ' split' : ''}">
      <div class="prose rv"><span class="eyebrow">About</span><h2 class="h2">${a.soon ? 'A new <span class="grad">branch</span>' : 'Train with <span class="grad">purpose</span>'}</h2><p>${esc(a.about)}</p>
        ${a.level ? `<p style="margin-top:14px"><b>Level:</b> ${esc(a.level)}</p>` : ''}
        ${a.venue ? `<p style="margin-top:8px"><b>Venue:</b> ${esc(a.venue)}</p>` : ''}</div>
      ${a.highlights.length ? `<div class="card rv" style="--d:100ms"><h3>What you get</h3><ul class="checks" style="grid-template-columns:1fr">${a.highlights.map(h => `<li>${ui('check')}<span>${esc(h)}</span></li>`).join('')}</ul></div>` : ''}
    </div></section>`;

    const programs = a.programs.length ? `
    <section class="section" style="padding-top:0"><div class="wrap">
      ${sectionHead('Programmes', 'Batches &amp; memberships', 'Ask us for timings and fees. We reply on WhatsApp or email.')}
      <div class="progs">${a.programs.map((p, i) => `<div class="prog rv" style="--d:${(i % 4) * 70}ms"><h3>${esc(p.name)}</h3><p>${esc(p.text)}</p>
        <a class="lnk" href="${waLink(num, `Hi ${BRAND}! I'd like details of the ${p.name} at ${a.name}.`)}" target="_blank" rel="noopener">Ask on WhatsApp ${ui('arrow')}</a></div>`).join('')}</div>
    </div></section>` : '';

    const initials = n => n.replace(/^(Coach|Sensei)\s+/, '').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
    const coaches = a.coaches.length ? `
    <section class="section" style="padding-top:0"><div class="wrap">
      ${sectionHead('Coaches', 'Meet the team', '')}
      <div class="coaches">${a.coaches.map((c, i) => `<div class="coach rv" style="--d:${i * 70}ms"><i>${esc(initials(c.name))}</i><div><strong>${esc(c.name)}</strong><span>${esc(c.role)}</span></div></div>`).join('')}</div>
    </div></section>` : '';

    const gal = gallery.length ? `
    <section class="section" id="gallery" style="padding-top:0"><div class="wrap">
      ${sectionHead('Gallery', `Life at <span class="grad">${esc(a.name)}</span>`, 'Tap any photo to view it full screen.')}
      <div class="gallery${gallery.length === 9 ? '' : ' uniform'}" id="gal" style="--h:${a.hue}">${gallery.map((g, n) => `<button class="g-item rv" style="--d:${(n % 4) * 60}ms" data-i="${n}" aria-label="Open photo: ${esc(g.caption)}">${media(g.hue, g.icon, n + 3, g.base, g.caption, a.photos)}<span class="cap">${esc(g.caption)}</span></button>`).join('')}</div>
    </div></section>` : '';

    const contact = `
    <section class="section light" id="contact"><div class="wrap">
      ${a.soon ? sectionHead('Stay in the loop', 'Be the <span class="grad">first to know</span>', 'Message us and we will tell you when the branch opens, where it is and which batches start first.')
               : sectionHead('Join us', `Enquire about <span class="grad">${esc(a.name)}</span>`, 'Message us directly for batches, timings and fees. We reply on WhatsApp or email.')}
      <div class="contact"><div class="ccards rv">
        ${ccard('wa', wa(), 'WhatsApp', '', waLink(num, msg), true)}
        ${ccard('', ui('phone'), 'Call', '', 'tel:+' + num)}
        ${ccard('', ui('mail'), 'Email', '', mailLink(mail, 'Enquiry', msg))}
        ${a.instagram ? ccard('', ui('instagram'), 'Instagram', '', a.instagram, true) : ''}
        ${a.venue ? ccard('', ui('pin'), 'Venue', esc(a.venue)) : ''}
      </div>${enquiry(a.soon ? 'Ask about the new branch' : 'Send an enquiry', topics, fullName(a), num, mail, BRAND)}</div>
    </div></section>`;

    const more = others.length ? `
    <section class="section" style="padding-top:0"><div class="wrap">
      ${sectionHead('More', a.soon ? 'Visit our first branch' : 'Explore other academies', '')}
      <div class="rail">${others.map(o => acadCard(o, S.academies.indexOf(o))).join('')}</div>
    </div></section>` : '';

    main.innerHTML = hero + playstrip('tabletennis') + about + programs + coaches + gal + contact + more;

    const grid = $('#gal');
    if (grid) grid.addEventListener('click', e => { const b = e.target.closest('.g-item'); if (b) lightbox(gallery, grid, +b.dataset.i); });
  }

  /* ------------------------------------------------------------- lightbox */
  function lightbox(list, grid, start) {
    const prevFocus = document.activeElement;
    let i = start;
    const lb = document.createElement('div');
    lb.className = 'lb'; lb.setAttribute('role', 'dialog'); lb.setAttribute('aria-modal', 'true'); lb.setAttribute('aria-label', 'Photo gallery');
    lb.style.setProperty('--h', list[0].hue);
    lb.innerHTML = `<div class="lb-top"><span class="cnt" aria-live="polite"></span><button class="close" aria-label="Close gallery">${ui('close')}</button></div>
      <div class="lb-stage"><button class="prev" aria-label="Previous photo">${ui('prev')}</button><div class="pic"></div><button class="next" aria-label="Next photo">${ui('next')}</button></div>
      <div class="lb-bot"><b></b><span></span></div>`;
    document.body.appendChild(lb);
    document.body.style.overflow = 'hidden';

    const show = n => {
      i = (n + list.length) % list.length;
      const it = list[i], img = grid.children[i].querySelector('img');
      $('.pic', lb).innerHTML = img && img.dataset.ok ? `<img src="${esc(img.currentSrc || img.src)}" alt="${esc(it.caption)}">` : art(it.hue, it.icon, i + 3);
      $('.cnt', lb).textContent = `${i + 1} / ${list.length}`;
      $('.lb-bot b', lb).textContent = it.caption;
      $('.lb-bot span', lb).textContent = it.sub;
    };
    const close = () => { lb.remove(); document.body.style.overflow = ''; removeEventListener('keydown', onKey); if (prevFocus && prevFocus.focus) prevFocus.focus(); };
    const onKey = e => {
      if (e.key === 'Escape') close();
      else if (e.key === 'ArrowRight') show(i + 1);
      else if (e.key === 'ArrowLeft') show(i - 1);
      else if (e.key === 'Tab') {
        const f = $$('button', lb); const first = f[0], last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    };
    addEventListener('keydown', onKey);
    $('.close', lb).addEventListener('click', close);
    $('.prev', lb).addEventListener('click', () => show(i - 1));
    $('.next', lb).addEventListener('click', () => show(i + 1));
    const stage = $('.lb-stage', lb); let x0 = null;
    stage.addEventListener('click', e => { if (e.target === stage) close(); });
    stage.addEventListener('pointerdown', e => { x0 = e.clientX; });
    stage.addEventListener('pointerup', e => { if (x0 !== null) { const dx = e.clientX - x0; if (Math.abs(dx) > 50) show(i + (dx < 0 ? 1 : -1)); x0 = null; } });
    show(i); $('.close', lb).focus();
  }

  /* ---------------------------------------------------------- behaviours */
  const io = 'IntersectionObserver' in window ? new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); if (e.target.matches('[data-count]')) countUp(e.target); io.unobserve(e.target); } }), { threshold: .12, rootMargin: '0px 0px -5% 0px' }) : null;

  function countUp(el) {
    const to = +el.dataset.count;
    if (REDUCE) { el.textContent = to.toLocaleString('en-IN'); return; }
    const t0 = performance.now(), dur = 1400;
    const step = t => { const p = Math.min(1, (t - t0) / dur); el.textContent = Math.round(to * (1 - Math.pow(1 - p, 3))).toLocaleString('en-IN'); if (p < 1) requestAnimationFrame(step); };
    requestAnimationFrame(step);
  }

  // reveal-on-scroll and hover tilt/glow
  function enhance(root = document) {
    $$('.rv:not(.in)', root).forEach(el => (io ? io.observe(el) : el.classList.add('in')));
    $$('[data-count]:not([data-seen])', root).forEach(el => { el.dataset.seen = 1; io ? io.observe(el) : (el.textContent = (+el.dataset.count).toLocaleString('en-IN')); });
    if (!FINE || REDUCE) return;
    $$('[data-tilt]:not([data-t])', root).forEach(el => {
      el.dataset.t = 1;
      el.addEventListener('pointermove', e => {
        const r = el.getBoundingClientRect(), x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
        el.style.setProperty('--mx', x * 100 + '%'); el.style.setProperty('--my', y * 100 + '%');
        el.style.transform = `perspective(900px) rotateX(${((.5 - y) * 7).toFixed(2)}deg) rotateY(${((x - .5) * 9).toFixed(2)}deg) translateY(-6px)`;
      });
      el.addEventListener('pointerleave', () => { el.style.transform = ''; });
    });
  }

  function initPlay() {
    const items = $$('.play').map(el => ({ el, ball: $('.ball', el), svg: $('.ball svg', el), shade: $('.shade', el), vis: false }));
    if (!items.length) return;
    const draw = it => {
      const r = it.el.getBoundingClientRect(), vh = innerHeight;
      let p = (vh - r.top) / (vh + r.height);                 // 0 as the strip enters, 1 as it leaves
      p = REDUCE ? .92 : Math.min(1, Math.max(0, (p - .12) / .72));
      const W = it.el.clientWidth, size = it.ball.offsetWidth, A = Math.min(it.el.clientHeight - size - 26, 96);
      const c = Math.abs(Math.cos(Math.PI * 4 * p)), h = A * c * Math.pow(1 - p, 1.25);   // 4 bounces, each lower than the last
      const x = p * (W - size), hit = c < .14 ? 1 - c / .14 : 0;                           // squash on the floor
      it.ball.style.transform = `translate3d(${x.toFixed(1)}px,${(-h).toFixed(1)}px,0) scale(${(1 + .14 * hit).toFixed(3)},${(1 - .2 * hit).toFixed(3)})`;
      it.svg.style.transform = `rotate(${(p * 600).toFixed(1)}deg)`;
      const k = A ? h / A : 0;
      it.shade.style.transform = `translate3d(${x.toFixed(1)}px,0,0) scale(${(1 - .45 * k).toFixed(3)},1)`;
      it.shade.style.opacity = (1 - .65 * k).toFixed(2);
    };
    let raf = 0;
    const tick = () => { raf = 0; items.forEach(it => it.vis && draw(it)); };
    const req = () => { if (!raf) raf = requestAnimationFrame(tick); };
    if ('IntersectionObserver' in window) {
      const o = new IntersectionObserver(es => { es.forEach(e => { items.find(i => i.el === e.target).vis = e.isIntersecting; }); req(); }, { rootMargin: '80px' });
      items.forEach(i => o.observe(i.el));
    } else items.forEach(i => { i.vis = true; });
    addEventListener('scroll', req, { passive: true }); addEventListener('resize', req); req();
  }

  function initArena() {
    const el = $('.arena'); if (!el) return;
    const shuttle = $('.shuttle', el), dots = $$('.dot', el);
    const draw = () => {
      const r = el.getBoundingClientRect(), vh = innerHeight, W = el.clientWidth, H = el.clientHeight, half = shuttle.offsetWidth / 2;
      const p = (vh - r.top) / (vh + r.height);                // 0 as the scene enters, 1 as it leaves
      const t = REDUCE ? 1 : Math.min(1, Math.max(0, (p - .1) / .55));
      const pad = Math.max(36, W * .06), y0 = H * .22, A = H - 52 - y0;   // starts high on the left, lands low on the right
      const at = u => ({ x: pad + u * (W - 2 * pad), y: y0 + A * (-.9 * u + 1.9 * u * u) });   // rises a little, then drops
      const q = at(t), vx = W - 2 * pad, vy = A * (-.9 + 3.8 * t);
      const ang = Math.atan2(vy, vx) * 180 / Math.PI - 90;     // cork first, like a real shuttle in flight
      shuttle.style.transform = `translate3d(${(q.x - half).toFixed(1)}px,${(q.y - half).toFixed(1)}px,0) rotate(${ang.toFixed(1)}deg)`;
      dots.forEach((d, i) => {
        const u = t - (i + 1) * .024;                          // earlier points on the same path
        if (u < 0) { d.style.opacity = 0; return; }
        const s = at(u), f = 1 - (i + 1) / (TRAIL + 1);        // older dots are smaller and fainter
        d.style.opacity = (f * .85).toFixed(2);
        d.style.transform = `translate3d(${(s.x - 4).toFixed(1)}px,${(s.y - 4).toFixed(1)}px,0) scale(${(.35 + f * .8).toFixed(2)})`;
      });
    };
    let raf = 0;
    const req = () => { if (!raf) raf = requestAnimationFrame(() => { raf = 0; if (el.classList.contains('on')) draw(); }); };
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(es => es.forEach(e => { el.classList.toggle('on', e.isIntersecting); if (e.isIntersecting) req(); }), { rootMargin: '60px' }).observe(el);
    } else el.classList.add('on');
    addEventListener('scroll', req, { passive: true }); addEventListener('resize', req); draw();
  }

  function enquirySubmit() {
    document.addEventListener('click', e => {
      const b = e.target.closest('[data-send]'); if (!b) return;
      const f = b.closest('form'); if (!f.reportValidity()) return;
      const d = Object.fromEntries(new FormData(f));
      const text = [`Hi ${f.dataset.label}! I'm ${d.name}.`, `About: ${d.topic}`, d.msg && d.msg.trim(), d.phone && `My phone: ${d.phone}`].filter(Boolean).join('\n');
      // the chosen topic can have its own WhatsApp / email (e.g. "Sports gear" goes to the main number)
      const opt = f.elements.topic && f.elements.topic.selectedOptions[0];
      const num = (opt && opt.dataset.wa) || f.dataset.wa, mail = (opt && opt.dataset.mail) || f.dataset.mail;
      if (b.dataset.send === 'wa') window.open(waLink(num, text), '_blank', 'noopener');
      else location.href = mailLink(mail, `Enquiry from ${d.name}: ${d.topic}`, text);
    });
  }

  function cursorGlow() {
    const g = $('.cursor-glow'); if (!g || !FINE || REDUCE) return;
    let x = 0, y = 0, raf = 0;
    addEventListener('pointermove', e => { x = e.clientX; y = e.clientY; g.style.opacity = 1; if (!raf) raf = requestAnimationFrame(() => { g.style.transform = `translate(${x}px,${y}px)`; raf = 0; }); }, { passive: true });
    document.addEventListener('pointerleave', () => { g.style.opacity = 0; });
  }

  /* ----------------------------------------------------------------- boot */
  renderShell();
  ({ home, store, academy }[PAGE] || home)();
  enquirySubmit();
  enhance();
  initPlay();
  initArena();
  cursorGlow();
})();
