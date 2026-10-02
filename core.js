'use strict';

/* Pure habit-domain helpers shared by the browser app and Node tests. */
(function (root) {
    const DEFAULT_REST_LIMIT = 4;
    const DOW = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

    function dateKey(date) {
        const d = date instanceof Date ? date : new Date(date);
        return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    }

    function isKey(value) {
        return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value);
    }

    function normalizeHabit(raw, index, todayDate) {
        const h = raw && typeof raw === 'object' ? raw : {};
        const todayKey = dateKey(todayDate || new Date());
        const entries = {}, freezes = {}, notes = {};
        if (h.entries && typeof h.entries === 'object') {
            Object.keys(h.entries).forEach(k => {
                if (!isKey(k) || k > todayKey) return;
                const value = h.entries[k];
                if (typeof value === 'number' && Number.isFinite(value) && value > 0) entries[k] = Math.round(value * 100) / 100;
                else if (value === true) entries[k] = true;
            });
        }
        if (h.freezes && typeof h.freezes === 'object') {
            Object.keys(h.freezes).forEach(k => { if (isKey(k) && h.freezes[k]) freezes[k] = true; });
        }
        if (h.notes && typeof h.notes === 'object') {
            Object.keys(h.notes).forEach(k => {
                if (isKey(k) && typeof h.notes[k] === 'string' && h.notes[k].trim()) notes[k] = h.notes[k].trim().slice(0, 400);
            });
        }
        let days = [0, 1, 2, 3, 4, 5, 6];
        if (Array.isArray(h.days)) {
            const validDays = h.days.map(Number).filter(n => Number.isInteger(n) && n >= 0 && n <= 6);
            if (validDays.length) days = [...new Set(validDays)].sort((a, b) => a - b);
        }
        const firstLogged = Object.keys(entries).concat(Object.keys(freezes)).sort()[0];
        const created = h.createdAt && !Number.isNaN(new Date(h.createdAt).getTime()) ? dateKey(new Date(h.createdAt)) : null;
        const marks = [h.startDate, firstLogged, created].filter(isKey).sort();
        const startDate = isKey(h.trackingStartDate) ? h.trackingStartDate : marks[0] || todayKey;
        return {
            id: typeof h.id === 'string' && h.id ? h.id : 'h' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
            name: String(h.name || 'Untitled').trim().slice(0, 60) || 'Untitled',
            category: String(h.category || 'General').trim().slice(0, 24) || 'General',
            type: h.type === 'numeric' ? 'numeric' : 'binary',
            target: Math.max(0.5, Number(h.target) || 1),
            unit: String(h.unit || '').trim().slice(0, 16),
            color: /^#[0-9a-f]{6}$/i.test(h.color) ? h.color : null,
            desc: String(h.desc || h.description || '').trim().slice(0, 120),
            doneMsg: String(h.doneMsg || '').trim().slice(0, 60),
            icon: typeof h.icon === 'string' ? [...h.icon].slice(0, 3).join('').trim() : '',
            days,
            restLimit: Number.isInteger(h.restLimit) ? Math.min(31, Math.max(0, h.restLimit)) : DEFAULT_REST_LIMIT,
            startDate,
            trackingStartDate: isKey(h.trackingStartDate) ? h.trackingStartDate : startDate,
            archived: !!h.archived,
            entries, freezes, notes
        };
    }

    function mergeHabits(current, imported, normalize) {
        const merged = current.map(h => JSON.parse(JSON.stringify(h)));
        const byId = new Map(merged.map(h => [h.id, h]));
        imported.forEach(incoming => {
            const existing = byId.get(incoming.id);
            if (!existing) {
                merged.push(incoming);
                byId.set(incoming.id, incoming);
                return;
            }
            const previousTrackingStart = existing.trackingStartDate || existing.startDate;
            ['name', 'category', 'type', 'target', 'unit', 'color', 'desc', 'doneMsg', 'icon', 'days', 'archived', 'restLimit'].forEach(field => {
                existing[field] = incoming[field];
            });
            existing.trackingStartDate = previousTrackingStart < incoming.trackingStartDate ? previousTrackingStart : incoming.trackingStartDate;
            existing.startDate = existing.trackingStartDate;
            existing.entries = { ...existing.entries, ...incoming.entries };
            existing.freezes = { ...existing.freezes, ...incoming.freezes };
            existing.notes = { ...existing.notes, ...incoming.notes };
        });
        return merged.map((habit, index) => normalize(habit, index));
    }

    root.TallyCore = { DOW, DEFAULT_REST_LIMIT, dateKey, isKey, normalizeHabit, mergeHabits };
})(typeof window === 'undefined' ? globalThis : window);
