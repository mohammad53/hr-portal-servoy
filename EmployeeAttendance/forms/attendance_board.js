/**
 * Day shown on the board
 *
 * @type {Date}
 *
 * @properties={typeid:35,uuid:"61A9E27F-CD6C-51A9-92C6-F74360E93B16",variableType:93}
 */
var boardDate = null;

/**
 * Department filter (null = all)
 *
 * @type {UUID}
 *
 * @properties={typeid:35,uuid:"B9E10FA5-C2FF-520A-A971-3924250C757B",variableType:-4}
 */
var departmentFilter = null;

/**
 * Status filter (null = all)
 *
 * @type {String}
 *
 * @properties={typeid:35,uuid:"7E6774D7-5521-5AC6-8A65-CA974AEE1B20"}
 */
var statusFilter = null;

/**
 * Counts per status for the day
 *
 * @type {String}
 *
 * @properties={typeid:35,uuid:"8D906261-7EFD-5F4B-BF81-B3769227ADBD"}
 */
var summaryText = '';

/**
 * @param {JSEvent} event
 *
 * @private
 *
 * @properties={typeid:24,uuid:"214F46EF-B635-5A5D-9EC0-8DD85C2C9CC7"}
 */
function onLoad(event) {
	boardDate = scopes.crud.today();
}

/**
 * @param {Boolean} firstShow
 * @param {JSEvent} event
 *
 * @private
 *
 * @properties={typeid:24,uuid:"487BC55F-12FC-550A-AD38-AA10D6162DF8"}
 */
function onShow(firstShow, event) {
	if (!scopes.auth.guard('attendance_board')) return;
	refresh();
}

/**
 * Recalculates the day for all employees and reloads the board.
 *
 * @properties={typeid:24,uuid:"36FD294A-4894-5799-AF89-9851E0FBBBC7"}
 */
function refresh() {
	if (!boardDate) boardDate = scopes.crud.today();
	scopes.attendance.processDate(boardDate);
	loadBoard();
}

/**
 * @param {Date} oldValue
 * @param {Date} newValue
 * @param {JSEvent} event
 * @return {Boolean}
 *
 * @private
 *
 * @properties={typeid:24,uuid:"542DB65D-6F8F-5115-914A-A13E408E2DD4"}
 */
function onDateChange(oldValue, newValue, event) {
	refresh();
	return true;
}

/**
 * @param {*} oldValue
 * @param {*} newValue
 * @param {JSEvent} event
 * @return {Boolean}
 *
 * @private
 *
 * @properties={typeid:24,uuid:"F16EB7F2-E57D-5313-A90B-7A0C218280BA"}
 */
function onFilterChange(oldValue, newValue, event) {
	loadBoard();
	return true;
}

/**
 * @param {JSEvent} event
 *
 * @private
 *
 * @properties={typeid:24,uuid:"D2F05F89-65E5-58FE-9211-AF6174287301"}
 */
function onClear(event) {
	departmentFilter = null;
	statusFilter = null;
	loadBoard();
}

/**
 * @param {JSEvent} event
 *
 * @private
 *
 * @properties={typeid:24,uuid:"73E6B590-8B26-524D-B9AE-354803382A3A"}
 */
function onPrevDay(event) {
	boardDate = scopes.attendance.addDays(boardDate || scopes.crud.today(), -1);
	refresh();
}

/**
 * @param {JSEvent} event
 *
 * @private
 *
 * @properties={typeid:24,uuid:"05F03932-5432-55B0-BB5C-8069EF21DF83"}
 */
function onNextDay(event) {
	boardDate = scopes.attendance.addDays(boardDate || scopes.crud.today(), 1);
	refresh();
}

/**
 * @param {JSEvent} event
 *
 * @private
 *
 * @properties={typeid:24,uuid:"C4C97D32-4CBD-5ED1-BC75-D04CAF8E7563"}
 */
function onToday(event) {
	boardDate = scopes.crud.today();
	refresh();
}

/**
 * @param {JSEvent} event
 *
 * @private
 *
 * @properties={typeid:24,uuid:"C698D439-8994-5BF7-A0CA-F43B2EA23BC7"}
 */
function onRecalculate(event) {
	refresh();
	plugins.dialogs.showInfoDialog('Attendance', 'Attendance for ' + utils.dateFormat(boardDate, 'dd-MM-yyyy') + ' was recalculated.', 'OK');
}

/**
 * Opens the manual punches of the selected row.
 *
 * @param {JSEvent} event
 *
 * @private
 *
 * @properties={typeid:24,uuid:"646782DD-EB65-58D8-A94E-FC29F66B9548"}
 */
function onEditPunches(event) {
	if (!scopes.auth.canOpen('punches')) {
		plugins.dialogs.showWarningDialog('Attendance', 'Only HR or an administrator can edit punches.', 'OK');
		return;
	}
	var rec = foundset.getSelectedRecord();
	if (!rec) {
		plugins.dialogs.showWarningDialog('Attendance', 'Select an employee in the list first.', 'OK');
		return;
	}
	forms.punches.openFor(rec.employee_id, rec.work_date);
	forms.main.showForm('punches');
}

/**
 * Downloads the board as a CSV file for Excel.
 *
 * @param {JSEvent} event
 *
 * @private
 *
 * @properties={typeid:24,uuid:"0BEA2F1D-D524-56A7-8931-FE669F15753C"}
 */
function onExport(event) {
	scopes.export.toCsv(foundset, [{"dp": "employee_id", "title": "Employee", "valuelist": "employees"}, {"dp": "attendance_to_employees.department_id", "title": "Department", "valuelist": "departments"}, {"dp": "shift_id", "title": "Shift", "valuelist": "shifts"}, {"dp": "check_in", "title": "In", "format": "HH:mm"}, {"dp": "check_out", "title": "Out", "format": "HH:mm"}, {"dp": "worked_minutes", "title": "Worked (min)"}, {"dp": "late_minutes", "title": "Late (min)"}, {"dp": "overtime_minutes", "title": "OT (min)"}, {"dp": "status", "title": "Status", "valuelist": "attendance_status_badge"}, {"dp": "remarks", "title": "Remarks"}],
		'attendance_' + utils.dateFormat(boardDate, 'yyyy-MM-dd'));
}

/**
 * Loads the attendance rows of the day with the current filters.
 *
 * @private
 *
 * @properties={typeid:24,uuid:"96BD4D4E-3B56-51A7-BBBD-5347E3B82D3A"}
 */
function loadBoard() {
	var day = scopes.attendance.dateOnly(boardDate);
	var q = datasources.db.attendance.attendance.createSelect();
	q.where.add(q.columns.work_date.eq(day));
	if (departmentFilter) {
		var inDepartment = datasources.db.attendance.employees.createSelect();
		inDepartment.result.add(inDepartment.columns.employee_id);
		inDepartment.where.add(inDepartment.columns.department_id.eq(departmentFilter));
		q.where.add(q.columns.employee_id.isin(inDepartment));
	}
	if (statusFilter) {
		q.where.add(q.columns.status.eq(statusFilter));
	}
	// managers only see their own team
	if (scopes.auth.isTeamOnly()) {
		q.where.add(q.columns.employee_id.isin(scopes.auth.teamSelect()));
	}
	q.sort.add(q.joins.attendance_to_employees.columns.first_name.asc);
	foundset.loadRecords(q);
	
	// summary: counts per status for the whole day
	var team = scopes.auth.teamSql();
	var ds = databaseManager.getDataSetByQuery('attendance',
		'select status, count(*) from attendance where work_date = ?' + team.sql + ' group by status',
		[day].concat(team.args), -1);
	var counts = {};
	for (var i = 1; i <= ds.getMaxRowIndex(); i++) {
		counts[ds.getValue(i, 1)] = ds.getValue(i, 2);
	}
	var order = ['PRESENT', 'LATE', 'HALF_DAY', 'MISSING_PUNCH', 'PENDING', 'ABSENT', 'ON_LEAVE', 'HOLIDAY', 'WEEKLY_OFF'];
	var parts = [];
	for (i = 0; i < order.length; i++) {
		if (counts[order[i]]) parts.push(scopes.attendance.statusLabel(order[i]) + ': ' + counts[order[i]]);
	}
	summaryText = parts.length ? parts.join('   \u00b7   ') : 'No attendance for this day. Assign shifts to employees to see them here.';
}
