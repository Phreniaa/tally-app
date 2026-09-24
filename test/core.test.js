'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

require('../core.js');
require('../storage.js');

const { TallyCore, TallyStorage } = globalThis;

class MemoryStorage {
    constructor() { this.values = new Map(); }
    getItem(key) { return this.values.has(key) ? this.values.get(key) : null; }
    setItem(key, value) { this.values.set(key, String(value)); }
}

const today = new Date(2026, 8, 24);
const normalize = (habit, index) => TallyCore.normalizeHabit(habit, index, today);

test('normalizes habit input and drops future or invalid entries', () => {
    const habit = normalize({
        id: 'reading',
        name: '  Read  ',
        target: '2',
        days: [1, 1, 8, '2'],
        entries: {
            '2026-09-23': 1.234,
            '2026-09-25': 4,
            bad: true
        },
        notes: { '2026-09-23': '  useful note  ' }
    }, 0);

    assert.equal(habit.name, 'Read');
    assert.equal(habit.target, 2);
    assert.deepEqual(habit.days, [1, 2]);
    assert.deepEqual(habit.entries, { '2026-09-23': 1.23 });
    assert.deepEqual(habit.notes, { '2026-09-23': 'useful note' });
});

test('merges matching habits without losing existing history', () => {
    const current = [normalize({
        id: 'h1', name: 'Old', startDate: '2026-09-01',
        entries: { '2026-09-01': true }, notes: { '2026-09-01': 'first' }
    }, 0)];
    const incoming = [normalize({
        id: 'h1', name: 'Updated', startDate: '2026-09-10',
        entries: { '2026-09-02': true }, notes: { '2026-09-02': 'second' }
    }, 0)];

    const merged = TallyCore.mergeHabits(current, incoming, normalize);
    assert.equal(merged.length, 1);
    assert.equal(merged[0].name, 'Updated');
    assert.equal(merged[0].startDate, '2026-09-01');
    assert.deepEqual(merged[0].entries, { '2026-09-01': true, '2026-09-02': true });
    assert.deepEqual(merged[0].notes, { '2026-09-01': 'first', '2026-09-02': 'second' });
});

test('writes a versioned envelope and preserves the previous snapshot', () => {
    const storage = new MemoryStorage();
    const first = { habits: [{ id: 'h1' }], theme: 'light' };
    const second = { habits: [{ id: 'h2' }], theme: 'dark' };

    TallyStorage.write(storage, 'tally.v1', first);
    TallyStorage.write(storage, 'tally.v1', second);

    assert.equal(JSON.parse(storage.getItem('tally.v1')).version, TallyStorage.VERSION);
    assert.deepEqual(JSON.parse(storage.getItem('tally.v1.backup')).habits, first.habits);
});

test('recovers from a corrupt primary value', () => {
    const storage = new MemoryStorage();
    TallyStorage.write(storage, 'tally.v1', { habits: [{ id: 'safe' }] });
    TallyStorage.write(storage, 'tally.v1', { habits: [{ id: 'new' }] });
    storage.setItem('tally.v1', '{not json');

    const result = TallyStorage.read(storage, 'tally.v1', 'legacy');
    assert.equal(result.recovered, true);
    assert.deepEqual(result.value.habits, [{ id: 'safe' }]);
});

test('rejects malformed and unbounded imports', () => {
    assert.throws(() => TallyStorage.parseImport('{"settings":{}}', normalize), /find any habits/i);
    assert.throws(() => TallyStorage.parseImport(JSON.stringify({ habits: Array(1001).fill({}) }), normalize), /too many habits/i);
});
