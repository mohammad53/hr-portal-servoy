/**
 * @param {JSEvent} event
 *
 * @private
 *
 * @properties={typeid:24,uuid:"485B3965-D5B0-5A26-AA3D-A4918B1B87EC"}
 */
function onLoad(event) {
	foundset.sort('start_date desc', true);
}

/**
 * @param {JSEvent} event
 *
 * @private
 *
 * @properties={typeid:24,uuid:"8705147B-B9B8-59C7-BD67-A02E969434EB"}
 */
function onNew(event) {
	var employee = forms.employees.foundset.getSelectedRecord();
	if (!employee || employee.isNew()) {
		plugins.dialogs.showWarningDialog('Shift assignment', 'Save the employee first.', 'OK');
		return;
	}
	scopes.crud.newRecord(foundset, {start_date: scopes.crud.today()});
	elements.fld_shift.requestFocus();
}

/**
 * @param {JSEvent} event
 *
 * @private
 *
 * @properties={typeid:24,uuid:"4F315CE7-BA19-5C1D-84F9-A6ED65B96873"}
 */
function onSave(event) {
	var rec = foundset.getSelectedRecord();
	if (rec && !rec.shift_id == !rec.pattern_id) {
		plugins.dialogs.showWarningDialog('Shift assignment', 'Choose either a fixed shift or a rotating pattern (not both).', 'OK');
		return;
	}
	if (rec && rec.pattern_id && !rec.cycle_start_date) {
		rec.cycle_start_date = rec.start_date;
	}
	if (rec && rec.shift_id) {
		rec.cycle_start_date = null;
	}
	scopes.crud.save(foundset, [["start_date", "From"]], 'Shift assignment');
}

/**
 * @param {JSEvent} event
 *
 * @private
 *
 * @properties={typeid:24,uuid:"0CD61186-D8F8-5CD3-9F69-A936CE6B02A5"}
 */
function onCancel(event) {
	scopes.crud.cancel(foundset);
}

/**
 * @param {JSEvent} event
 *
 * @private
 *
 * @properties={typeid:24,uuid:"2A66FB95-1D5F-54A6-935B-36C6E101CD46"}
 */
function onDelete(event) {
	scopes.crud.remove(foundset, 'Shift assignment', 'this shift assignment');
}

/**
 * Downloads the list as a CSV file for Excel.
 *
 * @param {JSEvent} event
 *
 * @private
 *
 * @properties={typeid:24,uuid:"D3C2289A-623A-59F2-B5DC-F32E8C6D1F57"}
 */
function onExport(event) {
	scopes.export.toCsv(foundset, [{"dp": "shift_id", "title": "Fixed shift", "valuelist": "shifts"}, {"dp": "pattern_id", "title": "Rotating pattern", "valuelist": "shift_patterns"}, {"dp": "start_date", "title": "From", "format": "dd-MM-yyyy"}, {"dp": "end_date", "title": "To", "format": "dd-MM-yyyy"}, {"dp": "weekly_off_days", "title": "Weekly off"}], 'employee_shifts');
}

/**
 * Access check: see scopes.auth.guard().
 *
 * @param {Boolean} firstShow
 * @param {JSEvent} event
 *
 * @private
 *
 * @properties={typeid:24,uuid:"5561D4F9-EFFF-5668-AE3B-1418F4694B52"}
 */
function onShow(firstShow, event) {
	if (!scopes.auth.guard('employee_shifts')) return;
}
