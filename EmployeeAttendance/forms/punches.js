/**
 * Employee whose punches are shown
 *
 * @type {UUID}
 *
 * @properties={typeid:35,uuid:"660CB323-0D3E-5369-BE75-3DDDF09C093C",variableType:-4}
 */
var selEmployee = null;

/**
 * Day whose punches are shown
 *
 * @type {Date}
 *
 * @properties={typeid:35,uuid:"37087EF8-ACF9-54E7-9AE6-9B3CD10E36F2",variableType:93}
 */
var selDate = null;

/**
 * Resulting attendance for the selected employee and day
 *
 * @type {String}
 *
 * @properties={typeid:35,uuid:"B9A3A456-EDEC-5F40-B6A4-400785DC7658"}
 */
var resultText = '';

/**
 * @param {JSEvent} event
 *
 * @private
 *
 * @properties={typeid:24,uuid:"FAA0A63A-49D3-5C38-B778-1902440922C2"}
 */
function onLoad(event) {
	selDate = scopes.crud.today();
	loadPunches();
}

/**
 * @param {*} oldValue
 * @param {*} newValue
 * @param {JSEvent} event
 * @return {Boolean}
 *
 * @private
 *
 * @properties={typeid:24,uuid:"DC996C8F-7A4E-58B9-8694-495D48AE0162"}
 */
function onFilterChange(oldValue, newValue, event) {
	loadPunches();
	return true;
}

/**
 * Loads the punches of the selected employee on the selected day.
 *
 * @private
 *
 * @properties={typeid:24,uuid:"A93DC470-98D5-5621-A86E-A791C231AB7E"}
 */
function loadPunches() {
	if (!selEmployee || !selDate) {
		foundset.clear();
		updateResult();
		return;
	}
	var day = scopes.attendance.dateOnly(selDate);
	var q = datasources.db.attendance.raw_punches.createSelect();
	q.where.add(q.columns.employee_id.eq(selEmployee))
		.add(q.columns.punch_time.ge(day))
		.add(q.columns.punch_time.lt(scopes.attendance.addDays(day, 1)));
	q.sort.add(q.columns.punch_time.asc);
	foundset.loadRecords(q);
	updateResult();
}

/**
 * Shows the attendance that the punches produce.
 *
 * @private
 *
 * @properties={typeid:24,uuid:"A3237781-7423-5BF0-B960-F60F75D9E7FE"}
 */
function updateResult() {
	resultText = '';
	if (!selEmployee || !selDate) return;
	var rec = scopes.attendance.getAttendance(selEmployee, selDate);
	resultText = rec ? 'Result: ' + scopes.attendance.describe(rec)
		: 'No attendance record for this day (no shift assigned, or a future day).';
}

/**
 * Opens the punches of an employee and day (used by the attendance board).
 *
 * @param {UUID} employeeId
 * @param {Date} date
 *
 * @properties={typeid:24,uuid:"9CEF1F32-D3F9-5FBB-92A0-83139EE7FFFA"}
 */
function openFor(employeeId, date) {
	selEmployee = employeeId;
	selDate = scopes.attendance.dateOnly(date || new Date());
	loadPunches();
}

/**
 * @param {JSEvent} event
 *
 * @private
 *
 * @properties={typeid:24,uuid:"C2A41BF0-6271-5DA1-8CB3-E68AB43F4EC8"}
 */
function onNew(event) {
	if (!selEmployee) {
		plugins.dialogs.showWarningDialog('Manual punch', 'Select an employee first.', 'OK');
		return;
	}
	// suggest OUT after an IN, otherwise IN; time = selected day at the current time
	var last = foundset.getSize() ? foundset.getRecord(foundset.getSize()).punch_type : null;
	var now = new Date();
	var day = scopes.attendance.dateOnly(selDate || now);
	scopes.crud.newRecord(foundset, {
		employee_id: selEmployee,
		source: 'MANUAL',
		punch_type: last == 'IN' ? 'OUT' : 'IN',
		punch_time: new Date(day.getFullYear(), day.getMonth(), day.getDate(), now.getHours(), now.getMinutes()),
		processed: 0
	});
	elements.fld_time.requestFocus();
}

/**
 * Saves the punch and recalculates the attendance it affects.
 *
 * @param {JSEvent} event
 *
 * @private
 *
 * @properties={typeid:24,uuid:"0FA7C3B1-DE19-5012-A6E5-6E6AEB01E65A"}
 */
function onSave(event) {
	var rec = foundset.getSelectedRecord();
	if (!rec) return;
	// remember the old time: moving a punch to another day must recalculate that day too
	var oldTime = null;
	var changes = rec.getChangedData();
	for (var i = 1; i <= changes.getMaxRowIndex(); i++) {
		if (changes.getValue(i, 1) == 'punch_time') oldTime = changes.getValue(i, 2);
	}
	if (!scopes.crud.save(foundset, [['punch_time', 'Time'], ['punch_type', 'In / Out']], 'Manual punch')) return;
	scopes.attendance.processPunchChange(rec.employee_id, rec.punch_time);
	if (oldTime) scopes.attendance.processPunchChange(rec.employee_id, oldTime);
	loadPunches();
}

/**
 * @param {JSEvent} event
 *
 * @private
 *
 * @properties={typeid:24,uuid:"D3590E6E-65F3-5413-8432-659FF968EDD0"}
 */
function onCancel(event) {
	scopes.crud.cancel(foundset);
}

/**
 * @param {JSEvent} event
 *
 * @private
 *
 * @properties={typeid:24,uuid:"55E69C7D-A193-5E62-A9BD-2B14741F4BD8"}
 */
function onDelete(event) {
	var rec = foundset.getSelectedRecord();
	if (!rec) return;
	var employeeId = rec.employee_id;
	var time = rec.punch_time;
	var saved = !rec.isNew();
	var text = (rec.punch_type == 'IN' ? 'In' : 'Out') + ' at ' + utils.dateFormat(time, 'dd-MM-yyyy HH:mm');
	if (scopes.crud.remove(foundset, 'Manual punch', text) && saved) {
		scopes.attendance.processPunchChange(employeeId, time);
		updateResult();
	}
}

/**
 * Access check: see scopes.auth.guard().
 *
 * @param {Boolean} firstShow
 * @param {JSEvent} event
 *
 * @private
 *
 * @properties={typeid:24,uuid:"2AECBB97-971C-5702-AAD4-4C8BEF9C7BD3"}
 */
function onShow(firstShow, event) {
	if (!scopes.auth.guard('punches')) return;
}
