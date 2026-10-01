/**
 * @param {JSEvent} event
 *
 * @private
 *
 * @properties={typeid:24,uuid:"D8B4DD97-FB27-56D8-B7CF-188E5C8BC691"}
 */
function onLoad(event) {
	foundset.sort('name asc', true);
}

/**
 * @param {JSEvent} event
 *
 * @private
 *
 * @properties={typeid:24,uuid:"55246344-8509-59C2-8901-96846BC6697D"}
 */
function onNew(event) {
	scopes.crud.newRecord(foundset, {is_active: 1});
	elements.fld_name.requestFocus();
}

/**
 * @param {JSEvent} event
 *
 * @private
 *
 * @properties={typeid:24,uuid:"A061B855-01F1-5CD4-A429-D0AC553AB9F5"}
 */
function onSave(event) {
	scopes.crud.save(foundset, [["name", "Name"]], 'Designations');
}

/**
 * @param {JSEvent} event
 *
 * @private
 *
 * @properties={typeid:24,uuid:"AFBC0723-5080-5896-B063-DDE43235280F"}
 */
function onCancel(event) {
	scopes.crud.cancel(foundset);
}

/**
 * @param {JSEvent} event
 *
 * @private
 *
 * @properties={typeid:24,uuid:"41CA2018-5F4B-5FF8-99A6-0BC83E936825"}
 */
function onDelete(event) {
	scopes.crud.remove(foundset, 'Designations', name);
}

/**
 * Downloads the list as a CSV file for Excel.
 *
 * @param {JSEvent} event
 *
 * @private
 *
 * @properties={typeid:24,uuid:"5FD313A4-8BAB-5865-9A43-EEFCCA37775A"}
 */
function onExport(event) {
	scopes.export.toCsv(foundset, [{"dp": "name", "title": "Name"}, {"dp": "is_active", "title": "Active", "valuelist": "yes_no"}], 'designations');
}

/**
 * Access check: see scopes.auth.guard().
 *
 * @param {Boolean} firstShow
 * @param {JSEvent} event
 *
 * @private
 *
 * @properties={typeid:24,uuid:"740A2B1E-27B0-5F78-A862-EB0B1835ACD3"}
 */
function onShow(firstShow, event) {
	if (!scopes.auth.guard('designations')) return;
}
