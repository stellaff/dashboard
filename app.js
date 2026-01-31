const metrics = {
  sales_2024_gross: "2024 Gross Sales",
  sales_2024_net: "2024 Net Sales",
  sales_2025_est_gross: "2025 Gross Sales",
  sales_2025_est_net: "2025 Net Sales",
  sales_2025_forecast: "2025 Forecast Sales",
  sales_2026_gross_positive: "2026 Gross Sales Positive"
};

const palette = {
  primary: "#d95d39",
  blue: "#3474a4",
  teal: "#3d7d7b",
  gold: "#f2b880",
  plum: "#7b4b94",
  slate: "#6a7b8a"
};

const categoryColors = [
  "#d95d39",
  "#3474a4",
  "#3d7d7b",
  "#f2b880",
  "#7b4b94",
  "#c98b3b",
  "#5b8a90",
  "#9a6b9f",
  "#9e6b57"
];

const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0
});

const labelFont = 11;
const smallLabelFont = 10;

const tableColumns = [
  { key: "customer_code", label: "Customer Code" },
  { key: "customer_name", label: "Customer Name" },
  { key: "customer_name_normalized", label: "Customer (Normalized)" },
  { key: "customer_category", label: "Category" },
  { key: "region", label: "Region" },
  { key: "sales_2025_est_gross", label: "2025 Gross" },
  { key: "sales_2025_est_net", label: "2025 Net" },
  { key: "sales_2024_gross", label: "2024 Gross" },
  { key: "sales_2024_net", label: "2024 Net" },
  { key: "sales_2025_forecast", label: "2025 Forecast" },
  { key: "sales_2026_gross_positive", label: "2026 Gross Positive" }
];

const state = {
  search: "",
  region: "All",
  category: "All",
  customer: "All",
  metric: "sales_2025_est_gross",
  sortKey: "sales_2025_est_gross",
  sortDir: "desc"
};

const sourceRecords = (DATA.records || []).map((r, idx) => ({
  id: idx + 1,
  ...r
}));

function uniqueSorted(values) {
  return Array.from(new Set(values.filter(Boolean))).sort((a, b) => a.localeCompare(b));
}

function shortLabel(label) {
  if (!label) return "";
  if (label.length <= 12) return label;
  const parts = label.split(" ");
  if (parts.length === 1) return label;
  return parts.slice(0, -1).join(" ") + "<br>" + parts[parts.length - 1];
}

function formatShort(val) {
  if (val === null || val === undefined) return "";
  if (Math.abs(val) >= 1e6) return (val / 1e6).toFixed(2) + "M";
  if (Math.abs(val) >= 1e3) return (val / 1e3).toFixed(0) + "K";
  return val.toFixed(0);
}

function initFilters() {
  const regionSelect = document.getElementById("region");
  const categorySelect = document.getElementById("category");
  const customerSelect = document.getElementById("customer");
  const metricSelect = document.getElementById("metric");

  const regions = uniqueSorted(sourceRecords.map((r) => r.region));
  const categories = uniqueSorted(sourceRecords.map((r) => r.customer_category));
  const customers = uniqueSorted(sourceRecords.map((r) => r.customer_name_normalized));

  fillSelect(regionSelect, ["All", ...regions]);
  fillSelect(categorySelect, ["All", ...categories]);
  fillSelect(customerSelect, ["All", ...customers]);

  Object.entries(metrics).forEach(([key, label]) => {
    const opt = document.createElement("option");
    opt.value = key;
    opt.textContent = label;
    metricSelect.appendChild(opt);
  });
  metricSelect.value = state.metric;
}

function fillSelect(select, values) {
  select.innerHTML = "";
  values.forEach((val) => {
    const opt = document.createElement("option");
    opt.value = val;
    opt.textContent = val;
    select.appendChild(opt);
  });
}

function applyFilters() {
  const search = state.search.toLowerCase();
  return sourceRecords.filter((r) => {
    if (state.region !== "All" && r.region !== state.region) return false;
    if (state.category !== "All" && r.customer_category !== state.category) return false;
    if (state.customer !== "All" && r.customer_name_normalized !== state.customer) return false;
    if (search) {
      const hay = [
        r.customer_code,
        r.customer_name,
        r.customer_name_normalized,
        r.customer_category,
        r.region
      ].join(" ").toLowerCase();
      if (!hay.includes(search)) return false;
    }
    return true;
  });
}

function sumMetric(records, key) {
  return records.reduce((acc, r) => acc + (Number(r[key]) || 0), 0);
}

function updateKPIs(records) {
  const kpis = document.getElementById("kpis");
  kpis.innerHTML = "";
  Object.entries(metrics).forEach(([key, label]) => {
    const div = document.createElement("div");
    div.className = "kpi";
    div.innerHTML = `<div class=\"label\">${label}</div><div class=\"value\">${currency.format(sumMetric(records, key))}</div>`;
    kpis.appendChild(div);
  });
}

function aggregateBy(records, key, metricKey) {
  const map = new Map();
  records.forEach((r) => {
    const k = r[key] || "Unknown";
    const current = map.get(k) || 0;
    map.set(k, current + (Number(r[metricKey]) || 0));
  });
  return Array.from(map.entries()).map(([name, value]) => ({ name, value }));
}

function topDelta(records, baseKey, compareKey, thresholdBase, thresholdCompare, topN, direction) {
  const map = new Map();
  records.forEach((r) => {
    const name = r.customer_name_normalized || r.customer_name || "Unknown";
    const base = Number(r[baseKey]) || 0;
    const compare = Number(r[compareKey]) || 0;
    const current = map.get(name) || { base: 0, compare: 0 };
    current.base += base;
    current.compare += compare;
    map.set(name, current);
  });

  const rows = [];
  map.forEach((vals, name) => {
    if (vals.base < thresholdBase || vals.compare < thresholdCompare) return;
    const delta = vals.compare - vals.base;
    rows.push({ name, base: vals.base, compare: vals.compare, delta });
  });

  const sorted = rows
    .filter((r) => (direction === "up" ? r.delta > 0 : r.delta < 0))
    .sort((a, b) => (direction === "up" ? b.delta - a.delta : a.delta - b.delta))
    .slice(0, topN);

  return sorted;
}

function elId(base, suffix) {
  return suffix ? `${base}${suffix}` : base;
}

function renderCharts(records, suffix, interactive) {
  const targetTop = document.getElementById(elId("chart-top", suffix));
  if (!targetTop) return;
  const metricKey = state.metric;
  const config = interactive
    ? { responsive: true }
    : { responsive: true, staticPlot: true, displayModeBar: false };

  const byCustomer = aggregateBy(records, "customer_name_normalized", metricKey)
    .sort((a, b) => b.value - a.value)
    .slice(0, 10);
  const maxTop = Math.max(...byCustomer.map((d) => d.value), 1);

  Plotly.react(elId("chart-top", suffix), [{
    x: byCustomer.map((d) => d.value).reverse(),
    y: byCustomer.map((d) => d.name).reverse(),
    type: "bar",
    orientation: "h",
    marker: { color: palette.primary },
    text: byCustomer.map((d) => d.value).reverse(),
    texttemplate: "%{text:,.0f}",
    textposition: "outside",
    textfont: { size: labelFont },
    cliponaxis: false,
    hovertemplate: interactive ? "%{y}<br>%{x:,.0f} EUR<extra></extra>" : undefined
  }], {
    height: 420,
    margin: { t: 10, l: 220, r: 120, b: 40 },
    xaxis: { title: "EUR", tickformat: ",.0f", range: [0, maxTop * 1.3] },
    yaxis: { automargin: true, tickfont: { size: 10 } },
    bargap: 0.35,
    paper_bgcolor: "rgba(0,0,0,0)",
    plot_bgcolor: "rgba(0,0,0,0)"
  }, config);

  const totals = [
    { name: "2024 Gross Sales", value: sumMetric(records, "sales_2024_gross") },
    { name: "2025 Gross Sales", value: sumMetric(records, "sales_2025_est_gross") },
    { name: "2025 Forecast", value: sumMetric(records, "sales_2025_forecast") },
    { name: "2026 Forecast", value: sumMetric(records, "sales_2026_gross_positive") }
  ];
  const maxTotal = Math.max(...totals.map((d) => d.value)) || 1;

  Plotly.react(elId("chart-totals", suffix), [{
    x: totals.map((d) => d.name),
    y: totals.map((d) => d.value),
    type: "bar",
    marker: { color: palette.blue },
    text: totals.map((d) => d.value),
    texttemplate: "%{text:,.0f}",
    textposition: "inside",
    textfont: { size: labelFont },
    cliponaxis: false
  }], {
    height: 420,
    margin: { t: 40, l: 90, r: 40, b: 80 },
    xaxis: { tickangle: -15, automargin: true },
    yaxis: { title: "EUR", range: [0, maxTotal * 1.35], tickformat: ",.0f", automargin: true },
    bargap: 0.35,
    uniformtext: { minsize: 8, mode: "show" },
    paper_bgcolor: "rgba(0,0,0,0)",
    plot_bgcolor: "rgba(0,0,0,0)"
  }, config);

  const yearTotals = [
    { year: "2024", value: sumMetric(records, "sales_2024_gross") },
    { year: "2025", value: sumMetric(records, "sales_2025_est_gross") },
    { year: "2026", value: sumMetric(records, "sales_2026_gross_positive") }
  ];
  const yoy = yearTotals.map((d, i) => {
    if (i === 0 || yearTotals[i - 1].value == 0) return null;
    return (d.value - yearTotals[i - 1].value) / yearTotals[i - 1].value;
  });
  const maxYear = Math.max(...yearTotals.map((d) => d.value)) || 1;

  Plotly.react(elId("chart-yoy", suffix), [
    {
      x: yearTotals.map((d) => d.year),
      y: yearTotals.map((d) => d.value),
      type: "bar",
      marker: { color: palette.teal },
      name: "Total Sales",
      text: yearTotals.map((d) => d.value),
      texttemplate: "%{text:,.0f}",
      textposition: "inside",
      textfont: { size: labelFont },
      cliponaxis: false
    },
    {
      x: yearTotals.map((d) => d.year),
      y: yoy,
      type: "scatter",
      mode: "lines+markers+text",
      yaxis: "y2",
      marker: { color: palette.primary },
      line: { color: palette.primary },
      name: "YoY %",
      text: ["", yoy[1] ? (yoy[1] * 100).toFixed(1) + "%" : "", yoy[2] ? (yoy[2] * 100).toFixed(1) + "%" : ""],
      textposition: "top center",
      hovertemplate: "%{x} YoY: %{y:.1%}<extra></extra>"
    }
  ], {
    height: 420,
    margin: { t: 40, l: 100, r: 80, b: 40 },
    xaxis: { type: "category", categoryorder: "array", categoryarray: ["2024", "2025", "2026"] },
    yaxis: { title: "EUR", tickformat: ",.0f", range: [0, maxYear * 1.35], automargin: true },
    yaxis2: { title: "YoY %", overlaying: "y", side: "right", tickformat: ".0%" },
    bargap: 0.35,
    uniformtext: { minsize: 8, mode: "show" },
    paper_bgcolor: "rgba(0,0,0,0)",
    plot_bgcolor: "rgba(0,0,0,0)"
  }, config);

  if (!suffix) return;

  const categories = uniqueSorted(records.map((r) => r.customer_category));
  const categoriesDisplay = categories.map(shortLabel);
  const colorMap = new Map();
  categories.forEach((c, i) => colorMap.set(c, categoryColors[i % categoryColors.length]));

  const byCategoryNet = aggregateBy(records, "customer_category", "sales_2025_est_net").filter((d) => d.value > 0);
  const donutTotal = byCategoryNet.reduce((s, d) => s + d.value, 0) || 1;

  const donutText = byCategoryNet.map((d) => {
    const pct = (d.value / donutTotal) * 100;
    return `${d.name}<br>${formatShort(d.value)} EUR (${pct.toFixed(1)}%)`;
  });

  Plotly.react("chart-net-dist-static", [{
    labels: byCategoryNet.map((d) => d.name),
    values: byCategoryNet.map((d) => d.value),
    text: donutText,
    type: "pie",
    hole: 0.6,
    sort: false,
    direction: "clockwise",
    rotation: 90,
    textinfo: "text",
    textposition: "outside",
    textfont: { size: labelFont, color: "#111" },
    automargin: true,
    marker: { colors: byCategoryNet.map((d) => colorMap.get(d.name)) }
  }], {
    height: 420,
    margin: { t: 10, l: 10, r: 10, b: 10 },
    paper_bgcolor: "rgba(0,0,0,0)",
    plot_bgcolor: "rgba(0,0,0,0)",
    showlegend: false
  }, config);

  const regions = uniqueSorted(records.map((r) => r.region));
  const regionMetrics = [
    { key: "sales_2025_est_gross", label: "2025 Gross Sales", color: palette.blue },
    { key: "sales_2025_forecast", label: "2025 Forecast", color: palette.plum },
    { key: "sales_2026_gross_positive", label: "2026 Forecast", color: palette.gold }
  ];
  const regionTraces = regionMetrics.map((m) => ({
    name: m.label,
    x: regions,
    y: regions.map((r) => sumMetric(records.filter((row) => row.region == r), m.key)),
    type: "bar",
    marker: { color: m.color },
    text: regions.map((r) => sumMetric(records.filter((row) => row.region == r), m.key)),
    customdata: regions.map((r) => sumMetric(records.filter((row) => row.region == r), m.key) / 1e6),
    texttemplate: "%{customdata:.1f}M",
    textposition: "outside",
    textfont: { size: smallLabelFont },
    cliponaxis: false
  }));

  Plotly.react("chart-region-bars-static", regionTraces, {
    height: 420,
    barmode: "group",
    margin: { t: 20, l: 90, r: 40, b: 60 },
    yaxis: { title: "EUR", tickformat: ".2s", automargin: true },
    xaxis: { tickangle: 0, automargin: true },
    bargap: 0.35,
    bargroupgap: 0.08,
    uniformtext: { minsize: 9, mode: "show" },
    paper_bgcolor: "rgba(0,0,0,0)",
    plot_bgcolor: "rgba(0,0,0,0)",
    legend: { orientation: "h", x: 0, y: 1.12 }
  }, config);

  const categoryTraces = regionMetrics.map((m) => ({
    name: m.label,
    x: categoriesDisplay,
    y: categories.map((c) => sumMetric(records.filter((row) => row.customer_category == c), m.key)),
    type: "bar",
    marker: { color: m.color },
    text: categories.map((c) => sumMetric(records.filter((row) => row.customer_category == c), m.key)),
    customdata: categories.map((c) => sumMetric(records.filter((row) => row.customer_category == c), m.key) / 1e6),
    texttemplate: "%{customdata:.1f}",
    textposition: "outside",
    textfont: { size: smallLabelFont },
    cliponaxis: false
  }));

  Plotly.react("chart-category-bars-static", categoryTraces, {
    height: 420,
    barmode: "group",
    margin: { t: 20, l: 90, r: 40, b: 90 },
    yaxis: { title: "EUR", tickformat: ".2s", automargin: true },
    xaxis: { tickangle: -10, automargin: true, tickfont: { size: 10 } },
    bargap: 0.35,
    bargroupgap: 0.08,
    uniformtext: { minsize: 9, mode: "show" },
    paper_bgcolor: "rgba(0,0,0,0)",
    plot_bgcolor: "rgba(0,0,0,0)",
    legend: { orientation: "h", x: 0, y: 1.12 },
    annotations: [{
      x: 0.99,
      y: -0.18,
      xref: "paper",
      yref: "paper",
      text: "Labels in M",
      showarrow: false,
      font: { size: 10, color: "#6a7b8a" },
      xanchor: "right",
      yanchor: "top"
    }]
  }, config);

  const yearTypes = [
    { label: "2025 Forecast", key: "sales_2025_forecast" },
    { label: "2025 Gross Sales", key: "sales_2025_est_gross" },
    { label: "2026 Forecast", key: "sales_2026_gross_positive" }
  ];
  const totalsByYear = yearTypes.map((y) => sumMetric(records, y.key) || 1);

  const stackTraces = categories.map((c) => {
    const yVals = yearTypes.map((y, idx) => {
      const total = totalsByYear[idx];
      const value = sumMetric(records.filter((row) => row.customer_category == c), y.key);
      return total ? value / total : 0;
    });
    const textVals = yVals.map((v) => (v > 0 ? (v * 100).toFixed(1) + "%\n" + c : ""));
    return {
      name: c,
      x: yearTypes.map((y) => y.label),
      y: yVals,
      type: "bar",
      marker: { color: colorMap.get(c) },
      text: textVals,
      textposition: "inside",
      textfont: { size: smallLabelFont },
      hoverinfo: "skip"
    };
  });

  Plotly.react("chart-category-stack-static", stackTraces, {
    height: 420,
    barmode: "stack",
    margin: { t: 20, l: 90, r: 40, b: 60 },
    yaxis: { title: "Percent of Sales", tickformat: ".0%", automargin: true },
    uniformtext: { minsize: 9, mode: "show" },
    paper_bgcolor: "rgba(0,0,0,0)",
    plot_bgcolor: "rgba(0,0,0,0)",
    legend: { x: 0.98, y: -0.12, xanchor: "right", yanchor: "top", orientation: "h" }
  }, config);

  renderCategoryMixTable(categories, yearTypes, totalsByYear, records);

  function renderDeltaChart(id, data, color, rangeMode) {
    const maxAbs = Math.max(...data.map((d) => Math.abs(d.delta)), 1);
    const minNeg = Math.min(...data.map((d) => d.delta), -1);
    Plotly.react(id, [{
      x: data.map((d) => d.delta).reverse(),
      y: data.map((d) => d.name).reverse(),
      type: "bar",
      orientation: "h",
      marker: { color },
      text: data.map((d) => d.delta).reverse(),
      texttemplate: "%{text:,.0f}",
      textposition: "outside",
      textfont: { size: labelFont },
      cliponaxis: false
    }], {
      height: 420,
      margin: { t: 20, l: 270, r: 120, b: 40 },
      xaxis: { title: "EUR", tickformat: ",.0f", tickangle: 0, range: rangeMode === "positive" ? [0, maxAbs * 1.25] : [minNeg * 1.25, 0] },
      yaxis: { automargin: true, tickfont: { size: 10 } },
      bargap: 0.35,
      paper_bgcolor: "rgba(0,0,0,0)",
      plot_bgcolor: "rgba(0,0,0,0)"
    }, config);
  }

  renderDeltaChart("chart-inc-gross-static", topDelta(records, "sales_2024_gross", "sales_2025_est_gross", 10000, 10000, 10, "up"), palette.teal, "positive");
  renderDeltaChart("chart-dec-gross-static", topDelta(records, "sales_2024_gross", "sales_2025_est_gross", 10000, 10000, 10, "down"), palette.plum, "negative");
  renderDeltaChart("chart-beat-forecast-static", topDelta(records, "sales_2025_forecast", "sales_2025_est_gross", 10000, 10000, 10, "up"), palette.gold, "positive");
  renderDeltaChart("chart-miss-forecast-static", topDelta(records, "sales_2025_forecast", "sales_2025_est_gross", 10000, 10000, 10, "down"), palette.slate, "negative");
  renderDeltaChart("chart-inc-2026-static", topDelta(records, "sales_2025_est_gross", "sales_2026_gross_positive", 10000, 10000, 10, "up"), palette.blue, "positive");
  renderDeltaChart("chart-dec-2026-static", topDelta(records, "sales_2025_est_gross", "sales_2026_gross_positive", 10000, 10000, 10, "down"), palette.plum, "negative");
}


function renderCategoryMixTable(categories, yearTypes, totalsByYear, records) {
  const table = document.getElementById("category-mix-table");
  if (!table) return;
  const thead = table.querySelector("thead");
  const tbody = table.querySelector("tbody");

  thead.innerHTML = "";
  const headRow = document.createElement("tr");
  const thName = document.createElement("th");
  thName.textContent = "Category";
  headRow.appendChild(thName);
  yearTypes.forEach((y) => {
    const th = document.createElement("th");
    th.textContent = y.label;
    headRow.appendChild(th);
  });
  thead.appendChild(headRow);

  tbody.innerHTML = "";
  categories.forEach((c) => {
    const tr = document.createElement("tr");
    const tdName = document.createElement("td");
    tdName.textContent = c;
    tr.appendChild(tdName);

    yearTypes.forEach((y, idx) => {
      const total = totalsByYear[idx] || 1;
      const value = records
        .filter((row) => row.customer_category == c)
        .reduce((sum, row) => sum + (Number(row[y.key]) || 0), 0);
      const pct = total ? (value / total) * 100 : 0;
      const td = document.createElement("td");
      td.textContent = pct.toFixed(1) + "%";
      tr.appendChild(td);
    });
    tbody.appendChild(tr);
  });
}

function updateCharts(records) {
  renderCharts(records, "-static", false);
}

function updateTable(records) {
  const table = document.getElementById("data-table");
  const thead = table.querySelector("thead");
  const tbody = table.querySelector("tbody");

  if (!thead.dataset.ready) {
    const tr = document.createElement("tr");
    tableColumns.forEach((col) => {
      const th = document.createElement("th");
      th.textContent = col.label;
      th.addEventListener("click", () => {
        if (state.sortKey === col.key) {
          state.sortDir = state.sortDir === "asc" ? "desc" : "asc";
        } else {
          state.sortKey = col.key;
          state.sortDir = "desc";
        }
        render();
      });
      tr.appendChild(th);
    });
    thead.appendChild(tr);
    thead.dataset.ready = "true";
  }

  const sorted = [...records].sort((a, b) => {
    const av = a[state.sortKey];
    const bv = b[state.sortKey];
    if (typeof av === "number" && typeof bv === "number") {
      return state.sortDir === "asc" ? av - bv : bv - av;
    }
    return state.sortDir === "asc"
      ? String(av || "").localeCompare(String(bv || ""))
      : String(bv || "").localeCompare(String(av || ""));
  });

  tbody.innerHTML = "";
  sorted.forEach((row) => {
    const tr = document.createElement("tr");
    tableColumns.forEach((col) => {
      const td = document.createElement("td");
      const value = row[col.key];
      td.textContent = col.key.startsWith("sales_") ? currency.format(Number(value) || 0) : (value || "");
      tr.appendChild(td);
    });
    tbody.appendChild(tr);
  });

  const meta = document.getElementById("table-meta");
  meta.textContent = `${sorted.length} rows - Sorted by ${tableColumns.find(c => c.key === state.sortKey).label} (${state.sortDir})`;
}

function render() {
  const filtered = applyFilters();
  updateKPIs(filtered);
  updateCharts(filtered);
  updateTable(filtered);
}

function bindEvents() {
  document.getElementById("search").addEventListener("input", (e) => {
    state.search = e.target.value;
    render();
  });
  document.getElementById("region").addEventListener("change", (e) => {
    state.region = e.target.value;
    render();
  });
  document.getElementById("category").addEventListener("change", (e) => {
    state.category = e.target.value;
    render();
  });
  document.getElementById("customer").addEventListener("change", (e) => {
    state.customer = e.target.value;
    render();
  });
  document.getElementById("metric").addEventListener("change", (e) => {
    state.metric = e.target.value;
    state.sortKey = e.target.value;
    render();
  });
  document.getElementById("reset").addEventListener("click", () => {
    state.search = "";
    state.region = "All";
    state.category = "All";
    state.customer = "All";
    state.metric = "sales_2025_est_gross";
    state.sortKey = "sales_2025_est_gross";
    state.sortDir = "desc";

    document.getElementById("search").value = "";
    document.getElementById("region").value = "All";
    document.getElementById("category").value = "All";
    document.getElementById("customer").value = "All";
    document.getElementById("metric").value = "sales_2025_est_gross";

    render();
  });

  const tabs = document.querySelectorAll('.tab');
  tabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      tabs.forEach((t) => t.classList.remove('active'));
      tab.classList.add('active');
      const target = tab.getAttribute('data-target');
      document.getElementById('board-view').classList.toggle('hidden', target !== 'board-view');
          });
  });
}

initFilters();
bindEvents();
render();
