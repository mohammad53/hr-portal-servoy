/**
 * @type {String}
 *
 * @properties={typeid:35,uuid:"7F1E85BC-544C-5AB8-84C4-D0FA140697E2"}
 */
var currentPassword = null;

/**
 * @type {String}
 *
 * @properties={typeid:35,uuid:"683BC324-F275-55A4-864F-1570AC1E480D"}
 */
var newPassword = null;

/**
 * @type {String}
 *
 * @properties={typeid:35,uuid:"AF730E74-6269-5775-830D-37323E9E637C"}
 */
var confirmPassword = null;

/**
 * @type {String}
 *
 * @properties={typeid:35,uuid:"B3FA9DD3-350F-58A8-AAF6-3BEABE8C2518"}
 */
var message = '';

/**
 * True when shown right after login (password must be changed)
 *
 * @type {Boolean}
 *
 * @properties={typeid:35,uuid:"BF2E36E9-1106-5939-B50E-1A73E6BBB446",variableType:-4}
 */
var forced = false;

/**
 * @param {JSEvent} event
 *
 * @private
 *
 * @properties={typeid:24,uuid:"671C77C2-AE2F-58BF-993D-0EF62D16DB7E"}
 */
function onSave(event) {
	message = scopes.auth.passwordProblem(newPassword, confirmPassword)
		|| scopes.auth.changePassword(currentPassword, newPassword) || '';
	if (message) return;
	currentPassword = null;
	newPassword = null;
	confirmPassword = null;
	if (forced) {
		forced = false;
		forms.main.controller.show();
	} else {
		plugins.dialogs.showInfoDialog('Change password', 'Your password was changed.', 'OK');
	}
}

/**
 * @param {Boolean} firstShow
 * @param {JSEvent} event
 *
 * @private
 *
 * @properties={typeid:24,uuid:"BC8D01D5-725C-5062-A2B5-C16FC0C156A8"}
 */
function onShow(firstShow, event) {
	if (!scopes.auth.guard('change_password')) return;
	message = forced ? 'Please choose a new password before you continue.' : '';
	elements.fld_current.requestFocus();
}
