/**
 * Breadcrumb in the top bar (html)
 *
 * @type {String}
 *
 * @properties={typeid:35,uuid:"1D6C959A-9F99-5E38-89EB-868F49D0AA62"}
 */
var pageTitle = '';

/**
 * Company, date and user in the top bar
 *
 * @type {String}
 *
 * @properties={typeid:35,uuid:"FED55501-1229-538E-BF0D-659B21CDC5AE"}
 */
var headerRight = '';

/**
 * Sidebar groups: group key -> form names
 *
 * @type {Object}
 *
 * @properties={typeid:35,uuid:"2C609861-A7D7-5627-BFE6-03A99942975B",variableType:-4}
 */
var NAV_GROUPS = {"selfservice": ["my_attendance", "change_password"], "attendance": ["attendance_board", "punches"], "organisation": ["employees", "departments", "designations"], "timesetup": ["shifts", "holidays", "leave_types"], "system": ["users", "settings"]};

/**
 * Form name -> [module, screen title]
 *
 * @type {Object}
 *
 * @properties={typeid:35,uuid:"CF3AF985-5591-5459-9008-F21533DE78B9",variableType:-4}
 */
var NAV_TITLES = {"dashboard": ["", "Dashboard"], "my_attendance": ["Self Service", "My Attendance"], "change_password": ["Self Service", "Change Password"], "attendance_board": ["Attendance", "Attendance Board"], "punches": ["Attendance", "Manual Punches"], "employees": ["Organisation", "Employees"], "departments": ["Organisation", "Departments"], "designations": ["Organisation", "Designations"], "shifts": ["Time & Leave Setup", "Shifts"], "holidays": ["Time & Leave Setup", "Holidays"], "leave_types": ["Time & Leave Setup", "Leave Types"], "users": ["System", "Users"], "settings": ["System", "Settings"]};

/**
 * Sidebar group key -> expanded
 *
 * @type {Object}
 *
 * @properties={typeid:35,uuid:"A4396E96-E3FD-5A64-A980-5E75DA30D6DF",variableType:-4}
 */
var groupOpen = {};

/**
 * @param {JSEvent} event
 *
 * @private
 *
 * @properties={typeid:24,uuid:"4B53031C-2810-5243-AA59-1E1C507D9F7A"}
 */
function onLoad(event) {
	if (!scopes.auth.currentUser) return;
	applyPermissions();
	refreshHeader();
	showForm(scopes.auth.home());
}

/**
 * @param {Boolean} firstShow
 * @param {JSEvent} event
 *
 * @private
 *
 * @properties={typeid:24,uuid:"1474D436-29E9-5D77-9BB3-FFAC5F0CDBBB"}
 */
function onShow(firstShow, event) {
	// never show the application without a logged in user
	if (!scopes.auth.currentUser) {
		forms.login.controller.show();
		return;
	}
	if (!firstShow) {
		applyPermissions();
		refreshHeader();
	}
}

/**
 * Sidebar item clicked; the button name is nav_<formName>.
 *
 * @param {JSEvent} event
 *
 * @private
 *
 * @properties={typeid:24,uuid:"CD8A6861-33FD-53B2-8DBF-3DBEA6DE2598"}
 */
function onNav(event) {
	showForm(event.getElementName().replace('nav_', ''));
}

/**
 * Sidebar group header clicked: expand / collapse.
 *
 * @param {JSEvent} event
 *
 * @private
 *
 * @properties={typeid:24,uuid:"76E70D9C-3EE6-50F0-9466-320E5B501AA6"}
 */
function onGroupToggle(event) {
	var key = event.getElementName().replace('grp_', '');
	setGroupOpen(key, !groupOpen[key]);
}

/**
 * @param {String} key
 * @param {Boolean} open
 *
 * @private
 *
 * @properties={typeid:24,uuid:"322A846F-766F-5020-898F-653F84647378"}
 */
function setGroupOpen(key, open) {
	groupOpen[key] = open;
	var items = NAV_GROUPS[key];
	for (var i = 0; i < items.length; i++) {
		// items the user may not open stay hidden
		elements['nav_' + items[i]].visible = open && scopes.auth.canOpen(items[i]);
	}
	elements['grp_' + key].trailingImageStyleClass = 'nav-chevron fa fa-chevron-' + (open ? 'down' : 'right');
}

/**
 * Shows only the menu items the current user's role may open.
 *
 * @private
 *
 * @properties={typeid:24,uuid:"682EFB60-9CD2-5081-8F14-CACC4DBB02C9"}
 */
function applyPermissions() {
	elements.nav_dashboard.visible = scopes.auth.canOpen('dashboard');
	for (var key in NAV_GROUPS) {
		var any = false;
		for (var i = 0; i < NAV_GROUPS[key].length; i++) {
			if (scopes.auth.canOpen(NAV_GROUPS[key][i])) any = true;
		}
		// a group without any permitted item disappears
		elements['grp_' + key].visible = any;
		setGroupOpen(key, any);
	}
}

/**
 * Shows a form in the content area, highlights its menu item and sets the breadcrumb.
 * Forms the user may not open are replaced by their home screen.
 *
 * @param {String} formName
 *
 * @properties={typeid:24,uuid:"BA66DDBA-32D7-50F9-AE87-B178373C5782"}
 */
function showForm(formName) {
	// never show the login form inside the shell
	if (!scopes.auth.currentUser) {
		forms.login.controller.show();
		return;
	}
	if (!scopes.auth.canOpen(formName)) formName = scopes.auth.home();
	elements.content.containedForm = formName;
	var names = elements.allnames;
	for (var i = 0; i < names.length; i++) {
		if (names[i].indexOf('nav_') == 0) elements[names[i]].removeStyleClass('active');
	}
	if (elements['nav_' + formName]) elements['nav_' + formName].addStyleClass('active');
	// make sure the item's group is open
	for (var key in NAV_GROUPS) {
		if (NAV_GROUPS[key].indexOf(formName) >= 0 && !groupOpen[key]) setGroupOpen(key, true);
	}
	var t = NAV_TITLES[formName] || ['', formName];
	pageTitle = (t[0] ? '<span class="crumb">' + t[0] + '</span><span class="crumb-sep">/</span>' : '') + '<b>' + t[1] + '</b>';
}

/**
 * Updates the right side of the top bar (company, date, user).
 *
 * @properties={typeid:24,uuid:"88F5CE75-FF39-560B-94D9-579D062302DC"}
 */
function refreshHeader() {
	headerRight = (scopes.settings.companyName ? '<span class="company">' + scopes.settings.companyName + '</span>' : '')
		+ '<span class="today"><i class="fa fa-calendar-day"></i> ' + utils.dateFormat(new Date(), 'EEE dd MMM yyyy') + '</span>'
		+ '<span class="user-chip"><i class="fa fa-user-circle"></i> ' + scopes.auth.displayName() + '</span>';
}

/**
 * @param {JSEvent} event
 *
 * @private
 *
 * @properties={typeid:24,uuid:"025775FA-DC74-5376-A38E-7F0F38F21093"}
 */
function onChangePassword(event) {
	showForm('change_password');
}

/**
 * @param {JSEvent} event
 *
 * @private
 *
 * @properties={typeid:24,uuid:"D4E02FEF-B748-5BAC-B995-23C8A529E7ED"}
 */
function onLogout(event) {
	if (plugins.dialogs.showQuestionDialog('Log out', 'Do you want to log out?', 'Log out', 'Cancel') == 'Log out') {
		scopes.auth.logout();
	}
}
