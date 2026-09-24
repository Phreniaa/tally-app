'use strict';

/* Versioned local persistence with validation and one recoverable snapshot. */
(function (root) {
    const VERSION = 3;
    const BACKUP_SUFFIX = '.backup';

    function isRecord(value) {
        return value !== null && typeof value === 'object' && !Array.isArray(value);
    }

    function parse(raw) {
        if (typeof raw !== 'string' || !raw.trim()) return null;
        try {
            const value = JSON.parse(raw);
            return isRecord(value) ? value : null;
        } catch (error) {
            return null;
        }
    }

    function envelope(value) {
        if (!value) return null;
        const habits = Array.isArray(value.habits) ? value.habits : null;
        if (!habits) return null;
        return {
            version: VERSION,
            theme: value.theme,
            accent: value.accent,
            density: value.density,
            view: value.view,
            todayFilter: value.todayFilter,
            horizon: value.horizon,
            statsCards: value.statsCards,
            habits
        };
    }

    function read(storage, key, legacyKey) {
        const current = envelope(parse(storage.getItem(key)));
        if (current) return { value: current, recovered: false, migrated: false };
        const backup = envelope(parse(storage.getItem(key + BACKUP_SUFFIX)));
        if (backup) return { value: backup, recovered: true, migrated: false };
        const legacy = envelope(parse(storage.getItem(legacyKey)));
        if (legacy) return { value: legacy, recovered: false, migrated: true };
        return { value: null, recovered: false, migrated: false };
    }

    function write(storage, key, value) {
        const next = envelope(value);
        if (!next) throw new Error('Cannot save invalid Tally data.');
        const previous = storage.getItem(key);
        if (previous && envelope(parse(previous))) storage.setItem(key + BACKUP_SUFFIX, previous);
        storage.setItem(key, JSON.stringify(next));
        return next;
    }

    function parseImport(raw, normalize) {
        const parsed = typeof raw === 'string' ? parse(raw) : raw;
        const habits = Array.isArray(parsed) ? parsed : parsed && Array.isArray(parsed.habits) ? parsed.habits : null;
        if (!habits) throw new Error('Could not find any habits in that file.');
        if (habits.length > 1000) throw new Error('That file contains too many habits.');
        return {
            habits: habits.map((habit, index) => normalize(habit, index)),
            settings: parsed && !Array.isArray(parsed) && isRecord(parsed.settings) ? parsed.settings : null
        };
    }

    root.TallyStorage = { VERSION, BACKUP_SUFFIX, envelope, parseImport, read, write };
})(typeof window === 'undefined' ? globalThis : window);
