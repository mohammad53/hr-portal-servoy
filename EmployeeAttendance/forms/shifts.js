/**
 * @param {JSEvent} event
 *
 * @private
 *
 * @properties={typeid:24,uuid:"EFD33A17-6B77-5AC6-AE3D-0C73EA848E0B"}
 */
function onLoad(event) {
	foundset.sort('start_time asc', true);
}

/**
 * @param {JSEvent} event
 *
 * @private
 *
 * @properties={typeid:24,uuid:"7FB74ACD-CE76-5C9A-92EB-216016AF55F2"}
 */
function onNew(event) {
	scopes.crud.newRecord(foundset, {is_active: 1, crosses_midnight: 0, grace_minutes: 15, break_minutes: 60, full_day_minutes: 420, half_day_minutes: 210, early_in_window_minutes: 120});
	elements.fld_code.requestFocus();
}

/**
 * @param {JSEvent} event
 *
 * @private
 *
 * @properties={typeid:24,uuid:"DB8DBF8C-F87F-589A-9976-A8E38021B26B"}
 */
function onSave(event) {
	scopes.crud.save(foundset, [["code", "Code"], ["name", "Name"], ["start_time", "Start time"], ["end_time", "End time"], ["full_day_minutes", "Full day minutes"], ["half_day_minutes", "Half day minutes"]], 'Shifts');
}

/**
 * @param {JSEvent} event
 *
 * @private
 *
 * @properties={typeid:24,uuid:"8D4BFCC7-4625-5AAD-B73A-D2783AF3FAA7"}
 */
function onCancel(event) {
	scopes.crud.cancel(foundset);
}

/**
 * @param {JSEvent} event
 *
 * @private
 *
 * @properties={typeid:24,uuid:"23148482-CFA9-5C1B-8B9D-9A1D6285F187"}
 */
function onDelete(event) {
	scopes.crud.remove(foundset, 'Shifts', name);
}

/**
 * Downloads the list as a CSV file for Excel.
 *
 * @param {JSEvent} event
 *
 * @private
 *
 * @properties={typeid:24,uuid:"0BBCDB6A-DDB6-5726-9846-1AD13EF0BDAE"}
 */
function onExport(event) {
	scopes.export.toCsv(foundset, [{"dp": "code", "title": "Code"}, {"dp": "name", "title": "Name"}, {"dp": "start_time", "title": "Start", "format": "HH:mm"}, {"dp": "end_time", "title": "End", "format": "HH:mm"}, {"dp": "crosses_midnight", "title": "Overnight", "valuelist": "yes_no"}], 'shifts');
}

/**
 * Keeps 'crosses midnight' in sync with the start and end time.
 *
 * @param {Date} oldValue
 * @param {Date} newValue
 * @param {JSEvent} event
 * @return {Boolean}
 *
 * @private
 *
 * @properties={typeid:24,uuid:"B2244878-EBBF-5A5A-9694-947B03823D14"}
 */
function onTimeChange(oldValue, newValue, event) {
	// A shift whose end time is not after its start time runs past midnight
	if (start_time && end_time) {
		var start = start_time.getHours() * 60 + start_time.getMinutes();
		var end = end_time.getHours() * 60 + end_time.getMinutes();
		crosses_midnight = end <= start ? 1 : 0;
	}
	return true;
}

/**
 * Access check: see scopes.auth.guard().
 *
 * @param {Boolean} firstShow
 * @param {JSEvent} event
 *
 * @private
 *
 * @properties={typeid:24,uuid:"A0261054-6058-54F7-8952-493E9249B7EF"}
 */
function onShow(firstShow, event) {
	if (!scopes.auth.guard('shifts')) return;
}
