/**
 * @param {JSEvent} event
 *
 * @private
 *
 * @properties={typeid:24,uuid:"C3FEC314-F6E7-5FE6-AD0B-C4F23FDF109A"}
 */
function onLoad(event) {
	foundset.sort('holiday_date asc', true);
}

/**
 * @param {JSEvent} event
 *
 * @private
 *
 * @properties={typeid:24,uuid:"5385ACC0-CBAB-552E-B7A8-93435AFD4F5B"}
 */
function onNew(event) {
	scopes.crud.newRecord(foundset, {is_optional: 0});
	elements.fld_date.requestFocus();
}

/**
 * @param {JSEvent} event
 *
 * @private
 *
 * @properties={typeid:24,uuid:"AAFC4B83-EA38-5515-ACA9-985CCF452D0E"}
 */
function onSave(event) {
	if (scopes.crud.save(foundset, [["holiday_date", "Date"], ["name", "Name"]], 'Holidays')) {
		// recalculate that day so it shows as Holiday (future days are handled when they come)
		scopes.attendance.processDate(holiday_date);
	}
}

/**
 * @param {JSEvent} event
 *
 * @private
 *
 * @properties={typeid:24,uuid:"26F009E6-544D-5593-A585-375BA28C95CA"}
 */
function onCancel(event) {
	scopes.crud.cancel(foundset);
}

/**
 * @param {JSEvent} event
 *
 * @private
 *
 * @properties={typeid:24,uuid:"2B84B7ED-CDD2-5A04-87C8-984EE94C49EE"}
 */
function onDelete(event) {
	var day = holiday_date;
	if (scopes.crud.remove(foundset, 'Holidays', name)) {
		if (day) scopes.attendance.processDate(day);
	}
}

/**
 * Downloads the list as a CSV file for Excel.
 *
 * @param {JSEvent} event
 *
 * @private
 *
 * @properties={typeid:24,uuid:"4ADC88FC-1148-5BAC-9859-CB791BF751AD"}
 */
function onExport(event) {
	scopes.export.toCsv(foundset, [{"dp": "holiday_date", "title": "Date", "format": "EEE dd-MM-yyyy"}, {"dp": "name", "title": "Holiday"}, {"dp": "is_optional", "title": "Optional", "valuelist": "yes_no"}], 'holidays');
}

/**
 * Access check: see scopes.auth.guard().
 *
 * @param {Boolean} firstShow
 * @param {JSEvent} event
 *
 * @private
 *
 * @properties={typeid:24,uuid:"24011FA5-73C0-5934-A6BB-C7D660435C8B"}
 */
function onShow(firstShow, event) {
	if (!scopes.auth.guard('holidays')) return;
}
