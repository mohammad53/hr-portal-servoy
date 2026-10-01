/**
 * Shown in the sidebar
 *
 * @type {String}
 *
 * @properties={typeid:35,uuid:"0FB981B1-7D95-5AB2-843A-AD99D7395A99"}
 */
var appName = 'HR Portal';

/**
 * Shown in the top bar
 *
 * @type {String}
 *
 * @properties={typeid:35,uuid:"6ED7095B-ED1A-5DB8-BEF1-56B2716EC795"}
 */
var companyName = '';

/**
 * Theme preset key (see tools/formgen/theme.py)
 *
 * @type {String}
 *
 * @properties={typeid:35,uuid:"3A6E3DA3-7D2B-5FF7-9441-031B51945BA5"}
 */
var themeColor = 'blue';

/**
 * dark | light | brand
 *
 * @type {String}
 *
 * @properties={typeid:35,uuid:"13057826-B87F-543B-942C-FFE944393F00"}
 */
var sidebarStyle = 'dark';

/**
 * Classes on the main form's theme marker; the stylesheet picks the theme with html:has(...)
 *
 * @type {String}
 *
 * @properties={typeid:35,uuid:"2D60B21C-2EA2-5425-92E8-3B57EF948E8C"}
 */
var themeClass = 'theme-blue sb-dark';

/**
 * Reads the settings from the database and applies the theme.
 *
 * @properties={typeid:24,uuid:"F3561221-5B20-5C90-BF93-D72D88DF4CCE"}
 */
function load() {
	var fs = datasources.db.attendance.app_settings.getFoundSet();
	fs.loadAllRecords();
	for (var i = 1; i <= fs.getSize(); i++) {
		var rec = fs.getRecord(i);
		if (rec.setting_key == 'app_name') appName = rec.setting_value || 'HR Portal';
		else if (rec.setting_key == 'company_name') companyName = rec.setting_value || '';
		else if (rec.setting_key == 'theme_color') themeColor = rec.setting_value || 'blue';
		else if (rec.setting_key == 'sidebar_style') sidebarStyle = rec.setting_value || 'dark';
	}
	applyTheme();
}

/**
 * Writes the current settings to the database.
 *
 * @return {Boolean}
 *
 * @properties={typeid:24,uuid:"9595CF42-A6A4-582C-A4B1-3E28BF0A897D"}
 */
function save() {
	var values = { app_name: appName, company_name: companyName, theme_color: themeColor, sidebar_style: sidebarStyle };
	var fs = datasources.db.attendance.app_settings.getFoundSet();
	fs.loadAllRecords();
	var found = {};
	for (var i = 1; i <= fs.getSize(); i++) {
		var rec = fs.getRecord(i);
		if (values.hasOwnProperty(rec.setting_key)) {
			rec.setting_value = values[rec.setting_key];
			rec.modified_at = new Date();
			found[rec.setting_key] = true;
		}
	}
	for (var key in values) {
		if (!found[key]) {
			var added = fs.getRecord(fs.newRecord());
			added.setting_key = key;
			added.setting_value = values[key];
		}
	}
	return databaseManager.saveData(fs);
}

/**
 * Selects the theme: the main form's marker gets these classes and the stylesheet does the rest.
 * (Servoy's Content Security Policy blocks inline styles, so themes are pre-generated CSS.)
 *
 * @properties={typeid:24,uuid:"37424712-6CBB-5A7D-84D7-D05E423D8ED8"}
 */
function applyTheme() {
	// older versions stored a hex colour: map it to its preset
	var fromHex = {"#1565c0": "blue", "#3949ab": "indigo", "#00897b": "teal", "#00838f": "cyan", "#2e7d32": "green", "#7b1fa2": "purple", "#ad1457": "pink", "#ef6c00": "orange", "#c62828": "red", "#455a64": "slate"};
	if (fromHex[themeColor]) themeColor = fromHex[themeColor];
	if (["blue", "indigo", "teal", "cyan", "green", "purple", "pink", "orange", "red", "slate"].indexOf(themeColor) < 0) themeColor = 'blue';
	if (['dark', 'light', 'brand'].indexOf(sidebarStyle) < 0) sidebarStyle = 'dark';
	themeClass = 'theme-' + themeColor + ' sb-' + sidebarStyle;
}
