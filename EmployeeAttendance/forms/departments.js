/**
 * @param {JSEvent} event
 *
 * @private
 *
 * @properties={typeid:24,uuid:"1F14C7CD-E671-55E1-9D52-6D0912AB9C49"}
 */
function onLoad(event) {
	foundset.sort('name asc', true);
}

/**
 * @param {JSEvent} event
 *
 * @private
 *
 * @properties={typeid:24,uuid:"AC4657D5-3138-5DBD-80DD-B465B9CA75A4"}
 */
function onNew(event) {
	scopes.crud.newRecord(foundset, {is_active: 1});
	elements.fld_code.requestFocus();
}

/**
 * @param {JSEvent} event
 *
 * @private
 *
 * @properties={typeid:24,uuid:"85B0A90D-18FD-58BE-86B8-F6D2D2CBC7D2"}
 */
function onSave(event) {
	scopes.crud.save(foundset, [["code", "Code"], ["name", "Name"]], 'Departments');
}

/**
 * @param {JSEvent} event
 *
 * @private
 *
 * @properties={typeid:24,uuid:"BC0B1A83-FD4F-53F6-B1DC-C3589314046C"}
 */
function onCancel(event) {
	scopes.crud.cancel(foundset);
}

/**
 * @param {JSEvent} event
 *
 * @private
 *
 * @properties={typeid:24,uuid:"BC5B9D04-1A7D-5BBF-BFD6-F0D8A39923AC"}
 */
function onDelete(event) {
	scopes.crud.remove(foundset, 'Departments', name);
}

/**
 * Downloads the list as a CSV file for Excel.
 *
 * @param {JSEvent} event
 *
 * @private
 *
 * @properties={typeid:24,uuid:"4A11A6B7-52E5-5B52-BF99-6C4C3B8FE079"}
 */
function onExport(event) {
	scopes.export.toCsv(foundset, [{"dp": "code", "title": "Code"}, {"dp": "name", "title": "Name"}, {"dp": "manager_employee_id", "title": "Manager", "valuelist": "employees"}, {"dp": "is_active", "title": "Active", "valuelist": "yes_no"}], 'departments');
}

/**
 * Access check: see scopes.auth.guard().
 *
 * @param {Boolean} firstShow
 * @param {JSEvent} event
 *
 * @private
 *
 * @properties={typeid:24,uuid:"6412D9B0-2B01-51E7-9934-B58943E60F00"}
 */
function onShow(firstShow, event) {
	if (!scopes.auth.guard('departments')) return;
}
