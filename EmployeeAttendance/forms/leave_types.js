/**
 * @param {JSEvent} event
 *
 * @private
 *
 * @properties={typeid:24,uuid:"79514453-1FA1-56D5-8B54-CBA577485F45"}
 */
function onLoad(event) {
	foundset.sort('name asc', true);
}

/**
 * @param {JSEvent} event
 *
 * @private
 *
 * @properties={typeid:24,uuid:"D66051D5-5FBE-5B8F-8CAC-8A9EA00ACED0"}
 */
function onNew(event) {
	scopes.crud.newRecord(foundset, {is_active: 1, is_paid: 1, carry_forward: 0, max_carry_forward: 0, requires_approval: 1, allow_half_day: 1, days_per_year: 0});
	elements.fld_code.requestFocus();
}

/**
 * @param {JSEvent} event
 *
 * @private
 *
 * @properties={typeid:24,uuid:"F456C220-2C89-55BA-8CA0-CFDC00B15C53"}
 */
function onSave(event) {
	scopes.crud.save(foundset, [["code", "Code"], ["name", "Name"], ["days_per_year", "Days per year"]], 'Leave Types');
}

/**
 * @param {JSEvent} event
 *
 * @private
 *
 * @properties={typeid:24,uuid:"915BCFE0-71EF-5BF1-B942-B57BB071BADE"}
 */
function onCancel(event) {
	scopes.crud.cancel(foundset);
}

/**
 * @param {JSEvent} event
 *
 * @private
 *
 * @properties={typeid:24,uuid:"2A81E062-3E6C-5C27-97B2-4601DF53F42B"}
 */
function onDelete(event) {
	scopes.crud.remove(foundset, 'Leave Types', name);
}

/**
 * Downloads the list as a CSV file for Excel.
 *
 * @param {JSEvent} event
 *
 * @private
 *
 * @properties={typeid:24,uuid:"AE17BB9E-1AE6-5718-A44A-C1A758ACAF6B"}
 */
function onExport(event) {
	scopes.export.toCsv(foundset, [{"dp": "code", "title": "Code"}, {"dp": "name", "title": "Name"}, {"dp": "days_per_year", "title": "Days/year", "format": "#0.##"}, {"dp": "is_paid", "title": "Paid", "valuelist": "yes_no"}, {"dp": "is_active", "title": "Active", "valuelist": "yes_no"}], 'leave_types');
}

/**
 * Access check: see scopes.auth.guard().
 *
 * @param {Boolean} firstShow
 * @param {JSEvent} event
 *
 * @private
 *
 * @properties={typeid:24,uuid:"FA1DE970-F1D3-530D-9C8F-282AED1B6A2F"}
 */
function onShow(firstShow, event) {
	if (!scopes.auth.guard('leave_types')) return;
}
