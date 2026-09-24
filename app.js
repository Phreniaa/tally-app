
'use strict';
/* =============================================================
   Tally — habit log
   State lives in localStorage under one key. No network calls.
   ============================================================= */

const KEY = 'tally.v1';
const LEGACY_KEY = 'HABIT_TRACKER_V6';
const WEEKS = 53;
const CELL = 12, GAP = 3;
const DEFAULT_REST_LIMIT = 4;
const DOW = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const PALETTE = ['#BC5B39', '#C08A2E', '#7D8B4A', '#4F8466', '#3E7F87', '#4E5D94', '#7C5A86', '#A85A72', '#5B6472', '#8A6A4B'];
const THEME_CYCLE = ['auto', 'light', 'warm', 'dark', 'dim'];
const THEME_LABELS = { auto: 'auto', light: 'light', warm: 'warm', dark: 'dark', dim: 'dim' };
const THEME_META = { light: '#E9ECE6', warm: '#F2E9D8', dark: '#101310', dim: '#1A1D22' };

const EMOJI = [
  '📚','📖','✍️','🧠','💭','🗒️',
  '🏃','🏋️','🚴','🧘','🏊','🚶','🥗','🥦','🍎','💧','☕','😴','🛏️',
  '💼','💻','📝','💰','📊','📈','🎯','✅',
  '🎸','🎨','🎹','🎵','🎧','🎮','🎬','📷',
  '🧹','🧺','🚿','🪥','🧴',
  '🌱','🌳','☀️','🌙','⭐','❤️','🙏','💪',
  '🐕','🐈','👶','👪',
  '🚗','🚌','✈️','🚂',
  '📵','📱','📧','📞',
  '🔒','🔑','🚭','🍺','🍷',
  '🏆','🎁','🧪','🔬'
];

const ACCENTS = [
  { id: 'moss',   label: 'Moss',   light: '#2E5545', dark: '#79AD90' },
  { id: 'clay',   label: 'Clay',   light: '#8C3D22', dark: '#D98A75' },
  { id: 'indigo', label: 'Indigo', light: '#3A4A80', dark: '#93A3DA' },
  { id: 'plum',   label: 'Plum',   light: '#6B3B6B', dark: '#BC8FBC' },
  { id: 'ochre',  label: 'Ochre',  light: '#7A5A18', dark: '#CCA85A' },
  { id: 'slate',  label: 'Slate',  light: '#3F4A5C', dark: '#94A2B8' },
  { id: 'rose',   label: 'Rose',   light: '#8C3A52', dark: '#D8899E' },
  { id: 'teal',   label: 'Teal',   light: '#1F5E5E', dark: '#6DB5B5' }
];

const METRIC_DEFS = [
  { key: 'consistency',     label: 'Consistency',     hint: 'Share of scheduled days you finished' },
  { key: 'cleanDays',       label: 'Fully handled days', hint: 'Every scheduled habit handled' },
  { key: 'checkins',        label: 'Check-ins',       hint: 'Scheduled days you logged something' },
  { key: 'restDays',        label: 'Rest days',       hint: 'Taken on purpose, not counted as misses' },
  { key: 'currentStreak',   label: 'Longest streak',  hint: 'Best run going right now, across habits' },
  { key: 'bestDay',         label: 'Best single day', hint: 'Most habits handled in one day' },
  { key: 'daysSinceClean',  label: 'Days since fully handled', hint: 'How long since every scheduled habit was handled' },
  { key: 'lifetime',        label: 'Lifetime check-ins', hint: 'All time, across every habit' },
  { key: 'restLeft',        label: 'Rest days remaining',  hint: 'Remaining this month' },
  { key: 'improved',        label: 'Most improved',   hint: 'Biggest jump vs the previous period' }
];
const METRIC_KEYS = METRIC_DEFS.map(m => m.key);
const DEFAULT_CARDS = ['consistency', 'cleanDays', 'checkins', 'currentStreak'];

const $ = id => document.getElementById(id);
const clamp = (n, a, b) => Math.min(b, Math.max(a, n));
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function key(d) {
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}
function parseKey(k) {
    const p = String(k).split('-');
    return new Date(+p[0], +p[1] - 1, +p[2]);
}
function today() { const d = new Date(); d.setHours(0, 0, 0, 0); return d; }
function shift(d, n) { const c = new Date(d); c.setDate(c.getDate() + n); return c; }
function dow(d) { return (d.getDay() + 6) % 7; }
function isKey(k) { return typeof k === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(k); }
function uid() { return 'h' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }
function round(n) { return Math.round(n * 100) / 100; }
function fmt(n) { return String(round(n)); }
function human(n) { return n >= 100 ? String(Math.round(n)) : String(round(n)); }

function longDate(d) { return d.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' }); }
function shortDate(d) { return d.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }); }
function medDate(d) { return d.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' }); }
function logDate(d) { return d.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }); }

const state = {
    theme: 'auto',
    accent: 'moss',
    density: 'comfortable',
    view: 'today',
    todayFilter: 'all',
    horizon: '30',
    query: '',
    category: 'All',
    showArchived: false,
    statsCards: [...DEFAULT_CARDS],
    logFilter: 'all',
    logQuery: '',
    habits: []
};

let statsCache = new Map();
let undoSnapshot = null;
let confirmFn = null;
const draft = { id: null, type: 'binary', days: [0, 1, 2, 3, 4, 5, 6], color: PALETTE[0], icon: '', archived: false, restLimit: DEFAULT_REST_LIMIT };
const dayDraft = { id: null, dateKey: null, value: 0, done: false, rest: false };
let importDraft = null;

function normHabit(raw, i) {
    const h = raw && typeof raw === 'object' ? raw : {};
    const entries = {}, freezes = {}, notes = {};
    const tKey = key(today());

    if (h.entries && typeof h.entries === 'object') {
        for (const k of Object.keys(h.entries)) {
            if (!isKey(k) || k > tKey) continue;
            const v = h.entries[k];
            if (typeof v === 'number' && isFinite(v) && v > 0) entries[k] = round(v);
            else if (v === true) entries[k] = true;
        }
    }
    if (h.freezes && typeof h.freezes === 'object') {
        for (const k of Object.keys(h.freezes)) if (isKey(k) && h.freezes[k]) freezes[k] = true;
    }
    if (h.notes && typeof h.notes === 'object') {
        for (const k of Object.keys(h.notes)) {
            if (isKey(k) && typeof h.notes[k] === 'string' && h.notes[k].trim()) notes[k] = h.notes[k].trim().slice(0, 400);
        }
    }

    let days = [0, 1, 2, 3, 4, 5, 6];
    if (Array.isArray(h.days)) {
        const d = h.days.map(Number).filter(n => Number.isInteger(n) && n >= 0 && n <= 6);
        if (d.length) days = [...new Set(d)].sort((a, b) => a - b);
    }

    const firstLogged = Object.keys(entries).concat(Object.keys(freezes)).sort()[0];
    let created = null;
    if (h.createdAt) { const c = new Date(h.createdAt); if (!isNaN(c)) created = key(c); }
    const marks = [h.startDate, firstLogged, created].filter(isKey).sort();
    const start = marks[0] || tKey;

    return {
        id: typeof h.id === 'string' && h.id ? h.id : uid(),
        name: String(h.name || 'Untitled').trim().slice(0, 60) || 'Untitled',
        category: String(h.category || 'General').trim().slice(0, 24) || 'General',
        type: h.type === 'numeric' ? 'numeric' : 'binary',
        target: Math.max(0.5, Number(h.target) || 1),
        unit: String(h.unit || '').trim().slice(0, 16),
        color: /^#[0-9a-f]{6}$/i.test(h.color) ? h.color : PALETTE[i % PALETTE.length],
        desc: String(h.desc || h.description || '').trim().slice(0, 120),
        doneMsg: String(h.doneMsg || '').trim().slice(0, 60),
        icon: typeof h.icon === 'string' ? [...h.icon].slice(0, 3).join('').trim() : '',
        days,
        restLimit: Number.isInteger(h.restLimit) ? clamp(h.restLimit, 0, 31) : DEFAULT_REST_LIMIT,
        startDate: start,
        archived: !!h.archived,
        entries, freezes, notes
    };
}

function load() {
    try {
        const result = TallyStorage.read(localStorage, KEY, LEGACY_KEY);
        const p = result.value;
        if (!p) return;
        state.habits = p.habits.map(normHabit);
        if (THEME_CYCLE.includes(p.theme)) state.theme = p.theme;
        if (ACCENTS.some(a => a.id === p.accent)) state.accent = p.accent;
        if (['comfortable', 'compact'].includes(p.density)) state.density = p.density;
        if (['today', 'grid', 'stats', 'log'].includes(p.view)) state.view = p.view;
        if (['all', 'left', 'done'].includes(p.todayFilter)) state.todayFilter = p.todayFilter;
        if (['7', '30', '90', 'all'].includes(p.horizon)) state.horizon = p.horizon;
        if (Array.isArray(p.statsCards)) {
            const valid = p.statsCards.filter(k => METRIC_KEYS.includes(k));
            if (valid.length) state.statsCards = [...new Set(valid)];
        }
        if (result.recovered) setTimeout(() => toast('Recovered your last saved backup.'), 400);
        if (result.migrated) {
            save();
            setTimeout(() => toast('Brought over ' + state.habits.length + ' habits from the old version.'), 400);
        }
    } catch (e) {
        state.habits = [];
        console.error('Could not read saved data:', e);
        toast("Couldn't read saved data. Your data was left untouched.");
    }
}

function save() {
    statsCache = new Map();
    try {
        TallyStorage.write(localStorage, KEY, {
            theme: state.theme, accent: state.accent, density: state.density,
            view: state.view, todayFilter: state.todayFilter,
            horizon: state.horizon, statsCards: state.statsCards,
            habits: state.habits
        });
    } catch (e) {
        console.error('Could not save data:', e);
        toast("Couldn't save — this browser's storage is full or blocked.");
    }
}

function scheduled(h, d) { return h.days.includes(dow(d)); }
function isRest(h, k) { return !!h.freezes[k]; }
const STATE_LABELS = { full: 'Done', part: 'Part of the way', rest: 'Rest day', off: 'Not scheduled', miss: 'Missed', pending: 'Not logged yet' };

function isDone(h, k) {
    const v = h.entries[k];
    if (v === undefined) return false;
    if (h.type === 'numeric') return typeof v === 'number' && v >= h.target;
    return !!v;
}
function amount(h, k) {
    const v = h.entries[k];
    return typeof v === 'number' ? v : (v === true ? h.target : 0);
}
function dayState(h, d) {
    const k = key(d);
    const t = key(today());
    if (k > t) return 'future';
    if (isRest(h, k)) return 'rest';
    if (isDone(h, k)) return 'full';
    if (h.type === 'numeric' && amount(h, k) > 0) return 'part';
    if (!scheduled(h, d) || k < h.startDate) return 'off';
    if (k === t) return 'pending';
    return 'miss';
}
function restsThisMonth(h, k) {
    const m = k.slice(0, 7);
    return Object.keys(h.freezes).filter(x => x.startsWith(m)).length;
}
function restLimit(h) { return Number.isInteger(h.restLimit) ? h.restLimit : DEFAULT_REST_LIMIT; }

function stats(h) {
    if (statsCache.has(h.id)) return statsCache.get(h.id);
    const t = today(), tKey = key(t);
    const start = parseKey(h.startDate);
    let streak = 0;
    for (let d = new Date(t); key(d) >= h.startDate; d = shift(d, -1)) {
        const k = key(d);
        if (!scheduled(h, d)) continue;
        if (isDone(h, k)) { streak++; continue; }
        if (isRest(h, k)) continue;
        if (k === tKey) continue;
        break;
    }
    let best = 0, run = 0, opps = 0, hits = 0, rests = 0, total = 0, volume = 0;
    let last30 = 0, last30opp = 0;
    const cut30 = key(shift(t, -29));
    for (let d = new Date(start); key(d) <= tKey; d = shift(d, 1)) {
        const k = key(d);
        if (typeof h.entries[k] === 'number') volume += h.entries[k];
        else if (h.entries[k] === true) volume += h.target;
        if (isDone(h, k)) total++;
        if (!scheduled(h, d)) continue;
        if (isDone(h, k)) {
            run++; if (run > best) best = run;
            opps++; hits++;
            if (k >= cut30) { last30++; last30opp++; }
        } else if (isRest(h, k)) {
            rests++;
        } else {
            run = 0;
            if (k !== tKey) { opps++; if (k >= cut30) last30opp++; }
        }
    }
    const out = {
        streak, best, total, volume, rests,
        rate: opps ? Math.round((hits / opps) * 100) : null,
        rate30: last30opp ? Math.round((last30 / last30opp) * 100) : null,
        opps, hits
    };
    statsCache.set(h.id, out);
    return out;
}

function activeHabits() { return state.habits.filter(h => !h.archived); }
function dueToday() { const t = today(); return activeHabits().filter(h => scheduled(h, t) && key(t) >= h.startDate); }
function iconHtml(h) { return h.icon ? `<span class="h-icon" aria-hidden="true">${esc(h.icon)}</span>` : ''; }
const DONE_MSGS = ['Nice.', 'Done.', 'Good.', 'Solid.', "That's one.", 'Logged.', 'Kept it.', 'Good one.'];
function hashStr(s) {
    let h = 0;
    for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
    return Math.abs(h);
}
function doneMsg(h, k) {
    if (h.doneMsg) return h.doneMsg;
    return DONE_MSGS[hashStr(h.id + k) % DONE_MSGS.length];
}

function renderToday() {
    const t = today(), tKey = key(t);
    const due = dueToday();
    const done = due.filter(h => isDone(h, tKey) || isRest(h, tKey));

    $('t-done').textContent = done.length;
    $('t-of').textContent = 'of ' + due.length + (due.length === 1 ? ' habit done today' : ' habits done today');

    const off = activeHabits().length - due.length;
    $('t-offday').textContent = off > 0 ? off + (off === 1 ? ' habit off today' : ' habits off today') : '';

    document.querySelectorAll('[data-act="t-filter"]').forEach(b => {
        b.setAttribute('aria-pressed', String(b.dataset.filter === state.todayFilter));
    });

    const list = due.filter(h => {
        const d = isDone(h, tKey) || isRest(h, tKey);
        return state.todayFilter === 'left' ? !d : state.todayFilter === 'done' ? d : true;
    });

    const box = $('t-list'), empty = $('t-empty');
    $('t-toolbar').classList.toggle('hide', activeHabits().length === 0);
    $('backup-banner').classList.toggle('hide', activeHabits().length === 0);

    if (!list.length) {
        box.classList.add('hide');
        empty.classList.remove('hide');
        empty.innerHTML = emptyToday(activeHabits().length, due.length, done.length);
        return;
    }
    empty.classList.add('hide');
    box.classList.remove('hide');

    box.classList.add('sheet');
    box.innerHTML = list.map(h => todayRow(h, tKey)).join('');
}

function emptyToday(totalActive, dueCount, doneCount) {
    if (!totalActive) return `<div class="empty">
        <h3>Start with one habit</h3>
        <p>Pick the thing you'd be annoyed to skip. You can add more once it sticks.</p>
        <button class="btn btn-primary" data-act="new-habit"><svg><use href="#i-plus"/></svg>New habit</button>
        <button class="btn" data-act="sample">Load examples</button>
    </div>`;
    if (!dueCount) return `<div class="empty"><h3>Today is off</h3><p>None of your habits are scheduled for today. Rest counts.</p></div>`;
    if (state.todayFilter === 'left') return `<div class="empty"><h3>Nothing left</h3><p>All ${dueCount} logged. See you tomorrow.</p></div>`;
    if (state.todayFilter === 'done') return `<div class="empty"><h3>Nothing logged yet</h3><p>Tick the first one and the day stops being theoretical.</p>
        <button class="btn" data-act="t-filter" data-filter="all">Show all</button></div>`;
    return `<div class="empty"><h3>Nothing here</h3><p>Try a different filter.</p></div>`;
}

function todayRow(h, tKey) {
    const s = stats(h);
    const rest = isRest(h, tKey);
    const done = isDone(h, tKey);
    const note = h.notes[tKey];
    const num = h.type === 'numeric';
    const val = amount(h, tKey);

    const control = rest
        ? `<button class="check rest" data-act="toggle" data-id="${h.id}" title="Rest day — click to undo" aria-label="Remove rest day"><svg><use href="#i-rest"/></svg></button>`
        : num
            ? `<div class="stepper${done ? ' hit' : ''}">
                 <button data-act="step" data-id="${h.id}" data-d="-1" aria-label="Subtract from ${esc(h.name)}">&minus;</button>
                 <button class="val" data-act="open-day" data-id="${h.id}" data-date="${tKey}" title="Enter an exact amount">
                   <b>${fmt(val)}</b><i>of ${fmt(h.target)} ${esc(h.unit || '')}</i>
                 </button>
                 <button data-act="step" data-id="${h.id}" data-d="1" aria-label="Add to ${esc(h.name)}">+</button>
               </div>`
            : `<button class="check${done ? ' on' : ''}" data-act="toggle" data-id="${h.id}" aria-pressed="${done}" aria-label="${done ? 'Unmark' : 'Mark'} ${esc(h.name)}"><svg><use href="#i-check"/></svg></button>`;

    const metas = [];
    if (s.streak >= 3) metas.push(`<span class="streak"><b>${s.streak}</b> days in a row</span>`);
    if (num && !rest && val > 0 && !done) metas.push(`<span>${Math.round((val / h.target) * 100)}% of target</span>`);

    let noteBlock = '';
    if (note) {
        noteBlock = `<p class="note" data-act="open-note" data-id="${h.id}" data-date="${tKey}">${esc(note)}</p>`;
    } else if (!rest) {
        noteBlock = `<span class="note-placeholder" data-act="open-note" data-id="${h.id}" data-date="${tKey}">Add a note…</span>`;
    }

    let kicker = '';
    if (done && !rest) {
        kicker = `<p class="row-kicker done">${esc(doneMsg(h, tKey))}</p>`;
    } else if (!rest && h.desc) {
        kicker = `<p class="row-kicker">${esc(h.desc)}</p>`;
    }

    return `<div class="row${done || rest ? ' done' : ''}" style="--habit:${h.color}">
      <div class="row-tick"></div>
      <div class="row-main">
        <div class="row-title">
          <h3>${iconHtml(h)}${esc(h.name)}</h3>
          ${rest ? '<span class="row-meta" style="margin:0;color:var(--rest)">rest day</span>' : ''}
        </div>
        ${kicker}
        ${metas.length ? `<div class="row-meta">${metas.join('')}</div>` : ''}
        ${noteBlock}
      </div>
      <div class="row-side">
        ${control}
        <div class="row-actions">
          <button class="icon-btn" data-act="edit" data-id="${h.id}" aria-label="Edit ${esc(h.name)}"><svg><use href="#i-pencil"/></svg></button>
        </div>
      </div>
    </div>`;
}

function toggleHabit(id) {
    const h = state.habits.find(x => x.id === id);
    if (!h) return;
    const k = key(today());
    if (isRest(h, k)) { delete h.freezes[k]; }
    else if (h.type === 'numeric') {
        if (isDone(h, k)) delete h.entries[k]; else h.entries[k] = h.target;
    } else {
        if (h.entries[k]) delete h.entries[k]; else h.entries[k] = true;
    }
    save(); render();
}

function stepHabit(id, dir) {
    const h = state.habits.find(x => x.id === id);
    if (!h) return;
    const k = key(today());
    const step = h.target <= 3 ? 0.5 : h.target <= 20 ? 1 : 5;
    const next = Math.max(0, round(amount(h, k) + dir * step));
    if (next > 0) h.entries[k] = next; else delete h.entries[k];
    delete h.freezes[k];
    save(); render();
}

function buildCalendar() {
    const t = today();
    const end = shift(t, 6 - dow(t));
    const start = shift(end, -(WEEKS * 7 - 1));
    const cells = [];
    const months = [];
    let lastMonth = -1;
    for (let i = 0; i < WEEKS * 7; i++) {
        const d = shift(start, i);
        const col = Math.floor(i / 7);
        if (d.getMonth() !== lastMonth && d.getDate() <= 7) {
            if (!months.length || col - months[months.length - 1].col >= 3) {
                months.push({ col, name: d.toLocaleDateString(undefined, { month: 'short' }) });
            }
            lastMonth = d.getMonth();
        }
        cells.push(d);
    }
    return { cells, months, start, end };
}

const CAL = { data: null };
let gridOrder = [];
function calendar() { if (!CAL.data) CAL.data = buildCalendar(); return CAL.data; }

function renderGrid() {
    const cats = ['All', ...new Set(state.habits.filter(h => state.showArchived || !h.archived).map(h => h.category))];
    if (!cats.includes(state.category)) state.category = 'All';
    $('g-cats').innerHTML = cats.map(c =>
        `<option value="${esc(c)}">${esc(c === 'All' ? 'All categories' : c)}</option>`
    ).join('');
    $('g-cats').value = state.category;
    $('g-archived').setAttribute('aria-pressed', String(state.showArchived));

    const q = state.query;
    const list = state.habits.filter(h => {
        if (!state.showArchived && h.archived) return false;
        if (state.showArchived && !h.archived) return false;
        if (state.category !== 'All' && h.category !== state.category) return false;
        if (q && !(h.name.toLowerCase().includes(q) || h.desc.toLowerCase().includes(q) || h.category.toLowerCase().includes(q))) return false;
        return true;
    });

    gridOrder = list.map(h => h.id);

    const box = $('g-list'), empty = $('g-empty');
    if (!list.length) {
        box.classList.add('hide');
        empty.classList.remove('hide');
        empty.innerHTML = !state.habits.length
            ?             `<div class="empty"><h3>Nothing to show yet</h3><p>Every habit you add gets a year of squares here. Click a day to mark it; press Enter or long-press for details.</p>
               <button class="btn btn-primary" data-act="new-habit"><svg><use href="#i-plus"/></svg>New habit</button></div>`
            : state.showArchived
                ? `<div class="empty"><h3>No archived habits</h3><p>Archiving keeps the history but takes a habit off your daily list.</p></div>`
                : `<div class="empty"><h3>No match</h3><p>Nothing fits that filter.</p></div>`;
        return;
    }
    empty.classList.add('hide');
    box.classList.remove('hide');

    const { cells, months } = calendar();
    const tKey = key(today());

    box.innerHTML = list.map((h, idx) => {
        const s = stats(h);
        const daysTxt = h.days.length === 7 ? 'every day' : h.days.map(d => DOW[d]).join(' ');
        return `<div class="block" style="--habit:${h.color}">
        <div class="block-head">
          <div>
            <h3><span class="swatch"></span>${iconHtml(h)}${esc(h.name)}${h.archived ? ' <span style="font-weight:400;color:var(--ink-3);font-size:13px">archived</span>' : ''}</h3>
            <div class="stat-line">
              <span><b>${s.streak}</b> day streak</span>
              <span>best <b>${s.best}</b></span>
              <span><b>${s.rate == null ? '—' : s.rate + '%'}</b> of scheduled days</span>
              <span><b>${h.type === 'numeric' ? human(s.volume) + ' ' + esc(h.unit || '') : s.total}</b> total</span>
              <span>${esc(daysTxt)}</span>
            </div>
          </div>
          <div class="row-actions">
            <button class="icon-btn" data-act="move" data-id="${h.id}" data-dir="-1" aria-label="Move up" ${idx === 0 ? 'disabled' : ''}><svg><use href="#i-up"/></svg></button>
            <button class="icon-btn" data-act="move" data-id="${h.id}" data-dir="1" aria-label="Move down" ${idx === list.length - 1 ? 'disabled' : ''}><svg><use href="#i-down"/></svg></button>
            <button class="icon-btn" data-act="edit" data-id="${h.id}" aria-label="Edit"><svg><use href="#i-pencil"/></svg></button>
            <button class="icon-btn" data-act="delete" data-id="${h.id}" aria-label="Delete"><svg><use href="#i-trash"/></svg></button>
          </div>
        </div>

        <div class="grid-scroll" data-scroll="1">
          <div class="grid-inner">
            <div class="grid-gutter" style="padding-top:15px">
              ${DOW.map((d, i) => `<span>${i % 2 ? '' : d}</span>`).join('')}
            </div>
            <div class="grid-body">
              <div class="grid-months">${months.map(m => `<span style="left:${m.col * (CELL + GAP)}px">${esc(m.name)}</span>`).join('')}</div>
              <div class="grid-cells" data-grid="${h.id}">
                ${cells.map(d => cellHtml(h, d, tKey)).join('')}
              </div>
            </div>
          </div>
        </div>
        <div class="legend">
          <span>less</span>
          <i style="background:var(--cell-void)"></i>
          <i style="background:color-mix(in srgb, ${h.color} 32%, var(--cell-void))"></i>
          <i style="background:color-mix(in srgb, ${h.color} 62%, var(--cell-void))"></i>
          <i style="background:${h.color}"></i>
          <span>more</span>
          <i style="background:var(--rest-wash);box-shadow:inset 0 0 0 1px var(--rest);margin-left:10px"></i>
          <span>rest day</span>
          <span class="grid-hint">Click a day to mark it. Press Enter or long-press for details.</span>
        </div>
      </div>`;
    }).join('');
}

function cellHtml(h, d, tKey) {
    const k = key(d);
    const st = dayState(h, d);
    let cls = 'cell';
    if (st === 'future') cls += ' future';
    else if (st === 'rest') cls += ' rest';
    else if (st === 'off') cls += ' off';
    else if (st === 'pending') cls += ' pending';
    else if (st === 'full') cls += ' lv3';
    else if (st === 'part') {
        cls += amount(h, k) / h.target >= 0.5 ? ' lv2' : ' lv1';
    }
    if (k === tKey) cls += ' today';
    if (h.notes[k]) cls += ' noted';
    const tag = st === 'future' ? 'div' : 'button';
    let aria = '';
    if (st !== 'future') {
        aria = shortDate(d) + ' — ' + STATE_LABELS[st];
        if (h.type === 'numeric' && (st === 'full' || st === 'part')) aria += ', ' + fmt(amount(h, k)) + ' of ' + fmt(h.target) + ' ' + (h.unit || '');
        if (h.notes[k]) aria += ', has a note';
    }
    return `<${tag} class="${cls}" data-date="${k}"${aria ? ` aria-label="${esc(aria)}"` : ''}></${tag}>`;
}

function cellTip(e) {
    const el = e.target.closest('.cell');
    const tip = $('tip');
    if (!el || el.classList.contains('future')) { tip.classList.add('hide'); return; }
    const grid = el.closest('[data-grid]');
    if (!grid) return;
    const h = state.habits.find(x => x.id === grid.dataset.grid);
    if (!h) return;
    const k = el.dataset.date, d = parseKey(k);
    const st = dayState(h, d);
    const label = STATE_LABELS[st] || '';
    const detail = h.type === 'numeric' && (st === 'full' || st === 'part')
        ? ' — ' + fmt(amount(h, k)) + ' of ' + fmt(h.target) + ' ' + esc(h.unit || '')
        : '';
    tip.innerHTML = `<b>${esc(shortDate(d))}</b><br>${label}${detail}` +
        (h.notes[k] ? `<em>${esc(h.notes[k])}</em>` : '') +
        `<em>Click to toggle · Enter or long-press for details</em>`;
    tip.classList.remove('hide');
    const r = el.getBoundingClientRect(), tr = tip.getBoundingClientRect();
    let left = clamp(r.left + r.width / 2 - tr.width / 2, 8, window.innerWidth - tr.width - 8);
    let top = r.top - tr.height - 8;
    if (top < 8) top = r.bottom + 8;
    tip.style.left = left + 'px';
    tip.style.top = top + 'px';
}

function moveHabit(id, dir) {
    const pos = gridOrder.indexOf(id);
    const neighbour = gridOrder[pos + dir];
    if (pos < 0 || !neighbour) return;
    const a = state.habits.findIndex(h => h.id === id);
    const b = state.habits.findIndex(h => h.id === neighbour);
    if (a < 0 || b < 0) return;
    [state.habits[a], state.habits[b]] = [state.habits[b], state.habits[a]];
    save(); renderGrid(); scrollGridsToEnd();
}

function toggleCell(h, k) {
    if (k > key(today())) return;
    const prevEntry = h.entries[k];
    const hadEntry = Object.prototype.hasOwnProperty.call(h.entries, k);
    const prevRest = h.freezes[k];
    const hadRest = Object.prototype.hasOwnProperty.call(h.freezes, k);

    if (h.type === 'numeric') {
        if (isDone(h, k)) delete h.entries[k];
        else h.entries[k] = h.target;
    } else {
        if (h.entries[k]) delete h.entries[k];
        else h.entries[k] = true;
    }
    save();
    renderGrid(); scrollGridsToEnd();

    const d = parseKey(k);
    const nowDone = isDone(h, k);
    toast(`${h.name} · ${medDate(d)} — ${nowDone ? 'done' : 'cleared'}`, 'Undo', () => {
        if (hadEntry) h.entries[k] = prevEntry; else delete h.entries[k];
        if (hadRest) h.freezes[k] = true; else delete h.freezes[k];
        save(); renderGrid(); scrollGridsToEnd();
    });
}

function renderLog() {
    const habits = state.habits.slice();
    if (state.logFilter !== 'all' && !habits.some(h => h.id === state.logFilter)) state.logFilter = 'all';

    const pillBox = $('l-habits');
    if (!habits.length) pillBox.innerHTML = '';
    else {
        pillBox.innerHTML = '<option value="all">All habits</option>' +
            habits.map(h => `<option value="${esc(h.id)}">${esc(h.name)}</option>`).join('');
        pillBox.value = state.logFilter;
    }

    const q = state.logQuery;
    const entries = [];
    state.habits.forEach(h => {
        if (state.logFilter !== 'all' && h.id !== state.logFilter) return;
        Object.keys(h.notes).forEach(k => {
            const note = h.notes[k];
            if (q) {
                const hay = (h.name + ' ' + h.category + ' ' + note + ' ' + k).toLowerCase();
                if (!hay.includes(q)) return;
            }
            entries.push({ k, h, note, kind: 'note' });
        });
        Object.keys(h.freezes).forEach(k => {
            if (h.notes[k]) return;
            if (q) {
                const hay = (h.name + ' rest day ' + k).toLowerCase();
                if (!hay.includes(q)) return;
            }
            entries.push({ k, h, kind: 'rest' });
        });
    });

    const box = $('l-list'), empty = $('l-empty');
    if (!entries.length) {
        box.classList.add('hide');
        empty.classList.remove('hide');
        if (!state.habits.length) {
            empty.innerHTML = `<div class="empty"><h3>Nothing written yet</h3>
                <p>Notes you add on any habit's day will collect here, newest first.</p>
                <button class="btn btn-primary" data-act="new-habit"><svg><use href="#i-plus"/></svg>New habit</button></div>`;
        } else if (q) {
            empty.innerHTML = `<div class="empty"><h3>No matches</h3><p>Nothing matches "${esc(state.logQuery)}".</p>
                <button class="btn" data-act="l-clear">Clear search</button></div>`;
        } else {
            empty.innerHTML = `<div class="empty"><h3>No notes yet</h3>
                <p>Open any day from Daily or Grid and write a note. It'll show up here. Rest days appear too.</p></div>`;
        }
        return;
    }
    empty.classList.add('hide');
    box.classList.remove('hide');

    entries.sort((a, b) => b.k.localeCompare(a.k) || a.h.name.localeCompare(b.h.name));
    const days = new Map();
    entries.forEach(e => {
        if (!days.has(e.k)) days.set(e.k, []);
        days.get(e.k).push(e);
    });

    const tKey = key(today());
    box.innerHTML = [...days.entries()].map(([k, list]) => {
        const d = parseKey(k);
        const heading = k === tKey ? 'Today' : logDate(d);
        return `<div class="log-day">
          <div class="log-date" aria-label="${esc(heading)}">${esc(heading)}</div>
          ${list.map(e => {
            const h = e.h;
            if (e.kind === 'rest') {
                return `<div class="log-entry log-rest">
                  <span class="log-icon"><svg><use href="#i-rest"/></svg></span>
                  <div><div class="log-habit">${esc(h.name)} <em>rest day</em></div></div>
                </div>`;
            }
            return `<div class="log-entry">
              <span class="log-icon">${h.icon ? esc(h.icon) : `<span style="display:inline-block;width:9px;height:9px;border-radius:2px;background:${h.color};margin-top:6px"></span>`}</span>
              <div>
                <div class="log-habit">${esc(h.name)} <em>${esc(h.category)}</em></div>
                <div class="note">${esc(e.note)}</div>
              </div>
            </div>`;
        }).join('')}
        </div>`;
    }).join('');
}

function horizonDates() {
    const t = today();
    let n = 30;
    if (state.horizon === '7') n = 7;
    else if (state.horizon === '90') n = 90;
    else if (state.horizon === 'all') {
        const starts = activeHabits().map(h => h.startDate).sort();
        n = starts.length ? Math.round((t - parseKey(starts[0])) / 86400000) + 1 : 1;
        n = clamp(n, 1, 3650);
    }
    const out = [];
    for (let i = n - 1; i >= 0; i--) out.push(shift(t, -i));
    return out;
}

function chartMode() {
    if (state.horizon === '90') return 'week';
    if (state.horizon === 'all') {
        const n = horizonDates().length;
        return n > 120 ? 'month' : n > 45 ? 'week' : 'day';
    }
    return 'day';
}

function buildBuckets(habits, dates, mode) {
    const tKey = key(today());
    const buckets = [];
    const map = new Map();
    dates.forEach(d => {
        const k = key(d);
        let bKey;
        if (mode === 'day') bKey = k;
        else if (mode === 'week') bKey = key(shift(d, -dow(d)));
        else bKey = k.slice(0, 7);

        if (!map.has(bKey)) {
            const b = { bKey, firstDate: d, lastDate: d, due: 0, hit: 0, rest: 0 };
            map.set(bKey, b);
            buckets.push(b);
        }
        const b = map.get(bKey);
        b.lastDate = d;
        habits.forEach(h => {
            if (!scheduled(h, d) || k < h.startDate) return;
            if (isRest(h, k)) { b.rest++; return; }
            b.due++;
            if (isDone(h, k)) b.hit++;
        });
    });
    buckets.forEach(b => {
        const denom = b.due + b.rest;
        b.pct = denom ? Math.round((b.hit + b.rest) / denom * 100) : null;
        b.hitShown = b.hit + b.rest;
        b.oppShown = denom;
    });
    return buckets;
}

function bucketLabel(b, mode) {
    if (mode === 'day') return medDate(b.firstDate);
    if (mode === 'week') return 'Week of ' + b.firstDate.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
    return b.firstDate.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
}

function computeMetricPool(habits, dates) {
    const t = today(), tKey = key(t);
    let opps = 0, hits = 0, rests = 0, perfect = 0, logged = 0;
    let bestDayN = 0, bestDayK = null;

    dates.forEach(d => {
        const k = key(d);
        let dayOpps = 0, dayHits = 0, dayRests = 0, dayDue = 0;
        habits.forEach(h => {
            if (!scheduled(h, d) || k < h.startDate) return;
            if (isRest(h, k)) { dayRests++; return; }
            dayDue++;
            if (isDone(h, k)) { dayHits++; dayOpps++; }
            else if (k !== tKey) dayOpps++;
        });
        opps += dayOpps; hits += dayHits; rests += dayRests;
        if (dayHits > 0) logged++;
        if (dayDue + dayRests > 0 && dayHits + dayRests === dayDue + dayRests) perfect++;
        if (dayHits + dayRests > bestDayN) { bestDayN = dayHits + dayRests; bestDayK = k; }
    });

    let daysSinceClean = null;
    for (let d = new Date(t), i = 0; i < 500; d = shift(d, -1), i++) {
        const k = key(d);
        let due = 0, done = 0;
        habits.forEach(h => {
            if (!scheduled(h, d) || k < h.startDate) return;
            due++;
            if (isRest(h, k) || isDone(h, k)) done++;
        });
        if (!due) continue;
        if (done === due) { daysSinceClean = i; break; }
    }

    const lifetime = state.habits.reduce((a, h) => a + Object.keys(h.entries).length, 0);
    const month = tKey.slice(0, 7);
    const restUsed = state.habits.reduce((a, h) => a + Object.keys(h.freezes).filter(k => k.startsWith(month)).length, 0);
    const restLeft = Math.max(0, habits.reduce((n, h) => n + restLimit(h), 0) - restUsed);
    const maxStreak = habits.length ? Math.max(...habits.map(h => stats(h).streak)) : 0;

    let improved = null;
    if (dates.length >= 2) {
        const n = dates.length;
        const prevEnd = shift(dates[0], -1);
        const prevStart = shift(prevEnd, -(n - 1));
        const rateOf = (h, a, b) => {
            let o = 0, hit = 0;
            for (let d = new Date(a); key(d) <= key(b); d = shift(d, 1)) {
                const k = key(d);
                if (!scheduled(h, d) || k < h.startDate || isRest(h, k)) continue;
                if (isDone(h, k)) { hit++; o++; }
                else if (k !== tKey) o++;
            }
            return o ? hit / o : null;
        };
        let bestDelta = 0;
        habits.forEach(h => {
            const r1 = rateOf(h, dates[0], dates[dates.length - 1]);
            const r2 = rateOf(h, prevStart, prevEnd);
            if (r1 == null || r2 == null) return;
            const delta = r1 - r2;
            if (delta > bestDelta) { bestDelta = delta; improved = { h, delta: Math.round(delta * 100) }; }
        });
    }

    const consistency = opps ? Math.round(hits / opps * 100) : null;

    return {
        consistency:    { value: consistency == null ? '—' : consistency + '%', label: 'consistency', sub: hits + ' of ' + opps + ' scheduled days done' },
        cleanDays:      { value: perfect, label: perfect === 1 ? 'fully handled day' : 'fully handled days', sub: 'every scheduled habit handled' },
        checkins:       { value: hits, label: 'check-ins', sub: logged + ' days with something logged' },
        restDays:       { value: rests, label: rests === 1 ? 'rest day' : 'rest days', sub: 'taken on purpose, not counted as misses' },
        currentStreak:  { value: maxStreak, label: 'day streak', sub: 'longest run going right now' },
        bestDay:        { value: bestDayN || '—', label: 'best single day', sub: bestDayK ? medDate(parseKey(bestDayK)) : 'nothing logged yet' },
        daysSinceClean: { value: daysSinceClean == null ? '—' : daysSinceClean,
                          label: daysSinceClean === 1 ? 'day since fully handled' : 'days since fully handled',
                          sub: daysSinceClean == null ? 'no fully handled day yet' : daysSinceClean === 0 ? 'every scheduled habit is handled today' : 'last fully handled day' },
        lifetime:       { value: lifetime, label: 'lifetime check-ins', sub: 'all time, across every habit' },
        restLeft:       { value: restLeft, label: restLeft === 1 ? 'rest day remaining' : 'rest days remaining', sub: 'this month' },
        improved:       improved
            ? { value: improved.h.name, label: 'most improved', sub: '+' + improved.delta + '% vs previous period' }
            : { value: '—', label: 'most improved', sub: 'not enough history yet' }
    };
}

function renderStats() {
    document.querySelectorAll('[data-act="horizon"]').forEach(b =>
        b.setAttribute('aria-pressed', String(b.dataset.h === state.horizon)));

    const body = $('s-body');
    const habits = activeHabits();

    if (!habits.length) {
        $('s-range').textContent = '';
        body.innerHTML = `<div class="sheet"><div class="empty"><h3>No numbers yet</h3>
          <p>Add a habit and log a few days. The maths gets interesting after about two weeks.</p>
          <button class="btn btn-primary" data-act="new-habit"><svg><use href="#i-plus"/></svg>New habit</button></div></div>`;
        return;
    }

    const dates = horizonDates();
    $('s-range').textContent = dates.length === 1 ? 'Today' : shortDate(dates[0]) + ' to ' + shortDate(dates[dates.length - 1]);

    const pool = computeMetricPool(habits, dates);

    const cards = state.statsCards.filter(k => pool[k]);
    const figures = cards.length
        ? `<div class="figures">${cards.map(k => {
            const m = pool[k];
            const long = String(m.value).length > 8;
            return `<div class="figure"><b class="${long ? 'small' : ''}">${esc(String(m.value))}</b><span>${esc(m.label)}</span><small>${esc(m.sub)}</small></div>`;
        }).join('')}</div>`
        : `<div class="panel" style="margin-top:0;text-align:center">
            <p class="hint" style="margin:0 0 10px">No stat cards selected.</p>
            <button class="btn btn-sm" data-act="open-cards">Choose cards</button>
           </div>`;

    const mode = chartMode();
    const buckets = buildBuckets(habits, dates, mode);

    const modeLabel = mode === 'day' ? 'Daily completion' : mode === 'week' ? 'Weekly completion' : 'Monthly completion';
    const modeHint = "Each bar shows the percentage of scheduled habits completed in that period.";
    const totalHit = buckets.reduce((sum, b) => sum + b.hitShown, 0);
    const totalOpp = buckets.reduce((sum, b) => sum + b.oppShown, 0);
    const overallPct = totalOpp ? Math.round(totalHit / totalOpp * 100) : null;

    const trend = `<div class="panel">
      <h3>${modeLabel}</h3>
      <p class="hint">${modeHint}</p>
      <div class="chart-summary"><b>${overallPct == null ? '—' : overallPct + '%'}</b><span>overall · ${totalHit} of ${totalOpp} scheduled check-ins</span></div>
      <div class="hbars${buckets.length > 12 ? ' dense' : ''}" role="img" aria-label="Completion trend: ${esc(buckets.map(b => bucketLabel(b, mode) + ' ' + (b.pct == null ? 'nothing scheduled' : b.pct + ' percent')).join('; '))}">
        ${buckets.map(b => {
            const h = b.pct == null ? 0 : Math.max(2, Math.round(b.pct * 1.24));
            const value = b.pct == null ? '—' : b.pct + '%';
            return `<i class="hbar ${b.pct ? '' : 'zero'}" style="height:${h || 2}px" title="${esc(bucketLabel(b, mode))} — ${b.pct == null ? 'nothing scheduled' : b.hitShown + ' of ' + b.oppShown}" tabindex="0"><b class="hbar-value">${value}</b></i>`;
        }).join('')}
      </div>
      <div class="xlabels">
        <span>${esc(bucketLabel(buckets[0], mode))}</span>
        ${buckets.length >= 7 ? `<span>${esc(bucketLabel(buckets[Math.floor(buckets.length / 2)], mode))}</span>` : ''}
        <span>${esc(bucketLabel(buckets[buckets.length - 1], mode))}</span>
      </div>
      <p class="sr">${esc(buckets.map(b => bucketLabel(b, mode) + ': ' + (b.pct == null ? 'nothing scheduled' : b.hitShown + ' of ' + b.oppShown + ' completed')).join('. '))}</p>
    </div>`;

    const byDow = [[0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0]];
    const tKey = key(today());
    dates.forEach(d => {
        const k = key(d);
        habits.forEach(h => {
            if (!scheduled(h, d) || k < h.startDate) return;
            if (isRest(h, k)) return;
            if (isDone(h, k)) { byDow[dow(d)][0]++; byDow[dow(d)][1]++; }
            else if (k !== tKey) byDow[dow(d)][1]++;
        });
    });
    const dowPct = byDow.map(([h, o]) => o ? Math.round(h / o * 100) : null);
    const bestDow = dowPct.reduce((best, p, i) => (p != null && (best < 0 || p > dowPct[best])) ? i : best, -1);
    const worstDow = dowPct.reduce((w, p, i) => (p != null && (w < 0 || p < dowPct[w])) ? i : w, -1);

    const week = `<div class="panel">
      <h3>Which days you keep</h3>
      <p class="hint">${bestDow >= 0 && worstDow >= 0 && bestDow !== worstDow
            ? `${DOW[bestDow]} is your strongest day, ${DOW[worstDow]} your weakest.`
            : 'Not enough history yet to call a pattern.'}</p>
      <div class="wbars" role="img" aria-label="Completion by weekday: ${esc(dowPct.map((p, i) => DOW[i] + ' ' + (p == null ? 'no data' : p + ' percent')).join('; '))}">
        ${dowPct.map((p, i) => `<div class="wbar">
            <b>${p == null ? '—' : p + '%'}</b>
            <i style="height:${p == null ? 2 : Math.max(2, Math.round(p * 1.04))}px;${p == null ? 'background:var(--rule-2)' : ''}"></i>
            <span>${DOW[i]}</span>
          </div>`).join('')}
      </div>
      <p class="sr">${esc(dowPct.map((p, i) => DOW[i] + ': ' + (p == null ? 'no data' : p + ' percent')).join('. '))}</p>
    </div>`;

    const rows = habits.map(h => {
        const s = stats(h);
        let o = 0, hit = 0;
        dates.forEach(d => {
            const k = key(d);
            if (!scheduled(h, d) || k < h.startDate || isRest(h, k)) return;
            if (isDone(h, k)) { hit++; o++; }
            else if (k !== tKey) o++;
        });
        const pct = o ? Math.round(hit / o * 100) : null;
        return { h, s, pct, hit, o };
    }).sort((a, b) => (b.pct == null ? -1 : b.pct) - (a.pct == null ? -1 : a.pct));

    const table = `<div class="panel">
      <h3>Habit by habit</h3>
      <p class="hint">Over the selected range. Rest days are left out of the maths.</p>
      <table class="rank">
        <caption class="sr">Habit completion ranking for the selected range</caption>
        <thead><tr>
          <th>Habit</th><th style="width:38%">Kept</th>
          <th class="n">Streak</th><th class="n">Best</th>
        </tr></thead>
        <tbody>
        ${rows.map(r => `<tr style="--habit:${r.h.color}">
          <td><span class="nm"><span class="swatch"></span>${r.h.icon ? `<span class="h-icon" aria-hidden="true">${esc(r.h.icon)}</span>` : ''}${esc(r.h.name)}</span></td>
          <td>
            <div style="display:flex;align-items:center;gap:9px">
              <span class="meter" style="flex:1"><i style="width:${r.pct || 0}%"></i></span>
              <span style="min-width:62px;color:var(--ink-2);font-size:12px">${r.pct == null ? '—' : r.pct + '%'} <span style="color:var(--ink-3)">(${r.hit}/${r.o})</span></span>
            </div>
          </td>
          <td class="n">${r.s.streak}</td>
          <td class="n">${r.s.best}</td>
        </tr>`).join('')}
        </tbody>
      </table>
    </div>`;

    body.innerHTML = figures + trend + week + table;
}

let lastFocus = null;

function openModal(id) {
    lastFocus = document.activeElement;
    const m = $(id);
    m.classList.remove('hide');
    requestAnimationFrame(() => m.classList.add('show'));
    document.body.style.overflow = 'hidden';
    const first = m.querySelector('input:not([type=hidden]), textarea, button.btn-primary');
    if (first) setTimeout(() => first.focus(), 40);
}
function closeModal(id) {
    const m = $(id);
    if (!m || m.classList.contains('hide')) return;
    m.classList.remove('show');
    setTimeout(() => {
        m.classList.add('hide');
        if (!document.querySelector('.scrim:not(.hide)')) document.body.style.overflow = '';
    }, 150);
    if (lastFocus && lastFocus.focus) lastFocus.focus();
}
function openConfirm(title, msg, fn, label) {
    $('c-title').textContent = title;
    $('c-msg').textContent = msg;
    $('c-ok').textContent = label || 'Confirm';
    confirmFn = fn;
    openModal('m-confirm');
}

function openDay(id, dateKey, focusNote) {
    const h = state.habits.find(x => x.id === id);
    if (!h || !isKey(dateKey) || dateKey > key(today())) return;
    dayDraft.id = id;
    dayDraft.dateKey = dateKey;
    dayDraft.rest = isRest(h, dateKey);
    dayDraft.value = amount(h, dateKey);
    dayDraft.done = isDone(h, dateKey);

    $('m-day-title').textContent = (h.icon ? h.icon + ' ' : '') + h.name;
    const d = parseKey(dateKey);
    const off = !scheduled(h, d) ? ' — not a scheduled day' : dateKey === key(today()) ? ' — today' : '';
    $('m-day-date').textContent = shortDate(d) + off;
    $('m-day-note').value = h.notes[dateKey] || '';

    drawDayEntry(h);
    drawRestBtn(h);
    openModal('m-day');
    if (focusNote) setTimeout(() => $('m-day-note').focus(), 110);
}

function drawDayEntry(h) {
    const box = $('m-day-entry');
    if (dayDraft.rest) {
        box.innerHTML = `<p class="callout">Marked as a rest day. Your streak carries on and the day isn't counted as a miss.</p>`;
        return;
    }
    if (h.type === 'numeric') {
        const max = Math.max(h.target * 2, dayDraft.value * 1.25, 1);
        const step = h.target <= 3 ? 0.5 : h.target <= 20 ? 1 : 5;
        const pct = clamp(Math.round(dayDraft.value / h.target * 100), 0, 100);
        box.innerHTML = `
        <div class="field">
          <div class="bigval"><b id="dv">${fmt(dayDraft.value)}</b><span>of ${fmt(h.target)} ${esc(h.unit || '')}</span></div>
          <div class="bar-track"><i id="dbar" style="width:${pct}%"></i></div>
          <input type="range" id="dslider" min="0" max="${round(max)}" step="${step}" value="${dayDraft.value}" aria-label="Amount">
          <div style="display:flex;gap:8px">
            <button type="button" class="btn btn-sm" data-act="day-step" data-d="-${step}" style="flex:1;justify-content:center">&minus;${step}</button>
            <button type="button" class="btn btn-sm" data-act="day-step" data-d="${step}" style="flex:1;justify-content:center">+${step}</button>
            <button type="button" class="btn btn-sm" data-act="day-set" data-v="${h.target}" style="flex:1;justify-content:center">Hit target</button>
            <button type="button" class="btn btn-sm" data-act="day-set" data-v="0" style="flex:1;justify-content:center">Zero</button>
          </div>
        </div>`;
        const sl = $('dslider');
        sl.addEventListener('input', () => setDayValue(parseFloat(sl.value)));
    } else {
        box.innerHTML = `
        <div class="field">
          <span class="field-label">Did you do it?</span>
          <div class="seg">
            <button type="button" data-act="day-done" data-v="1" aria-pressed="${dayDraft.done}">Yes</button>
            <button type="button" data-act="day-done" data-v="0" aria-pressed="${!dayDraft.done}">No</button>
          </div>
        </div>`;
    }
}

function setDayValue(v) {
    const h = state.habits.find(x => x.id === dayDraft.id);
    if (!h) return;
    dayDraft.value = Math.max(0, round(v || 0));
    dayDraft.done = dayDraft.value >= h.target;
    if (dayDraft.value > 0 && dayDraft.rest) { dayDraft.rest = false; drawDayEntry(h); drawRestBtn(h); return; }
    const dv = $('dv'), bar = $('dbar'), sl = $('dslider');
    if (dv) dv.textContent = fmt(dayDraft.value);
    if (bar) bar.style.width = clamp(Math.round(dayDraft.value / h.target * 100), 0, 100) + '%';
    if (sl) {
        const curMax = parseFloat(sl.max) || 0;
        if (dayDraft.value > curMax) sl.max = round(Math.max(dayDraft.value * 1.1, h.target * 2));
        if (parseFloat(sl.value) !== dayDraft.value) sl.value = dayDraft.value;
    }
}

function drawRestBtn(h) {
    const used = restsThisMonth(h, dayDraft.dateKey);
    $('m-day-rest-txt').textContent = dayDraft.rest ? 'Rest day is on' : 'Mark as a rest day';
    $('m-day-rest').classList.toggle('btn-primary', dayDraft.rest);
    $('m-day-rest-help').textContent = `${used} of ${restLimit(h)} rest days used this month.`;
}

function saveDay(e) {
    e.preventDefault();
    const h = state.habits.find(x => x.id === dayDraft.id);
    if (!h) return;
    const k = dayDraft.dateKey;
    if (dayDraft.rest) {
        h.freezes[k] = true;
        delete h.entries[k];
    } else {
        delete h.freezes[k];
        if (h.type === 'numeric') {
            if (dayDraft.value > 0) h.entries[k] = dayDraft.value; else delete h.entries[k];
        } else {
            if (dayDraft.done) h.entries[k] = true; else delete h.entries[k];
        }
    }
    const note = $('m-day-note').value.trim();
    if (note) h.notes[k] = note.slice(0, 400); else delete h.notes[k];
    if (k < h.startDate) h.startDate = k;
    save(); closeModal('m-day'); render();
}

function clearDay() {
    const h = state.habits.find(x => x.id === dayDraft.id);
    if (!h) return;
    const k = dayDraft.dateKey;
    delete h.entries[k]; delete h.freezes[k]; delete h.notes[k];
    save(); closeModal('m-day'); render();
    toast(shortDate(parseKey(k)) + ' cleared.');
}

function openHabit(id) {
    const h = id ? state.habits.find(x => x.id === id) : null;
    draft.id = h ? h.id : null;
    draft.type = h ? h.type : 'binary';
    draft.days = h ? [...h.days] : [0, 1, 2, 3, 4, 5, 6];
    draft.color = h ? h.color : PALETTE[state.habits.length % PALETTE.length];
    draft.icon = h ? h.icon : '';
    draft.archived = h ? h.archived : false;
    draft.restLimit = h ? restLimit(h) : DEFAULT_REST_LIMIT;

    $('m-habit-title').textContent = h ? 'Edit habit' : 'New habit';
    $('h-more-options').open = !!h;
    $('h-id').value = h ? h.id : '';
    $('h-name').value = h ? h.name : '';
    $('h-target').value = h && h.type === 'numeric' ? h.target : '';
    $('h-unit').value = h ? h.unit : '';
    $('h-category').value = h ? h.category : '';
    $('h-desc').value = h ? h.desc : '';
    $('h-donemsg').value = h ? h.doneMsg : '';
    $('h-rest-limit').value = draft.restLimit;

    $('cat-list').innerHTML = [...new Set(state.habits.map(x => x.category))]
        .map(c => `<option value="${esc(c)}">`).join('');
    $('h-colors').innerHTML = PALETTE.map(c =>
        `<button type="button" data-act="h-color" data-c="${c}" style="background:${c}" aria-label="Colour ${c}"></button>`).join('');
    $('h-emoji').innerHTML = EMOJI.map(e =>
        `<button type="button" data-act="h-emoji" data-e="${esc(e)}" aria-label="Icon ${esc(e)}">${e}</button>`).join('');

    const arch = $('h-archive');
    arch.classList.toggle('hide', !h);
    arch.textContent = draft.archived ? 'Restore from archive' : 'Archive';
    $('h-phase').classList.toggle('hide', !h || draft.archived);
    drawDraft();
    openModal('m-habit');
}

function drawDraft() {
    document.querySelectorAll('[data-act="h-type"]').forEach(b =>
        b.setAttribute('aria-pressed', String(b.dataset.type === draft.type)));
    $('h-numeric').classList.toggle('hide', draft.type !== 'numeric');
    $('h-days').innerHTML = DOW.map((d, i) =>
        `<button type="button" data-act="h-day" data-d="${i}" aria-pressed="${draft.days.includes(i)}">${d[0]}${d[1]}</button>`).join('');
    document.querySelectorAll('[data-act="h-color"]').forEach(b =>
        b.setAttribute('aria-pressed', String(b.dataset.c === draft.color)));
    document.querySelectorAll('[data-act="h-emoji"]').forEach(b =>
        b.setAttribute('aria-pressed', String(b.dataset.e === draft.icon)));
}

function saveHabit(e) {
    e.preventDefault();
    const name = $('h-name').value.trim();
    if (!name) return;
    if (!draft.days.length) { toast('Pick at least one day of the week.'); return; }
    const payload = {
        name,
        category: $('h-category').value.trim() || 'General',
        type: draft.type,
        target: draft.type === 'numeric' ? Math.max(0.5, parseFloat($('h-target').value) || 1) : 1,
        unit: draft.type === 'numeric' ? $('h-unit').value.trim() : '',
        color: draft.color,
        icon: draft.icon,
        desc: $('h-desc').value.trim(),
        doneMsg: $('h-donemsg').value.trim(),
        restLimit: clamp(parseInt($('h-rest-limit').value, 10) || 0, 0, 31),
        days: [...draft.days].sort((a, b) => a - b)
    };
    if (draft.id) {
        const h = state.habits.find(x => x.id === draft.id);
        if (h) Object.assign(h, payload);
    } else {
        state.habits.push(normHabit({ ...payload, startDate: key(today()) }, state.habits.length));
    }

    save(); closeModal('m-habit'); render();
    toast(draft.id ? 'Saved.' : '"' + name + '" added.');
}

function startNewPhase() {
    const h = state.habits.find(x => x.id === draft.id);
    if (!h) return;
    openConfirm('Start a new phase?', 'The current habit will be archived and a fresh phase will start today. Its history stays intact.', () => {
        h.archived = true;
        const next = { ...h, id: uid(), startDate: key(today()), archived: false, entries: {}, freezes: {}, notes: {} };
        state.habits.push(normHabit(next, state.habits.length));
        save(); closeModal('m-habit'); render();
        toast('New phase started for "' + h.name + '".');
    }, 'Start phase');
}

function archiveHabit() {
    const h = state.habits.find(x => x.id === draft.id);
    if (!h) return;
    h.archived = !h.archived;
    save(); closeModal('m-habit'); render();
    toast(h.archived ? '"' + h.name + '" archived. Its history is kept.' : '"' + h.name + '" is back.');
}

function deleteHabit(id) {
    const h = state.habits.find(x => x.id === id);
    if (!h) return;
    const days = Object.keys(h.entries).length;
    openConfirm('Delete "' + h.name + '"?',
        days ? days + ' logged days go with it. Archiving keeps the history instead.' : 'It has no history yet.',
        () => {
            undoSnapshot = JSON.parse(JSON.stringify(state.habits));
            state.habits = state.habits.filter(x => x.id !== id);
            save(); render();
            toast('Deleted "' + h.name + '".', 'Undo', () => {
                state.habits = undoSnapshot.map(normHabit);
                undoSnapshot = null; save(); render();
            });
        }, 'Delete');
}

function refreshAccentSwatches() {
    const dark = document.documentElement.getAttribute('data-mode') === 'dark';
    document.querySelectorAll('[data-act="accent"]').forEach(b => {
        const a = ACCENTS.find(x => x.id === b.dataset.v);
        if (a) b.style.background = dark ? a.dark : a.light;
    });
}

function openAppear() {
    $('a-accents').innerHTML = ACCENTS.map(a =>
        `<button type="button" data-act="accent" data-v="${a.id}" aria-label="${a.label}" title="${a.label}"></button>`
    ).join('');
    refreshAccentSwatches();
    document.querySelectorAll('[data-act="accent"]').forEach(b =>
        b.setAttribute('aria-pressed', String(b.dataset.v === state.accent)));
    document.querySelectorAll('[data-act="theme-set"]').forEach(b =>
        b.setAttribute('aria-pressed', String(b.dataset.v === state.theme)));
    document.querySelectorAll('[data-act="density"]').forEach(b =>
        b.setAttribute('aria-pressed', String(b.dataset.v === state.density)));
    openModal('m-appear');
}

function openCards() {
    $('c-cards').innerHTML = METRIC_DEFS.map(m =>
        `<label><input type="checkbox" data-act="card" data-k="${m.key}" ${state.statsCards.includes(m.key) ? 'checked' : ''}>
          <span>${esc(m.label)}</span><small>${esc(m.hint)}</small></label>`
    ).join('');
    openModal('m-cards');
}

function openData() {
    let bytes = 0;
    try { bytes = new Blob([localStorage.getItem(KEY) || '']).size; } catch (e) { }
    const n = state.habits.length;
    const logged = state.habits.reduce((a, h) => a + Object.keys(h.entries).length, 0);
    const notes = state.habits.reduce((a, h) => a + Object.keys(h.notes).length, 0);
    $('d-size').textContent = `${n} habit${n === 1 ? '' : 's'}, ${logged} logged days, ${notes} note${notes === 1 ? '' : 's'}, ${(bytes / 1024).toFixed(1)} KB.`;
    openModal('m-data');
}

function exportData() {
    const payload = {
        app: 'tally', version: TallyStorage.VERSION, exported: new Date().toISOString(),
        settings: {
            theme: state.theme, accent: state.accent, density: state.density,
            horizon: state.horizon, statsCards: state.statsCards
        },
        habits: state.habits
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'tally-' + key(today()) + '.json';
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    toast('Exported.');
}

function importData(file) {
    const r = new FileReader();
    r.onload = () => {
        let imported;
        try {
            imported = TallyStorage.parseImport(r.result, normHabit);
        } catch (e) {
            toast(e.message || "That file isn't valid Tally data.");
            return;
        }
        importDraft = imported;
        $('m-import-summary').textContent = `${importDraft.habits.length} habit${importDraft.habits.length === 1 ? '' : 's'} found. Choose replace or merge.`;
        openModal('m-import');
    };
    r.readAsText(file);
}

function applyImportedSettings(s) {
    if (!s) return;
    if (THEME_CYCLE.includes(s.theme)) state.theme = s.theme;
    if (ACCENTS.some(a => a.id === s.accent)) state.accent = s.accent;
    if (['comfortable', 'compact'].includes(s.density)) state.density = s.density;
    if (['7', '30', '90', 'all'].includes(s.horizon)) state.horizon = s.horizon;
    if (Array.isArray(s.statsCards)) {
        const valid = s.statsCards.filter(k => METRIC_KEYS.includes(k));
        if (valid.length) state.statsCards = [...new Set(valid)];
    }
    applyAppearance();
}

function mergeImportedHabits(imported) {
    return TallyCore.mergeHabits(state.habits, imported, normHabit);
}

function finishImport(mode) {
    if (!importDraft) return;
    if (mode === 'merge') {
        state.habits = mergeImportedHabits(importDraft.habits);
        toast('Merged ' + importDraft.habits.length + ' habits.');
    } else {
        state.habits = importDraft.habits;
        applyImportedSettings(importDraft.settings);
        toast('Imported ' + state.habits.length + ' habits.');
    }
    importDraft = null;
    save(); closeModal('m-import'); closeModal('m-data'); render();
}

function loadSample() {
    const t = today();
    const gen = (prob, num, target) => {
        const e = {};
        for (let i = 1; i < 120; i++) {
            if (Math.random() > prob) continue;
            const k = key(shift(t, -i));
            if (!num) { e[k] = true; continue; }
            e[k] = Math.random() < 0.78
                ? target + Math.round(Math.random() * target * 0.25)
                : Math.max(1, Math.round(target * (0.3 + Math.random() * 0.5)));
        }
        return e;
    };
    const make = () => ([
        { name: 'Read', category: 'Mind', type: 'numeric', target: 20, unit: 'pages', color: PALETTE[3], icon: '📚', desc: 'Twenty pages is small enough to never skip.', entries: gen(.72, true, 20), startDate: key(shift(t, -119)) },
        { name: 'Train', category: 'Body', type: 'binary', days: [0, 2, 4], color: PALETTE[0], icon: '🏋️', entries: gen(.6), startDate: key(shift(t, -119)) },
        { name: 'Job applications', category: 'Work', type: 'numeric', target: 3, unit: 'sent', days: [0, 1, 2, 3, 4], color: PALETTE[5], icon: '💼', entries: gen(.55, true, 3), startDate: key(shift(t, -119)) },
        { name: 'No phone before noon', category: 'Mind', type: 'binary', color: PALETTE[6], icon: '📵', entries: gen(.45), startDate: key(shift(t, -119)) }
    ]);
    const apply = () => {
        state.habits = make().map(normHabit);
        save(); closeModal('m-data'); render();
        toast('Example habits loaded.');
    };
    if (!state.habits.length) apply();
    else openConfirm('Replace your habits?', 'The examples overwrite what you have. Export first if you want it back.', apply, 'Replace');
}

function resetAll() {
    openConfirm('Delete everything?', 'Every habit, check-in and note goes. This cannot be undone.', () => {
        undoSnapshot = JSON.parse(JSON.stringify(state.habits));
        state.habits = [];
        save(); closeModal('m-data'); render();
        toast('Everything deleted.', 'Undo', () => {
            state.habits = undoSnapshot.map(normHabit);
            undoSnapshot = null; save(); render();
        });
    }, 'Delete everything');
}

function toast(msg, actionLabel, action) {
    const el = document.createElement('div');
    el.className = 'toast';
    el.innerHTML = `<span>${esc(msg)}</span>`;
    if (actionLabel) {
        const b = document.createElement('button');
        b.textContent = actionLabel;
        b.addEventListener('click', () => { action(); el.remove(); });
        el.appendChild(b);
    }
    $('toasts').appendChild(el);
    requestAnimationFrame(() => el.classList.add('show'));
    setTimeout(() => {
        el.classList.remove('show');
        setTimeout(() => el.remove(), 200);
    }, actionLabel ? 7000 : 2800);
}

const media = window.matchMedia
    ? window.matchMedia('(prefers-color-scheme: dark)')
    : { matches: false, addEventListener() { } };

function resolvedTheme() {
    if (state.theme === 'auto') return media.matches ? 'dark' : 'light';
    return state.theme;
}

function applyAppearance() {
    const rt = resolvedTheme();
    const mode = (rt === 'dark' || rt === 'dim') ? 'dark' : 'light';
    const root = document.documentElement;
    root.setAttribute('data-theme', rt);
    root.setAttribute('data-mode', mode);
    root.setAttribute('data-accent', state.accent);
    root.setAttribute('data-density', state.density);

    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', THEME_META[rt] || '#E9ECE6');

    const icon = state.theme === 'auto' ? 'i-auto'
        : (rt === 'dark' || rt === 'dim') ? 'i-moon' : 'i-sun';
    $('theme-btn').innerHTML = `<svg><use href="#${icon}"/></svg>`;
    $('theme-btn').title = 'Theme: ' + THEME_LABELS[state.theme];
}

function cycleTheme() {
    const i = THEME_CYCLE.indexOf(state.theme);
    state.theme = THEME_CYCLE[(i + 1) % THEME_CYCLE.length];
    applyAppearance(); save();
    const msg = state.theme === 'auto' ? 'Following your system theme.'
        : state.theme === 'light' ? 'Light.'
            : state.theme === 'warm' ? 'Warm.'
                : state.theme === 'dark' ? 'Dark.' : 'Dim.';
    toast(msg);
}

function setView(v) {
    state.view = v;
    ['today', 'grid', 'stats', 'log'].forEach(x => {
        $('view-' + x).classList.toggle('hide', x !== v);
        $('tab-' + x).setAttribute('aria-selected', String(x === v));
        $('tab-' + x).setAttribute('tabindex', x === v ? '0' : '-1');
    });
    save(); render();
}

function render() {
    $('head-date').textContent = longDate(today());
    if (state.view === 'today') renderToday();
    else if (state.view === 'grid') { renderGrid(); scrollGridsToEnd(); }
    else if (state.view === 'stats') renderStats();
    else renderLog();
}

function scrollGridsToEnd() {
    document.querySelectorAll('[data-scroll]').forEach(el => { el.scrollLeft = el.scrollWidth; });
}

let longPressTimer = null;
let longPressFired = false;
let longStartX = 0, longStartY = 0;
const LONG_MS = 500;
const MOVE_TOL = 8;

document.addEventListener('pointerdown', e => {
    if (e.pointerType === 'mouse') return;
    const cell = e.target.closest('.cell[data-date]');
    if (!cell || cell.classList.contains('future')) return;
    longStartX = e.clientX; longStartY = e.clientY;
    longPressFired = false;
    longPressTimer = setTimeout(() => {
        longPressFired = true;
        const grid = cell.closest('[data-grid]');
        if (grid) openDay(grid.dataset.grid, cell.dataset.date);
    }, LONG_MS);
}, { passive: true });
document.addEventListener('pointermove', e => {
    if (!longPressTimer) return;
    if (Math.abs(e.clientX - longStartX) > MOVE_TOL || Math.abs(e.clientY - longStartY) > MOVE_TOL) {
        clearTimeout(longPressTimer); longPressTimer = null;
    }
}, { passive: true });
document.addEventListener('pointerup', () => {
    if (longPressTimer) { clearTimeout(longPressTimer); longPressTimer = null; }
}, { passive: true });
document.addEventListener('pointercancel', () => {
    if (longPressTimer) { clearTimeout(longPressTimer); longPressTimer = null; }
}, { passive: true });

document.addEventListener('contextmenu', e => {
    const cell = e.target.closest('.cell[data-date]');
    if (!cell || cell.classList.contains('future')) return;
    const grid = cell.closest('[data-grid]');
    if (!grid) return;
    e.preventDefault();
    openDay(grid.dataset.grid, cell.dataset.date);
});

document.addEventListener('click', e => {
    const cell = e.target.closest('.cell[data-date]');
    if (cell && !cell.classList.contains('future')) {
        if (longPressFired) { longPressFired = false; return; }
        const grid = cell.closest('[data-grid]');
        if (grid) {
            const h = state.habits.find(x => x.id === grid.dataset.grid);
            if (h) {
                const k = cell.dataset.date;
                if (e.shiftKey || e.ctrlKey || e.metaKey) { openDay(h.id, k); return; }
                if (isRest(h, k)) { openDay(h.id, k); return; }
                toggleCell(h, k);
                return;
            }
        }
    }

    const el = e.target.closest('[data-act]');
    if (!el) return;
    const a = el.dataset.act;
    const id = el.dataset.id;

    switch (a) {
        case 'view': setView(el.dataset.view); break;
        case 'cycle-theme': cycleTheme(); break;
        case 'open-appear': openAppear(); break;
        case 'open-cards': openCards(); break;
        case 'new-habit': openHabit(null); break;
        case 'edit': openHabit(id); break;
        case 'delete': deleteHabit(id); break;
        case 'move': moveHabit(id, +el.dataset.dir); break;
        case 'toggle': toggleHabit(id); break;
        case 'step': stepHabit(id, +el.dataset.d); break;
        case 'open-day': openDay(id, el.dataset.date); break;
        case 'open-note': openDay(id, el.dataset.date, true); break;
        case 'open-data': openData(); break;
        case 'close': closeModal(el.dataset.modal); break;
        case 't-filter':
            state.todayFilter = el.dataset.filter; save(); renderToday(); break;
        case 'cat':
            state.category = el.dataset.cat; renderGrid(); scrollGridsToEnd(); break;
        case 'cat-filter':
            state.category = el.value; renderGrid(); scrollGridsToEnd(); break;
        case 'toggle-archived':
            state.showArchived = !state.showArchived; state.category = 'All'; renderGrid(); scrollGridsToEnd(); break;

        case 'l-habit':
            state.logFilter = el.dataset.id; renderLog(); break;
        case 'log-filter':
            state.logFilter = el.value; renderLog(); break;
        case 'l-clear':
            state.logQuery = ''; $('l-search').value = ''; renderLog(); break;

        case 'toggle-rest': {
            const h = state.habits.find(x => x.id === dayDraft.id);
            if (!h) break;
            if (!dayDraft.rest && restsThisMonth(h, dayDraft.dateKey) >= restLimit(h) && !isRest(h, dayDraft.dateKey)) {
                toast('That is all ' + restLimit(h) + ' rest days for this month.');
                break;
            }
            dayDraft.rest = !dayDraft.rest;
            if (dayDraft.rest) { dayDraft.value = 0; dayDraft.done = false; }
            drawDayEntry(h); drawRestBtn(h);
            break;
        }
        case 'day-step': setDayValue(dayDraft.value + parseFloat(el.dataset.d)); break;
        case 'day-set': setDayValue(parseFloat(el.dataset.v)); break;
        case 'day-done': {
            dayDraft.done = el.dataset.v === '1';
            if (dayDraft.done) dayDraft.rest = false;
            const h = state.habits.find(x => x.id === dayDraft.id);
            drawDayEntry(h); drawRestBtn(h);
            break;
        }
        case 'clear-day': clearDay(); break;

        case 'h-type': draft.type = el.dataset.type; drawDraft(); break;
        case 'h-day': {
            const d = +el.dataset.d;
            draft.days = draft.days.includes(d) ? draft.days.filter(x => x !== d) : [...draft.days, d];
            drawDraft();
            break;
        }
        case 'h-color': draft.color = el.dataset.c; drawDraft(); break;
        case 'h-emoji': draft.icon = draft.icon === el.dataset.e ? '' : el.dataset.e; drawDraft(); break;
        case 'h-icon-clear': draft.icon = ''; drawDraft(); break;
        case 'archive': archiveHabit(); break;
        case 'phase': startNewPhase(); break;

        case 'theme-set':
            state.theme = el.dataset.v; applyAppearance(); save();
            document.querySelectorAll('[data-act="theme-set"]').forEach(b =>
                b.setAttribute('aria-pressed', String(b.dataset.v === state.theme)));
            refreshAccentSwatches();
            break;
        case 'accent':
            state.accent = el.dataset.v; applyAppearance(); save();
            document.querySelectorAll('[data-act="accent"]').forEach(b =>
                b.setAttribute('aria-pressed', String(b.dataset.v === state.accent)));
            break;
        case 'density':
            state.density = el.dataset.v; applyAppearance(); save();
            document.querySelectorAll('[data-act="density"]').forEach(b =>
                b.setAttribute('aria-pressed', String(b.dataset.v === state.density)));
            break;

        case 'cards-reset':
            state.statsCards = [...DEFAULT_CARDS]; save(); openCards();
            if (state.view === 'stats') renderStats();
            break;

        case 'export': exportData(); break;
        case 'import': $('d-file').click(); break;
        case 'import-replace':
            openConfirm('Replace everything?', 'Importing swaps out all ' + state.habits.length + ' habits currently in the app.', () => finishImport('replace'), 'Import');
            break;
        case 'import-merge': finishImport('merge'); break;
        case 'sample': loadSample(); break;
        case 'reset': resetAll(); break;
        case 'horizon': state.horizon = el.dataset.h; save(); renderStats(); break;
    }
});

document.addEventListener('change', e => {
    if (e.target.id === 'g-cats') {
        state.category = e.target.value;
        renderGrid();
        scrollGridsToEnd();
        return;
    }
    if (e.target.id === 'l-habits') {
        state.logFilter = e.target.value;
        renderLog();
        return;
    }
    const el = e.target.closest('[data-act="card"]');
    if (!el) return;
    const k = el.dataset.k;
    if (el.checked) {
        if (!state.statsCards.includes(k)) state.statsCards = [...state.statsCards, k];
    } else {
        state.statsCards = state.statsCards.filter(x => x !== k);
    }
    save();
    if (state.view === 'stats') renderStats();
});

document.addEventListener('input', e => {
    if (e.target.id === 'l-search') {
        clearTimeout(e.target._t);
        const v = e.target.value.toLowerCase().trim();
        e.target._t = setTimeout(() => { state.logQuery = v; renderLog(); }, 140);
    }
});

document.addEventListener('keydown', e => {
    const cell = e.target.closest && e.target.closest('.cell[data-date]');
    if (cell && e.key === 'Enter' && !cell.classList.contains('future')) {
        e.preventDefault();
        const grid = cell.closest('[data-grid]');
        if (grid) openDay(grid.dataset.grid, cell.dataset.date);
        return;
    }
    const tab = e.target.closest && e.target.closest('[role="tab"]');
    if (tab && (e.key === 'ArrowRight' || e.key === 'ArrowDown' || e.key === 'ArrowLeft' || e.key === 'ArrowUp')) {
        e.preventDefault();
        const tabs = [...document.querySelectorAll('[role="tab"]')];
        const index = tabs.indexOf(tab);
        const next = (index + (e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 1) + tabs.length) % tabs.length;
        tabs[next].focus();
        setView(tabs[next].dataset.view);
        return;
    }
    const dialog = document.querySelector('.scrim:not(.hide)');
    if (e.key === 'Tab' && dialog) {
        const f = [...dialog.querySelectorAll('button, [href], input:not(.hide), select, textarea, [tabindex]:not([tabindex="-1"])')]
            .filter(el => el.offsetParent !== null || el === document.activeElement);
        if (f.length) {
            const first = f[0], last = f[f.length - 1];
            if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
            else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
        }
    }
    if (e.key === 'Escape') {
        const open = document.querySelector('.scrim:not(.hide)');
        if (open) { closeModal(open.id); return; }
    }
    const tag = (e.target.tagName || '').toLowerCase();
    if (tag === 'input' || tag === 'textarea' || tag === 'select' || e.target.isContentEditable) return;
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    if (document.querySelector('.scrim:not(.hide)')) return;

    if (e.key === '1') setView('today');
    else if (e.key === '2') setView('grid');
    else if (e.key === '3') setView('stats');
    else if (e.key === '4') setView('log');
    else if (e.key.toLowerCase() === 'n') { e.preventDefault(); openHabit(null); }
});

document.querySelectorAll('.scrim').forEach(s => {
    s.addEventListener('mousedown', e => { if (e.target === s) closeModal(s.id); });
});

$('c-ok').addEventListener('click', () => {
    const fn = confirmFn;
    confirmFn = null;
    closeModal('m-confirm');
    if (fn) fn();
});

$('m-day-form').addEventListener('submit', saveDay);
$('m-habit-form').addEventListener('submit', saveHabit);
$('d-file').addEventListener('change', e => {
    const f = e.target.files && e.target.files[0];
    if (f) importData(f);
    e.target.value = '';
});

let searchTimer = null;
$('g-search').addEventListener('input', e => {
    clearTimeout(searchTimer);
    const v = e.target.value.toLowerCase().trim();
    searchTimer = setTimeout(() => { state.query = v; renderGrid(); scrollGridsToEnd(); }, 140);
});

document.addEventListener('mouseover', e => { if (e.target.closest('.grid-cells')) cellTip(e); });
document.addEventListener('mouseout', e => { if (e.target.closest('.grid-cells')) $('tip').classList.add('hide'); });
window.addEventListener('scroll', () => $('tip').classList.add('hide'), { passive: true });
document.addEventListener('scroll', e => { if (e.target.closest && e.target.closest('.grid-scroll')) $('tip').classList.add('hide'); }, true);

media.addEventListener('change', () => { if (state.theme === 'auto') applyAppearance(); });

let dayStamp = key(today());
setInterval(() => {
    const now = key(today());
    if (now !== dayStamp) { dayStamp = now; CAL.data = null; statsCache = new Map(); render(); }
}, 60000);
document.addEventListener('visibilitychange', () => {
    if (document.visibilityState !== 'visible') return;
    const now = key(today());
    if (now !== dayStamp) { dayStamp = now; CAL.data = null; statsCache = new Map(); }
    render();
});

load();
applyAppearance();
setView(state.view);
