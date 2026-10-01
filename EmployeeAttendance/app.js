/**
 * Solution onOpen handler.
 *
 * @param {String} arg
 * @param {Object<String|Array<String>>} queryParams
 *
 * @properties={typeid:24,uuid:"A90AD440-6782-56C5-9733-2A39246E9F8D"}
 */
function onSolutionOpen(arg, queryParams) {
	// Changes are only written when the user presses Save
	databaseManager.setAutoSave(false);
	// app name, company and theme colours
	scopes.settings.load();
}

/**
 * Runs a single-value count query on the attendance server.
 *
 * @param {String} sql
 * @param {Array} [args]
 * @return {Number}
 *
 * @properties={typeid:24,uuid:"06E0F272-D8AA-557B-8ACA-37203876F8EF"}
 */
function count(sql, args) {
	var ds = databaseManager.getDataSetByQuery('attendance', sql, args || [], 1);
	return ds.getMaxRowIndex() ? ds.getValue(1, 1) : 0;
}
