/**
 * Live preview while editing.
 *
 * @param {*} oldValue
 * @param {*} newValue
 * @param {JSEvent} event
 * @return {Boolean}
 *
 * @private
 *
 * @properties={typeid:24,uuid:"BEE63BEA-4A64-584B-AF02-916802174E4E"}
 */
function onThemeChange(oldValue, newValue, event) {
	scopes.settings.applyTheme();
	forms.main.refreshHeader();
	return true;
}

/**
 * Colour swatch clicked (button name preset_<key>).
 *
 * @param {JSEvent} event
 *
 * @private
 *
 * @properties={typeid:24,uuid:"FE8B9A28-839D-5F66-B45D-EC14F447CF5D"}
 */
function onPreset(event) {
	scopes.settings.themeColor = event.getElementName().replace('preset_', '');
	scopes.settings.applyTheme();
}

/**
 * @param {JSEvent} event
 *
 * @private
 *
 * @properties={typeid:24,uuid:"A68531B3-7C05-5D85-B77D-F761BBEC26B2"}
 */
function onSave(event) {
	if (scopes.settings.save()) {
		forms.main.refreshHeader();
		plugins.dialogs.showInfoDialog('Settings', 'Settings saved.', 'OK');
	} else {
		plugins.dialogs.showErrorDialog('Settings', 'Could not save the settings.', 'OK');
	}
}

/**
 * @param {JSEvent} event
 *
 * @private
 *
 * @properties={typeid:24,uuid:"91FF41F2-B66D-5BC8-9923-DDCCFB96DCF0"}
 */
function onCancel(event) {
	// discard the preview and reload what is stored
	scopes.settings.load();
	forms.main.refreshHeader();
}

/**
 * @param {JSEvent} event
 * @return {Boolean}
 *
 * @private
 *
 * @properties={typeid:24,uuid:"AA7218C8-3871-59B1-9D41-DC2790387738"}
 */
function onHide(event) {
	// leaving without saving: restore the stored theme
	scopes.settings.load();
	forms.main.refreshHeader();
	return true;
}

/**
 * @param {JSEvent} event
 *
 * @private
 *
 * @properties={typeid:24,uuid:"507E2E21-A6DC-5B17-BFB1-E37A9D6469A0"}
 */
function onPreviewClick(event) {
	// preview only
}

/**
 * Access check: see scopes.auth.guard().
 *
 * @param {Boolean} firstShow
 * @param {JSEvent} event
 *
 * @private
 *
 * @properties={typeid:24,uuid:"15B94588-19EA-5D95-8790-5CAF33823D04"}
 */
function onShow(firstShow, event) {
	if (!scopes.auth.guard('settings')) return;
}
