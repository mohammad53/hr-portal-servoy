/**
 * @type {Number}
 *
 * @properties={typeid:35,uuid:"CA9123B1-5BD1-5B81-AB4B-417BB4CAB355",variableType:4}
 */
var inToday = 0;

/**
 * @type {Number}
 *
 * @properties={typeid:35,uuid:"8AD352ED-DA89-5C7A-90BE-EA0F1DF993F4",variableType:4}
 */
var lateToday = 0;

/**
 * @type {Number}
 *
 * @properties={typeid:35,uuid:"EAB533F7-261D-5204-960E-9F4DDE80EBE7",variableType:4}
 */
var notInToday = 0;

/**
 * @type {Number}
 *
 * @properties={typeid:35,uuid:"614110C7-F3C0-589F-B498-C42F3CFC6A8F",variableType:4}
 */
var onLeaveToday = 0;

/**
 * @type {Number}
 *
 * @properties={typeid:35,uuid:"88F007DE-8EF0-5943-BC9C-B7DA1DFBC062",variableType:4}
 */
var activeEmployees = 0;

/**
 * @type {Number}
 *
 * @properties={typeid:35,uuid:"E309915B-CD8E-59C8-9728-02E944754B4B",variableType:4}
 */
var departmentCount = 0;

/**
 * @type {Number}
 *
 * @properties={typeid:35,uuid:"99B38F1A-4986-5039-867D-A05520F83922",variableType:4}
 */
var shiftCount = 0;

/**
 * @type {Number}
 *
 * @properties={typeid:35,uuid:"EB5396AC-0263-569F-9029-5F746C1F533B",variableType:4}
 */
var pendingLeaves = 0;

/**
 * SVG donut of today's statuses
 *
 * @type {String}
 *
 * @properties={typeid:35,uuid:"E2A73FA0-CE7E-59FA-AA14-195E25E40795"}
 */
var todayChart = '';

/**
 * SVG bars of the last 7 days
 *
 * @type {String}
 *
 * @properties={typeid:35,uuid:"9A8A1D64-573B-51E3-8BD9-CD314269E7ED"}
 */
var weekChart = '';

/**
 * Heading line with the date
 *
 * @type {String}
 *
 * @properties={typeid:35,uuid:"AA61B51F-D30C-5809-9B1F-C07C7A4F9360"}
 */
var greeting = '';

/**
 * Refreshes counters and charts every time the dashboard is shown.
 *
 * @param {Boolean} firstShow
 * @param {JSEvent} event
 *
 * @private
 *
 * @properties={typeid:24,uuid:"82063A4F-D373-5FBC-89E8-2E821D2C4541"}
 */
function onShow(firstShow, event) {
	if (!scopes.auth.guard('dashboard')) return;
	var today = scopes.crud.today();
	// make sure the last 7 days are calculated (days that were never opened on the board)
	for (var d = firstShow ? 6 : 0; d >= 0; d--) {
		scopes.attendance.processDate(scopes.attendance.addDays(today, -d));
	}
	greeting = 'Overview for ' + utils.dateFormat(today, 'EEEE, dd MMMM yyyy');
	
	// managers see their team only
	var team = scopes.auth.teamSql();
	var sql = "select count(*) from attendance where work_date = current_date" + team.sql + " and status ";
	inToday = scopes.app.count(sql + "in ('PRESENT', 'LATE', 'HALF_DAY', 'MISSING_PUNCH')", team.args);
	lateToday = scopes.app.count(sql + "= 'LATE'", team.args);
	notInToday = scopes.app.count(sql + "= 'PENDING'", team.args);
	onLeaveToday = scopes.app.count(sql + "= 'ON_LEAVE'", team.args);
	activeEmployees = scopes.app.count("select count(*) from employees where status = 'ACTIVE'");
	departmentCount = scopes.app.count('select count(*) from departments where is_active');
	shiftCount = scopes.app.count('select count(*) from shifts where is_active');
	pendingLeaves = scopes.app.count("select count(*) from leave_requests where status = 'PENDING'");
	
	var colors = scopes.charts.STATUS_COLORS;
	var order = ['PRESENT', 'LATE', 'HALF_DAY', 'MISSING_PUNCH', 'PENDING', 'ABSENT', 'ON_LEAVE', 'HOLIDAY', 'WEEKLY_OFF'];
	
	// today: donut per status
	var ds = databaseManager.getDataSetByQuery('attendance',
		'select status, count(*) from attendance where work_date = current_date' + team.sql + ' group by status',
		team.args, -1);
	var counts = {};
	for (var i = 1; i <= ds.getMaxRowIndex(); i++) counts[ds.getValue(i, 1)] = ds.getValue(i, 2);
	var segments = [];
	for (i = 0; i < order.length; i++) {
		segments.push({ label: scopes.attendance.statusLabel(order[i]), value: counts[order[i]] || 0, color: colors[order[i]] });
	}
	todayChart = scopes.charts.donut(segments, 'employees');
	
	// last 7 days: stacked bars
	var from = scopes.attendance.addDays(today, -6);
	ds = databaseManager.getDataSetByQuery('attendance',
		'select work_date, status, count(*) from attendance where work_date between ? and ?' + team.sql
		+ ' group by work_date, status', [from, today].concat(team.args), -1);
	var days = [];
	for (d = 0; d < 7; d++) {
		days.push({ label: utils.dateFormat(scopes.attendance.addDays(from, d), 'EEE dd'), values: {} });
	}
	for (i = 1; i <= ds.getMaxRowIndex(); i++) {
		var index = scopes.attendance.daysBetween(from, ds.getValue(i, 1));
		if (index >= 0 && index < 7) days[index].values[ds.getValue(i, 2)] = ds.getValue(i, 3);
	}
	var series = [];
	var shown = ['PRESENT', 'LATE', 'HALF_DAY', 'MISSING_PUNCH', 'ABSENT', 'ON_LEAVE'];
	for (i = 0; i < shown.length; i++) {
		series.push({ key: shown[i], label: scopes.attendance.statusLabel(shown[i]), color: colors[shown[i]] });
	}
	weekChart = scopes.charts.stackedBars(days, series);
}
