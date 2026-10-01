/**
 * Chart colour per attendance status
 *
 * @type {Object}
 *
 * @properties={typeid:35,uuid:"D961B31D-CEFB-5631-B0F4-D01C27E14425",variableType:-4}
 */
var STATUS_COLORS = { PRESENT: '#2e7d32', LATE: '#f59e0b', HALF_DAY: '#0288d1', MISSING_PUNCH: '#475569', PENDING: '#cbd5e1', ABSENT: '#dc2626', ON_LEAVE: '#7c3aed', HOLIDAY: '#64748b', WEEKLY_OFF: '#e2e8f0' };

/**
 * SVG donut chart with legend.
 *
 * @param {Array<{label: String, value: Number, color: String}>} segments
 * @param {String} caption text under the total
 * @return {String} html
 *
 * @properties={typeid:24,uuid:"232002FD-D45F-5471-9D96-32564FDB9874"}
 */
function donut(segments, caption) {
	var total = 0;
	for (var i = 0; i < segments.length; i++) total += segments[i].value;
	var r = 60;
	var circumference = 2 * Math.PI * r;
	var offset = 0;
	var arcs = '<circle r="60" cx="80" cy="80" fill="none" stroke="#eef2f7" stroke-width="22"/>';
	var legend = '';
	for (i = 0; i < segments.length; i++) {
		var s = segments[i];
		if (!s.value) continue;
		var len = circumference * s.value / total;
		arcs += '<circle r="60" cx="80" cy="80" fill="none" stroke="' + s.color + '" stroke-width="22"'
			+ ' stroke-dasharray="' + len.toFixed(2) + ' ' + (circumference - len).toFixed(2) + '"'
			+ ' stroke-dashoffset="' + (-offset).toFixed(2) + '" transform="rotate(-90 80 80)"/>';
		offset += len;
		legend += '<li>' + dot(s.color) + s.label
			+ '<b>' + s.value + '</b></li>';
	}
	return '<div class="chart-donut"><svg viewBox="0 0 160 160" width="160" height="160">' + arcs
		+ '<text x="80" y="80" text-anchor="middle" class="chart-total">' + total + '</text>'
		+ '<text x="80" y="100" text-anchor="middle" class="chart-caption">' + caption + '</text></svg>'
		+ '<ul class="chart-legend">' + (legend || '<li>No data</li>') + '</ul></div>';
}

/**
 * SVG stacked bar chart.
 *
 * @param {Array<{label: String, values: Object<Number>}>} days
 * @param {Array<{key: String, label: String, color: String}>} series
 * @return {String} html
 *
 * @properties={typeid:24,uuid:"5071CB8B-CDFD-5AEF-BBF2-91A351021696"}
 */
function stackedBars(days, series) {
	var max = 1;
	for (var i = 0; i < days.length; i++) {
		var sum = 0;
		for (var j = 0; j < series.length; j++) sum += days[i].values[series[j].key] || 0;
		if (sum > max) max = sum;
	}
	var width = 420, height = 190, padTop = 10, bottom = 30, left = 10;
	var slot = (width - left) / days.length;
	var barWidth = Math.min(34, slot * 0.6);
	var svg = '<line x1="' + left + '" y1="' + (height - bottom) + '" x2="' + width + '" y2="' + (height - bottom)
		+ '" stroke="#e2e8f0"/>';
	for (i = 0; i < days.length; i++) {
		var x = left + i * slot + (slot - barWidth) / 2;
		var y = height - bottom;
		for (j = 0; j < series.length; j++) {
			var v = days[i].values[series[j].key] || 0;
			if (!v) continue;
			var h = (height - padTop - bottom) * v / max;
			y -= h;
			svg += '<rect x="' + x.toFixed(1) + '" y="' + y.toFixed(1) + '" width="' + barWidth.toFixed(1)
				+ '" height="' + h.toFixed(1) + '" fill="' + series[j].color + '" rx="2"><title>'
				+ series[j].label + ': ' + v + '</title></rect>';
		}
		svg += '<text x="' + (x + barWidth / 2).toFixed(1) + '" y="' + (height - 10) + '" text-anchor="middle" class="chart-axis">'
			+ days[i].label + '</text>';
	}
	var legend = '';
	for (j = 0; j < series.length; j++) {
		legend += '<li>' + dot(series[j].color) + series[j].label + '</li>';
	}
	return '<div class="chart-bars"><svg viewBox="0 0 ' + width + ' ' + height + '" preserveAspectRatio="xMidYMid meet">'
		+ svg + '</svg><ul class="chart-legend inline">' + legend + '</ul></div>';
}

/**
 * Legend marker. An svg fill attribute is used because inline styles are blocked by the CSP.
 *
 * @param {String} color
 * @return {String}
 *
 * @private
 *
 * @properties={typeid:24,uuid:"AFBAD4A2-8E76-59BC-9E51-F0A7271952A0"}
 */
function dot(color) {
	return '<svg class="dot" width="10" height="10"><rect width="10" height="10" rx="3" fill="' + color + '"/></svg>';
}
