// Unit tests for the pure attendance rules in EmployeeAttendance/attendance.js
// Run: node tools/formgen/test_attendance_rules.js
const fs = require('fs');
const path = require('path');
const assert = require('assert');

const src = fs.readFileSync(path.join(__dirname, '..', '..', 'EmployeeAttendance', 'attendance.js'), 'utf8');
const scope = new Function(src + '\nreturn { evaluateDay, getWindow, formatMinutes };')();

const T = (h, m) => new Date(1970, 0, 1, h, m);
const MORNING = { start_time: T(9, 0), end_time: T(17, 0), crosses_midnight: 0, grace_minutes: 15, break_minutes: 60,
    full_day_minutes: 420, half_day_minutes: 210, early_in_window_minutes: 120 };
const NIGHT = Object.assign({}, MORNING, { start_time: T(21, 0), end_time: T(5, 0), crosses_midnight: 1 });

const DAY = new Date(2026, 8, 28);              // Monday 28-09-2026
const at = (d, h, m) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + (d.getHours() ? 0 : 0), h, m);
const next = new Date(2026, 8, 29);
const LATER = new Date(2026, 9, 5, 12, 0);      // long after the day
const IN = (h, m, d = DAY) => ({ time: at(d, h, m), type: 'IN', source: 'MANUAL' });
const OUT = (h, m, d = DAY) => ({ time: at(d, h, m), type: 'OUT', source: 'MANUAL' });

function run(punches, extra = {}) {
    return scope.evaluateDay(Object.assign({ day: DAY, now: LATER, shift: MORNING, off: false, holiday: false,
        leave: null, employed: true, punches }, extra));
}

const cases = [
    ['on time, full day', () => {
        const r = run([IN(9, 5), OUT(17, 10)]);
        assert.strictEqual(r.status, 'PRESENT');
        assert.strictEqual(r.late_minutes, 0);          // 5 min is within the 15 min grace
        assert.strictEqual(r.worked_minutes, 425);      // 485 - 60 break
        assert.strictEqual(r.overtime_minutes, 10);
    }],
    ['20 min late, stays till end -> LATE', () => {
        const r = run([IN(9, 20), OUT(17, 0)]);
        assert.strictEqual(r.status, 'LATE');
        assert.strictEqual(r.late_minutes, 20);
        assert.strictEqual(r.worked_minutes, 400);
    }],
    ['leaves 30 min early -> PRESENT with early leave', () => {
        const r = run([IN(9, 0), OUT(16, 30)]);
        assert.strictEqual(r.status, 'PRESENT');
        assert.strictEqual(r.early_leave_minutes, 30);
    }],
    ['morning only 09-13 -> HALF_DAY, no break deducted', () => {
        const r = run([IN(9, 0), OUT(13, 0)]);
        assert.strictEqual(r.status, 'HALF_DAY');
        assert.strictEqual(r.worked_minutes, 240);
    }],
    ['arrives 13:00 -> HALF_DAY', () => {
        const r = run([IN(13, 0), OUT(17, 0)]);
        assert.strictEqual(r.status, 'HALF_DAY');
        assert.strictEqual(r.late_minutes, 240);
    }],
    ['works 2 hours -> ABSENT', () => {
        const r = run([IN(10, 0), OUT(12, 0)]);
        assert.strictEqual(r.status, 'ABSENT');
    }],
    ['night shift 21:10 - 05:00 next day -> PRESENT', () => {
        const r = run([IN(21, 10), OUT(5, 0, next)], { shift: NIGHT });
        assert.strictEqual(r.status, 'PRESENT');
        assert.strictEqual(r.late_minutes, 0);
        assert.strictEqual(r.worked_minutes, 410);      // 470 - 60 break
    }],
    ['night shift window runs into next morning', () => {
        const w = scope.getWindow(DAY, NIGHT);
        assert.strictEqual(w.end.getTime(), at(next, 5, 0).getTime());
        assert.strictEqual(w.to.getTime(), at(next, 9, 0).getTime());
        assert.strictEqual(w.dayEnd.getTime(), at(next, 5, 0).getTime());
    }],
    ['checked in, still working -> PRESENT (not missing)', () => {
        const r = run([IN(9, 0)], { now: at(DAY, 12, 0) });
        assert.strictEqual(r.status, 'PRESENT');
    }],
    ['checked in late, still working -> LATE', () => {
        const r = run([IN(9, 40)], { now: at(DAY, 12, 0) });
        assert.strictEqual(r.status, 'LATE');
    }],
    ['never checked out -> MISSING_PUNCH once the window closes', () => {
        const r = run([IN(9, 0)]);
        assert.strictEqual(r.status, 'MISSING_PUNCH');
    }],
    ['only a check-out -> MISSING_PUNCH', () => {
        const r = run([OUT(17, 0)]);
        assert.strictEqual(r.status, 'MISSING_PUNCH');
    }],
    ['no punches, day not over -> PENDING', () => {
        assert.strictEqual(run([], { now: at(DAY, 10, 0) }).status, 'PENDING');
    }],
    ['no punches, day over -> ABSENT', () => {
        assert.strictEqual(run([], { now: at(next, 0, 1) }).status, 'ABSENT');
    }],
    ['night shift, no punches at 03:00 next day -> still PENDING', () => {
        assert.strictEqual(run([], { shift: NIGHT, now: at(next, 3, 0) }).status, 'PENDING');
    }],
    ['night shift, no punches at 06:00 next day -> ABSENT', () => {
        assert.strictEqual(run([], { shift: NIGHT, now: at(next, 6, 0) }).status, 'ABSENT');
    }],
    ['weekly off -> WEEKLY_OFF', () => {
        assert.strictEqual(run([], { shift: null, off: true }).status, 'WEEKLY_OFF');
    }],
    ['holiday -> HOLIDAY', () => {
        assert.strictEqual(run([], { holiday: true }).status, 'HOLIDAY');
    }],
    ['approved leave -> ON_LEAVE', () => {
        assert.strictEqual(run([], { leave: { half: false } }).status, 'ON_LEAVE');
    }],
    ['works on weekly off -> PRESENT, all overtime', () => {
        const r = run([IN(10, 0), OUT(14, 0)], { shift: null, off: true });
        assert.strictEqual(r.status, 'PRESENT');
        assert.strictEqual(r.overtime_minutes, 240);
    }],
    ['no shift assigned, no punches -> no record', () => {
        assert.strictEqual(run([], { shift: null }), null);
    }],
    ['before join date, no punches -> no record', () => {
        assert.strictEqual(run([], { employed: false }), null);
    }],
    ['duplicate IN punches: first IN and last OUT count', () => {
        const r = run([IN(9, 0), IN(9, 2), OUT(12, 0), OUT(17, 0)]);
        assert.strictEqual(r.check_in.getHours() * 60 + r.check_in.getMinutes(), 540);
        assert.strictEqual(r.check_out.getHours(), 17);
        assert.strictEqual(r.status, 'PRESENT');
    }],
    ['formatMinutes', () => {
        assert.strictEqual(scope.formatMinutes(425), '7h 05m');
        assert.strictEqual(scope.formatMinutes(30), '30m');
        assert.strictEqual(scope.formatMinutes(0), '0m');
    }],
];

let failed = 0;
for (const [name, fn] of cases) {
    try { fn(); console.log('  ok   ' + name); }
    catch (e) { failed++; console.log('  FAIL ' + name + '\n       ' + e.message); }
}
console.log(`\n${cases.length - failed}/${cases.length} passed`);
process.exit(failed ? 1 : 0);
