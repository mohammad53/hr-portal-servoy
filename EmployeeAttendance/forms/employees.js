/**
 * Free text search on code, name and biometric id
 *
 * @type {String}
 *
 * @properties={typeid:35,uuid:"8FB6D350-100C-5A29-B36B-A281B040AD2A"}
 */
var searchText = null;

/**
 * Status filter (null = all)
 *
 * @type {String}
 *
 * @properties={typeid:35,uuid:"05BD871A-FD1A-5D58-BD17-73097E732627"}
 */
var statusFilter = 'ACTIVE';

/**
 * Department filter (null = all)
 *
 * @type {UUID}
 *
 * @properties={typeid:35,uuid:"51DDF462-5F66-56FE-B616-36A834DC67D3",variableType:-4}
 */
var departmentFilter = null;

/**
 * Designation filter (null = all)
 *
 * @type {UUID}
 *
 * @properties={typeid:35,uuid:"8311F793-B016-5301-98D3-5486244CF095",variableType:-4}
 */
var designationFilter = null;

/**
 * @param {JSEvent} event
 *
 * @private
 *
 * @properties={typeid:24,uuid:"D101633F-A3DE-51B2-AFF7-6CF116BF7803"}
 */
function onLoad(event) {
	applyFilter();
}

/**
 * @param {JSEvent} event
 *
 * @private
 *
 * @properties={typeid:24,uuid:"09E0C21F-10BF-52B1-9979-132B482D25E1"}
 */
function onNew(event) {
	scopes.crud.newRecord(foundset, {status: 'ACTIVE', join_date: scopes.crud.today()});
	elements.fld_code.requestFocus();
}

/**
 * @param {JSEvent} event
 *
 * @private
 *
 * @properties={typeid:24,uuid:"67C79C50-AFEF-5615-B45D-C39ECC958344"}
 */
function onSave(event) {
	var current = foundset.getSelectedRecord();
	if (current && current.reports_to_employee_id && String(current.reports_to_employee_id) == String(current.employee_id)) {
		plugins.dialogs.showWarningDialog('Employees', 'An employee cannot report to themselves. Choose a different manager.', 'OK');
		return;
	}
	if (current && current.leave_date && current.join_date && current.leave_date < current.join_date) {
		plugins.dialogs.showWarningDialog('Employees', 'The leave date cannot be before the join date.', 'OK');
		return;
	}
	scopes.crud.save(foundset, [["employee_code", "Employee code"], ["first_name", "First name"], ["join_date", "Join date"], ["status", "Status"]], 'Employees');
}

/**
 * @param {JSEvent} event
 *
 * @private
 *
 * @properties={typeid:24,uuid:"CD1FC566-97B6-5469-BC09-1FC7861914D3"}
 */
function onCancel(event) {
	scopes.crud.cancel(foundset);
}

/**
 * @param {JSEvent} event
 *
 * @private
 *
 * @properties={typeid:24,uuid:"0CEA12AE-FC32-5223-BB36-69342320F039"}
 */
function onDelete(event) {
	scopes.crud.remove(foundset, 'Employees', first_name + ' ' + (last_name || ''));
}

/**
 * Downloads the list as a CSV file for Excel.
 *
 * @param {JSEvent} event
 *
 * @private
 *
 * @properties={typeid:24,uuid:"B2EE7A7D-3315-5A7C-8AD5-4CB864E60169"}
 */
function onExport(event) {
	scopes.export.toCsv(foundset, [{"dp": "employee_code", "title": "Code"}, {"dp": "first_name", "title": "First name"}, {"dp": "last_name", "title": "Last name"}, {"dp": "department_id", "title": "Department", "valuelist": "departments"}, {"dp": "designation_id", "title": "Designation", "valuelist": "designations"}, {"dp": "status", "title": "Status", "valuelist": "employee_status"}, {"dp": "biometric_user_id", "title": "Biometric ID"}], 'employees');
}

/**
 * @param {*} oldValue
 * @param {*} newValue
 * @param {JSEvent} event
 * @return {Boolean}
 *
 * @private
 *
 * @properties={typeid:24,uuid:"28A86C8D-477F-5CC1-856B-F2BB84040CD7"}
 */
function onSearch(oldValue, newValue, event) {
	applyFilter();
	return true;
}

/**
 * @param {JSEvent} event
 *
 * @private
 *
 * @properties={typeid:24,uuid:"83EFDEC8-30DC-5905-956E-AD3E700ABAB4"}
 */
function onSearchClick(event) {
	applyFilter();
}

/**
 * @param {JSEvent} event
 *
 * @private
 *
 * @properties={typeid:24,uuid:"022E91A1-5AB9-55ED-BEE1-258F0A30F493"}
 */
function onClear(event) {
	searchText = null;
	statusFilter = null;
	departmentFilter = null;
	designationFilter = null;
	applyFilter();
}

/**
 * Loads employees matching the filter panel.
 *
 * @private
 *
 * @properties={typeid:24,uuid:"8F8D59E7-E284-5934-AD26-924902EF003E"}
 */
function applyFilter() {
	var q = datasources.db.attendance.employees.createSelect();
	if (searchText) {
		var s = '%' + searchText.toLowerCase() + '%';
		q.where.add(q.or
			.add(q.columns.employee_code.lower.like(s))
			.add(q.columns.first_name.lower.like(s))
			.add(q.columns.last_name.lower.like(s))
			.add(q.columns.biometric_user_id.lower.like(s)));
	}
	if (statusFilter) q.where.add(q.columns.status.eq(statusFilter));
	if (departmentFilter) q.where.add(q.columns.department_id.eq(departmentFilter));
	if (designationFilter) q.where.add(q.columns.designation_id.eq(designationFilter));
	q.sort.add(q.columns.first_name.asc).add(q.columns.last_name.asc);
	foundset.loadRecords(q);
}

/**
 * Access check: see scopes.auth.guard().
 *
 * @param {Boolean} firstShow
 * @param {JSEvent} event
 *
 * @private
 *
 * @properties={typeid:24,uuid:"F82D05C3-708A-5265-8AA2-1A1A28E0A00F"}
 */
function onShow(firstShow, event) {
	if (!scopes.auth.guard('employees')) return;
}
