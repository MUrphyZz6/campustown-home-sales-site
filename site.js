/*
 * What homes sold for in each city
 *
 * Every figure on the page is computed here, in the browser, from the CSV in data/.
 * Nothing is precomputed, hard-coded or estimated.
 */
(function (global) {
  'use strict';

  var DATA_PATH = 'data/college_town_home_sales.csv';
  var PRICE_RULE = 10000;

  /* Parse one line that contains quoted fields, following RFC 4180. */
  function parseQuotedLine(line) {
    var out = [], field = '', inQuotes = false, n = line.length;
    for (var i = 0; i < n; i++) {
      var c = line.charCodeAt(i);
      if (inQuotes) {
        if (c === 34) {
          if (line.charCodeAt(i + 1) === 34) { field += '"'; i++; }
          else inQuotes = false;
        } else {
          field += line.charAt(i);
        }
      } else if (c === 34) {
        inQuotes = true;
      } else if (c === 44) {
        out.push(field); field = '';
      } else {
        field += line.charAt(i);
      }
    }
    out.push(field);
    return out;
  }

  /*
   * The dataset has one row per sale and no quoted field spans a line break,
   * so splitting on line breaks is safe and much faster than a full scanner.
   */
  function parseCsv(text) {
    if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);
    var lines = text.split('\n');
    var rows = [];
    for (var i = 0; i < lines.length; i++) {
      var line = lines[i];
      if (line.charCodeAt(line.length - 1) === 13) line = line.slice(0, -1);
      if (line === '') continue;
      rows.push(line.indexOf('"') >= 0 ? parseQuotedLine(line) : line.split(','));
    }
    return rows;
  }

  function median(sorted) {
    var n = sorted.length;
    if (!n) return NaN;
    var mid = n >> 1;
    return (n % 2) ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  }

  function computeCityStats(csvText, priceRule) {
    var rule = priceRule == null ? PRICE_RULE : priceRule;
    var rows = parseCsv(csvText);
    if (!rows.length) throw new Error('The dataset is empty.');

    var header = rows[0];
    var iCity = header.indexOf('city');
    var iState = header.indexOf('state');
    var iPrice = header.indexOf('sale_price');
    if (iCity < 0 || iPrice < 0) throw new Error('Unexpected dataset columns; expected city and sale_price.');

    var byCity = new Map();
    var total = 0, excluded = 0, qualifying = 0;

    for (var r = 1; r < rows.length; r++) {
      var row = rows[r];
      if (!row || row.length < 2) continue;
      total++;

      var raw = (row[iPrice] || '').trim();
      if (raw === '') continue;
      var price = Number(raw);
      if (!isFinite(price)) continue;

      if (price < rule) { excluded++; continue; }
      qualifying++;

      var city = (row[iCity] || '').trim();
      var entry = byCity.get(city);
      if (!entry) {
        entry = { city: city, state: iState >= 0 ? (row[iState] || '').trim() : '', prices: [] };
        byCity.set(city, entry);
      }
      entry.prices.push(price);
    }

    var cities = [];
    byCity.forEach(function (e) {
      e.prices.sort(function (a, b) { return a - b; });
      cities.push({ city: e.city, state: e.state, sales: e.prices.length, median: median(e.prices) });
    });

    cities.sort(function (a, b) {
      if (b.median !== a.median) return b.median - a.median;
      return a.city < b.city ? -1 : a.city > b.city ? 1 : 0;
    });

    return { total: total, excluded: excluded, qualifying: qualifying, priceRule: rule, cities: cities };
  }

  function formatMoney(value) {
    return '$' + Math.round(value).toLocaleString('en-US');
  }

  function formatInt(value) {
    return Number(value).toLocaleString('en-US');
  }

  function render(stats) {
    document.getElementById('stat-cities').textContent = formatInt(stats.cities.length);
    document.getElementById('stat-sales').textContent = formatInt(stats.qualifying);
    document.getElementById('status').textContent =
      'Showing ' + stats.cities.length + ' cities, ranked by median price.';

    var max = stats.cities.length ? stats.cities[0].median : 0;
    var chart = document.getElementById('chart');
    var tbody = document.getElementById('table-body');
    var chartFrag = document.createDocumentFragment();
    var tableFrag = document.createDocumentFragment();

    stats.cities.forEach(function (c) {
      var label = c.city + (c.state ? ', ' + c.state : '');

      var row = document.createElement('div');
      row.className = 'bar-row';
      row.setAttribute('role', 'img');
      row.setAttribute('aria-label', label + ': median ' + formatMoney(c.median) + ' from ' + formatInt(c.sales) + ' sales');

      var lab = document.createElement('div');
      lab.className = 'bar-label';
      lab.textContent = label;

      var track = document.createElement('div');
      track.className = 'bar-track';
      var fill = document.createElement('div');
      fill.className = 'bar-fill';
      fill.style.width = (max > 0 ? (c.median / max) * 100 : 0).toFixed(2) + '%';
      track.appendChild(fill);

      var val = document.createElement('div');
      val.className = 'bar-value';
      val.textContent = formatMoney(c.median);

      row.appendChild(lab);
      row.appendChild(track);
      row.appendChild(val);

      chartFrag.appendChild(row);

      var tr = document.createElement('tr');
      var tdCity = document.createElement('td');
      tdCity.textContent = label;
      var tdSales = document.createElement('td');
      tdSales.className = 'num';
      tdSales.textContent = formatInt(c.sales);
      var tdMedian = document.createElement('td');
      tdMedian.className = 'num';
      tdMedian.textContent = formatMoney(c.median);
      tr.appendChild(tdCity);
      tr.appendChild(tdSales);
      tr.appendChild(tdMedian);

      tableFrag.appendChild(tr);
    });

    chart.textContent = '';
    chart.appendChild(chartFrag);
    tbody.textContent = '';
    tbody.appendChild(tableFrag);
  }

  function fail(message) {
    var status = document.getElementById('status');
    if (status) status.textContent = '';
    var box = document.getElementById('error');
    if (box) {
      box.hidden = false;
      box.textContent = message;
    }
  }

  function boot() {
    fetch(DATA_PATH)
      .then(function (response) {
        if (!response.ok) throw new Error('could not load ' + DATA_PATH + ' (' + response.status + ')');
        return response.text();
      })
      .then(function (text) {
        render(computeCityStats(text, PRICE_RULE));
      })
      .catch(function (error) {
        fail('The page could not compute its figures: ' + error.message + '.');
      });
  }

  var api = {
    parseCsv: parseCsv,
    computeCityStats: computeCityStats,
    formatMoney: formatMoney,
    formatInt: formatInt,
    PRICE_RULE: PRICE_RULE
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;

  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
    else boot();
  }
})(typeof globalThis !== 'undefined' ? globalThis : this);
