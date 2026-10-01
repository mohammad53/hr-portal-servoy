/**
 * Downloads the records of a foundset as a CSV file that opens in Excel.
 * Valuelist columns export their display value, dates use the column format.
 *
 * @param {JSFoundSet} fs
 * @param {Array<Object>} columns objects with dp, title and optional format / valuelist
 * @param {String} fileName without extension
 * @return {Number} rows exported
 *
 * @properties={typeid:24,uuid:"D59F6945-D400-5C97-AF73-3354E255AA7D"}
 */
function toCsv(fs, columns, fileName) {
	var lines = [];
	var header = [];
	for (var c = 0; c < columns.length; c++) header.push(quote(columns[c]['title']));
	lines.push(header.join(','));
	var count = databaseManager.getFoundSetCount(fs);
	for (var i = 1; i <= count; i++) {
		var rec = fs.getRecord(i);
		var cells = [];
		for (c = 0; c < columns.length; c++) {
			cells.push(quote(displayValue(rec, columns[c])));
		}
		lines.push(cells.join(','));
	}
	var name = fileName + '_' + utils.dateFormat(new Date(), 'yyyyMMdd_HHmm') + '.csv';
	// BOM so Excel opens the file as UTF-8
	plugins.file.writeTXTFile(name, '\ufeff' + lines.join('\r\n'), 'UTF-8', 'text/csv');
	return count;
}

/**
 * @param {JSRecord} rec
 * @param {Object} column dp, optional format / valuelist
 * @return {String}
 *
 * @private
 *
 * @properties={typeid:24,uuid:"132B4B67-DBFB-5B9F-AB5F-1408E0605A35"}
 */
function displayValue(rec, column) {
	/** @type {String} */
	var path = column['dp'];
	/** @type {String} */
	var valuelist = column['valuelist'];
	/** @type {String} */
	var format = column['format'];
	// follow related paths like attendance_to_employees.department_id
	/** @type {*} */
	var value = rec;
	/** @type {Array<String>} */
	var parts = path.split('.');
	for (var i = 0; i < parts.length && value != null; i++) {
		value = value[parts[i]];
	}
	if (value == null) return '';
	if (valuelist) {
		/** @type {Object} */
		var raw = value;
		var shown = application.getValueListDisplayValue(valuelist, raw);
		value = shown == null ? value : shown;
	} else if (value instanceof Date) {
		return utils.dateFormat(value, format || 'dd-MM-yyyy');
	}
	return String(value).replace(/<[^>]*>/g, '');
}

/**
 * @param {*} value
 * @return {String}
 *
 * @private
 *
 * @properties={typeid:24,uuid:"0F14A206-A2A0-580B-809C-E4BFD5D8A845"}
 */
function quote(value) {
	var s = value == null ? '' : String(value);
	return /[",\r\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
}
