/**
 * @type {String}
 *
 * @properties={typeid:35,uuid:"39219096-049B-5B52-A5CE-D7C2308DDA99"}
 */
var username = null;

/**
 * @type {String}
 *
 * @properties={typeid:35,uuid:"0375B80D-7CF0-5AF0-915C-46FB664547C1"}
 */
var password = null;

/**
 * Message shown under the form
 *
 * @type {String}
 *
 * @properties={typeid:35,uuid:"EFC9CF42-B22B-50D1-9A00-70DF93B81F41"}
 */
var loginError = '';

/**
 * @param {JSEvent} event
 *
 * @private
 *
 * @properties={typeid:24,uuid:"180C20FD-3D15-5C7C-B0F2-BF64BA1D0480"}
 */
function onLogin(event) {
	loginError = '';
	var message = scopes.auth.login(username, password);
	password = null;
	if (message) {
		loginError = message;
		return;
	}
	if (scopes.auth.currentUser.mustChangePassword) {
		forms.change_password.forced = true;
		forms.change_password.controller.show();
		return;
	}
	forms.main.controller.show();
}

/**
 * @param {Boolean} firstShow
 * @param {JSEvent} event
 *
 * @private
 *
 * @properties={typeid:24,uuid:"19BE6B22-3EF9-502B-BAC6-D8421DE02D51"}
 */
function onShow(firstShow, event) {
	// fresh installation: create the first administrator
	if (!scopes.auth.hasUsers()) {
		forms.setup.controller.show();
		return;
	}
	if (scopes.auth.currentUser) {
		forms.main.controller.show();
		return;
	}
	elements.fld_username.requestFocus();
}
