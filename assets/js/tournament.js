/* ==========================================================================
   Live scores & tournaments (table tennis and badminton).
   - Admin creates a tournament: names in, draw out (knockout with byes, or round robin).
   - A secret admin token lets one or more scorers enter points; everyone else just watches.
   - Several matches can be live at once (one per table / court).
   Storage: this device only (default) or a free Supabase database (assets/js/live-config.js).
   ========================================================================== */
(() => {
  'use strict';
  const main = document.getElementById('main');
  if (!main) return;
  const SM = window.SM || {};
  const CFG = window.LIVE || {};
  const LIVE = !!(CFG.url && CFG.anonKey);
  const qs = new URLSearchParams(location.search);
  const TID = (qs.get('t') || '').toLowerCase().replace(/[^a-z0-9]/g, '');

  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];

  /* -------------------------------------------------------------- sport rules */
  const SPORTS = {
    tt: { name: 'Table tennis', unit: 'Table', icon: 'tabletennis', points: 11, cap: 0, bestOf: 3, semiBestOf: 5, finalBestOf: 5 },
    badminton: { name: 'Badminton', unit: 'Court', icon: 'badminton', points: 21, cap: 30, bestOf: 3, semiBestOf: 3, finalBestOf: 3 }
  };
  const MAX_PLAYERS = 2000, MAX_TABLES = 64, MAX_MATCHES = 5000;     // most players in a tournament, tables at once, and matches in one stage
  const semiOf = r => (r.semiBestOf == null ? r.finalBestOf : r.semiBestOf);     // tournaments made earlier had one value for both
  const bestOfText = (r, rounds, knockout) => !knockout ? `Every match is best of ${r.bestOf} games.`
    : rounds >= 3 ? `Best of ${r.bestOf} games; semi-finals best of ${semiOf(r)}; final best of ${r.finalBestOf}.`
    : rounds === 2 ? `Semi-finals best of ${semiOf(r)}; final best of ${r.finalBestOf}.` : `Final best of ${r.finalBestOf}.`;
  const bestOfShort = S => (S.format === 'roundrobin' ? `best of ${S.rules.bestOf}`
    : S.rounds >= 3 ? `best of ${S.rules.bestOf}, semi-finals best of ${semiOf(S.rules)}, final best of ${S.rules.finalBestOf}`
    : S.rounds === 2 ? `semi-finals best of ${semiOf(S.rules)}, final best of ${S.rules.finalBestOf}` : `final best of ${S.rules.finalBestOf}`);
  const rulesText = T => {                         // one sentence for the points, then the best-of for every stage
    const r = T.rules, base = `First to ${r.points} points, win by ${r.winBy}${r.cap ? ` (the ${r.cap}th point wins)` : ''}. `;
    if (T.stages.length === 1) { const S = T.stages[0]; return base + bestOfText(S.rules, S.rounds, S.format !== 'roundrobin'); }
    return base + T.stages.map(S => `${S.title}: ${bestOfShort(S)}.`).join(' ');
  };

  /* ------------------------------------------------------------------ helpers */
  const A32 = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789', L31 = 'abcdefghjkmnpqrstuvwxyz23456789';
  const rnd = n => Array.from(crypto.getRandomValues(new Uint32Array(n)));
  const makeToken = () => { const c = rnd(16).map(x => A32[x % 32]); return [0, 4, 8, 12].map(i => c.slice(i, i + 4).join('')).join('-'); };
  const makeId = () => rnd(8).map(x => L31[x % 31]).join('');
  const normTok = t => String(t || '').toUpperCase().replace(/[^A-Z0-9]/g, '').replace(/(.{4})(?=.)/g, '$1-');
  const shuffle = a => { const r = a.slice(); for (let i = r.length - 1; i > 0; i--) { const j = rnd(1)[0] % (i + 1); [r[i], r[j]] = [r[j], r[i]]; } return r; };
  const nextPow2 = n => { let m = 2; while (m < n) m *= 2; return m; };
  const cyrb = s => { let a = 0xdeadbeef, b = 0x41c6ce57; for (let i = 0, c; i < s.length; i++) { c = s.charCodeAt(i); a = Math.imul(a ^ c, 2654435761); b = Math.imul(b ^ c, 1597334677); } a = Math.imul(a ^ (a >>> 16), 2246822507) ^ Math.imul(b ^ (b >>> 13), 3266489909); b = Math.imul(b ^ (b >>> 16), 2246822507) ^ Math.imul(a ^ (a >>> 13), 3266489909); return (4294967296 * (2097151 & b) + (a >>> 0)).toString(36); };
  const jget = (k, d) => { try { const v = JSON.parse(localStorage.getItem(k)); return v == null ? d : v; } catch { return d; } };
  const jset = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch { return false; } };      // false = storage blocked or full
  const FULL = 'This browser has no room left. Download a backup, then end old tournaments to free space.';
  const tokens = { get: id => (jget('sm_tok', {})[id] || ''), set: (id, t) => jset('sm_tok', { ...jget('sm_tok', {}), [id]: t }), del: id => { const o = jget('sm_tok', {}); delete o[id]; jset('sm_tok', o); } };
  const mine = { all: () => jget('sm_mine', []), add: e => jset('sm_mine', [e, ...mine.all().filter(x => x.id !== e.id)]), del: id => jset('sm_mine', mine.all().filter(x => x.id !== id)) };
  const url = p => p;
  const toast = msg => { let t = $('.tn-toast'); if (!t) { t = document.createElement('div'); t.className = 'tn-toast'; document.body.appendChild(t); } t.textContent = msg; t.classList.add('on'); clearTimeout(toast.h); toast.h = setTimeout(() => t.classList.remove('on'), 3200); };
  const copy = async text => { try { await navigator.clipboard.writeText(text); toast('Copied'); } catch { prompt('Copy this:', text); } };

  /* ------------------------------------------------------------------ storage */
  function applyPatch(s, p) {
    Object.assign(s, p.set || {});
    for (const [id, m] of Object.entries(p.matches || {})) s.matches[id] = m;
    s.updated = Date.now();
  }
  const Local = {
    async load(id) { return jget('sm_t_' + id, null); },
    async create(id, token, state) { state.th = cyrb(token); if (!jset('sm_t_' + id, state)) throw new Error(FULL); },
    async patch(id, token, patch) {
      const s = jget('sm_t_' + id, null);
      if (!s) throw new Error('Tournament not found');
      if (s.th !== cyrb(token)) throw new Error('Wrong token');
      applyPatch(s, patch); if (!jset('sm_t_' + id, s)) throw new Error(FULL); return s.updated;
    },
    async verify(id, token) { const s = jget('sm_t_' + id, null); return !!s && s.th === cyrb(token); },
    async remove(id, token) { const s = jget('sm_t_' + id, null); if (!s) return; if (s.th !== cyrb(token)) throw new Error('Wrong token'); localStorage.removeItem('sm_t_' + id); },
    async reset(id, oldT, newT) { const s = jget('sm_t_' + id, null); if (!s || s.th !== cyrb(oldT)) throw new Error('Wrong token'); s.th = cyrb(newT); if (!jset('sm_t_' + id, s)) throw new Error(FULL); },
    async recent() {
      const out = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith('sm_t_')) { const s = jget(k, null); if (s) out.push({ id: k.slice(5), name: s.name, sport: s.sport, status: s.status, live: s.liveCount || 0, updated_at: s.updated }); }
      }
      return out.sort((a, b) => b.updated_at - a.updated_at);
    },
    watch(id, cb) { const f = e => { if (e.key === 'sm_t_' + id) cb(); }; addEventListener('storage', f); return () => removeEventListener('storage', f); }
  };
  const Remote = {
    H: { apikey: CFG.anonKey, Authorization: 'Bearer ' + CFG.anonKey, 'Content-Type': 'application/json' },
    async rpc(fn, body) {
      const r = await fetch(`${CFG.url}/rest/v1/rpc/${fn}`, { method: 'POST', headers: this.H, body: JSON.stringify(body) });
      const t = await r.text(); let j = null; try { j = t ? JSON.parse(t) : null; } catch { /* not json */ }
      if (!r.ok) throw new Error((j && (j.message || j.hint)) || `Request failed (${r.status})`);
      return j;
    },
    async load(id) {
      const r = await fetch(`${CFG.url}/rest/v1/tournaments?id=eq.${encodeURIComponent(id)}&select=data,updated_at`, { headers: this.H, cache: 'no-store' });
      if (!r.ok) throw new Error(`Could not load (${r.status})`);
      const a = await r.json(); if (!a.length) return null;
      const s = a[0].data; s.updated = Date.parse(a[0].updated_at); return s;
    },
    async create(id, token, state) { await this.rpc('create_tournament', { tid: id, token, payload: state }); },
    async patch(id, token, patch) { return Date.parse(await this.rpc('patch_tournament', { tid: id, token, patch })); },
    verify(id, token) { return this.rpc('verify_token', { tid: id, token }); },
    async remove(id, token) { await this.rpc('delete_tournament', { tid: id, token }); },
    async reset(id, o, n) { if (!(await this.rpc('reset_token', { tid: id, old_token: o, new_token: n }))) throw new Error('Wrong token'); },
    async recent() {
      const r = await fetch(`${CFG.url}/rest/v1/tournaments?select=id,name:data->>name,sport:data->>sport,status:data->>status,live:data->>liveCount,updated_at&data->>listed=eq.true&order=updated_at.desc&limit=12`, { headers: this.H, cache: 'no-store' });
      return r.ok ? r.json() : [];
    },
    watch(id, cb) { const t = setInterval(cb, 3000); return () => clearInterval(t); }
  };
  const store = LIVE ? Remote : Local;

  /* ------------------------------------------------------------ draw + scoring */
  function seedPositions(M) { let s = [1]; while (s.length < M) { const n = s.length * 2 + 1; s = s.flatMap(x => [x, n - x]); } return s; }
  const roundName = (S, r) => {                  // S = a stage
    if (S.format === 'roundrobin') return `Round ${r}`;
    const left = S.rounds - r;
    return left === 0 ? 'Final' : left === 1 ? 'Semi-final' : left === 2 ? 'Quarter-final' : `Round ${r}`;
  };
  const bestOfFor = (o, r, R) => (r === R ? o.finalBestOf : (R > 1 && r === R - 1 ? semiOf(o) : o.bestOf));   // final, semi-finals, everything earlier
  const newMatch = (id, round, idx, a, b, bestOf) => ({ id, round, idx, a, b, bye: false, status: 'pending', table: null, log: [], wo: null, first: 0, bestOf, games: [], cur: [0, 0], wins: [0, 0], winner: null, next: null, slot: null, no: 0 });

  function plan(names, o) {                       // numbers shown in the create form
    const N = names.length, M = nextPow2(Math.max(N, 2)), B = M - N;
    return { N, M, B, r1: M / 2 - B, rounds: Math.log2(M) };
  }
  // ---- groups (league only) ----
  const gname = i => (i < 26 ? String.fromCharCode(65 + i) : String.fromCharCode(64 + Math.floor(i / 26)) + String.fromCharCode(65 + (i % 26)));    // A, B ... Z, AA, AB ...
  const groupSizes = (N, G) => Array.from({ length: G }, (_, g) => Math.floor(N / G) + (g < N % G ? 1 : 0));                                     // as even as possible
  function assignGroups(ids, G, mode) {          // mode 'seed': top names land in different groups (snake order A B C, C B A, ...); 'random': shuffled
    const sizes = groupSizes(ids.length, G), groups = Array.from({ length: G }, () => []);
    if (mode === 'random') { const mix = shuffle(ids); let p = 0; groups.forEach((gr, g) => { gr.push(...mix.slice(p, p + sizes[g])); p += sizes[g]; }); return groups; }
    let p = 0;
    for (let row = 0; p < ids.length; row++) {
      const order = row % 2 ? Array.from({ length: G }, (_, g) => G - 1 - g) : Array.from({ length: G }, (_, g) => g);
      for (const g of order) if (groups[g].length < sizes[g] && p < ids.length) groups[g].push(ids[p++]);
    }
    return groups;
  }
  // Players who already met in an earlier stage are kept apart where possible. `from` maps a player id to the group they came from.
  function separatePairs(pairs, from) {           // knockout round 1
    const same = (a, b) => a && b && from[a] != null && from[a] === from[b];
    for (let i = 0; i < pairs.length; i++) {
      if (!same(pairs[i][0], pairs[i][1])) continue;
      outer: for (let j = 0; j < pairs.length; j++) {
        if (j === i) continue;
        for (let y = 0; y < 2; y++) {
          const a = pairs[i][0], b = pairs[i][1], c = pairs[j][y], d = pairs[j][1 - y];
          if (!a || !b || !c || !d) continue;        // never touch a bye
          if (!same(a, c) && !same(d, b)) { pairs[i][1] = c; pairs[j][y] = b; break outer; }
        }
      }
    }
    return pairs;
  }
  function separateGroups(groups, from) {         // league groups
    const clash = (gr, id) => gr.some(x => x !== id && from[x] != null && from[x] === from[id]);
    for (let g = 0; g < groups.length; g++) {
      for (const y of groups[g].slice()) {
        if (!groups[g].includes(y) || !clash(groups[g], y)) continue;
        outer: for (let h = 0; h < groups.length; h++) {
          if (h === g) continue;
          for (const z of groups[h]) {
            const gG = groups[g].filter(x => x !== y).concat(z), gH = groups[h].filter(x => x !== z).concat(y);
            if (!clash(gG, z) && !clash(gH, y)) { groups[g] = gG; groups[h] = gH; break outer; }
          }
        }
      }
    }
    return groups;
  }
  const groupsFor = (ids, G, mode, from) => { const g = assignGroups(ids, G, mode); return from ? separateGroups(g, from) : g; };

  // Adds one stage to the tournament: a league (one group or several) or a knockout. Returns the stage.
  // o: { format, ids (in seed order), draw, byeMode, byeIds, groups, rules, title, src, from }
  function addStage(T, o) {
    const n = T.stages.length + 1, pre = n === 1 ? '' : 's' + n, ids = o.ids.slice(), rules = o.rules;
    const S = { n, pre, format: o.format, ids, rules: { bestOf: rules.bestOf, semiBestOf: rules.semiBestOf, finalBestOf: rules.finalBestOf }, rounds: 1, groups: [], title: '', src: o.src || null };
    const start = T.order.length;                                                          // the new matches go after the old ones
    const add = m => { m.st = n - 1; T.matches[m.id] = m; T.order.push(m.id); return m; };
    if (o.format === 'roundrobin') {
      const groups = o.groups && o.groups.length ? o.groups : [ids];                       // every group plays its own league
      S.groups = groups.map((g, i) => ({ name: gname(i), ids: g.slice() }));
      groups.forEach((gids, g) => {
        let list = gids.slice(); if (o.draw === 'random') list = shuffle(list);
        if (list.length % 2) list.push(null);                                              // odd group: one player rests each round
        const len = list.length; S.rounds = Math.max(S.rounds, len - 1);
        for (let r = 0; r < len - 1; r++) {                                                // circle method
          let k = 0;
          for (let i = 0; i < len / 2; i++) { const a = list[i], b = list[len - 1 - i]; if (a && b) { const m = add(newMatch(`${pre}g${g + 1}r${r + 1}m${++k}`, r + 1, k - 1, a, b, rules.bestOf)); m.group = g; } }
          list.splice(1, 0, list.pop());
        }
      });
    } else {
      const N = ids.length, M = nextPow2(N), B = M - N, R = Math.log2(M); S.rounds = R;
      let byeIds;
      if (o.byeMode === 'manual') byeIds = o.byeIds.slice(0, B);
      else if (o.byeMode === 'random') byeIds = shuffle(ids).slice(0, B);
      else byeIds = ids.slice(0, B);
      let rest = ids.filter(id => !byeIds.includes(id)); if (o.draw === 'random') rest = shuffle(rest);
      const seeds = [...byeIds, ...rest], pos = seedPositions(M);                          // seed 1 = first, ...
      for (let r = 1; r <= R; r++) {
        for (let i = 0; i < M / 2 ** r; i++) {
          const m = add(newMatch(`${pre}r${r}m${i + 1}`, r, i, null, null, bestOfFor(rules, r, R)));
          if (r < R) { m.next = `${pre}r${r + 1}m${Math.floor(i / 2) + 1}`; m.slot = i % 2 === 0 ? 'a' : 'b'; }
        }
      }
      const pairs = Array.from({ length: M / 2 }, (_, i) => [seeds[pos[2 * i] - 1] || null, seeds[pos[2 * i + 1] - 1] || null]);
      if (o.from) separatePairs(pairs, o.from);
      pairs.forEach(([a, b], i) => {
        const m = T.matches[`${pre}r1m${i + 1}`]; m.a = a; m.b = b;
        if (!(a && b)) { m.bye = true; m.status = 'done'; m.winner = a || b; T.matches[m.next][m.slot] = m.winner; }
      });
    }
    const base = o.format === 'roundrobin' ? (S.groups.length > 1 ? 'Group stage' : 'League') : 'Knockout';
    S.title = o.title || (n === 1 ? base : `Stage ${n} ${base.toLowerCase()}`);
    T.stages.push(S);
    const fresh = T.order.splice(start).sort((x, y) => T.matches[x].round - T.matches[y].round || (T.matches[x].group || 0) - (T.matches[y].group || 0) || T.matches[x].idx - T.matches[y].idx);
    T.order.push(...fresh);
    let no = T.order.slice(0, start).reduce((a, id) => Math.max(a, T.matches[id].no), 0);
    fresh.forEach(id => { if (!T.matches[id].bye) T.matches[id].no = ++no; });             // match numbers carry on from the stage before
    return S;
  }
  function build(o) {
    const players = o.names.map((n, i) => ({ id: 'p' + (i + 1), name: n }));
    const T = { v: 2, name: o.name, sport: o.sport, rules: o.rules, tables: o.tables, format: o.format, listed: o.listed, status: 'running', created: Date.now(), players, matches: {}, order: [], rounds: 1, stages: [], liveCount: 0, updated: Date.now() };
    const S = addStage(T, { format: o.format, ids: players.map(p => p.id), draw: o.draw, byeMode: o.byeMode, byeIds: o.byeIds, groups: o.groups, rules: o.rules });
    T.rounds = S.rounds; if (o.format === 'roundrobin') T.groups = S.groups;              // stage 1 is also kept at the top, as older versions had it
    return T;
  }
  function gameOver([a, b], r) {
    const hi = Math.max(a, b), lo = Math.min(a, b);
    if (r.cap && hi >= r.cap) return true;
    return hi >= r.points && hi - lo >= r.winBy;
  }
  function recalc(m, rules) {
    const need = Math.ceil(m.bestOf / 2); let cur = [0, 0]; const wins = [0, 0], games = []; let w = -1;
    if (m.wo === 0 || m.wo === 1) { m.games = []; m.cur = [0, 0]; m.wins = m.wo === 0 ? [need, 0] : [0, need]; m.winner = m.wo === 0 ? m.a : m.b; m.status = 'done'; return; }   // walkover: no points were played
    for (const s of m.log) {
      if (w >= 0) break;
      cur[s]++;
      if (gameOver(cur, rules)) { const g = cur[0] > cur[1] ? 0 : 1; games.push(cur.slice()); wins[g]++; cur = [0, 0]; if (wins[g] >= need) w = g; }
    }
    m.games = games; m.cur = cur; m.wins = wins; m.winner = w < 0 ? null : (w === 0 ? m.a : m.b);
    if (w >= 0) m.status = 'done'; else if (m.status === 'done') m.status = 'live';
  }
  const serverOf = m => { const g = m.games.length, tot = m.cur[0] + m.cur[1], first = (m.first + g) % 2, flips = tot >= 20 ? 10 + (tot - 20) : Math.floor(tot / 2); return (first + flips) % 2; };

  /* ------------------------------------------------------------------- state */
  let T = null, isAdmin = false, showTok = false, pending = 0, unwatch = null, nextMode = false;
  let moreReady = false, moreDone = false;         // 'Show all' for the long Up next and Results lists
  const LIST = 40;                                  // rows shown before a list is cut
  const stOpen = {};                                // which stage panels the viewer has opened or closed (kept across redraws)
  let pmap = null, pmapFor = null;                  // player lookup by id (a Map, so big tournaments stay quick)
  const P = id => { if (pmapFor !== T.players) { pmap = new Map(T.players.map(p => [p.id, p])); pmapFor = T.players; } return pmap.get(id) || null; };
  const pname = id => (id ? (P(id) ? P(id).name : '?') : 'TBD');
  const M_ = id => T.matches[id];
  const allMatches = () => T.order.map(M_);

  /* ---- stages: a tournament is one or more stages (league, league with groups, knockout); the players who go through carry on to the next one ---- */
  function norm(t) {                               // tournaments made before stages existed get their single stage worked out here
    if (!t.stages) {
      const ko = t.format !== 'roundrobin', all = t.players.map(p => p.id), many = !ko && t.groups && t.groups.length > 1;
      t.stages = [{ n: 1, pre: '', format: t.format, ids: all, rounds: t.rounds, groups: ko ? [] : (t.groups && t.groups.length ? t.groups : [{ name: 'A', ids: all }]), rules: { bestOf: t.rules.bestOf, semiBestOf: semiOf(t.rules), finalBestOf: t.rules.finalBestOf }, title: ko ? 'Knockout' : (many ? 'Group stage' : 'League'), src: null }];
    }
    return t;
  }
  const loadT = async id => { const s = await store.load(id); return s ? norm(s) : s; };
  const stOf = m => m.st || 0;
  const stageOf = m => T.stages[stOf(m)];
  const lastStage = () => T.stages[T.stages.length - 1];
  const stMatches = S => allMatches().filter(m => stOf(m) === S.n - 1);
  const sGroups = S => (S.groups && S.groups.length ? S.groups : [{ name: 'A', ids: S.ids }]);
  const stageDone = S => stMatches(S).filter(m => !m.bye).every(m => m.status === 'done');
  const locked = m => stOf(m) < T.stages.length - 1;                           // a stage is closed once the next one has been set up
  const canNext = () => !T.ended && lastStage().format === 'roundrobin' && stageDone(lastStage());
  const canRedo = () => !T.ended && T.stages.length > 1 && stMatches(lastStage()).every(m => m.bye || (m.status === 'pending' && !m.log.length && m.wo == null));
  const kindOf = S => (S.format === 'roundrobin' ? (sGroups(S).length > 1 ? 'groups' : 'league') : 'knockout');
  const formatLabel = () => (T.stages.length === 1 ? (T.stages[0].format === 'roundrobin' ? 'league' : 'knockout') : T.stages.map(kindOf).join(' + '));
  const srcLabel = s => (s.g ? `${s.g}${s.r}` : `#${s.r}`);

  async function commit(changed, set = {}) {
    T.liveCount = T.ended ? 0 : allMatches().filter(m => m.status === 'live').length;
    const done = allMatches().filter(m => !m.bye).every(m => m.status === 'done');
    T.status = T.ended ? 'ended' : (done ? 'done' : 'running');
    const patch = { set: { status: T.status, liveCount: T.liveCount, ended: !!T.ended, endedAt: T.endedAt || null, ...set }, matches: {} };
    for (const id of changed) patch.matches[id] = T.matches[id];
    T.updated = Date.now(); render();
    pending++; let failed = false;
    try { T.updated = await store.patch(T.id, tokens.get(T.id), patch); }
    catch (e) {
      failed = true;
      if (/wrong token/i.test(e.message)) { tokens.del(T.id); isAdmin = false; toast('Your admin token is no longer valid. Sign in again.'); }
      else toast('Could not save: ' + e.message);
      const fresh = await loadT(T.id).catch(() => null); if (fresh) T = fresh;
    } finally { pending--; if (failed) render(); }
  }
  function redoStage() {                            // remove the newest stage (nothing played in it yet) and set it up again
    if (!canRedo()) return toast('Matches in this stage have already started.');
    const S = lastStage();
    if (!confirm(`Remove "${S.title}" and set it up again? Nothing has been played in it yet.`)) return;
    stMatches(S).forEach(m => { delete T.matches[m.id]; });
    T.order = T.order.filter(id => T.matches[id]);
    T.stages.pop();
    nextMode = true; history.replaceState(null, '', `tournament.html?t=${T.id}&next=1`);
    commit([], { stages: T.stages, order: T.order, matches: T.matches });
  }
  function act(a, d) {
    const m = d.m ? M_(d.m) : null;
    if (a === 'end') return endAndRemove();                                   // ends the tournament and removes it for good
    if (a === 'reopen') { T.ended = false; T.endedAt = null; return commit([]); }   // only for tournaments ended by an older version
    if (T.ended) return toast('This tournament has ended. Reopen it to change scores.');
    if (a === 'redo') return redoStage();
    if (m && (a === 'result' || a === 'undo') && locked(m)) return toast(`${stageOf(m).title} is closed because the next stage was set up. Use "Redo this stage" first (possible until a match in it starts).`);
    if (a === 'start') {
      if (live().some(x => x.table === +d.t)) return toast(`${SPORTS[T.sport].unit} ${d.t} is busy`);
      const clash = live().find(x => x.a === m.a || x.a === m.b || x.b === m.a || x.b === m.b);      // nobody can play two matches at once
      if (clash) { const who = [m.a, m.b].find(p => p === clash.a || p === clash.b); return toast(`${pname(who)} is already playing on ${SPORTS[T.sport].unit} ${clash.table}`); }
      m.status = 'live'; m.table = +d.t; return commit([m.id]);
    }
    if (a === 'result') return openResult(m);
    if (a === 'unstart' && m.log.length === 0) { m.status = 'pending'; m.table = null; return commit([m.id]); }
    if (a === 'first' && m.log.length === 0) { m.first = +d.s; return commit([m.id]); }
    if (a === 'pt') {
      if (m.status !== 'live') return;
      m.log.push(+d.s); recalc(m, T.rules);
      const ch = [m.id];
      if (m.status === 'done' && m.next) { M_(m.next)[m.slot] = m.winner; ch.push(m.next); }
      return commit(ch);
    }
    if (a === 'undo') {
      if (!m.log.length) return;
      const was = m.status === 'done';
      if (was && m.next && M_(m.next).log.length) return toast('The next match has already started');
      if (was && live().some(x => x.id !== m.id && x.table === m.table)) {           // its table was reused: find another free one
        let t = 1; while (t <= T.tables && live().some(x => x.table === t)) t++;
        if (t > T.tables) return toast('Every table is busy. Finish a match first, then reopen this one.');
        m.table = t;
      }
      m.log.pop(); recalc(m, T.rules);
      const ch = [m.id];
      if (was && m.next) { const n = M_(m.next); n[m.slot] = null; if (n.status === 'live') { n.status = 'pending'; n.table = null; } ch.push(m.next); }
      if (m.status === 'done') m.status = 'live';
      return commit(ch);
    }
  }
  const live = () => allMatches().filter(m => m.status === 'live').sort((a, b) => (a.table || 0) - (b.table || 0));
  const ready = () => allMatches().filter(m => m.status === 'pending' && m.a && m.b && !m.bye);

  /* -------------------------------------------------------------------- views */
  const crumbs = last => `<nav class="crumbs" aria-label="Breadcrumb"><a href="index.html">Home</a><span>/</span>${last === 'Live Scores' ? '<span>Live Scores</span>' : `<a href="tournament.html">Live Scores</a><span>/</span><span>${esc(last)}</span>`}</nav>`;
  const hero = (title, lead, extra = '', after = '') => `<section class="ahero" style="--h:40"><div class="glow"></div><div class="wrap">${extra}<h1>${title}</h1>${lead ? `<p class="lead" style="margin-top:12px">${lead}</p>` : ''}${after}</div></section>`;
  const modeNote = () => LIVE
    ? `<p class="tn-note"><b>Live mode is on.</b> Anyone with a watch link sees scores update within a few seconds.</p>`
    : `<p class="tn-note"><b>This device only.</b> Tournaments are saved in this browser, so nobody else can watch yet.</p>`;
  const sportName = s => (SPORTS[s] || SPORTS.tt).name;
  const tcard = e => `<a class="tn-list-item" href="tournament.html?t=${esc(e.id)}"><span><b>${esc(e.name)}</b><small>${esc(sportName(e.sport))} - ${e.status === 'done' ? 'finished' : e.status === 'ended' ? 'ended' : (+e.live ? `${+e.live} match${+e.live > 1 ? 'es' : ''} live` : 'in progress')}</small></span><span class="tn-go">Open</span></a>`;

  async function viewHome() {
    main.innerHTML = hero('Live <em>scores</em>', 'Run a table tennis or badminton tournament. Add the players, get the draw, and let everyone follow the matches live.',
      `${crumbs('Live Scores')}<div class="ic">${SM.sport ? SM.sport('tabletennis', 'ico sp') : ''}</div>`)
      + `<section class="section"><div class="wrap tn">
        <div class="cta-row" style="margin:0 0 18px"><a class="btn btn-primary" href="tournament.html?new=1">Create a tournament</a></div>
        ${modeNote()}
        <div id="tn-mine"></div><div id="tn-recent"></div>
        ${backupCard()}</div></section>`;
    const mineList = mine.all();
    if (mineList.length) $('#tn-mine').innerHTML = `<h3 class="tn-h">Your tournaments (admin on this device)</h3><div class="tn-list">${mineList.map(tcard).join('')}</div>`;
    const rec = await store.recent().catch(() => []);
    const others = rec.filter(r => !mineList.some(m => m.id === r.id));
    $('#tn-recent').innerHTML = `<h3 class="tn-h">${LIVE ? 'Recent tournaments' : 'On this device'}</h3>` + (others.length ? `<div class="tn-list">${others.map(tcard).join('')}</div>` : `<p class="tn-muted">${LIVE ? 'No public tournaments yet.' : 'Nothing else saved here yet.'}</p>`);
  }

  function parseNames(text) {
    let list = text.split(/\n/).map(s => s.trim()).filter(Boolean);
    if (list.length === 1 && /[,;]/.test(list[0])) list = list[0].split(/[,;]/).map(s => s.trim()).filter(Boolean);
    return list;
  }
  /* ---- the part of a form that decides what is played (format, draw, groups, byes): shared by "Create a tournament" and "Next stage" ---- */
  const setupHead = (tables, orderText) => `<div class="tn-grid3">
      <label>Tables / courts at the same time<input name="tables" type="number" min="1" max="${MAX_TABLES}" value="${tables}"></label>
      <label>Format<select name="format"><option value="knockout">Knockout (with byes)</option><option value="roundrobin">League (everyone plays everyone)</option></select></label>
      <label>Draw<select name="draw"><option value="seeded">${orderText}</option><option value="random">Random</option></select></label>
    </div>
    <div class="tn-grid3" id="tn-groups">
      <label>Number of groups<input name="groups" type="number" min="1" max="${MAX_PLAYERS / 2}" value="1"></label>
      <label>Players per group (about)<input name="gsize" type="number" min="2" max="${MAX_PLAYERS}"></label>
      <label>Who goes in which group<select name="gmode"><option value="seed">Spread by order (top names in different groups)</option><option value="random">Random</option><option value="manual">I will choose</option></select></label>
    </div>`;
  const setupTail = '<div class="tn-plan" id="tn-plan"></div><div id="tn-gpick" class="tn-byes"></div><div id="tn-byes" class="tn-byes"></div>';
  const groupCountOf = (f, N) => Math.min(Math.max(1, Math.floor(N / 2)), Math.max(1, Math.round(+f.elements.groups.value) || 1));   // every group needs 2+ players

  // getPlayers() -> [{id, name}] in seed order. o.from: player id -> the group they came from (those players are kept apart). o.after(ko, rounds): called on every redraw.
  function bindSetup(f, getPlayers, o = {}) {
    const el = n => f.elements[n];
    const refresh = () => {
      const pls = getPlayers(), names = pls.map(p => p.name), ids = pls.map(p => p.id), N = names.length, pl = plan(names);
      const nm = id => esc((pls.find(p => p.id === id) || {}).name);
      const ko = el('format').value === 'knockout';
      if (o.after) o.after(ko, N >= 2 ? pl.rounds : 3);
      $('#tn-groups').style.display = ko ? 'none' : '';
      const prev = {}; $$('select[name=gp]', f).forEach(s => { prev[s.dataset.id] = +s.value; });      // remember manual group choices before the list is redrawn
      $('#tn-gpick').innerHTML = '';
      if (N < 2) { $('#tn-plan').innerHTML = '<span class="tn-muted">Add at least 2 players.</span>'; $('#tn-byes').innerHTML = ''; return; }
      if (!ko) {
        const G = groupCountOf(f, N);
        if (document.activeElement !== el('groups')) el('groups').value = G;
        if (document.activeElement !== el('gsize')) el('gsize').value = Math.ceil(N / G);
        const sizes = groupSizes(N, G), mt = sizes.reduce((a, s) => a + s * (s - 1) / 2, 0), mode = el('gmode').value;
        const warn = mt > MAX_MATCHES ? ` <b style="color:#ffb4a2">That is too many matches (the limit is ${MAX_MATCHES.toLocaleString()}). Use more groups.</b>` : '';
        $('#tn-plan').innerHTML = G === 1
          ? `<b>${N} players</b> play each other once: <b>${mt.toLocaleString()} matches</b> in ${N % 2 ? N : N - 1} rounds.${warn || (mt > 60 ? ' That is a lot of matches. Try more groups, or a knockout.' : '')}`
          : `<b>${N} players in ${G} groups</b> (${G > 12 ? (sizes[0] === sizes[G - 1] ? `${sizes[0]} each` : `${sizes[0]} or ${sizes[G - 1]} each`) : sizes.map((s, g) => `${gname(g)}: ${s}`).join(', ')}). Each group plays itself once: <b>${mt.toLocaleString()} matches</b> in total.${warn}`;
        $('#tn-byes').innerHTML = '';
        if (G > 1) {
          if (mode === 'seed') $('#tn-gpick').innerHTML = groupsFor(ids, G, 'seed', o.from).map((gr, g) => `<p class="tn-gline"><b>Group ${gname(g)}</b> ${gr.map(nm).join(', ')}</p>`).join('');
          else if (mode === 'random') $('#tn-gpick').innerHTML = '<p class="tn-muted">The players are shuffled into groups when you press the button below.</p>';
          else {
            const def = {}; groupsFor(ids, G, 'seed', o.from).forEach((gr, g) => gr.forEach(id => { def[id] = g; }));
            const opts = sel => Array.from({ length: G }, (_, g) => `<option value="${g}" ${g === sel ? 'selected' : ''}>${gname(g)}</option>`).join('');
            $('#tn-gpick').innerHTML = `<div class="tn-byehead"><b>Choose a group for each player</b></div><div class="tn-pick">${ids.map(id => `<label class="tn-pickrow"><span>${nm(id)}</span><select name="gp" data-id="${id}">${opts(prev[id] < G ? prev[id] : def[id])}</select></label>`).join('')}</div><p class="tn-muted" id="tn-gcount"></p>`;
            const cnt = Array.from({ length: G }, () => 0); $$('select[name=gp]', f).forEach(s => { cnt[+s.value]++; });
            const gc = $('#tn-gcount'); gc.textContent = `Players per group: ${cnt.map((c, g) => `${gname(g)} ${c}`).join(', ')}. Each group needs at least 2.`; gc.style.color = cnt.every(c => c >= 2) ? '' : '#ffb4a2';
          }
        }
        return;
      }
      $('#tn-plan').innerHTML = `<b>${pl.N} players</b> make a <b>${pl.M}-place bracket</b>, so <b>${pl.B} bye${pl.B === 1 ? '' : 's'}</b> (${pl.B === 0 ? 'everyone plays round 1' : `${pl.B} player${pl.B === 1 ? ' goes' : 's go'} straight to round 2; ${pl.r1} match${pl.r1 === 1 ? '' : 'es'} in round 1`}). ${pl.rounds} rounds in total.`;
      if (pl.B === 0) { $('#tn-byes').innerHTML = ''; return; }
      const cur = (f.querySelector('input[name=byeMode]:checked') || {}).value || 'top';
      const checked = $$('input[name=bye]:checked', f).map(i => i.value);
      $('#tn-byes').innerHTML = `<div class="tn-byehead"><b>Who gets the ${pl.B} bye${pl.B === 1 ? '' : 's'}?</b></div>
        <label class="tn-check"><input type="radio" name="byeMode" value="top" ${cur === 'top' ? 'checked' : ''}> The top ${pl.B} seed${pl.B === 1 ? '' : 's'} (first ${pl.B} name${pl.B === 1 ? '' : 's'} in the list)</label>
        <label class="tn-check"><input type="radio" name="byeMode" value="random" ${cur === 'random' ? 'checked' : ''}> ${pl.B} player${pl.B === 1 ? '' : 's'} picked at random</label>
        <label class="tn-check"><input type="radio" name="byeMode" value="manual" ${cur === 'manual' ? 'checked' : ''}> I will choose</label>
        ${cur === 'manual' ? `<div class="tn-pick">${pls.map(p => `<label class="tn-check"><input type="checkbox" name="bye" value="${p.id}" ${checked.includes(p.id) ? 'checked' : ''}> ${esc(p.name)}</label>`).join('')}</div><p class="tn-muted" id="tn-count"></p>` : ''}`;
      const cnt = $('#tn-count'); if (cnt) { const k = $$('input[name=bye]:checked', f).length; cnt.textContent = `Selected ${k} of ${pl.B}`; cnt.style.color = k === pl.B ? '' : '#ffb4a2'; }
    };
    f.addEventListener('input', e => {
      if (e.target.name === 'gsize') {                // "players per group" decides how many groups
        const N = getPlayers().length, sz = Math.max(2, Math.round(+e.target.value) || 2);
        el('groups').value = Math.max(1, Math.min(Math.max(1, Math.floor(N / 2)), Math.ceil(N / sz)));
      }
      refresh();
    });
    f.addEventListener('change', refresh);
    return { refresh };
  }
  function readSetup(f, pls, from) {                // what the setup part of the form says, or { error }
    const el = n => f.elements[n], ko = el('format').value === 'knockout', pl = plan(pls), ids = pls.map(p => p.id);
    const byeMode = (f.querySelector('input[name=byeMode]:checked') || {}).value || 'top';
    const byeIds = $$('input[name=bye]:checked', f).map(i => i.value);
    if (ko && pl.B && byeMode === 'manual' && byeIds.length !== pl.B) return { error: `Choose exactly ${pl.B} players for the byes (you chose ${byeIds.length}).` };
    let groups = null;                              // league groups: list of player-id lists (null = one group)
    if (!ko) {
      const G = groupCountOf(f, ids.length);
      if (G > 1) {
        if (el('gmode').value === 'manual') {
          groups = Array.from({ length: G }, () => []);
          $$('select[name=gp]', f).forEach(s => { if (groups[+s.value]) groups[+s.value].push(s.dataset.id); });
          const bad = groups.findIndex(g => g.length < 2);
          if (bad >= 0) return { error: `Group ${gname(bad)} needs at least 2 players (it has ${groups[bad].length}).` };
        } else groups = groupsFor(ids, G, el('gmode').value, from);
      }
      const total = (groups ? groups.map(g => g.length) : [ids.length]).reduce((a, n) => a + n * (n - 1) / 2, 0);
      if (total > MAX_MATCHES) return { error: `That would be ${total.toLocaleString()} matches in one stage (the limit is ${MAX_MATCHES.toLocaleString()}). Use more groups.` };
    }
    return { format: el('format').value, draw: el('draw').value, byeMode, byeIds, groups, tables: Math.min(MAX_TABLES, Math.max(1, +el('tables').value || 1)) };
  }

  function viewCreate() {
    main.innerHTML = hero('Create a <em>tournament</em>', 'Name it, paste the players, pick the rules. The site works out the draw and the byes.', crumbs('New tournament'))
      + `<section class="section"><div class="wrap tn"><form class="tn-form" id="tn-form" autocomplete="off">
        <div class="tn-grid2">
          <label>Tournament name<input name="name" required maxlength="60" placeholder="Smart Smashers Open"></label>
          <label>Sport<select name="sport"><option value="tt">Table tennis</option><option value="badminton">Badminton</option></select></label>
        </div>
        <div class="tn-grid5">
          <label>Points per game<input name="points" type="number" min="5" max="50" value="11"></label>
          <label>Point cap (0 = none)<input name="cap" type="number" min="0" max="60" value="0"></label>
          <label>Early rounds: best of<select name="bestOf"><option>1</option><option selected>3</option><option>5</option><option>7</option></select></label>
          <label>Semi-finals: best of<select name="semiBestOf"><option>1</option><option>3</option><option selected>5</option><option>7</option></select></label>
          <label>Final: best of<select name="finalBestOf"><option>1</option><option>3</option><option selected>5</option><option>7</option></select></label>
        </div>
        <p class="tn-muted" id="tn-rules"></p>
        ${setupHead(3, 'In the order entered (top names are top seeds)')}
        <label>Players (one name per line, any number)<textarea name="names" rows="9" placeholder="Asha&#10;Ravi&#10;Meera&#10;..."></textarea></label>
        ${setupTail}
        <p class="tn-muted">A league with groups can be followed by more stages (for example the top 2 of every group play another league, then a knockout). You set those up when the groups are finished.</p>
        <label class="tn-check"><input type="checkbox" name="listed" checked> Show this tournament on the Live Scores page</label>
        <p class="tn-error" id="tn-err" role="alert"></p>
        <button class="btn btn-primary" type="submit">Create tournament</button>
      </form></div></section>`;
    const f = $('#tn-form'), el = n => f.elements[n];
    const getPlayers = () => parseNames(el('names').value).map((n, i) => ({ id: 'p' + (i + 1), name: n }));
    const after = (ko, rounds) => {
      const sp = SPORTS[el('sport').value];
      $('#tn-rules').textContent = `First to ${el('points').value || sp.points} points, win by 2${+el('cap').value ? `, the ${el('cap').value}th point wins` : ''}. ` + bestOfText({ bestOf: +el('bestOf').value, semiBestOf: +el('semiBestOf').value, finalBestOf: +el('finalBestOf').value }, rounds, ko);
    };
    const setup = bindSetup(f, getPlayers, { after });
    const setDefaults = () => { const sp = SPORTS[el('sport').value]; el('points').value = sp.points; el('cap').value = sp.cap; el('bestOf').value = sp.bestOf; el('semiBestOf').value = sp.semiBestOf; el('finalBestOf').value = sp.finalBestOf; };
    el('sport').addEventListener('change', () => { setDefaults(); setup.refresh(); });
    setDefaults(); setup.refresh();
    f.addEventListener('submit', async e => {
      e.preventDefault();
      const err = $('#tn-err'); err.textContent = '';
      const names = parseNames(el('names').value), pls = getPlayers();
      const low = names.map(n => n.toLowerCase());
      const dup = names.find((n, i) => low.indexOf(n.toLowerCase()) !== i);
      if (names.length < 2) return void (err.textContent = 'Add at least 2 players.');
      if (names.length > MAX_PLAYERS) return void (err.textContent = `Up to ${MAX_PLAYERS.toLocaleString()} players.`);
      if (dup) return void (err.textContent = `"${dup}" appears twice. Make the names different (for example add a surname).`);
      const st = readSetup(f, pls, null); if (st.error) return void (err.textContent = st.error);
      const sp = SPORTS[el('sport').value];
      const rules = { points: Math.max(5, +el('points').value || sp.points), winBy: 2, cap: Math.max(0, +el('cap').value || 0), bestOf: +el('bestOf').value, semiBestOf: +el('semiBestOf').value, finalBestOf: +el('finalBestOf').value };
      const state = build({ name: el('name').value.trim(), sport: el('sport').value, rules, tables: st.tables, format: st.format, listed: el('listed').checked, names, draw: st.draw, byeMode: st.byeMode, byeIds: st.byeIds, groups: st.groups });
      const btn = $('button[type=submit]', f); btn.disabled = true; btn.textContent = 'Creating...';
      const token = makeToken(); let id = makeId();
      try {
        for (let tries = 0; ; tries++) {
          try { await store.create(id, token, { ...state, id }); break; }
          catch (er) { if (tries < 3 && /duplicate|exists|23505/i.test(er.message)) { id = makeId(); continue; } throw er; }
        }
        tokens.set(id, token); mine.add({ id, name: state.name, sport: state.sport, status: 'running', live: 0 });
        viewCreated(id, token, state.name);
      } catch (er) { err.textContent = 'Could not create the tournament: ' + er.message; btn.disabled = false; btn.textContent = 'Create tournament'; }
    });
  }

  /* ---- next stage: pick who goes through from the stage that just finished, then choose what they play ---- */
  function viewNext() {
    if (!isAdmin || !canNext()) { nextMode = false; history.replaceState(null, '', `tournament.html?t=${T.id}`); return viewT(); }
    const L = lastStage(), gs = sGroups(L), many = gs.length > 1, bgL = byGroup(L), tabs = gs.map((g, gi) => standingsData(L, gi, bgL[gi])), nextN = T.stages.length + 1;
    const maxN = Math.max(1, Math.min(...tabs.map(t => t.length)) - 1);
    const defN = many ? Math.min(2, maxN) : Math.min(maxN, tabs[0].length >= 6 ? 4 : 2);
    const from = {}; if (many) gs.forEach(g => g.ids.forEach(id => { from[id] = g.name; }));
    const bo = (name, label, sel) => `<label>${label}<select name="${name}">${[1, 3, 5, 7].map(v => `<option ${v === +sel ? 'selected' : ''}>${v}</option>`).join('')}</select></label>`;
    const rows = tabs.map((t, gi) => `${many ? `<h4 class="tn-gh">Group ${esc(gs[gi].name)}</h4>` : ''}<div class="tn-qlist">${t.map((x, i) => `<label class="tn-check tn-q"><input type="checkbox" name="q" value="${x.p.id}" data-g="${gi}" data-r="${i + 1}" ${i < defN ? 'checked' : ''}><span class="tn-qn">${i + 1}. ${esc(x.p.name)}</span><small>${x.w} won, ${x.l} lost, games ${x.gf}-${x.ga}</small></label>`).join('')}</div>`).join('');
    main.innerHTML = hero(`Stage ${nextN} <em>setup</em>`, `${esc(T.name)}. Choose who goes through, then what they play.`, crumbs(T.name))
      + `<section class="section"><div class="wrap tn"><form class="tn-form" id="tn-nform" autocomplete="off">
        <h3 class="tn-sub">1. Who goes through</h3>
        <p class="tn-muted">${esc(L.title)} is finished. The players at the top of ${many ? 'each group' : 'the table'} are ticked. Change the number, or tick and untick names yourself (for example to add the best third-placed player). Players who are level on every tie-break are ordered by name, so check the ticks at the cut.</p>
        <label class="tn-narrow">${many ? 'Players going through from each group' : 'Players going through'}<input name="topn" type="number" min="1" max="${maxN}" value="${defN}"></label>
        ${rows}
        <p class="tn-muted" id="tn-qcount"></p>
        <h3 class="tn-sub">2. What they play next</h3>
        <label>Name of this stage (optional)<input name="title" maxlength="40" placeholder="for example Super 8"></label>
        <div class="tn-grid3">${bo('bestOf', 'Early rounds / league: best of', L.rules.bestOf)}${bo('semiBestOf', 'Semi-finals: best of', semiOf(L.rules))}${bo('finalBestOf', 'Final: best of', L.rules.finalBestOf)}</div>
        <p class="tn-muted" id="tn-rules"></p>
        ${setupHead(T.tables, 'By table position (winners first)')}
        ${setupTail}
        <p class="tn-muted">Players who met in the stage before are kept apart where possible.</p>
        <p class="tn-error" id="tn-err" role="alert"></p>
        <div class="cta-row" style="margin:0"><button class="btn btn-primary" type="submit">Start stage ${nextN}</button><a class="btn btn-ghost" href="tournament.html?t=${esc(T.id)}">Cancel</a></div>
      </form></div></section>`;
    const f = $('#tn-nform'), el = n => f.elements[n], picks = () => $$('input[name=q]', f);
    const getPlayers = () => picks().filter(i => i.checked).sort((a, b) => a.dataset.r - b.dataset.r || a.dataset.g - b.dataset.g).map(i => ({ id: i.value, name: pname(i.value) }));
    const count = () => {
      const on = picks().filter(i => i.checked), k = on.length, per = gs.map(() => 0), c = $('#tn-qcount'); on.forEach(i => { per[+i.dataset.g]++; });
      c.textContent = `${k} player${k === 1 ? '' : 's'} going through${many ? (gs.length <= 12 ? ` (${gs.map((g, gi) => `${g.name} ${per[gi]}`).join(', ')})` : ` from ${gs.length} groups`) : ''}. At least 2 are needed.`; c.style.color = k >= 2 ? '' : '#ffb4a2';
    };
    f.addEventListener('input', e => {                // this listener comes first, so the setup part below sees the new ticks
      if (e.target.name === 'topn') { const n = Math.max(1, Math.min(maxN, Math.round(+e.target.value) || 1)); picks().forEach(i => { i.checked = +i.dataset.r <= n; }); }
      count();
    });
    el('bestOf').value = L.rules.bestOf; el('semiBestOf').value = semiOf(L.rules); el('finalBestOf').value = L.rules.finalBestOf;
    const after = (ko, rounds) => { $('#tn-rules').textContent = bestOfText({ bestOf: +el('bestOf').value, semiBestOf: +el('semiBestOf').value, finalBestOf: +el('finalBestOf').value }, rounds, ko); };
    const setup = bindSetup(f, getPlayers, { after, from: many ? from : null });
    count(); setup.refresh();
    f.addEventListener('submit', async e => {
      e.preventDefault();
      const err = $('#tn-err'); err.textContent = '';
      const pls = getPlayers();
      if (pls.length < 2) return void (err.textContent = 'Tick at least 2 players to go through.');
      const st = readSetup(f, pls, many ? from : null); if (st.error) return void (err.textContent = st.error);
      const btn = $('button[type=submit]', f); btn.disabled = true;
      const fresh = await loadT(T.id).catch(() => null);                // another device may have set this stage up already
      if (!fresh || fresh.stages.length !== T.stages.length) { if (fresh) { fresh.id = T.id; T = fresh; } nextMode = false; history.replaceState(null, '', `tournament.html?t=${T.id}`); toast('The next stage was already set up.'); return render(); }
      const src = {}; picks().forEach(i => { if (i.checked) src[i.value] = { g: many ? gs[+i.dataset.g].name : '', r: +i.dataset.r }; });
      const rules = { bestOf: +el('bestOf').value, semiBestOf: +el('semiBestOf').value, finalBestOf: +el('finalBestOf').value };
      const before = T.order.length; T.tables = st.tables;
      addStage(T, { format: st.format, ids: pls.map(p => p.id), draw: st.draw, byeMode: st.byeMode, byeIds: st.byeIds, groups: st.groups, rules, title: el('title').value.trim(), src, from: many ? from : null });
      nextMode = false; history.replaceState(null, '', `tournament.html?t=${T.id}`);
      commit(T.order.slice(before), { stages: T.stages, order: T.order, tables: T.tables });
      toast(`Stage ${nextN} is ready`); window.scrollTo(0, 0);
    });
  }
  const watchUrl = id => new URL(`tournament.html?t=${id}`, location.href).href;
  function viewCreated(id, token, name) {
    history.replaceState(null, '', `tournament.html?new=1`);
    main.innerHTML = hero('Tournament <em>created</em>', esc(name), crumbs('New tournament'))
      + `<section class="section"><div class="wrap tn"><div class="tn-card tn-token-card">
        <h3>Your admin token</h3>
        <p class="tn-muted">This is the password for entering scores. <b>Save it now</b> (screenshot, notes or message to yourself). It is saved on this device so you stay signed in here. On another phone, use "Admin sign in" and type it. Viewers never see it.</p>
        <div class="tn-token" id="tn-token">${esc(token)}</div>
        <div class="cta-row" style="margin-top:12px"><button class="btn btn-ghost" data-a="copytoken">Copy token</button></div>
        <hr class="tn-hr">
        <h3>Watch link for everyone</h3>
        <div class="tn-token small">${esc(watchUrl(id))}</div>
        <div class="cta-row" style="margin-top:12px"><button class="btn btn-ghost" data-a="copylink">Copy watch link</button>
        <a class="btn btn-primary" href="tournament.html?t=${id}">Open the tournament</a></div>
        ${LIVE ? '' : `<p class="tn-note" style="margin-top:14px"><b>This device only.</b> Until the database keys are added, only this browser can see this tournament.</p>`}
      </div></div></section>`;
    main.onclick = e => { const b = e.target.closest('[data-a]'); if (!b) return; if (b.dataset.a === 'copytoken') copy(token); if (b.dataset.a === 'copylink') copy(watchUrl(id)); };
  }

  /* ---------- the tournament page ---------- */
  const pips = (m, side) => { const need = Math.ceil(m.bestOf / 2); return Array.from({ length: need }, (_, i) => `<i class="${i < m.wins[side] ? 'on' : ''}"></i>`).join(''); };
  const mlabel = m => { const S = stageOf(m), gs = sGroups(S); return `Match ${m.no} - ${T.stages.length > 1 ? S.title + ' - ' : ''}${S.format === 'roundrobin' && gs.length > 1 ? `Group ${gs[m.group || 0].name} - ` : ''}${roundName(S, m.round)}`; };
  function liveCard(m) {
    const tt = T.sport === 'tt', srv = tt && m.status === 'live' ? serverOf(m) : -1, unit = SPORTS[T.sport].unit;
    const row = s => {
      const id = s ? m.b : m.a, won = m.status === 'done' && m.winner === id;
      return `<div class="sb-row ${won ? 'won' : ''}"><div class="sb-name">${srv === s ? '<span class="sb-srv" title="Serving"></span>' : ''}${esc(pname(id))}</div><div class="sb-pips" title="Games won">${pips(m, s)}</div><div class="sb-pt">${m.cur[s]}</div></div>`;
    };
    const hist = m.games.map(g => `<span>${g[0]}-${g[1]}</span>`).join('');
    const ctrl = !isAdmin ? '' : `<div class="sb-btns">
        <button class="btn btn-primary sb-plus" data-act="pt" data-m="${m.id}" data-s="0">+1 ${esc(pname(m.a))}</button>
        <button class="btn btn-primary sb-plus" data-act="pt" data-m="${m.id}" data-s="1">+1 ${esc(pname(m.b))}</button></div>
      <div class="sb-tools"><button class="btn btn-ghost btn-sm" data-act="undo" data-m="${m.id}" ${m.log.length ? '' : 'disabled'}>Undo last point</button>
      <button class="btn btn-ghost btn-sm" data-act="result" data-m="${m.id}">Enter / edit score</button>
      ${m.log.length === 0 ? `${tt ? `<button class="btn btn-ghost btn-sm" data-act="first" data-m="${m.id}" data-s="${m.first ? 0 : 1}">Serve first: ${esc(pname(m.first ? m.b : m.a))} (switch)</button>` : ''}<button class="btn btn-ghost btn-sm" data-act="unstart" data-m="${m.id}">Take off ${unit.toLowerCase()}</button>` : ''}</div>`;
    return `<article class="tn-card sb"><div class="sb-head"><span class="tn-livepill"><i></i>${unit} ${m.table}</span><small>${esc(mlabel(m))} - best of ${m.bestOf}</small></div>
      ${row(0)}${row(1)}<div class="sb-hist">Game ${m.games.length + 1}${hist ? ` <span class="sb-sep"></span> ${hist}` : ''}</div>${ctrl}</article>`;
  }
  let freeNow = [];                                 // tables free right now, worked out once per redraw
  function readyRow(m) {
    const free = freeNow;
    const btns = !isAdmin ? '' : (free.length ? `<span class="tn-start">Start on ${free.map(t => `<button class="btn btn-ghost btn-sm" data-act="start" data-m="${m.id}" data-t="${t}">${SPORTS[T.sport].unit} ${t}</button>`).join('')}</span>` : `<span class="tn-muted">All ${SPORTS[T.sport].unit.toLowerCase()}s busy</span>`);
    return `<div class="tn-row"><span><b>${esc(pname(m.a))}</b> vs <b>${esc(pname(m.b))}</b><small>${esc(mlabel(m))}</small></span>${isAdmin ? `<span class="tn-acts">${btns}<button class="btn btn-ghost btn-sm" data-act="result" data-m="${m.id}">Enter result</button></span>` : ''}</div>`;
  }
  function doneRow(m) {
    if (m.bye) return '';
    const sc = m.wo != null ? 'walkover' : m.games.map(g => `${g[0]}-${g[1]}`).join(', ');
    return `<div class="tn-row"><span><b class="${m.winner === m.a ? 'tn-w' : ''}">${esc(pname(m.a))}</b> ${m.wins[0]} - ${m.wins[1]} <b class="${m.winner === m.b ? 'tn-w' : ''}">${esc(pname(m.b))}</b><small>${esc(mlabel(m))} - ${esc(sc)}</small></span>${isAdmin && !locked(m) ? `<button class="btn btn-ghost btn-sm" data-act="result" data-m="${m.id}">Edit result</button>` : ''}</div>`;
  }
  function bracket(S) {
    const sm = stMatches(S), cols = [];
    for (let r = 1; r <= S.rounds; r++) {
      const ms = sm.filter(m => m.round === r);
      cols.push(`<div class="br-col"><h4>${esc(roundName(S, r))}</h4><div class="br-list">${ms.map(m => {
        const side = s => { const id = s ? m.b : m.a; const win = m.winner && m.winner === id; return `<div class="br-p ${win ? 'win' : ''} ${id ? '' : 'tbd'}"><span>${id ? esc(pname(id)) : (m.bye ? 'BYE' : 'TBD')}</span><b>${m.bye ? '' : (m.status === 'pending' ? '' : m.wins[s])}</b></div>`; };
        return `<div class="br-m ${m.status} ${m.bye ? 'bye' : ''}">${side(0)}${side(1)}</div>`;
      }).join('')}</div></div>`);
    }
    return `<div class="br">${cols.join('')}</div>`;
  }
  const byGroup = S => { const b = sGroups(S).map(() => []); stMatches(S).forEach(m => { (b[m.group || 0] || b[0]).push(m); }); return b; };     // a stage's matches, sorted into their groups
  function standingsData(S, gi = 0, ms = null) {   // the table of one group of one stage (ms: that group's matches, when already sorted out)
    ms = ms || byGroup(S)[gi];
    const st = sGroups(S)[gi].ids.map(id => ({ p: P(id), pl: 0, w: 0, l: 0, gf: 0, ga: 0, pf: 0, pa: 0 }));
    const g = id => st.find(x => x.p.id === id);
    for (const m of ms) if (m.status === 'done' && !m.bye) {
      const A = g(m.a), B = g(m.b); A.pl++; B.pl++;
      (m.winner === m.a ? (A.w++, B.l++) : (B.w++, A.l++));
      A.gf += m.wins[0]; A.ga += m.wins[1]; B.gf += m.wins[1]; B.ga += m.wins[0];
      m.games.forEach(x => { A.pf += x[0]; A.pa += x[1]; B.pf += x[1]; B.pa += x[0]; });
    }
    // ranking: most wins first. Players level on wins are ordered by the matches between them, then game difference, then point difference.
    const groups = new Map();
    st.forEach(x => { if (!groups.has(x.w)) groups.set(x.w, []); groups.get(x.w).push(x); });
    const ranked = [];
    [...groups.keys()].sort((a, b) => b - a).forEach(w => {
      const grp = groups.get(w), ids = new Set(grp.map(x => x.p.id));
      grp.forEach(x => { x.h = 0; });
      if (grp.length > 1) for (const m of ms) if (m.status === 'done' && !m.bye && ids.has(m.a) && ids.has(m.b)) grp.find(x => x.p.id === m.winner).h++;
      grp.sort((a, b) => b.h - a.h || (b.gf - b.ga) - (a.gf - a.ga) || (b.pf - b.pa) - (a.pf - a.pa) || a.p.name.localeCompare(b.p.name));
      ranked.push(...grp);
    });
    return ranked;
  }
  function standings(S) {                          // one table per group
    const gs = sGroups(S), bg = byGroup(S);
    return gs.map((g, gi) => (gs.length > 1 ? `<h4 class="tn-gh">Group ${esc(g.name)}</h4>` : '') + standingsTable(standingsData(S, gi, bg[gi]))).join('');
  }
  function standingsTable(st) {
    return `<div class="tn-table-wrap"><table class="tn-table"><thead><tr><th>#</th><th>Player</th><th>P</th><th>W</th><th>L</th><th>Games</th><th>Points</th></tr></thead><tbody>${st.map((x, i) => `<tr><td>${i + 1}</td><td>${esc(x.p.name)}</td><td>${x.pl}</td><td>${x.w}</td><td>${x.l}</td><td>${x.gf}-${x.ga}</td><td>${x.pf}-${x.pa}</td></tr>`).join('')}</tbody></table></div>`;
  }
  function champText() {                           // plain text (used on the chart): the winner of the last stage, once it is finished
    const S = lastStage();
    if (S.format !== 'roundrobin') { const f = M_(`${S.pre}r${S.rounds}m1`); return f && f.winner ? `Champion: ${pname(f.winner)}` : ''; }
    if (!stageDone(S)) return '';
    const gs = sGroups(S), bg = byGroup(S);
    return gs.length === 1 ? `Winner: ${standingsData(S, 0, bg[0])[0].p.name}` : `Group winners: ${gs.map((g, gi) => `${g.name} - ${standingsData(S, gi, bg[gi])[0].p.name}`).join(',  ')}`;
  }
  function champion() {
    if (T.status !== 'done' && T.status !== 'ended') return '';
    const note = T.status === 'ended' ? '<p class="tn-note" style="margin:0 0 12px"><b>Ended.</b> The admin ended this tournament, so scores are locked.</p>' : '';
    const S = lastStage();
    if (S.format === 'roundrobin') {
      if (!stageDone(S)) return note;
      const gs = sGroups(S), bg = byGroup(S);
      return note + (gs.length === 1 ? `<div class="tn-champ">Winner: <b>${esc(standingsData(S, 0, bg[0])[0].p.name)}</b></div>`
        : `<div class="tn-champ">Group winners: ${gs.map((g, gi) => `${esc(g.name)} - <b>${esc(standingsData(S, gi, bg[gi])[0].p.name)}</b>`).join(' &nbsp; ')}</div>`);
    }
    const fin = M_(`${S.pre}r${S.rounds}m1`); return note + (fin && fin.winner ? `<div class="tn-champ">Champion: <b>${esc(pname(fin.winner))}</b></div>` : '');
  }
  function stageCard() {                           // admin only: carry on to the next stage, or redo one that has not started
    if (!isAdmin || T.ended) return '';
    const S = lastStage();
    if (canNext()) return `<div class="tn-card tn-next"><h3>${esc(S.title)} is finished</h3><p class="tn-muted">Choose who goes through (for example the top 2 of every group) and what they play next: another league, or a knockout.</p><a class="btn btn-primary" href="tournament.html?t=${esc(T.id)}&next=1">Set up the next stage</a></div>`;
    if (canRedo()) return `<div class="tn-card tn-next"><h3>${esc(S.title)} has not started</h3><p class="tn-muted">Nothing has been played in it yet. If who goes through or the format is wrong, remove it and choose again.</p><button class="btn btn-ghost btn-sm" data-act="redo">Redo this stage</button></div>`;
    return '';
  }
  function stageBody(S) {
    const through = S.src ? `<p class="tn-muted tn-through">Went through: ${S.ids.filter(id => S.src[id]).map(id => `${esc(pname(id))} (${esc(srcLabel(S.src[id]))})`).join(', ')}</p>` : '';
    return through + (S.format === 'roundrobin' ? standings(S) : bracket(S));
  }
  function stagesHtml() {                          // one stage: as before. Several: a panel per stage, newest first, older ones folded
    if (T.stages.length === 1) { const S = T.stages[0]; return `<h3 class="tn-h">${S.format === 'roundrobin' ? 'Standings' : 'Bracket'}</h3>${stageBody(S)}`; }
    const last = lastStage();
    return '<h3 class="tn-h">Stages</h3>' + T.stages.slice().reverse().map(S => {
      const open = S.n in stOpen ? stOpen[S.n] : S === last;
      const ms = stMatches(S).filter(m => !m.bye), dn = ms.filter(m => m.status === 'done').length;
      return `<details class="tn-stage" data-stage="${S.n}" ${open ? 'open' : ''}><summary><b>${esc(S.title)}</b><small>${/^Stage \d/.test(S.title) ? '' : `Stage ${S.n} - `}${dn} of ${ms.length} matches played</small></summary>${stageBody(S)}</details>`;
    }).join('');
  }
  function viewT() {
    const L = T.ended ? [] : live(), R = T.ended ? [] : ready(), D = allMatches().filter(m => m.status === 'done' && !m.bye).reverse();
    const busy = new Set(L.map(x => x.table)); freeNow = []; for (let t = 1; t <= T.tables; t++) if (!busy.has(t)) freeNow.push(t);
    const sp = SPORTS[T.sport];
    const adminBar = isAdmin
      ? `<div class="tn-admin"><span class="tn-adminpill">Admin</span>
          <button class="btn btn-ghost btn-sm" data-act="tok">${showTok ? 'Hide token' : 'Show token'}</button>
          <button class="btn btn-ghost btn-sm" data-act="regen">New token</button>
          <button class="btn btn-ghost btn-sm" data-bk="download">Download backup</button>
          ${T.ended ? '<button class="btn btn-primary btn-sm" data-act="reopen">Reopen tournament</button>' : ''}<button class="btn btn-ghost btn-sm tn-danger" data-act="end">End tournament</button>
          <button class="btn btn-ghost btn-sm" data-act="logout">Sign out</button></div>
        ${showTok ? `<div class="tn-tokenrow"><div class="tn-token">${esc(tokens.get(T.id))}</div><button class="btn btn-ghost btn-sm" data-act="copytok">Copy</button></div>` : ''}`
      : `<details class="tn-signin"><summary>Admin sign in</summary><form id="tn-login"><input name="token" placeholder="Admin token, e.g. ABCD-EFGH-JKLM-NPQR" autocomplete="off" required><button class="btn btn-primary btn-sm" type="submit">Sign in</button></form><p class="tn-error" id="tn-lerr"></p></details>`;
    main.innerHTML = hero(esc(T.name), '', crumbs(T.name), `<div class="tn-badges"><span class="pill">${sp.name}</span><span class="pill">${T.players.length} players</span><span class="pill">${T.stages.length > 1 ? `${T.stages.length} stages` : esc(formatLabel().replace(/^./, c => c.toUpperCase()))}</span><span class="pill">${T.tables} ${sp.unit.toLowerCase()}${T.tables > 1 ? 's' : ''}</span>${T.status === 'done' ? '<span class="pill">Finished</span>' : T.ended ? '<span class="pill">Ended</span>' : '<span class="pill tn-livepill"><i></i>Live</span>'}</div>`)
      + `<section class="section"><div class="wrap tn">
        <div class="tn-bar"><button class="btn btn-ghost btn-sm" data-act="share">Copy watch link</button><button class="btn btn-ghost btn-sm" data-act="chart">Download chart</button><button class="btn btn-ghost btn-sm" data-act="csv">Download results (CSV)</button></div>
        <p class="tn-muted" style="margin-bottom:6px">${esc(rulesText(T))}</p>
        ${champion()}
        ${stageCard()}
        <h3 class="tn-h">Playing now</h3>
        ${L.length ? `<div class="tn-live">${L.map(liveCard).join('')}</div>` : `<p class="tn-muted">${T.status === 'done' ? 'The tournament is finished.' : T.ended ? 'The tournament has ended.' : 'No match is being played right now.'}</p>`}
        ${R.length ? `<h3 class="tn-h">Up next${R.length > LIST ? ` <small class="tn-muted">(${R.length} waiting)</small>` : ''}</h3><div class="tn-rows">${(moreReady ? R : R.slice(0, LIST)).map(readyRow).join('')}</div>${R.length > LIST ? `<button class="btn btn-ghost btn-sm tn-more" data-act="morer">${moreReady ? 'Show fewer' : `Show all ${R.length}`}</button>` : ''}` : ''}
        ${stagesHtml()}
        ${D.length ? `<h3 class="tn-h">Results${D.length > LIST ? ` <small class="tn-muted">(${D.length} played)</small>` : ''}</h3><div class="tn-rows">${(moreDone ? D : D.slice(0, LIST)).map(doneRow).join('')}</div>${D.length > LIST ? `<button class="btn btn-ghost btn-sm tn-more" data-act="mored">${moreDone ? 'Show fewer' : `Show all ${D.length}`}</button>` : ''}` : ''}
        <div class="tn-foot">${adminBar}${modeNote()}</div>
      </div></section>`;
    const lf = $('#tn-login');
    if (lf) lf.addEventListener('submit', async e => {
      e.preventDefault(); const t = normTok(lf.elements.token.value), er = $('#tn-lerr'); er.textContent = '';
      try { if (await store.verify(T.id, t)) { tokens.set(T.id, t); isAdmin = true; mine.add({ id: T.id, name: T.name, sport: T.sport, status: T.status, live: T.liveCount }); render(); toast('Signed in as admin'); } else er.textContent = 'That token does not match.'; }
      catch (x) { er.textContent = 'Could not check the token: ' + x.message; }
    });
  }
  function render() { if (T) (nextMode ? viewNext() : viewT()); }

  async function openTournament(id) {
    main.innerHTML = '<section class="section"><div class="wrap"><p class="tn-muted">Loading...</p></div></section>';
    try { T = await loadT(id); } catch (e) { main.innerHTML = `<section class="section"><div class="wrap tn"><p class="tn-error">${esc(e.message)}</p></div></section>`; return; }
    if (!T) {
      main.innerHTML = hero('Not found', 'We could not find that tournament.' + (LIVE ? '' : ' Tournaments are saved in the browser they were created in, so this link only works there until the live database is added.'), crumbs('Not found')) + `<section class="section"><div class="wrap tn"><div class="cta-row" style="margin:0 0 18px"><a class="btn btn-primary" href="tournament.html">Back to Live Scores</a></div>${backupCard('Lost your tournaments? Pick your backup file and press Restore.')}</div></section>`;
      return;
    }
    T.id = id; isAdmin = !!tokens.get(id); nextMode = isAdmin && !!qs.get('next'); render();
    unwatch && unwatch();
    unwatch = store.watch(id, async () => {
      if (pending) return;
      const s = await loadT(id).catch(() => undefined);      // undefined = storage not reachable, null = the tournament is gone
      if (s === null && !pending) return showRemoved();
      if (s && !pending && s.updated > T.updated) { s.id = id; T = s; if (!nextMode) render(); }       // never redraw the next-stage form while it is being filled in
    });
  }
  main.addEventListener('toggle', e => { const d = e.target; if (d && d.matches && d.matches('details.tn-stage')) stOpen[d.dataset.stage] = d.open; }, true);   // remember opened/closed stage panels
  main.addEventListener('click', e => {
    const b = e.target.closest('[data-act]'); if (!b || !T) return;
    const a = b.dataset.act;
    if (a === 'morer') { moreReady = !moreReady; return render(); }
    if (a === 'mored') { moreDone = !moreDone; return render(); }
    if (a === 'share') return copy(watchUrl(T.id));
    if (a === 'chart') return downloadChart();
    if (a === 'csv') return downloadCsv();
    if (a === 'tok') { showTok = !showTok; return render(); }
    if (a === 'copytok') return copy(tokens.get(T.id));
    if (a === 'logout') { if (confirm('Sign out of admin on this device? You will need the token to score again.')) { tokens.del(T.id); isAdmin = false; showTok = false; render(); } return; }
    if (a === 'regen') {
      if (!confirm('Make a new token? The old one stops working.')) return;
      const n = makeToken();
      store.reset(T.id, tokens.get(T.id), n).then(() => { tokens.set(T.id, n); showTok = true; render(); toast('New token created. Save it now.'); }).catch(er => toast('Could not change the token: ' + er.message));
      return;
    }
    if (isAdmin) act(a, { ...b.dataset });
  });

  /* ------------------------------------ type a result instead of tapping every point */
  function synth(a, b) {                           // a possible point-by-point order for a game that stands at a-b
    const lo = Math.min(a, b), lead = a > b ? 0 : 1, s = [];
    for (let i = 0; i < lo; i++) s.push(0, 1);
    for (let i = 0; i < Math.abs(a - b); i++) s.push(lead);
    return s;
  }
  function classify(a, b, rules) {                 // 'done' = a finished game, 'part' = a game in progress, null = not a possible score
    const c = [0, 0], s = synth(a, b);
    for (let k = 0; k < s.length; k++) { c[s[k]]++; if (gameOver(c, rules)) return k === s.length - 1 ? 'done' : null; }
    return 'part';
  }
  function rowsToLog(rows, rules, bestOf) {        // game scores -> the equivalent list of points (so undo, serve, standings all keep working)
    const log = [], need = Math.ceil(bestOf / 2), wins = [0, 0];
    for (let i = 0; i < rows.length; i++) {
      const [a, b] = rows[i];
      if (wins[0] >= need || wins[1] >= need) return { error: `The match was already decided before game ${i + 1}. Clear game ${i + 1}.` };
      const k = classify(a, b, rules);
      if (!k) return { error: `Game ${i + 1}: ${a}-${b} is not a possible score. A game is first to ${rules.points}, win by ${rules.winBy}${rules.cap ? `, and the ${rules.cap}th point wins` : ''}.` };
      if (k === 'part' && i < rows.length - 1) return { error: `Game ${i + 1}: ${a}-${b} is not finished, so the games after it cannot be entered.` };
      log.push(...synth(a, b));
      if (k === 'done') wins[a > b ? 0 : 1]++;
    }
    return { log };
  }
  function applyResult(m, res) {                   // returns '' when saved, or a message to show
    const old = m.winner, nx = m.next ? M_(m.next) : null;
    const t = { ...m, log: res.log, wo: res.wo == null ? null : res.wo };
    recalc(t, T.rules);
    const decided = !!t.winner;
    if (!decided && m.status === 'pending') return res.empty ? 'Type at least one game, or tick Walkover.' : 'This match has not started. Enter the full result, or start it on a table and score it live.';
    if (old !== t.winner && nx && (nx.log.length || nx.wo != null || nx.status === 'done')) return 'The next match has already been played, so this result cannot be changed.';
    if (!decided) {                                // it will be live again: nobody may be in two matches, and it needs a free table
      const clash = live().find(x => x.id !== m.id && (x.a === m.a || x.a === m.b || x.b === m.a || x.b === m.b));
      if (clash) return `${pname([m.a, m.b].find(p => p === clash.a || p === clash.b))} is already playing on ${SPORTS[T.sport].unit} ${clash.table}.`;
    }
    let table = m.table;
    if (!decided && (!table || live().some(x => x.id !== m.id && x.table === table))) {
      table = 1; while (table <= T.tables && live().some(x => x.id !== m.id && x.table === table)) table++;
      if (table > T.tables) return 'Every table is busy. Finish another match first.';
    }
    Object.assign(m, { log: t.log, wo: t.wo, games: t.games, cur: t.cur, wins: t.wins, winner: t.winner, status: decided ? 'done' : 'live', table: decided ? m.table : table });
    const ch = [m.id];
    if (nx && old !== m.winner) { nx[m.slot] = m.winner; if (nx.status === 'live') { nx.status = 'pending'; nx.table = null; } ch.push(nx.id); }
    commit(ch); return '';
  }
  function openResult(m) {
    const A = pname(m.a), B = pname(m.b), rows0 = [...m.games, ...(m.cur[0] || m.cur[1] ? [m.cur] : [])];
    const el = document.createElement('div');
    el.className = 'tn-modal'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true');
    const cell = (g, s, name) => `<input type="number" min="0" max="99" inputmode="numeric" data-g="${g}" data-s="${s}" value="${rows0[g] ? rows0[g][s] : ''}" aria-label="Game ${g + 1}, ${esc(name)}">`;
    el.innerHTML = `<div class="tn-modal-box">
      <h3>Enter result</h3>
      <p class="tn-muted">${esc(mlabel(m))}. Best of ${m.bestOf} games. Type the score of each game and leave unused games empty. A game still in progress can go in the last row.</p>
      <div class="rs-row rs-head"><span></span><b>${esc(A)}</b><b>${esc(B)}</b></div>
      ${Array.from({ length: m.bestOf }, (_, g) => `<div class="rs-row"><span>Game ${g + 1}</span>${cell(g, 0, A)}${cell(g, 1, B)}</div>`).join('')}
      <label class="tn-check"><input type="checkbox" id="rs-wo" ${m.wo != null ? 'checked' : ''}> Walkover: the match was not played</label>
      <select id="rs-wow" aria-label="Who wins the walkover"><option value="0" ${m.wo === 0 ? 'selected' : ''}>${esc(A)} wins</option><option value="1" ${m.wo === 1 ? 'selected' : ''}>${esc(B)} wins</option></select>
      <p class="tn-error" id="rs-err" role="alert"></p>
      <div class="tn-modal-btns"><button class="btn btn-ghost" data-m="cancel">Cancel</button><button class="btn btn-primary" data-m="save">Save result</button></div>
    </div>`;
    const wo = $('#rs-wo', el), wow = $('#rs-wow', el);
    const sync = () => { wow.style.display = wo.checked ? '' : 'none'; $$('.rs-row input', el).forEach(i => { i.disabled = wo.checked; }); };
    wo.addEventListener('change', sync); sync();
    const close = () => { document.removeEventListener('keydown', onKey); el.remove(); };
    const onKey = e => { if (e.key === 'Escape') close(); };
    el.addEventListener('click', e => {
      if (e.target === el) return close();
      const btn = e.target.closest('[data-m]'); if (!btn) return;
      if (btn.dataset.m === 'cancel') return close();
      const err = $('#rs-err', el); err.textContent = '';
      let res;
      if (wo.checked) res = { wo: +wow.value, log: [] };
      else {
        const rows = []; let gap = false;
        for (let g = 0; g < m.bestOf; g++) {
          const va = $(`[data-g="${g}"][data-s="0"]`, el).value.trim(), vb = $(`[data-g="${g}"][data-s="1"]`, el).value.trim();
          if (va === '' && vb === '') { gap = true; continue; }
          if (va === '' || vb === '') return void (err.textContent = `Game ${g + 1}: type both scores.`);
          if (!/^\d{1,2}$/.test(va) || !/^\d{1,2}$/.test(vb)) return void (err.textContent = `Game ${g + 1}: scores are whole numbers.`);
          if (gap) return void (err.textContent = `Game ${g + 1}: fill the games in order, with no empty game before it.`);
          rows.push([+va, +vb]);
        }
        const r = rowsToLog(rows, T.rules, m.bestOf); if (r.error) return void (err.textContent = r.error);
        res = { log: r.log, wo: null, empty: rows.length === 0 };
      }
      const msg = applyResult(m, res); if (msg) return void (err.textContent = msg);
      close(); toast('Result saved');
    });
    document.addEventListener('keydown', onKey);
    document.body.appendChild(el);
    const first = $('.rs-row input:not([disabled])', el) || $('[data-m=cancel]', el); first.focus();
  }

  /* ------------------------------------------- download results + delete data */
  const slug = s => String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'tournament';
  function saveBlob(blob, name) {
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name;
    document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  }
  function downloadCsv() {
    const q = v => `"${String(v ?? '').replace(/"/g, '""')}"`, unit = SPORTS[T.sport].unit;
    const multi = T.stages.length > 1, gcol = T.stages.some(S => S.format === 'roundrobin' && sGroups(S).length > 1);     // Stage / Group columns only when needed
    const rows = [['Match', ...(multi ? ['Stage'] : []), ...(gcol ? ['Group'] : []), 'Round', unit, 'Player A', 'Player B', 'Games A', 'Games B', 'Game scores', 'Winner', 'Status']];
    for (const m of allMatches()) if (!m.bye) {
      const S = stageOf(m), gs = sGroups(S);
      rows.push([m.no, ...(multi ? [S.title] : []), ...(gcol ? [S.format === 'roundrobin' && gs.length > 1 ? gs[m.group || 0].name : ''] : []), roundName(S, m.round), m.table ? `${unit} ${m.table}` : '', pname(m.a), pname(m.b), m.status === 'pending' ? '' : m.wins[0], m.status === 'pending' ? '' : m.wins[1], m.wo != null ? 'walkover' : m.games.map(g => g.join('-')).join(' | '), m.winner ? pname(m.winner) : '', m.status]);
    }
    T.stages.forEach(S => {
      if (S.format !== 'roundrobin') return;
      const gs = sGroups(S);
      gs.forEach((g, gi) => {
        rows.push([], [`${multi ? S.title + ' - ' : ''}${gs.length > 1 ? `Group ${g.name} standings` : 'Standings'}`], ['Rank', 'Player', 'Played', 'Won', 'Lost', 'Games won', 'Games lost', 'Points for', 'Points against']);
        standingsData(S, gi).forEach((x, i) => rows.push([i + 1, x.p.name, x.pl, x.w, x.l, x.gf, x.ga, x.pf, x.pa]));
      });
    });
    saveBlob(new Blob(['﻿' + rows.map(r => r.map(q).join(',')).join('\r\n')], { type: 'text/csv' }), `${slug(T.name)}-results.csv`);
    toast('Results saved as a spreadsheet file');
  }
  function downloadChart() {                       // draws every stage (standings tables and brackets) onto one canvas and saves it as a PNG
    const ink = '#1f1a11', bronze = '#8a6a2c', line = '#b9a77a', paper = '#f6f1e7';
    const sp = SPORTS[T.sport], multi = T.stages.length > 1, champ = champText();
    const sub = `${sp.name}  -  ${T.players.length} players  -  ${formatLabel()}  -  ${new Date(T.created || Date.now()).toLocaleDateString()}${T.ended ? '  -  ended early' : ''}`;
    const BOX = { w: 214, h: 46 }, GAP = 54, ROW = 60, PAD = 28, HEAD = champ ? 122 : 96, SH = 40, SGAP = 22;
    const cv = document.createElement('canvas'), c = cv.getContext('2d');
    const fit = (t, max) => { t = String(t); if (c.measureText(t).width <= max) return t; while (t.length > 1 && c.measureText(t + '...').width > max) t = t.slice(0, -1); return t + '...'; };
    // Each block knows its size (w, h) and draws itself with its top-left corner at 0,0.
    const koBlock = S => {
      const sm = stMatches(S), R = S.rounds, n1 = sm.filter(m => m.round === 1).length, cy = {}, top = 24;
      const w = PAD * 2 + R * BOX.w + (R - 1) * GAP, h = top + n1 * ROW;
      for (let r = 1; r <= R; r++) sm.filter(m => m.round === r).forEach((m, i) => { cy[m.id] = r === 1 ? top + i * ROW + BOX.h / 2 : (cy[`${S.pre}r${r - 1}m${2 * i + 1}`] + cy[`${S.pre}r${r - 1}m${2 * i + 2}`]) / 2; });
      return { w, h, draw: () => {
        for (let r = 1; r <= R; r++) {
          const x = PAD + (r - 1) * (BOX.w + GAP);
          c.fillStyle = bronze; c.font = '600 11px Arial'; c.fillText(roundName(S, r).toUpperCase(), x, top - 12);
          sm.filter(m => m.round === r).forEach(m => {
            const y = cy[m.id] - BOX.h / 2;
            c.beginPath(); if (c.roundRect) c.roundRect(x, y, BOX.w, BOX.h, 8); else c.rect(x, y, BOX.w, BOX.h);
            c.fillStyle = '#fff'; c.fill(); c.strokeStyle = line; c.lineWidth = 1; c.stroke();
            [0, 1].forEach(s => {
              const id = s ? m.b : m.a, ry = y + s * (BOX.h / 2), won = m.winner && m.winner === id;
              if (won) { c.fillStyle = '#efe3c2'; c.fillRect(x + 1, ry + (s ? 0 : 1), BOX.w - 2, BOX.h / 2 - 1); }
              c.fillStyle = id ? ink : '#9a8f7a'; c.font = `${won ? '700' : '400'} 13px Arial`;
              c.fillText(fit(id ? pname(id) : (m.bye ? 'BYE' : 'TBD'), BOX.w - 50), x + 10, ry + 15);
              if (!m.bye && m.status !== 'pending' && id) { c.textAlign = 'right'; c.font = '700 13px Arial'; c.fillText(m.wins[s], x + BOX.w - 10, ry + 15); c.textAlign = 'left'; }
            });
            c.strokeStyle = line; c.beginPath(); c.moveTo(x, y + BOX.h / 2); c.lineTo(x + BOX.w, y + BOX.h / 2); c.stroke();
            if (m.next) { const x2 = x + BOX.w, xm = x2 + GAP / 2; c.beginPath(); c.moveTo(x2, cy[m.id]); c.lineTo(xm, cy[m.id]); c.lineTo(xm, cy[m.next]); c.lineTo(x2 + GAP, cy[m.next]); c.stroke(); }
          });
        }
      } };
    };
    const leagueBlock = S => {
      const gs = sGroups(S), sm = stMatches(S), RH = 30, GH = gs.length > 1 ? 30 : 0, tables = gs.map((g, gi) => standingsData(S, gi));    // one standings table per group
      const cols = [['#', 40], ['Player', 240], ['P', 50], ['W', 50], ['L', 50], ['Games', 90], ['Points', 120]];
      const showRes = sm.length <= 150;               // a long match list would make the picture huge: it is in the CSV
      const w = PAD * 2 + cols.reduce((a, x) => a + x[1], 0), h = tables.reduce((a, st) => a + GH + (st.length + 1) * RH + 20, 0) + (showRes ? 44 + sm.length * 24 : 44);
      return { w, h, draw: () => {
        let y = 0, x = PAD;
        tables.forEach((st, gi) => {
          if (GH) { c.fillStyle = ink; c.font = '700 15px Georgia, serif'; c.textAlign = 'left'; c.fillText(`Group ${gs[gi].name}`, PAD, y + 18); y += GH; }
          x = PAD; c.font = '600 12px Arial'; c.fillStyle = bronze;
          cols.forEach(([hd, cw], i) => { c.textAlign = i >= 2 ? 'right' : 'left'; c.fillText(hd.toUpperCase(), i >= 2 ? x + cw - 8 : x + 8, y + 20); x += cw; });
          c.textAlign = 'left'; y += RH;
          st.forEach((r, k) => {
            if (k % 2 === 0) { c.fillStyle = 'rgba(138,106,44,.08)'; c.fillRect(PAD, y, w - PAD * 2, RH); }
            const cells = [k + 1, r.p.name, r.pl, r.w, r.l, `${r.gf}-${r.ga}`, `${r.pf}-${r.pa}`]; x = PAD;
            cols.forEach(([, cw], i) => { c.fillStyle = ink; c.font = `${k === 0 ? '700' : '400'} 13px Arial`; c.textAlign = i >= 2 ? 'right' : 'left'; c.fillText(i === 1 ? fit(cells[i], cw - 16) : cells[i], i >= 2 ? x + cw - 8 : x + 8, y + 20); x += cw; });
            c.textAlign = 'left'; y += RH;
          });
          y += 20;
        });
        y += 14; c.fillStyle = bronze; c.font = '600 12px Arial';
        if (!showRes) return void c.fillText('Match results: see the CSV file.', PAD, y + 4);
        c.fillText('RESULTS', PAD, y); y += 24;
        sm.forEach(m => {
          c.fillStyle = ink; c.font = '13px Arial';
          const t = `Match ${m.no}   ${gs.length > 1 ? `[${gs[m.group || 0].name}]  ` : ''}${pname(m.a)}  ${m.status === 'pending' ? 'v' : `${m.wins[0]} - ${m.wins[1]}`}  ${pname(m.b)}` + (m.wo != null ? '   (walkover)' : m.games.length ? `   (${m.games.map(g => g.join('-')).join(', ')})` : '');
          c.fillText(fit(t, w - PAD * 2), PAD, y); y += 24;
        });
      } };
    };
    const blocks = T.stages.map(S => (S.format === 'roundrobin' ? leagueBlock(S) : koBlock(S)));
    const W = Math.max(440, ...blocks.map(b => b.w)), H = HEAD + blocks.reduce((a, b) => a + b.h + (multi ? SH + SGAP : 0), 0) + PAD;
    const phone = /Android|iPhone|iPad|Mobile/i.test(navigator.userAgent), maxPx = phone ? 14e6 : 50e6, maxSide = phone ? 16000 : 30000;     // keep within what the browser can draw
    const k = Math.min(2, Math.sqrt(maxPx / (W * H)), maxSide / H, maxSide / W);
    if (k < 0.45) return toast('This tournament is too big for one picture (the text would be unreadable). Use "Download results (CSV)" instead.');
    cv.width = Math.round(W * k); cv.height = Math.round(H * k); c.scale(k, k);
    c.fillStyle = paper; c.fillRect(0, 0, W, H);
    c.fillStyle = ink; c.font = '700 24px Georgia, serif'; c.fillText(fit(T.name, W - PAD * 2), PAD, 42);
    c.fillStyle = '#6c614e'; c.font = '13px Arial'; c.fillText(fit(sub, W - PAD * 2), PAD, 64);
    if (champ) { c.fillStyle = bronze; c.font = '700 17px Georgia, serif'; c.fillText(fit(champ, W - PAD * 2), PAD, 94); }
    let y = HEAD;
    blocks.forEach((b, i) => {
      if (multi) { c.fillStyle = ink; c.font = '700 17px Georgia, serif'; c.textAlign = 'left'; c.fillText(fit(T.stages[i].title, W - PAD * 2), PAD, y + 22); y += SH; }
      c.save(); c.translate(0, y); b.draw(); c.restore();
      y += b.h + (multi ? SGAP : 0);
    });
    c.textAlign = 'right'; c.fillStyle = '#9a8f7a'; c.font = '11px Arial'; c.fillText('Sports Maven', W - PAD, H - 10);
    const fname = `${slug(T.name)}-chart.png`;       // read now: the tournament may be removed before the image is ready
    cv.toBlob(b => { if (b) { saveBlob(b, fname); toast('Chart saved as an image'); } else toast('Could not make the image'); }, 'image/png');
  }
  // The "End tournament" window: asks "are you sure?" and offers to save copies first.
  function confirmEnd() {
    return new Promise(resolve => {
      const el = document.createElement('div');
      el.className = 'tn-modal'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true'); el.setAttribute('aria-labelledby', 'tn-m-title');
      el.innerHTML = `<div class="tn-modal-box">
        <h3 id="tn-m-title">End "${esc(T.name)}" and remove it?</h3>
        <p>This stops scoring and <b>deletes the tournament and every score for everyone</b>. It cannot be undone.</p>
        <p class="tn-muted">Save a copy to your device first:</p>
        <label class="tn-check"><input type="checkbox" id="m-chart" checked> Chart picture (PNG)</label>
        <label class="tn-check"><input type="checkbox" id="m-csv" checked> Results spreadsheet (CSV)</label>
        <label class="tn-check"><input type="checkbox" id="m-bk" checked> Backup file (to bring this tournament back later with Restore)</label>
        <div class="tn-modal-btns"><button class="btn btn-ghost" data-m="cancel">Cancel</button><button class="btn btn-primary" data-m="go">Yes, end and remove</button></div>
      </div>`;
      const done = v => { document.removeEventListener('keydown', onKey); el.remove(); resolve(v); };
      const onKey = e => { if (e.key === 'Escape') done(null); };
      el.addEventListener('click', e => {
        if (e.target === el) return done(null);
        const b = e.target.closest('[data-m]'); if (!b) return;
        if (b.dataset.m === 'cancel') return done(null);
        done({ chart: $('#m-chart', el).checked, csv: $('#m-csv', el).checked, backup: $('#m-bk', el).checked });
      });
      document.addEventListener('keydown', onKey);
      document.body.appendChild(el);
      $('[data-m=cancel]', el).focus();                  // the safe choice is focused first
    });
  }
  async function endAndRemove() {
    const pick = await confirmEnd();
    if (!pick) return;
    const id = T.id, token = tokens.get(id), sleep = ms => new Promise(r => setTimeout(r, ms));
    if (pick.csv) { downloadCsv(); await sleep(400); }
    if (pick.chart) { downloadChart(); await sleep(900); }
    if (pick.backup) { await downloadBackup(id); await sleep(400); }
    try { await store.remove(id, token); } catch (e) { return toast('Could not remove the tournament: ' + e.message); }
    tokens.del(id); mine.del(id); if (unwatch) unwatch(); T = null;
    toast('Tournament ended and removed'); setTimeout(() => { location.href = 'tournament.html'; }, 1200);
  }
  function showRemoved() {
    if (unwatch) unwatch(); T = null;
    main.innerHTML = hero('Tournament <em>ended</em>', 'This tournament has ended and its scores have been removed by the organiser.', crumbs('Ended'))
      + '<section class="section"><div class="wrap"><a class="btn btn-primary" href="tournament.html">Back to Live Scores</a></div></section>';
  }

  /* ------------------------------------------------------- backup file: save + restore */
  const backupCard = (lead = '') => `<div class="tn-card tn-backup"><h3>Backup file</h3>
    <p class="tn-muted">${lead ? esc(lead) + ' ' : ''}Save all your tournaments (players, matches, scores and admin tokens) as a file, and keep it somewhere safe such as Google Drive or WhatsApp to yourself. If the data ever disappears, press <b>Restore</b> and pick that file. Keep the file private: anyone who has it can score your tournaments.</p>
    <div class="cta-row" style="margin:12px 0 0"><button class="btn btn-primary btn-sm" data-bk="download">Download backup</button><button class="btn btn-ghost btn-sm" data-bk="restore">Restore from file</button></div>
    <input type="file" id="bk-file" accept=".json,application/json" hidden></div>`;

  async function downloadBackup(onlyId) {                // onlyId: back up just that one tournament
    const ids = new Set(mine.all().map(m => m.id));
    if (!LIVE) for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k && k.startsWith('sm_t_')) ids.add(k.slice(5)); }
    if (onlyId) { ids.clear(); ids.add(onlyId); }
    const tournaments = {}, tk = {};
    for (const id of ids) { const s = await store.load(id).catch(() => null); if (s) { tournaments[id] = s; if (tokens.get(id)) tk[id] = tokens.get(id); } }
    const n = Object.keys(tournaments).length;
    if (!n) return toast('Nothing to back up yet');
    const file = { app: 'sports-maven-backup', version: 1, saved: new Date().toISOString(), tournaments, tokens: tk, mine: mine.all().filter(m => tournaments[m.id]) };
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([JSON.stringify(file)], { type: 'application/json' }));
    a.download = `sports-maven-backup-${onlyId ? slug(tournaments[onlyId].name) + '-' : ''}${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
    toast(`Backup saved: ${n} tournament${n > 1 ? 's' : ''}`);
  }
  async function restoreBackup(file) {
    if (!file) return;
    if (file.size > 30e6) return toast('That file is too big to be a backup');
    let b; try { b = JSON.parse(await file.text()); } catch { b = null; }
    if (!b || b.app !== 'sports-maven-backup' || !b.tournaments || typeof b.tournaments !== 'object') return toast('That file is not a Sports Maven backup');
    let restored = 0, kept = 0, skipped = 0;
    for (const [id, s] of Object.entries(b.tournaments)) {
      if (!/^[a-z0-9]{6,40}$/.test(id) || !s || !s.matches || !Array.isArray(s.players) || !s.name) { skipped++; continue; }
      const have = await store.load(id).catch(() => null), tok = (b.tokens || {})[id];
      if (have && (have.updated || 0) >= (s.updated || 0)) { kept++; if (tok && !tokens.get(id)) tokens.set(id, tok); continue; }   // never replace newer data
      try {
        if (LIVE) { if (have || !tok) { skipped++; continue; } await store.create(id, tok, s); }
        else if (!jset('sm_t_' + id, s)) throw new Error(FULL);
        if (tok) tokens.set(id, tok);
        restored++;
      } catch { skipped++; }
    }
    for (const e of (b.mine || [])) if (e && b.tournaments[e.id]) mine.add(e);
    toast(`Restored ${restored}${kept ? `, kept ${kept} newer` : ''}${skipped ? `, skipped ${skipped}` : ''}`);
    setTimeout(() => location.reload(), 1300);
  }
  main.addEventListener('click', e => {
    const b = e.target.closest('[data-bk]'); if (!b) return;
    if (b.dataset.bk === 'download') downloadBackup(); else { const f = $('#bk-file'); if (f) f.click(); }
  });
  main.addEventListener('change', e => { if (e.target.id === 'bk-file') { restoreBackup(e.target.files[0]); e.target.value = ''; } });

  /* ------------------------------------------------------------------- start */
  if (TID) openTournament(TID);
  else if (qs.get('new')) viewCreate();
  else viewHome();
})();
