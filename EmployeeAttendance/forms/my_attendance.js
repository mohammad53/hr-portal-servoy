/**
 * First day of the month shown
 *
 * @type {Date}
 *
 * @properties={typeid:35,uuid:"0C4CE756-98E2-5485-BC9E-CE340ECD55DD",variableType:93}
 */
var monthStart = null;

/**
 * @type {String}
 *
 * @properties={typeid:35,uuid:"880AB949-8B4C-5945-ABD7-2CC0EA87001A"}
 */
var monthLabel = '';

/**
 * @type {String}
 *
 * @properties={typeid:35,uuid:"5C6EA261-D196-5345-B634-C2CC93DBEED2"}
 */
var summaryText = '';

/**
 * @type {String}
 *
 * @properties={typeid:35,uuid:"26A3CB24-82A0-5DB0-BF28-92F1CE7F3846"}
 */
var infoText = '';

/**
 * @param {JSEvent} event
 *
 * @private
 *
 * @properties={typeid:24,uuid:"F9FF8143-6A79-54B8-A595-82B76A395008"}
 */
function onLoad(event) {
	var today = scopes.crud.today();
	monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
}

/**
 * @param {Boolean} firstShow
 * @param {JSEvent} event
 *
 * @private
 *
 * @properties={typeid:24,uuid:"FEF63A0F-A008-54C5-851E-C5B998239F0C"}
 */
function onShow(firstShow, event) {
	if (!scopes.auth.guard('my_attendance')) return;
	load();
}

/**
 * @param {JSEvent} event
 *
 * @private
 *
 * @properties={typeid:24,uuid:"F94D2C84-002D-515B-9AD5-ACE85973395C"}
 */
function onPrevMonth(event) {
	monthStart = new Date(monthStart.getFullYear(), monthStart.getMonth() - 1, 1);
	load();
}

/**
 * @param {JSEvent} event
 *
 * @private
 *
 * @properties={typeid:24,uuid:"56D51F43-5987-5502-A7D3-B6BBCBF4E101"}
 */
function onNextMonth(event) {
	monthStart = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 1);
	load();
}

/**
 * @param {JSEvent} event
 *
 * @private
 *
 * @properties={typeid:24,uuid:"C285469E-7381-515D-A0D1-59C6DFB93400"}
 */
function onExport(event) {
	scopes.export.toCsv(foundset, [{"dp": "work_date", "title": "Date", "format": "EEE dd-MM-yyyy"}, {"dp": "shift_id", "title": "Shift", "valuelist": "shifts"}, {"dp": "check_in", "title": "In", "format": "HH:mm"}, {"dp": "check_out", "title": "Out", "format": "HH:mm"}, {"dp": "worked_minutes", "title": "Worked (min)"}, {"dp": "late_minutes", "title": "Late (min)"}, {"dp": "overtime_minutes", "title": "OT (min)"}, {"dp": "status", "title": "Status", "valuelist": "attendance_status_badge"}, {"dp": "remarks", "title": "Remarks"}], 'my_attendance_' + utils.dateFormat(monthStart, 'yyyy-MM'));
}

/**
 * Loads the logged in employee's attendance for the month.
 *
 * @private
 *
 * @properties={typeid:24,uuid:"5AC710C3-FB17-55F5-A408-36385EB77F61"}
 */
function load() {
	monthLabel = utils.dateFormat(monthStart, 'MMMM yyyy');
	var employeeId = scopes.auth.currentUser ? scopes.auth.currentUser.employee_id : null;
	if (!employeeId) {
		infoText = 'Your user account is not linked to an employee record. Ask HR or an administrator to link it.';
		summaryText = '';
		foundset.clear();
		return;
	}
	infoText = '';
	var monthEnd = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0);
	// make sure every day up to today is calculated
	var today = scopes.crud.today();
	for (var d = new Date(monthStart.getTime()); d <= monthEnd && d <= today; d = scopes.attendance.addDays(d, 1)) {
		scopes.attendance.processDay(employeeId, d);
	}
	var q = datasources.db.attendance.attendance.createSelect();
	q.where.add(q.columns.employee_id.eq(employeeId))
		.add(q.columns.work_date.ge(monthStart))
		.add(q.columns.work_date.le(monthEnd));
	q.sort.add(q.columns.work_date.asc);
	foundset.loadRecords(q);
	
	var counts = {};
	var worked = 0;
	var late = 0;
	for (var i = 1; i <= foundset.getSize(); i++) {
		var rec = foundset.getRecord(i);
		counts[rec.status] = (counts[rec.status] || 0) + 1;
		worked += rec.worked_minutes || 0;
		late += rec.late_minutes || 0;
	}
	var parts = [];
	var order = ['PRESENT', 'LATE', 'HALF_DAY', 'MISSING_PUNCH', 'ABSENT', 'ON_LEAVE', 'HOLIDAY'];
	for (i = 0; i < order.length; i++) {
		if (counts[order[i]]) parts.push(scopes.attendance.statusLabel(order[i]) + ': ' + counts[order[i]]);
	}
	parts.push('Worked: ' + scopes.attendance.formatMinutes(worked));
	if (late) parts.push('Late: ' + late + ' min');
	summaryText = parts.join('   \u00b7   ');
}
