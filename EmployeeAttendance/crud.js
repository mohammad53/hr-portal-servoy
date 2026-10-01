/**
 * Creates a new record at the top of the foundset, applies default values and sets created_by.
 *
 * @param {JSFoundSet} fs
 * @param {Object} [defaults] column name -> value
 * @return {JSRecord}
 *
 * @properties={typeid:24,uuid:"DC5C07FE-6EB2-5AF5-A815-29A7D122615D"}
 */
function newRecord(fs, defaults) {
	var rec = fs.getRecord(fs.newRecord(true));
	if (defaults) {
		for (var key in defaults) {
			rec[key] = defaults[key];
		}
	}
	if (hasColumn(fs, 'created_by') && scopes.auth.currentUser) {
		rec['created_by'] = scopes.auth.currentUser.username;
	}
	return rec;
}

/**
 * Validates required fields and saves the selected record, showing a dialog on failure.
 *
 * @param {JSFoundSet} fs
 * @param {Array<Array<String>>} required pairs of [dataprovider, label]
 * @param {String} title dialog title
 * @return {Boolean}
 *
 * @properties={typeid:24,uuid:"FF70D723-2208-5658-8C38-B0B76CDB2C68"}
 */
function save(fs, required, title) {
	var rec = fs.getSelectedRecord();
	if (!rec) return false;
	var missing = [];
	for (var i = 0; required && i < required.length; i++) {
		var value = rec[required[i][0]];
		if (value === null || value === undefined || value === '') {
			missing.push(required[i][1]);
		}
	}
	if (missing.length) {
		plugins.dialogs.showWarningDialog(title, 'Please fill in: ' + missing.join(', '), 'OK');
		return false;
	}
	if (!rec.isNew() && rec.hasChangedData() && hasColumn(fs, 'modified_by')) {
		rec['modified_at'] = new Date();
		rec['modified_by'] = scopes.auth.currentUser ? scopes.auth.currentUser.username : null;
	}
	if (!databaseManager.saveData(rec)) {
		var msg = rec.exception ? rec.exception.getMessage() : 'Unknown error';
		plugins.dialogs.showErrorDialog(title, friendlyError(msg), 'OK');
		return false;
	}
	return true;
}

/**
 * @param {JSFoundSet} fs
 * @param {String} column
 * @return {Boolean}
 *
 * @private
 *
 * @properties={typeid:24,uuid:"24228B42-BC77-5DD1-B9D7-2388C984BE26"}
 */
function hasColumn(fs, column) {
	var table = databaseManager.getTable(fs);
	return !!(table && table.getColumn(column));
}

/**
 * Discards unsaved changes on the selected record (removes it if it was never saved).
 *
 * @param {JSFoundSet} fs
 *
 * @properties={typeid:24,uuid:"E382ADD1-B399-56AD-A2DE-DCD0AE5B4C2A"}
 */
function cancel(fs) {
	var rec = fs.getSelectedRecord();
	if (!rec) return;
	if (rec.isNew()) {
		fs.deleteRecord(rec);
	} else {
		rec.revertChanges();
	}
}

/**
 * Deletes the selected record after confirmation.
 *
 * @param {JSFoundSet} fs
 * @param {String} title dialog title
 * @param {String} description shown in the question
 * @return {Boolean}
 *
 * @properties={typeid:24,uuid:"DF2A17EE-2EA1-5A7F-AD7D-AE1C86A10477"}
 */
function remove(fs, title, description) {
	var rec = fs.getSelectedRecord();
	if (!rec) return false;
	var answer = plugins.dialogs.showQuestionDialog(title, 'Delete "' + description + '"?', 'Delete', 'Cancel');
	if (answer != 'Delete') return false;
	try {
		if (!fs.deleteRecord(rec)) throw new Error('delete failed');
	} catch (e) {
		plugins.dialogs.showErrorDialog(title, 'This record cannot be deleted because other data still refers to it. Mark it inactive instead.', 'OK');
		return false;
	}
	return true;
}

/**
 * @param {String} msg database error message
 * @return {String}
 *
 * @private
 *
 * @properties={typeid:24,uuid:"D5D428B3-6407-582C-82F8-29C0E1BB57BF"}
 */
function friendlyError(msg) {
	if (/duplicate key|unique constraint/i.test(msg)) {
		return 'A record with the same code or name already exists.';
	}
	var check = /check constraint "([^"]+)"/i.exec(msg);
	if (check) {
		// known rules get a plain explanation; never show the raw row data
		var rules = {
			ck_employees_not_own_manager: 'An employee cannot report to themselves.',
			employees_check: 'The leave date cannot be before the join date.',
			shifts_check: 'Tick "Ends next day" only when the end time is before the start time.',
			shifts_check1: 'Half-day minutes cannot be more than full-day minutes.',
			employee_shift_assignments_check: 'Choose either a fixed shift or a rotating pattern (not both).',
			employee_shift_assignments_check1: 'A rotating pattern needs the date on which pattern day 1 falls.',
			employee_shift_assignments_check2: 'The end date cannot be before the start date.',
			attendance_check: 'Check-out must be after check-in.'
		};
		return rules[check[1]] || 'Some values are not valid for this record (rule: ' + check[1] + ').';
	}
	if (/foreign key/i.test(msg)) {
		return 'This record refers to data that does not exist, or is still in use.\n\n' + msg;
	}
	return 'Could not save: ' + msg;
}

/**
 * @return {Date} today at midnight
 *
 * @properties={typeid:24,uuid:"1CE86D14-D29C-5FFF-8D85-7A521B573106"}
 */
function today() {
	var d = new Date();
	d.setHours(0, 0, 0, 0);
	return d;
}
