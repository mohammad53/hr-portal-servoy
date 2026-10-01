/**
 * @type {String}
 *
 * @properties={typeid:35,uuid:"6617F5DB-054B-5897-AA38-8253AC006BBF"}
 */
var username = 'admin';

/**
 * @type {String}
 *
 * @properties={typeid:35,uuid:"0CA06992-54E8-5CE8-ABEF-DDD2D7B6C01E"}
 */
var password = null;

/**
 * @type {String}
 *
 * @properties={typeid:35,uuid:"CB743023-1F76-59D3-B617-CD3C9A483CA1"}
 */
var confirm = null;

/**
 * @type {String}
 *
 * @properties={typeid:35,uuid:"BE64F2C1-DED7-5943-A4C5-BE22A32DC529"}
 */
var setupError = '';

/**
 * @param {JSEvent} event
 *
 * @private
 *
 * @properties={typeid:24,uuid:"D8AF0AC0-9BDC-53A4-A945-AD0C87C80988"}
 */
function onCreate(event) {
	setupError = scopes.auth.passwordProblem(password, confirm) || scopes.auth.createFirstAdmin(username, password) || '';
	if (setupError) return;
	// sign in with the new account
	setupError = scopes.auth.login(username, password) || '';
	password = null;
	confirm = null;
	if (!setupError) forms.main.controller.show();
}

/**
 * @param {Boolean} firstShow
 * @param {JSEvent} event
 *
 * @private
 *
 * @properties={typeid:24,uuid:"E5473A65-3FB7-56A2-B0E0-94E2F37C8846"}
 */
function onShow(firstShow, event) {
	// only available on a fresh installation
	if (scopes.auth.hasUsers()) forms.login.controller.show();
}
