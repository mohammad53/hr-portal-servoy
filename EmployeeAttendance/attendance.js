/**
 * How long after a shift ends a punch still counts as that shift's check-out.
 *
 * @type {Number}
 *
 * @properties={typeid:35,uuid:"8B7916AB-8CD1-52C3-BFE1-73132B463BB0",variableType:4}
 */
var PUNCH_OUT_WINDOW_MINUTES = 240;

/**
 * @param {Date} d
 * @return {Date} the same day at 00:00
 *
 * @properties={typeid:24,uuid:"C4947DAF-D794-5432-A0B4-7984B8040562"}
 */
function dateOnly(d) {
	var x = new Date(d.getTime());
	x.setHours(0, 0, 0, 0);
	return x;
}

/**
 * @param {Date} d
 * @param {Number} n
 * @return {Date}
 *
 * @properties={typeid:24,uuid:"E3DFCB54-0E34-53BD-A83C-2B143A9924A8"}
 */
function addDays(d, n) {
	var x = new Date(d.getTime());
	x.setDate(x.getDate() + n);
	return x;
}

/**
 * @param {Date} d
 * @param {Number} n
 * @return {Date}
 *
 * @properties={typeid:24,uuid:"B438B05E-99A3-5F6B-90EB-804F4F2CB945"}
 */
function addMinutes(d, n) {
	return new Date(d.getTime() + n * 60000);
}

/**
 * Combines the date part of day with the time part of time.
 *
 * @param {Date} day
 * @param {Date} time
 * @return {Date}
 *
 * @properties={typeid:24,uuid:"3D9B54C3-8EB2-5F47-A410-0EFA7377AC1F"}
 */
function atTime(day, time) {
	return new Date(day.getFullYear(), day.getMonth(), day.getDate(), time.getHours(), time.getMinutes(), 0, 0);
}

/**
 * @param {Date} from
 * @param {Date} to
 * @return {Number}
 *
 * @properties={typeid:24,uuid:"A00FD259-D81E-5F60-AFE1-3A400BD6B57C"}
 */
function minutesBetween(from, to) {
	return Math.round((to.getTime() - from.getTime()) / 60000);
}

/**
 * @param {Date} from
 * @param {Date} to
 * @return {Number}
 *
 * @properties={typeid:24,uuid:"F7EA3DED-1810-512D-A3AF-1183DDFB7586"}
 */
function daysBetween(from, to) {
	return Math.round((dateOnly(to).getTime() - dateOnly(from).getTime()) / 86400000);
}

/**
 * @param {Date} d
 * @return {Number} 1 = Monday ... 7 = Sunday
 *
 * @properties={typeid:24,uuid:"45151160-DFBF-56AE-95D6-B88563F4BC5D"}
 */
function isoWeekday(d) {
	var w = d.getDay();
	return w == 0 ? 7 : w;
}

/**
 * @param {Number} m minutes
 * @return {String} e.g. 7h 05m
 *
 * @properties={typeid:24,uuid:"CE3E4A1C-B0B3-572F-A066-B7233E71C38A"}
 */
function formatMinutes(m) {
	if (!m) return '0m';
	var h = Math.floor(m / 60);
	var r = m % 60;
	return h ? h + 'h ' + (r < 10 ? '0' : '') + r + 'm' : r + 'm';
}

/**
 * Time window of a work day.
 *
 * start/end: shift times (null without a shift). from/to: punches in this range belong to the day.
 * dayEnd: after this moment the day is over (end of the calendar day, or later for an overnight shift).
 *
 * @param {Date} day work date (00:00)
 * @param {JSRecord<db:/attendance/shifts>|Object} shift
 * @return {{start: Date, end: Date, from: Date, to: Date, dayEnd: Date}}
 *
 * @properties={typeid:24,uuid:"4B3B5032-0E1A-5388-A5D5-B4FD1F32B2F0"}
 */
function getWindow(day, shift) {
	var nextDay = addDays(day, 1);
	if (!shift) {
		return { start: null, end: null, from: day, to: nextDay, dayEnd: nextDay };
	}
	var start = atTime(day, shift.start_time);
	var end = atTime(shift.crosses_midnight ? nextDay : day, shift.end_time);
	return {
		start: start,
		end: end,
		from: addMinutes(start, -(shift.early_in_window_minutes || 0)),
		to: addMinutes(end, PUNCH_OUT_WINDOW_MINUTES),
		dayEnd: end > nextDay ? end : nextDay
	};
}

/**
 * @param {Array<{time: Date, type: String, source: String}>} punches
 * @return {String}
 *
 * @private
 *
 * @properties={typeid:24,uuid:"B8D595F8-485D-5933-86E9-18D8758C20E5"}
 */
function punchSource(punches) {
	var biometric = false;
	var manual = false;
	for (var i = 0; i < punches.length; i++) {
		if (punches[i].source == 'BIOMETRIC') biometric = true;
		else manual = true;
	}
	if (biometric && manual) return 'MIXED';
	if (biometric) return 'BIOMETRIC';
	return manual ? 'MANUAL' : 'SYSTEM';
}

/**
 * The attendance rules. Pure function: no database access.
 *
 * Status rules for a working day with both punches:
 * - worked >= full day minutes -> PRESENT (LATE if check-in was after start + grace)
 * - worked >= half day and late + early leave <= (full - half) -> PRESENT / LATE
 * - worked >= half day -> HALF_DAY, otherwise ABSENT
 * No punches: ON_LEAVE, HOLIDAY, WEEKLY_OFF, PENDING while the day is not over, then ABSENT.
 *
 * @param {{day: Date, now: Date, shift: JSRecord<db:/attendance/shifts>, off: Boolean, holiday: Boolean, leave: {half: Boolean}, employed: Boolean, punches: Array<{time: Date, type: String, source: String}>}} info
 * @return {{status: String, check_in: Date, check_out: Date, worked_minutes: Number, late_minutes: Number, early_leave_minutes: Number, overtime_minutes: Number, remarks: String, source: String}} null = no record
 *
 * @properties={typeid:24,uuid:"2771A0FE-8123-52C5-8B5D-4CAE11BF7491"}
 */
function evaluateDay(info) {
	/** @type {JSRecord<db:/attendance/shifts>} */
	var shift = info.shift;
	var win = getWindow(info.day, shift);
	var punches = info.punches || [];
	var result = {
		status: null, check_in: null, check_out: null, worked_minutes: 0, late_minutes: 0,
		early_leave_minutes: 0, overtime_minutes: 0, remarks: null, source: punchSource(punches)
	};
	
	// Not employed on this day and nothing punched: no record
	if (!info.employed && !punches.length) return null;
	
	// ---- no punches ----
	if (!punches.length) {
		if (info.leave && !info.leave.half) result.status = 'ON_LEAVE';
		else if (info.holiday) result.status = 'HOLIDAY';
		else if (info.off) result.status = 'WEEKLY_OFF';
		else if (!shift) return null; // not rostered
		else if (info.now < win.dayEnd) result.status = 'PENDING';
		else if (info.leave) {
			result.status = 'HALF_DAY';
			result.remarks = 'Half-day leave, other half not worked';
		} else result.status = 'ABSENT';
		return result;
	}
	
	// ---- punches: first IN = check-in, last OUT after it = check-out ----
	var i;
	for (i = 0; i < punches.length; i++) {
		if (punches[i].type != 'OUT') {
			result.check_in = punches[i].time;
			break;
		}
	}
	for (i = punches.length - 1; i >= 0; i--) {
		if (punches[i].type != 'IN' && (!result.check_in || punches[i].time > result.check_in)) {
			result.check_out = punches[i].time;
			break;
		}
	}
	var working = shift && !info.off && !info.holiday;
	
	if (working && result.check_in && result.check_in > addMinutes(win.start, shift.grace_minutes || 0)) {
		result.late_minutes = minutesBetween(win.start, result.check_in);
	}
	
	// ---- only one side punched ----
	if (!result.check_in || !result.check_out) {
		if (result.check_in && info.now < win.to) {
			result.status = result.late_minutes ? 'LATE' : 'PRESENT';
			result.remarks = 'Checked in, not checked out yet';
		} else {
			result.status = 'MISSING_PUNCH';
			result.remarks = result.check_in ? 'No check-out' : 'No check-in';
		}
		return result;
	}
	
	// ---- both punched ----
	var worked = minutesBetween(result.check_in, result.check_out);
	if (working) {
		// the break is deducted when the employee worked through the middle of the shift
		var middle = addMinutes(win.start, minutesBetween(win.start, win.end) / 2);
		if (result.check_in < middle && result.check_out > middle) {
			worked = Math.max(0, worked - (shift.break_minutes || 0));
		}
		if (result.check_out < win.end) result.early_leave_minutes = minutesBetween(result.check_out, win.end);
		if (result.check_out > win.end) result.overtime_minutes = minutesBetween(win.end, result.check_out);
	}
	result.worked_minutes = worked;
	
	if (!working) {
		result.status = 'PRESENT';
		if (shift || info.off || info.holiday) result.overtime_minutes = worked;
		result.remarks = info.holiday ? 'Worked on a holiday' : info.off ? 'Worked on a weekly off' : 'No shift assigned';
	} else if (info.leave) {
		result.status = 'HALF_DAY';
		result.remarks = info.leave.half ? 'Half-day leave' : 'Worked during approved leave';
	} else if (worked >= shift.full_day_minutes) {
		result.status = result.late_minutes ? 'LATE' : 'PRESENT';
	} else if (worked >= shift.half_day_minutes
			&& result.late_minutes + result.early_leave_minutes <= shift.full_day_minutes - shift.half_day_minutes) {
		// short only because of a moderate late arrival / early leave
		result.status = result.late_minutes ? 'LATE' : 'PRESENT';
	} else if (worked >= shift.half_day_minutes) {
		result.status = 'HALF_DAY';
	} else {
		result.status = 'ABSENT';
		result.remarks = 'Worked less than half a day';
	}
	return result;
}

/**
 * @param {UUID} shiftId
 * @return {JSRecord<db:/attendance/shifts>}
 *
 * @private
 *
 * @properties={typeid:24,uuid:"5EFDA345-EC70-52CB-A429-DF019D849F58"}
 */
function getShift(shiftId) {
	var q = datasources.db.attendance.shifts.createSelect();
	q.where.add(q.columns.shift_id.eq(shiftId));
	var fs = datasources.db.attendance.shifts.getFoundSet();
	fs.loadRecords(q);
	return fs.getSize() ? fs.getRecord(1) : null;
}

/**
 * Which shift an employee works on a day.
 *
 * @param {UUID} employeeId
 * @param {Date} day
 * @return {{shift: JSRecord<db:/attendance/shifts>, off: Boolean}} shift null + off false = not rostered
 *
 * @properties={typeid:24,uuid:"3985FE55-0DDC-51CA-A0F7-764926B27659"}
 */
function getRoster(employeeId, day) {
	// 1. one-off roster change for this day
	var qo = datasources.db.attendance.roster_overrides.createSelect();
	qo.where.add(qo.columns.employee_id.eq(employeeId)).add(qo.columns.work_date.eq(day));
	var overrides = datasources.db.attendance.roster_overrides.getFoundSet();
	overrides.loadRecords(qo);
	if (overrides.getSize()) {
		var override = overrides.getRecord(1);
		return { shift: override.shift_id ? getShift(override.shift_id) : null, off: !override.shift_id };
	}
	
	// 2. the assignment valid on this day (latest start date wins)
	var qa = datasources.db.attendance.employee_shift_assignments.createSelect();
	qa.where.add(qa.columns.employee_id.eq(employeeId))
		.add(qa.columns.start_date.le(day))
		.add(qa.or.add(qa.columns.end_date.isNull).add(qa.columns.end_date.ge(day)));
	qa.sort.add(qa.columns.start_date.desc);
	var assignments = datasources.db.attendance.employee_shift_assignments.getFoundSet();
	assignments.loadRecords(qa);
	if (!assignments.getSize()) return { shift: null, off: false };
	var assignment = assignments.getRecord(1);
	
	// 2a. fixed shift with weekly off days
	if (assignment.shift_id) {
		var offDays = (assignment.weekly_off_days || '').split(',');
		for (var i = 0; i < offDays.length; i++) {
			if (offDays[i].replace(/\s/g, '') == String(isoWeekday(day))) return { shift: null, off: true };
		}
		return { shift: getShift(assignment.shift_id), off: false };
	}
	
	// 2b. rotating pattern
	var qp = datasources.db.attendance.shift_patterns.createSelect();
	qp.where.add(qp.columns.pattern_id.eq(assignment.pattern_id));
	var patterns = datasources.db.attendance.shift_patterns.getFoundSet();
	patterns.loadRecords(qp);
	if (!patterns.getSize()) return { shift: null, off: false };
	var cycle = patterns.getRecord(1).cycle_days;
	var index = ((daysBetween(assignment.cycle_start_date, day) % cycle) + cycle) % cycle;
	var qd = datasources.db.attendance.shift_pattern_days.createSelect();
	qd.where.add(qd.columns.pattern_id.eq(assignment.pattern_id)).add(qd.columns.day_index.eq(index));
	var patternDays = datasources.db.attendance.shift_pattern_days.getFoundSet();
	patternDays.loadRecords(qd);
	if (!patternDays.getSize() || !patternDays.getRecord(1).shift_id) return { shift: null, off: true };
	return { shift: getShift(patternDays.getRecord(1).shift_id), off: false };
}

/**
 * @param {UUID} employeeId
 * @param {Date} date
 * @return {JSRecord<db:/attendance/attendance>}
 *
 * @properties={typeid:24,uuid:"F4933E45-11D9-5325-84D0-19641160E9BE"}
 */
function getAttendance(employeeId, date) {
	var q = datasources.db.attendance.attendance.createSelect();
	q.where.add(q.columns.employee_id.eq(employeeId)).add(q.columns.work_date.eq(dateOnly(date)));
	var fs = datasources.db.attendance.attendance.getFoundSet();
	fs.loadRecords(q);
	return fs.getSize() ? fs.getRecord(1) : null;
}

/**
 * @param {Date} day
 * @return {JSRecord<db:/attendance/holidays>}
 *
 * @private
 *
 * @properties={typeid:24,uuid:"F2AAF35B-86D1-5648-B7CA-1FAD7D833AD8"}
 */
function getHoliday(day) {
	var q = datasources.db.attendance.holidays.createSelect();
	q.where.add(q.columns.holiday_date.eq(day));
	var fs = datasources.db.attendance.holidays.getFoundSet();
	fs.loadRecords(q);
	return fs.getSize() ? fs.getRecord(1) : null;
}

/**
 * @param {UUID} employeeId
 * @param {Date} day
 * @return {JSRecord<db:/attendance/leave_requests>}
 *
 * @private
 *
 * @properties={typeid:24,uuid:"FD236720-FE02-513E-B69C-6FEE9BEF81D9"}
 */
function getApprovedLeave(employeeId, day) {
	var q = datasources.db.attendance.leave_requests.createSelect();
	q.where.add(q.columns.employee_id.eq(employeeId))
		.add(q.columns.status.eq('APPROVED'))
		.add(q.columns.from_date.le(day))
		.add(q.columns.to_date.ge(day));
	var fs = datasources.db.attendance.leave_requests.getFoundSet();
	fs.loadRecords(q);
	return fs.getSize() ? fs.getRecord(1) : null;
}

/**
 * Punches in a day's window that are not claimed by another day.
 *
 * @param {UUID} employeeId
 * @param {{from: Date, to: Date}} win
 * @param {JSRecord<db:/attendance/attendance>} attendance existing row or null
 * @return {JSFoundSet<db:/attendance/raw_punches>}
 *
 * @private
 *
 * @properties={typeid:24,uuid:"4D45B7F5-FEB6-5013-9E65-496CC5E75BAC"}
 */
function getPunches(employeeId, win, attendance) {
	var q = datasources.db.attendance.raw_punches.createSelect();
	q.where.add(q.columns.employee_id.eq(employeeId))
		.add(q.columns.punch_time.ge(win.from))
		.add(q.columns.punch_time.lt(win.to));
	// skip punches already claimed by another day (e.g. the previous night shift)
	/** @type {QBLogicalCondition} */
	var unclaimed = q.or.add(q.columns.attendance_id.isNull);
	if (attendance) unclaimed.add(q.columns.attendance_id.eq(attendance.attendance_id));
	q.where.add(unclaimed);
	q.sort.add(q.columns.punch_time.asc);
	var fs = datasources.db.attendance.raw_punches.getFoundSet();
	fs.loadRecords(q);
	return fs;
}

/**
 * Unlinks all punches from an attendance row.
 *
 * @param {JSRecord<db:/attendance/attendance>} attendance
 *
 * @private
 *
 * @properties={typeid:24,uuid:"F5F7FE52-FAC5-5464-B1F5-FCD1CE547919"}
 */
function releasePunches(attendance) {
	var q = datasources.db.attendance.raw_punches.createSelect();
	q.where.add(q.columns.attendance_id.eq(attendance.attendance_id));
	var fs = datasources.db.attendance.raw_punches.getFoundSet();
	fs.loadRecords(q);
	for (var i = 1; i <= fs.getSize(); i++) {
		fs.getRecord(i).attendance_id = null;
		fs.getRecord(i).processed = 0;
	}
	databaseManager.saveData(fs);
}

/**
 * Recalculates (creates, updates or removes) the attendance row of one employee for one day.
 * Locked rows are never changed.
 *
 * @param {UUID} employeeId
 * @param {Date} date
 * @return {JSRecord<db:/attendance/attendance>} null when the day has no record
 *
 * @properties={typeid:24,uuid:"2DBDEC1A-6CE9-5163-BA19-9D2FD296B186"}
 */
function processDay(employeeId, date) {
	var day = dateOnly(date);
	var now = new Date();
	var qe = datasources.db.attendance.employees.createSelect();
	qe.where.add(qe.columns.employee_id.eq(employeeId));
	var employees = datasources.db.attendance.employees.getFoundSet();
	employees.loadRecords(qe);
	if (!employees.getSize()) return null;
	var employee = employees.getRecord(1);
	var attendance = getAttendance(employeeId, day);
	if (attendance && attendance.is_locked) return attendance;
	
	// nothing is recorded for future days
	if (day > now) {
		removeAttendance(attendance);
		return null;
	}
	
	var roster = getRoster(employeeId, day);
	var win = getWindow(day, roster.shift);
	var punchFs = getPunches(employeeId, win, attendance);
	var punches = [];
	for (var i = 1; i <= punchFs.getSize(); i++) {
		var p = punchFs.getRecord(i);
		punches.push({ time: p.punch_time, type: p.punch_type, source: p.source });
	}
	var holiday = getHoliday(day);
	var leave = getApprovedLeave(employeeId, day);
	
	var result = evaluateDay({
		day: day,
		now: now,
		shift: roster.shift,
		off: roster.off,
		holiday: !!(holiday && !holiday.is_optional),
		leave: leave ? { half: !!leave.is_half_day } : null,
		employed: day >= dateOnly(employee.join_date) && (!employee.leave_date || day <= dateOnly(employee.leave_date)),
		punches: punches
	});
	if (!result) {
		removeAttendance(attendance);
		return null;
	}
	
	if (!attendance) {
		var fs = datasources.db.attendance.attendance.getFoundSet();
		attendance = fs.getRecord(fs.newRecord());
		attendance.employee_id = employeeId;
		attendance.work_date = day;
	}
	attendance.shift_id = roster.shift ? roster.shift.shift_id : null;
	attendance.check_in = result.check_in;
	attendance.check_out = result.check_out;
	attendance.worked_minutes = result.worked_minutes;
	attendance.late_minutes = result.late_minutes;
	attendance.early_leave_minutes = result.early_leave_minutes;
	attendance.overtime_minutes = result.overtime_minutes;
	attendance.status = result.status;
	attendance.source = result.source;
	attendance.remarks = result.remarks;
	attendance.leave_request_id = leave ? leave.leave_request_id : null;
	if (!attendance.isNew()) attendance.modified_at = now;
	if (!databaseManager.saveData(attendance)) {
		throw new Error('Could not save attendance: ' + (attendance.exception ? attendance.exception.getMessage() : ''));
	}
	
	// release punches this day claimed before, then claim the ones in its window
	releasePunches(attendance);
	for (i = 1; i <= punchFs.getSize(); i++) {
		punchFs.getRecord(i).attendance_id = attendance.attendance_id;
		punchFs.getRecord(i).processed = 1;
	}
	databaseManager.saveData(punchFs);
	return attendance;
}

/**
 * @param {JSRecord<db:/attendance/attendance>} attendance
 *
 * @private
 *
 * @properties={typeid:24,uuid:"7160BC16-AED0-58CD-8913-61452170A2B7"}
 */
function removeAttendance(attendance) {
	if (!attendance || attendance.is_locked) return;
	releasePunches(attendance);
	attendance.foundset.deleteRecord(attendance);
}

/**
 * Call after a punch is added, changed or deleted.
 *
 * @param {UUID} employeeId
 * @param {Date} punchTime
 * @return {JSRecord<db:/attendance/attendance>}
 *
 * @properties={typeid:24,uuid:"0ABCE589-4BC4-595A-BED7-93DF079005D8"}
 */
function processPunchChange(employeeId, punchTime) {
	// a punch after midnight can belong to the previous day's overnight shift
	var day = dateOnly(punchTime);
	processDay(employeeId, addDays(day, -1));
	return processDay(employeeId, day);
}

/**
 * Recalculates all employees for one day.
 *
 * @param {Date} date
 * @return {Number} employees processed
 *
 * @properties={typeid:24,uuid:"8C6589A5-D8A3-5FF5-9D1C-46FAB6D23DBD"}
 */
function processDate(date) {
	var day = dateOnly(date);
	// active employees, plus anyone who already has a record that day
	var withRecord = datasources.db.attendance.attendance.createSelect();
	withRecord.result.add(withRecord.columns.employee_id);
	withRecord.where.add(withRecord.columns.work_date.eq(day));
	var q = datasources.db.attendance.employees.createSelect();
	q.where.add(q.or.add(q.columns.status.eq('ACTIVE')).add(q.columns.employee_id.isin(withRecord)));
	var fs = datasources.db.attendance.employees.getFoundSet();
	fs.loadRecords(q);
	/** @type {Array<UUID>} */
	var ids = [];
	for (var i = 1; i <= fs.getSize(); i++) {
		ids.push(fs.getRecord(i).employee_id);
	}
	for (i = 0; i < ids.length; i++) {
		processDay(ids[i], day);
	}
	return ids.length;
}

/**
 * @param {String} status
 * @return {String}
 *
 * @properties={typeid:24,uuid:"F4599374-7C33-5DDA-A7CC-E6A7042526F0"}
 */
function statusLabel(status) {
	var labels = {
		PRESENT: 'Present', LATE: 'Late', HALF_DAY: 'Half day', ABSENT: 'Absent', ON_LEAVE: 'On leave',
		HOLIDAY: 'Holiday', WEEKLY_OFF: 'Weekly off', MISSING_PUNCH: 'Missing punch', PENDING: 'Not in yet'
	};
	return labels[status] || status;
}

/**
 * One-line summary of an attendance record.
 *
 * @param {JSRecord<db:/attendance/attendance>} attendance
 * @return {String}
 *
 * @properties={typeid:24,uuid:"2C1C7E77-F370-5744-94FD-A99240583E8A"}
 */
function describe(attendance) {
	if (!attendance) return '';
	var parts = [statusLabel(attendance.status)];
	if (attendance.check_in) parts.push('in ' + utils.dateFormat(attendance.check_in, 'HH:mm'));
	if (attendance.check_out) parts.push('out ' + utils.dateFormat(attendance.check_out, 'HH:mm'));
	if (attendance.worked_minutes) parts.push('worked ' + formatMinutes(attendance.worked_minutes));
	if (attendance.late_minutes) parts.push(attendance.late_minutes + ' min late');
	if (attendance.early_leave_minutes) parts.push('left ' + attendance.early_leave_minutes + ' min early');
	if (attendance.overtime_minutes) parts.push('overtime ' + formatMinutes(attendance.overtime_minutes));
	if (attendance.remarks) parts.push(attendance.remarks);
	return parts.join(' \u00b7 ');
}
