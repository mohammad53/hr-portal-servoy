/**
 * @param {JSEvent} event
 *
 * @private
 *
 * @properties={typeid:24,uuid:"5162C60B-F416-56F8-94B5-06894FD4FF69"}
 */
function onLoad(event) {
	foundset.sort('username asc', true);
}

/**
 * @param {JSEvent} event
 *
 * @private
 *
 * @properties={typeid:24,uuid:"267F5D1E-9984-525D-A34D-9849AEE3D040"}
 */
function onNew(event) {
	scopes.crud.newRecord(foundset, {role: 'EMPLOYEE', is_active: 1, must_change_password: 1, failed_login_count: 0});
	elements.fld_username.requestFocus();
}

/**
 * @param {JSEvent} event
 *
 * @private
 *
 * @properties={typeid:24,uuid:"E2117D0C-02CE-5E3D-87F8-B8DAE8289384"}
 */
function onSave(event) {
	var rec = foundset.getSelectedRecord();
	var tempPassword = null;
	if (!rec) return;
	if (rec.username) {
		rec.username = rec.username.trim();
		var sameName = scopes.auth.findUser(rec.username);
		if (sameName && String(sameName.user_id) != String(rec.user_id)) {
			plugins.dialogs.showWarningDialog('Users', 'The username "' + rec.username + '" is already taken.', 'OK');
			return;
		}
	}
	if (String(rec.user_id) == String(scopes.auth.currentUser.user_id) && (rec.role != 'ADMIN' || !rec.is_active)) {
		plugins.dialogs.showWarningDialog('Users', 'You cannot remove your own administrator access.', 'OK');
		return;
	}
	if (rec.isNew() && !rec.password_hash) {
		tempPassword = scopes.auth.generatePassword();
		rec.password_hash = scopes.auth.hashPassword(tempPassword);
		rec.must_change_password = 1;
	}
	if (scopes.crud.save(foundset, [["username", "Username"], ["role", "Role"]], 'Users')) {
		if (tempPassword) showTemporaryPassword(rec.username, tempPassword);
	}
}

/**
 * @param {JSEvent} event
 *
 * @private
 *
 * @properties={typeid:24,uuid:"9C49F3E4-8FC4-50BE-9999-41D78A88ECAC"}
 */
function onCancel(event) {
	scopes.crud.cancel(foundset);
}

/**
 * @param {JSEvent} event
 *
 * @private
 *
 * @properties={typeid:24,uuid:"1AFBE348-3797-56C0-83E2-0622B3BB965D"}
 */
function onDelete(event) {
	if (username && scopes.auth.currentUser && username == scopes.auth.currentUser.username) {
		plugins.dialogs.showWarningDialog('Users', 'You cannot delete your own account.', 'OK');
		return;
	}
	scopes.crud.remove(foundset, 'Users', username);
}

/**
 * Downloads the list as a CSV file for Excel.
 *
 * @param {JSEvent} event
 *
 * @private
 *
 * @properties={typeid:24,uuid:"ACCF7F53-B9E6-540F-8188-4A2FAD20CF78"}
 */
function onExport(event) {
	scopes.export.toCsv(foundset, [{"dp": "username", "title": "Username"}, {"dp": "role", "title": "Role", "valuelist": "user_roles"}, {"dp": "employee_id", "title": "Employee", "valuelist": "employees"}, {"dp": "is_active", "title": "Active", "valuelist": "yes_no"}, {"dp": "last_login", "title": "Last login", "format": "dd-MM-yyyy HH:mm"}, {"dp": "failed_login_count", "title": "Failed logins"}], 'users');
}

/**
 * Generates a temporary password and unlocks the account.
 *
 * @param {JSEvent} event
 *
 * @private
 *
 * @properties={typeid:24,uuid:"022A984D-ACBE-5DB0-BAB9-70465C99A625"}
 */
function onResetPassword(event) {
	var rec = foundset.getSelectedRecord();
	if (!rec || rec.isNew()) {
		plugins.dialogs.showWarningDialog('Users', 'Save the user first.', 'OK');
		return;
	}
	if (plugins.dialogs.showQuestionDialog('Users', 'Reset the password of "' + rec.username + '"? '
		+ 'A temporary password is generated and the account is unlocked.', 'Reset', 'Cancel') != 'Reset') return;
	var temp = scopes.auth.generatePassword();
	rec.password_hash = scopes.auth.hashPassword(temp);
	rec.must_change_password = 1;
	rec.failed_login_count = 0;
	if (scopes.crud.save(foundset, [], 'Users')) showTemporaryPassword(rec.username, temp);
}

/**
 * @param {String} account username of the account
 * @param {String} temporaryPassword
 *
 * @private
 *
 * @properties={typeid:24,uuid:"38F37ABB-7DA8-5FE8-ADB5-68B78BDC9773"}
 */
function showTemporaryPassword(account, temporaryPassword) {
	plugins.dialogs.showInfoDialog('Temporary password',
		'Temporary password for "' + account + '":\n\n' + temporaryPassword
		+ '\n\nGive it to the user. They must choose a new password when they sign in. It is not shown again.', 'OK');
}

/**
 * Access check: see scopes.auth.guard().
 *
 * @param {Boolean} firstShow
 * @param {JSEvent} event
 *
 * @private
 *
 * @properties={typeid:24,uuid:"832499C2-2898-5DC3-AC69-B68327F058A4"}
 */
function onShow(firstShow, event) {
	if (!scopes.auth.guard('users')) return;
}
