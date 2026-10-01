/**
 * The logged in user (null = not logged in)
 *
 * @type {{user_id: UUID, username: String, role: String, employee_id: UUID, mustChangePassword: Boolean}}
 *
 * @properties={typeid:35,uuid:"6295CEBA-2BC4-5EB9-948D-B6BC75DBC4FF",variableType:-4}
 */
var currentUser = null;

/**
 * Role -> screens (forms) the role may open
 *
 * @type {Object}
 *
 * @properties={typeid:35,uuid:"65B22C35-2E55-5653-B934-0C8F5FD820DF",variableType:-4}
 */
var PERMISSIONS = {"ADMIN": ["dashboard", "attendance_board", "punches", "my_attendance", "employees", "employee_shifts", "departments", "designations", "shifts", "holidays", "leave_types", "users", "settings", "change_password"], "HR": ["dashboard", "attendance_board", "punches", "my_attendance", "employees", "employee_shifts", "departments", "designations", "shifts", "holidays", "leave_types", "change_password"], "MANAGER": ["dashboard", "attendance_board", "my_attendance", "change_password"], "EMPLOYEE": ["my_attendance", "change_password"]};

/**
 * Role -> first screen after login
 *
 * @type {Object}
 *
 * @properties={typeid:35,uuid:"DE5749F5-6D00-5AFD-A2FE-886915F08641",variableType:-4}
 */
var HOME = {"ADMIN": "dashboard", "HR": "dashboard", "MANAGER": "dashboard", "EMPLOYEE": "my_attendance"};

/**
 * @return {Boolean} false on a fresh installation (first-run setup)
 *
 * @properties={typeid:24,uuid:"5F43E7EC-C4CD-5366-AEC5-4E85A42887FB"}
 */
function hasUsers() {
	return scopes.app.count('select count(*) from app_users') > 0;
}

/**
 * @param {String} password
 * @return {String}
 *
 * @properties={typeid:24,uuid:"9BFE8618-295F-55A5-B3DB-737D6EB08180"}
 */
function hashPassword(password) {
	return utils.stringPBKDF2Hash(password, 10000);
}

/**
 * @param {String} password
 * @param {String} [confirm]
 * @return {String} null when the password is acceptable
 *
 * @properties={typeid:24,uuid:"0ECAFA07-1306-59D7-9397-379FCF076D4B"}
 */
function passwordProblem(password, confirm) {
	if (!password || password.length < 8) return 'The password must be at least 8 characters.';
	if (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) return 'The password must contain letters and numbers.';
	if (confirm !== undefined && password !== confirm) return 'The passwords do not match.';
	return null;
}

/**
 * @param {String} username case-insensitive
 * @return {JSRecord<db:/attendance/app_users>}
 *
 * @properties={typeid:24,uuid:"704A51FE-BE09-5D19-98F5-9DFB4CA67FBB"}
 */
function findUser(username) {
	var q = datasources.db.attendance.app_users.createSelect();
	q.where.add(q.columns.username.lower.eq(String(username || '').toLowerCase().trim()));
	var fs = datasources.db.attendance.app_users.getFoundSet();
	fs.loadRecords(q);
	return fs.getSize() ? fs.getRecord(1) : null;
}

/**
 * Checks the credentials and starts the session.
 *
 * @param {String} username
 * @param {String} password
 * @return {String} null on success, otherwise the message to show
 *
 * @properties={typeid:24,uuid:"1965CBB4-1201-507A-A008-EBF06D6AE8B1"}
 */
function login(username, password) {
	var user = findUser(username);
	if (!user) return 'Invalid username or password.';
	if (!user.is_active) return 'This account is disabled. Please contact an administrator.';
	if (user.failed_login_count >= 5) {
		return 'This account is locked after too many failed attempts. Ask an administrator to reset your password.';
	}
	if (!password || !utils.validatePBKDF2Hash(password, user.password_hash)) {
		user.failed_login_count = (user.failed_login_count || 0) + 1;
		databaseManager.saveData(user);
		return 'Invalid username or password.';
	}
	user.failed_login_count = 0;
	user.last_login = new Date();
	databaseManager.saveData(user);
	currentUser = {
		user_id: user.user_id,
		username: user.username,
		role: user.role,
		employee_id: user.employee_id,
		mustChangePassword: !!user.must_change_password
	};
	return null;
}

/**
 * First-run setup: creates the first administrator (only when no users exist).
 *
 * @param {String} username
 * @param {String} password
 * @return {String} null on success
 *
 * @properties={typeid:24,uuid:"4C9C71E5-0EC1-5543-94FB-FF80F1B0DC86"}
 */
function createFirstAdmin(username, password) {
	if (hasUsers()) return 'An administrator already exists.';
	if (!username || !/^[A-Za-z0-9._-]{3,50}$/.test(username)) return 'Username: 3-50 letters, numbers, dot, dash or underscore.';
	var fs = datasources.db.attendance.app_users.getFoundSet();
	var user = fs.getRecord(fs.newRecord());
	user.username = username.trim();
	user.password_hash = hashPassword(password);
	user.role = 'ADMIN';
	user.is_active = 1;
	user.must_change_password = 0;
	user.failed_login_count = 0;
	user.created_by = 'setup';
	if (!databaseManager.saveData(user)) {
		return 'Could not create the account: ' + (user.exception ? user.exception.getMessage() : '');
	}
	return null;
}

/**
 * @param {String} current
 * @param {String} newPassword (already validated)
 * @return {String} null on success
 *
 * @properties={typeid:24,uuid:"9EFAAB63-1E48-571F-9FFB-DEC0F89B573B"}
 */
function changePassword(current, newPassword) {
	if (!currentUser) return 'You are not logged in.';
	var user = findUser(currentUser.username);
	if (!user || !utils.validatePBKDF2Hash(current, user.password_hash)) return 'The current password is not correct.';
	if (current === newPassword) return 'The new password must be different from the current one.';
	user.password_hash = hashPassword(newPassword);
	user.must_change_password = 0;
	user.modified_at = new Date();
	user.modified_by = currentUser.username;
	if (!databaseManager.saveData(user)) return 'Could not save the new password.';
	currentUser.mustChangePassword = false;
	return null;
}

/**
 * Random temporary password (letters and digits, 10 characters).
 *
 * @return {String}
 *
 * @properties={typeid:24,uuid:"6B377D85-88D3-5CF9-972B-0FF0F9CF71C2"}
 */
function generatePassword() {
	var chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
	var random = new Packages.java.security.SecureRandom();
	var password = '';
	while (passwordProblem(password)) {
		password = '';
		for (var i = 0; i < 10; i++) password += chars.charAt(random.nextInt(chars.length));
	}
	return password;
}

/**
 * @param {String} formName
 * @return {Boolean}
 *
 * @properties={typeid:24,uuid:"2E1F518E-078C-5C71-931E-8A902C74E5FB"}
 */
function canOpen(formName) {
	if (!currentUser) return false;
	var allowed = PERMISSIONS[currentUser.role] || [];
	return allowed.indexOf(formName) >= 0;
}

/**
 * Re-reads the logged in user's role and linked employee, so changes made under System > Users
 * apply without logging in again.
 *
 * @return {Boolean} false when the account was deleted or disabled
 *
 * @properties={typeid:24,uuid:"01FE210C-DA72-5888-9D03-55AC5D35E205"}
 */
function refresh() {
	if (!currentUser) return false;
	var q = datasources.db.attendance.app_users.createSelect();
	q.where.add(q.columns.user_id.eq(currentUser.user_id));
	var fs = datasources.db.attendance.app_users.getFoundSet();
	fs.loadRecords(q);
	if (!fs.getSize()) return false;
	// another session (an administrator) may have changed this account
	databaseManager.refreshRecordFromDatabase(fs, 1);
	var user = fs.getRecord(1);
	if (!user.is_active) return false;
	currentUser.role = user.role;
	currentUser.employee_id = user.employee_id;
	return true;
}

/**
 * Called in every screen's onShow: sends users that are not logged in to the login screen and
 * users without permission back to their home screen.
 *
 * @param {String} formName
 * @return {Boolean}
 *
 * @properties={typeid:24,uuid:"48A4A315-1F91-5606-A62F-116E9F1EB469"}
 */
function guard(formName) {
	if (!currentUser) {
		forms.login.controller.show();
		return false;
	}
	if (!refresh()) {
		plugins.dialogs.showWarningDialog('Signed out', 'Your account is no longer active.', 'OK');
		logout();
		return false;
	}
	if (!canOpen(formName)) {
		plugins.dialogs.showWarningDialog('Access denied', 'You do not have access to this screen.', 'OK');
		forms.main.showForm(home());
		return false;
	}
	return true;
}

/**
 * @return {String} the first screen of the current user's role
 *
 * @properties={typeid:24,uuid:"08CDA27F-4D80-5CC3-83A3-F6677FDC4D15"}
 */
function home() {
	return currentUser ? (HOME[currentUser.role] || 'my_attendance') : 'login';
}

/**
 * @return {Boolean} true when the user may only see their own team
 *
 * @properties={typeid:24,uuid:"4AD71F8C-02DF-52BF-8681-F1593AAB8A5C"}
 */
function isTeamOnly() {
	return !!currentUser && currentUser.role == 'MANAGER';
}

/**
 * @return {QBSelect<db:/attendance/employees>} employee ids of the manager's team
 *
 * @properties={typeid:24,uuid:"941781D9-937C-5FCA-BCD9-A10FDE1B43C7"}
 */
function teamSelect() {
	// the manager and everyone reporting to them
	var q = datasources.db.attendance.employees.createSelect();
	q.result.add(q.columns.employee_id);
	q.where.add(q.or
		.add(q.columns.reports_to_employee_id.eq(currentUser.employee_id))
		.add(q.columns.employee_id.eq(currentUser.employee_id)));
	return q;
}

/**
 * SQL condition limiting attendance queries to the manager's team.
 *
 * @return {{sql: String, args: Array}}
 *
 * @properties={typeid:24,uuid:"1D4F9E47-8FC4-55BA-8C7D-6432DF9021E0"}
 */
function teamSql() {
	if (!isTeamOnly()) return { sql: '', args: [] };
	return {
		sql: ' and employee_id in (select employee_id from employees where reports_to_employee_id = ? or employee_id = ?)',
		args: [currentUser.employee_id, currentUser.employee_id]
	};
}

/**
 * @return {String} e.g. admin (Administrator)
 *
 * @properties={typeid:24,uuid:"E0520A70-CBEA-528E-A83B-97368C1B2CA3"}
 */
function displayName() {
	if (!currentUser) return '';
	var labels = {"ADMIN": "Administrator", "HR": "HR", "MANAGER": "Manager", "EMPLOYEE": "Employee"};
	return currentUser.username + ' (' + (labels[currentUser.role] || currentUser.role) + ')';
}

/**
 * Ends the session and restarts the solution at the login screen.
 *
 * @properties={typeid:24,uuid:"244DDC1F-5C94-53A4-8F98-8CB734ADEC33"}
 */
function logout() {
	currentUser = null;
	// unsaved edits must not leak into the next user's session
	databaseManager.revertEditedRecords();
	// close and reopen the solution: every form and scope starts fresh at the login screen
	// (security.logout() does nothing here because Servoy's built-in security is not used)
	application.closeSolution(application.getSolutionName());
}
