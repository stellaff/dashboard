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

const percentFmt = new Intl.NumberFormat("en-US", {
  style: "percent",
  maximumFractionDigits: 1
});

const labelFont = 11;
const smallLabelFont = 10;
const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

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
  sortDir: "desc",
  monthlyMonth: 1,
  monthlyMetric: "gross",
  monthlyRegion: "All",
  monthlyCategory: "All",
  monthlyCustomer: "All"
};

let sourceRecords = [];
let monthlyActualRecords = [];
let monthlyForecastRecords = [];

const monthlyTableColumns = [
  { key: "customer_code", label: "Customer Code" },
  { key: "customer_name", label: "Customer Name" },
  { key: "customer_category", label: "Customer Category" },
  { key: "region", label: "Region" },
  { key: "sales_2026_gross", label: "2026 Monthly Gross Sales" },
  { key: "sales_2026_net", label: "2026 Monthly Net Sales" },
  { key: "sales_2026_gm_pct", label: "2026 Gross Margin %" },
  { key: "sales_2026_nm_pct", label: "2026 Net Margin %" },
  { key: "sales_2025_gross", label: "2025 Gross Sales" },
  { key: "sales_2025_net", label: "2025 Net Sales" },
  { key: "sales_2025_gm_pct", label: "2025 Gross Margin %" },
  { key: "sales_2025_nm_pct", label: "2025 Net Margin %" },
  { key: "sales_2026_fc_gross", label: "2026 Forecast Gross Sales" },
  { key: "sales_2026_fc_net", label: "2026 Forecast Net Sales" },
  { key: "sales_2026_fc_gm_pct", label: "2026 Forecast Gross Margin %" },
  { key: "sales_2026_fc_nm_pct", label: "2026 Forecast Net Margin %" }
];

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

function formatPct(numerator, denominator) {
  if (!denominator) return "0.0%";
  return percentFmt.format(numerator / denominator);
}

function normalizeCustomerName(name) {
  const value = (name || "").trim().toUpperCase();
  if (value === "TRADING HOUSE ASKONA LLC" || value === "A TRADE LLC") return "ASKONA";
  if (value === "BED QUARTER FURNITURE TRADING" || value === "BED QUARTER COMPANY FOR TRADING") return "BED QUARTER";
  return (name || "").trim();
}

function customerKey(code, name) {
  return `${String(code || "").trim()}||${normalizeCustomerName(name)}`;
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
    xaxis: { title: "EUR", tickformat: ",.0f", range: [0, maxTop * 1.45] },
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
    height: 530,
    barmode: "stack",
    bargap: 0.4,
    margin: { t: 30, l: 50, r: 50, b: 120 },
    yaxis: { tickformat: ".0%", automargin: true },
    uniformtext: { minsize: 9, mode: "show" },
    paper_bgcolor: "rgba(0,0,0,0)",
    plot_bgcolor: "rgba(0,0,0,0)",
    legend: { x: 0.5, y: -0.12, xanchor: "center", yanchor: "top", orientation: "h", font: { size: 11 } }
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
      margin: { t: 20, l: 270, r: 140, b: 40 },
      xaxis: { title: "EUR", tickformat: ",.0f", tickangle: 0, range: rangeMode === "positive" ? [0, maxAbs * 1.45] : [minNeg * 1.45, 0] },
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

function renderMonthlyCategoryMixTable(tableId, metaId, categories, yearTypes, valuesByCategoryYear, totalsByYear) {
  const table = document.getElementById(tableId);
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
      const value = valuesByCategoryYear.get(c)?.[idx] || 0;
      const pct = total ? (value / total) * 100 : 0;
      const td = document.createElement("td");
      td.textContent = pct.toFixed(1) + "%";
      tr.appendChild(td);
    });
    tbody.appendChild(tr);
  });

  const meta = document.getElementById(metaId);
  if (meta) meta.textContent = `${categories.length} categories`;
}

function renderNoData(chartId, message) {
  Plotly.react(chartId, [], {
    height: 420,
    margin: { t: 20, l: 20, r: 20, b: 20 },
    xaxis: { visible: false },
    yaxis: { visible: false },
    annotations: [{
      text: message,
      x: 0.5,
      y: 0.5,
      xref: "paper",
      yref: "paper",
      showarrow: false,
      font: { size: 14, color: "#6b6257" }
    }],
    paper_bgcolor: "rgba(0,0,0,0)",
    plot_bgcolor: "rgba(0,0,0,0)"
  }, { responsive: true, staticPlot: true, displayModeBar: false });
}

function buildTopCustomerBuckets(records, metricKey, limit = 5) {
  const totals = aggregateBy(records, "customer_name_normalized", metricKey)
    .filter((d) => d.value > 0)
    .sort((a, b) => b.value - a.value);
  if (!totals.length) return { labels: [], topSet: new Set(), hasOther: false };
  const top = totals.slice(0, limit);
  const otherTotal = totals.slice(limit).reduce((sum, d) => sum + d.value, 0);
  const labels = top.map((d) => d.name);
  if (otherTotal > 0) labels.push("Other small customers");
  return { labels, topSet: new Set(top.map((d) => d.name)), hasOther: otherTotal > 0 };
}

function sumByCustomerBucket(records, metricKey, bucket) {
  const totals = new Map();
  let otherTotal = 0;
  bucket.labels.forEach((label) => {
    if (label !== "Other small customers") totals.set(label, 0);
  });
  records.forEach((r) => {
    const name = r.customer_name_normalized || "Unknown";
    const value = Number(r[metricKey]) || 0;
    if (bucket.topSet.has(name)) {
      totals.set(name, (totals.get(name) || 0) + value);
    } else {
      otherTotal += value;
    }
  });
  return bucket.labels.map((label) => {
    if (label === "Other small customers") return otherTotal;
    return totals.get(label) || 0;
  });
}

function sortRowsByKey(rows, key) {
  return rows.sort((a, b) => (Number(b[key]) || 0) - (Number(a[key]) || 0));
}

function aggregateCustomerTotals(records, metricKey) {
  const map = new Map();
  records.forEach((r) => {
    const name = r.customer_name_normalized || r.customer_name || "Unknown";
    map.set(name, (map.get(name) || 0) + (Number(r[metricKey]) || 0));
  });
  return map;
}

function topDeltaFromMaps(baseMap, compareMap, topN, direction, fillToTopN = false) {
  const names = new Set([...baseMap.keys(), ...compareMap.keys()]);
  const rows = [];
  names.forEach((name) => {
    const base = Number(baseMap.get(name)) || 0;
    const compare = Number(compareMap.get(name)) || 0;
    const delta = compare - base;
    rows.push({ name, base, compare, delta });
  });
  const filtered = rows.filter((r) => (direction === "up" ? r.delta > 0 : r.delta < 0));
  filtered.sort((a, b) => (direction === "up" ? b.delta - a.delta : a.delta - b.delta));
  if (!fillToTopN || filtered.length >= topN) {
    return filtered.slice(0, topN);
  }
  const existing = new Set(filtered.map((r) => r.name));
  const fallback = rows
    .slice()
    .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))
    .filter((r) => !existing.has(r.name));
  const filled = filtered.slice();
  for (const r of fallback) {
    if (filled.length >= topN) break;
    filled.push(r);
  }
  return filled.slice(0, topN);
}

function initMonthlyData() {
  const monthlyData = window.MONTHLY_DATA || {};
  const metaMap = new Map();
  const metaByCode = new Map();
  const customerMap = (window.CUSTOMER_MAP && window.CUSTOMER_MAP.map) ? window.CUSTOMER_MAP.map : {};

  sourceRecords.forEach((r) => {
    const key = customerKey(r.customer_code, r.customer_name_normalized || r.customer_name);
    metaMap.set(key, {
      customer_name_normalized: r.customer_name_normalized || normalizeCustomerName(r.customer_name),
      customer_category: r.customer_category || "Unknown",
      region: r.region || "Unknown"
    });
  });

  Object.values(customerMap).forEach((row) => {
    const key = customerKey(row.customer_code, row.customer_name);
    if (!metaMap.has(key)) {
      metaMap.set(key, {
        customer_name_normalized: row.customer_name_normalized || normalizeCustomerName(row.customer_name),
        customer_category: row.customer_category || "Unknown",
        region: row.region || "Unknown"
      });
    }
    const codeKey = String(row.customer_code || "").trim();
    if (codeKey && !metaByCode.has(codeKey)) {
      metaByCode.set(codeKey, {
        customer_name_normalized: row.customer_name_normalized || normalizeCustomerName(row.customer_name),
        customer_category: row.customer_category || "Unknown",
        region: row.region || "Unknown"
      });
    }
  });

  monthlyActualRecords = (monthlyData.actual || []).map((r) => {
    const normName = normalizeCustomerName(r.customer_name);
    const meta = metaMap.get(customerKey(r.customer_code, normName))
      || metaByCode.get(String(r.customer_code || "").trim())
      || {};
    return {
      year: Number(r.year),
      month: Number(r.month),
      customer_code: r.customer_code,
      customer_name: r.customer_name,
      customer_name_normalized: meta.customer_name_normalized || normName || "Unknown",
      customer_category: meta.customer_category || "Unknown",
      region: meta.region || "Unknown",
      gross: Number(r.gross) || 0,
      net: Number(r.net) || 0,
      gross_margin_update: Number(r.gross_margin_update) || 0,
      net_margin_update: Number(r.net_margin_update) || 0
    };
  });

  monthlyForecastRecords = (monthlyData.forecast || []).map((r) => {
    const normName = normalizeCustomerName(r.customer_name);
    const meta = metaMap.get(customerKey(r.customer_code, normName))
      || metaByCode.get(String(r.customer_code || "").trim())
      || {};
    return {
      year: 2026,
      month: Number(r.month),
      customer_code: r.customer_code,
      customer_name: r.customer_name,
      customer_name_normalized: meta.customer_name_normalized || normName || "Unknown",
      customer_category: r.customer_category || meta.customer_category || "Unknown",
      region: r.region || meta.region || "Unknown",
      gross: Number(r.gross) || 0,
      net: Number(r.net) || 0,
      gross_margin: Number(r.gross_margin) || 0,
      net_margin: Number(r.net_margin) || 0
    };
  });

  const monthSelect = document.getElementById("monthly-month");
  const monthlyRegionSelect = document.getElementById("monthly-region");
  const monthlyCategorySelect = document.getElementById("monthly-category");
  const monthlyCustomerSelect = document.getElementById("monthly-customer");
  const metricSelect = document.getElementById("monthly-metric");
  const availableMonths = uniqueSorted(
    monthlyActualRecords
      .filter((r) => r.year === 2026)
      .map((r) => String(r.month))
  ).map(Number);

  monthSelect.innerHTML = "";
  availableMonths.forEach((m) => {
    const opt = document.createElement("option");
    opt.value = String(m);
    opt.textContent = monthNames[m - 1] || `Month ${m}`;
    monthSelect.appendChild(opt);
  });

  if (availableMonths.length) {
    const currentMonth = new Date().getMonth() + 1;
    state.monthlyMonth = availableMonths.includes(currentMonth)
      ? currentMonth
      : Math.max(...availableMonths);
    monthSelect.value = String(state.monthlyMonth);
  }

  const base2026 = monthlyActualRecords.filter((r) => r.year === 2026);
  if (monthlyRegionSelect) {
    const regions = uniqueSorted(base2026.map((r) => r.region));
    fillSelect(monthlyRegionSelect, ["All", ...regions]);
    monthlyRegionSelect.value = state.monthlyRegion;
  }
  if (monthlyCategorySelect) {
    const categories = uniqueSorted(base2026.map((r) => r.customer_category));
    fillSelect(monthlyCategorySelect, ["All", ...categories]);
    monthlyCategorySelect.value = state.monthlyCategory;
  }
  if (monthlyCustomerSelect) {
    const customers = uniqueSorted(base2026.map((r) => r.customer_name_normalized));
    fillSelect(monthlyCustomerSelect, ["All", ...customers]);
    monthlyCustomerSelect.value = state.monthlyCustomer;
  }

  if (metricSelect) {
    metricSelect.innerHTML = "";
    const opts = [
      { value: "gross", label: "2026 Gross Sales" },
      { value: "net", label: "2026 Net Sales" }
    ];
    opts.forEach((optData) => {
      const opt = document.createElement("option");
      opt.value = optData.value;
      opt.textContent = optData.label;
      metricSelect.appendChild(opt);
    });
    metricSelect.value = state.monthlyMetric;
  }
}

function applyMonthlyFilters(records) {
  return records.filter((r) => {
    if (state.monthlyRegion !== "All" && r.region !== state.monthlyRegion) return false;
    if (state.monthlyCategory !== "All" && r.customer_category !== state.monthlyCategory) return false;
    if (state.monthlyCustomer !== "All" && r.customer_name_normalized !== state.monthlyCustomer) return false;
    return true;
  });
}

function aggregateCustomerMetrics(records, isForecast) {
  const map = new Map();
  records.forEach((r) => {
    const key = `${r.customer_code}||${r.customer_name_normalized || r.customer_name}`;
    const current = map.get(key) || {
      customer_code: r.customer_code,
      customer_name: r.customer_name_normalized || r.customer_name,
      customer_category: r.customer_category || "Unknown",
      region: r.region || "Unknown",
      gross: 0,
      net: 0,
      gross_margin: 0,
      net_margin: 0
    };
    current.gross += Number(r.gross) || 0;
    current.net += Number(r.net) || 0;
    if (isForecast) {
      current.gross_margin += Number(r.gross_margin) || 0;
      current.net_margin += Number(r.net_margin) || 0;
    } else {
      current.gross_margin += Number(r.gross_margin_update) || 0;
      current.net_margin += Number(r.net_margin_update) || 0;
    }
    map.set(key, current);
  });
  return map;
}

function buildMonthlyTableRows(current2026, current2025, forecast2026) {
  const map2026 = aggregateCustomerMetrics(current2026, false);
  const map2025 = aggregateCustomerMetrics(current2025, false);
  const mapFc = aggregateCustomerMetrics(forecast2026, true);

  const keys = new Set([...map2026.keys(), ...map2025.keys(), ...mapFc.keys()]);
  const rows = [];
  keys.forEach((k) => {
    const a26 = map2026.get(k) || {};
    const a25 = map2025.get(k) || {};
    const fc = mapFc.get(k) || {};
    const base = a26.customer_code ? a26 : (a25.customer_code ? a25 : fc);

    rows.push({
      customer_code: base.customer_code || "",
      customer_name: base.customer_name || "",
      customer_category: base.customer_category || "Unknown",
      region: base.region || "Unknown",
      sales_2026_gross: a26.gross || 0,
      sales_2026_net: a26.net || 0,
      sales_2026_gm_pct: formatPct(a26.gross_margin || 0, a26.gross || 0),
      sales_2026_nm_pct: formatPct(a26.net_margin || 0, a26.net || 0),
      sales_2025_gross: a25.gross || 0,
      sales_2025_net: a25.net || 0,
      sales_2025_gm_pct: formatPct(a25.gross_margin || 0, a25.gross || 0),
      sales_2025_nm_pct: formatPct(a25.net_margin || 0, a25.net || 0),
      sales_2026_fc_gross: fc.gross || 0,
      sales_2026_fc_net: fc.net || 0,
      sales_2026_fc_gm_pct: formatPct(fc.gross_margin || 0, fc.gross || 0),
      sales_2026_fc_nm_pct: formatPct(fc.net_margin || 0, fc.net || 0)
    });
  });

  return rows.sort((a, b) => b.sales_2026_gross - a.sales_2026_gross);
}

function renderMonthlyTable(tableId, metaId, rows, titleColumns) {
  const table = document.getElementById(tableId);
  if (!table) return;
  const thead = table.querySelector("thead");
  const tbody = table.querySelector("tbody");

  if (!thead.dataset.ready) {
    const tr = document.createElement("tr");
    titleColumns.forEach((col) => {
      const th = document.createElement("th");
      th.textContent = col.label;
      tr.appendChild(th);
    });
    thead.appendChild(tr);
    thead.dataset.ready = "true";
  }

  tbody.innerHTML = "";
  rows.forEach((row) => {
    const tr = document.createElement("tr");
    titleColumns.forEach((col) => {
      const td = document.createElement("td");
      const value = row[col.key];
      if (col.key.includes("_pct")) {
        td.textContent = value || "0.0%";
      } else if (col.key.startsWith("sales_")) {
        td.textContent = currency.format(Number(value) || 0);
      } else {
        td.textContent = value || "";
      }
      tr.appendChild(td);
    });
    tbody.appendChild(tr);
  });

  const meta = document.getElementById(metaId);
  if (meta) meta.textContent = `${rows.length} rows`;
}

function updateMonthlyKPIs(current2026, current2025, forecast2026, month, metricKey) {
  const kpis = document.getElementById("monthly-kpis");
  if (!kpis) return;
  const monthLabel = monthNames[month - 1] || `Month ${month}`;
  const metricLabel = metricKey === "net" ? "Net" : "Gross";
  const cards = [
    { label: `${monthLabel} 2026 ${metricLabel} Sales`, value: sumMetric(current2026, metricKey) },
    { label: `${monthLabel} 2025 ${metricLabel} Sales`, value: sumMetric(current2025, metricKey) },
    { label: `${monthLabel} 2026 Forecast ${metricLabel} Sales`, value: sumMetric(forecast2026, metricKey) }
  ];

  kpis.innerHTML = "";
  cards.forEach((card) => {
    const div = document.createElement("div");
    div.className = "kpi";
    div.innerHTML = `<div class="label">${card.label}</div><div class="value">${currency.format(card.value)}</div>`;
    kpis.appendChild(div);
  });
}

function renderMonthlyView() {
  const month = Number(state.monthlyMonth);
  if (!month) return;
  const metricKey = state.monthlyMetric === "net" ? "net" : "gross";
  const metricLabel = metricKey === "net" ? "Net" : "Gross";

  const current2026 = applyMonthlyFilters(monthlyActualRecords.filter((r) => r.year === 2026 && r.month === month));
  const current2025 = applyMonthlyFilters(monthlyActualRecords.filter((r) => r.year === 2025 && r.month === month));
  const forecast2026 = applyMonthlyFilters(monthlyForecastRecords.filter((r) => r.month === month));

  updateMonthlyKPIs(current2026, current2025, forecast2026, month, metricKey);

  const config = { responsive: true, staticPlot: true, displayModeBar: false };
  const useCustomerBuckets = state.monthlyRegion !== "All" || state.monthlyCategory !== "All";
  const customerBucket = useCustomerBuckets ? buildTopCustomerBuckets(current2026, metricKey, 5) : null;
  const shouldBucket = (labels) => useCustomerBuckets && labels.length <= 1 && customerBucket && customerBucket.labels.length > 0;

  let byCategoryCurrent = aggregateBy(current2026, "customer_category", metricKey)
    .sort((a, b) => b.value - a.value);

  if (state.monthlyRegion !== "All" || state.monthlyCategory !== "All") {
    const byCustomerCurrent = aggregateBy(current2026, "customer_name_normalized", metricKey)
      .sort((a, b) => b.value - a.value);
    if (byCategoryCurrent.length <= 1 && byCustomerCurrent.length > 1) {
      const top = byCustomerCurrent.slice(0, 5);
      const otherTotal = byCustomerCurrent.slice(5).reduce((s, d) => s + d.value, 0);
      byCategoryCurrent = [...top.map((d) => ({ name: d.name, value: d.value })), { name: "Other small customers", value: otherTotal }]
        .filter((d) => d.value > 0);
    }
  }

  if (!byCategoryCurrent.length) {
    renderNoData("chart-monthly-gross-net-category", "No 2026 actual data for this month");
  } else {
    const total = byCategoryCurrent.reduce((s, d) => s + d.value, 0) || 1;
    Plotly.react("chart-monthly-gross-net-category", [{
      labels: byCategoryCurrent.map((d) => d.name),
      values: byCategoryCurrent.map((d) => d.value),
      text: byCategoryCurrent.map((d) => {
        const pct = (d.value / total) * 100;
        return `${d.name}<br>${metricLabel} ${formatShort(d.value)} EUR (${pct.toFixed(1)}%)`;
      }),
      type: "pie",
      hole: 0.6,
      texttemplate: "%{text}",
      sort: false,
      direction: "clockwise",
      rotation: 90,
      textinfo: "text",
      textposition: "outside",
      textfont: { size: 11, color: "#111" },
      textangle: 0,
      outsidetextfont: { size: 11, color: "#111" },
      insidetextorientation: "radial",
      automargin: true
    }], {
      height: 420,
      margin: { t: 10, l: 40, r: 240, b: 10 },
      paper_bgcolor: "rgba(0,0,0,0)",
      plot_bgcolor: "rgba(0,0,0,0)",
      showlegend: false,
      uniformtext: { minsize: 9, mode: "show" }
    }, config);
  }

  const ytd2026 = applyMonthlyFilters(monthlyActualRecords.filter((r) => r.year === 2026 && r.month <= month));
  let byCategoryYtd = aggregateBy(ytd2026, "customer_category", metricKey)
    .sort((a, b) => b.value - a.value);

  if (state.monthlyRegion !== "All" || state.monthlyCategory !== "All") {
    const byCustomerYtd = aggregateBy(ytd2026, "customer_name_normalized", metricKey)
      .sort((a, b) => b.value - a.value);
    if (byCategoryYtd.length <= 1 && byCustomerYtd.length > 1) {
      const top = byCustomerYtd.slice(0, 5);
      const otherTotal = byCustomerYtd.slice(5).reduce((s, d) => s + d.value, 0);
      byCategoryYtd = [...top.map((d) => ({ name: d.name, value: d.value })), { name: "Other small customers", value: otherTotal }]
        .filter((d) => d.value > 0);
    }
  }

  if (!byCategoryYtd.length) {
    renderNoData("chart-monthly-gross-net-region", "No 2026 YTD data for this month");
  } else {
    const total = byCategoryYtd.reduce((s, d) => s + d.value, 0) || 1;
    Plotly.react("chart-monthly-gross-net-region", [{
      labels: byCategoryYtd.map((d) => d.name),
      values: byCategoryYtd.map((d) => d.value),
      text: byCategoryYtd.map((d) => {
        const pct = (d.value / total) * 100;
        return `${d.name}<br>${metricLabel} ${formatShort(d.value)} EUR (${pct.toFixed(1)}%)`;
      }),
      type: "pie",
      hole: 0.6,
      texttemplate: "%{text}",
      sort: false,
      direction: "clockwise",
      rotation: 90,
      textinfo: "text",
      textposition: "outside",
      textfont: { size: 11, color: "#111" },
      textangle: 0,
      outsidetextfont: { size: 11, color: "#111" },
      insidetextorientation: "radial",
      automargin: true
    }], {
      height: 420,
      margin: { t: 10, l: 40, r: 240, b: 10 },
      paper_bgcolor: "rgba(0,0,0,0)",
      plot_bgcolor: "rgba(0,0,0,0)",
      showlegend: false,
      uniformtext: { minsize: 9, mode: "show" }
    }, config);
  }

  const topCustomers = aggregateBy(current2026, "customer_name_normalized", metricKey)
    .sort((a, b) => b.value - a.value)
    .slice(0, 10);

  if (!topCustomers.length) {
    renderNoData("chart-monthly-top-customer", "No 2026 actual data for this month");
  } else {
    const maxTopCustomer = Math.max(...topCustomers.map((d) => d.value), 1);
    Plotly.react("chart-monthly-top-customer", [{
      x: topCustomers.map((d) => d.value).reverse(),
      y: topCustomers.map((d) => d.name).reverse(),
      type: "bar",
      orientation: "h",
      marker: { color: palette.primary },
      text: topCustomers.map((d) => d.value).reverse(),
      texttemplate: "%{text:,.0f}",
      textposition: "outside",
      cliponaxis: true
    }], {
      height: 420,
      margin: { t: 20, l: 220, r: 120, b: 40 },
      xaxis: { tickformat: ",.0f", range: [0, maxTopCustomer * 1.45] },
      yaxis: { automargin: true, tickfont: { size: 10 } },
      annotations: [{
        x: 0,
        y: 1.12,
        xref: "paper",
        yref: "paper",
        text: "EUR",
        showarrow: false,
        font: { size: 11, color: "#6a7b8a" },
        xanchor: "left"
      }],
      paper_bgcolor: "rgba(0,0,0,0)",
      plot_bgcolor: "rgba(0,0,0,0)"
    }, config);
  }

  const compareTotals = [
    { name: `2025 ${metricLabel} (Same Month)`, value: sumMetric(current2025, metricKey), color: palette.teal },
    { name: `2026 ${metricLabel} (Actual)`, value: sumMetric(current2026, metricKey), color: palette.blue },
    { name: `2026 Forecast ${metricLabel}`, value: sumMetric(forecast2026, metricKey), color: palette.gold }
  ];

  Plotly.react("chart-monthly-compare", [{
    x: compareTotals.map((d) => d.name),
    y: compareTotals.map((d) => d.value),
    type: "bar",
    marker: { color: compareTotals.map((d) => d.color) },
    text: compareTotals.map((d) => d.value),
    texttemplate: "%{text:,.0f}",
    textposition: "outside",
    cliponaxis: false
  }], {
    height: 420,
    margin: { t: 70, l: 90, r: 30, b: 70 },
    bargap: 0.7,
    bargroupgap: 0.25,
    yaxis: { tickformat: ",.0f", automargin: true },
    xaxis: { tickangle: -8, automargin: true },
    annotations: (() => {
      const base2025 = compareTotals[0].value || 0;
      const actual2026 = compareTotals[1].value || 0;
      const fc2026 = compareTotals[2].value || 0;
      const deltaVs2025 = actual2026 - base2025;
      const deltaVsFc = actual2026 - fc2026;
      const pctVs2025 = base2025 ? (deltaVs2025 / base2025) * 100 : 0;
      const pctVsFc = fc2026 ? (deltaVsFc / fc2026) * 100 : 0;
      return [
        {
          x: 0,
          y: 1.12,
          xref: "paper",
          yref: "paper",
          text: `vs 2025: ${formatShort(deltaVs2025)} (${pctVs2025.toFixed(1)}%)`,
          showarrow: false,
          font: { size: 11, color: "#6a7b8a" },
          xanchor: "left"
        },
        {
          x: 0,
          y: 1.05,
          xref: "paper",
          yref: "paper",
          text: `vs 2026 Forecast: ${formatShort(deltaVsFc)} (${pctVsFc.toFixed(1)}%)`,
          showarrow: false,
          font: { size: 11, color: "#6a7b8a" },
          xanchor: "left"
        }
      ];
    })(),
    paper_bgcolor: "rgba(0,0,0,0)",
    plot_bgcolor: "rgba(0,0,0,0)"
  }, config);

  const regions = uniqueSorted([
    ...current2025.map((r) => r.region),
    ...current2026.map((r) => r.region),
    ...forecast2026.map((r) => r.region)
  ]);
  if (!regions.length) {
    renderNoData("chart-monthly-region-comp", "No regional data for this month");
  } else {
    const regionLabels = shouldBucket(regions) ? customerBucket.labels : regions;
    const regionSeries = [
      { label: `2025 ${metricLabel}`, records: current2025, color: palette.teal },
      { label: `2026 ${metricLabel}`, records: current2026, color: palette.blue },
      { label: `2026 Forecast ${metricLabel}`, records: forecast2026, color: palette.gold }
    ];
    Plotly.react("chart-monthly-region-comp", regionSeries.map((s) => ({
      name: s.label,
      x: regionLabels,
      y: shouldBucket(regions)
        ? sumByCustomerBucket(s.records, metricKey, customerBucket)
        : regions.map((region) => sumMetric(s.records.filter((r) => r.region === region), metricKey)),
      type: "bar",
      marker: { color: s.color },
      text: shouldBucket(regions)
        ? sumByCustomerBucket(s.records, metricKey, customerBucket).map((v) => formatShort(v))
        : regions.map((region) => formatShort(sumMetric(s.records.filter((r) => r.region === region), metricKey))),
      textposition: "outside",
      textfont: { size: 12 },
      cliponaxis: false
    })), {
      height: 420,
      barmode: "group",
      margin: { t: 20, l: 90, r: 120, b: 70 },
      yaxis: { tickformat: ",.0f", automargin: true },
      xaxis: { automargin: true, tickangle: -10 },
      legend: { orientation: "h", x: 0, y: 1.12 },
      bargap: 0.25,
      bargroupgap: 0.12,
      uniformtext: { minsize: 10, mode: "show" },
      paper_bgcolor: "rgba(0,0,0,0)",
      plot_bgcolor: "rgba(0,0,0,0)"
    }, config);
  }

  const categories = uniqueSorted([
    ...current2025.map((r) => r.customer_category),
    ...current2026.map((r) => r.customer_category),
    ...forecast2026.map((r) => r.customer_category)
  ]);
  if (!categories.length) {
    renderNoData("chart-monthly-category-comp", "No category data for this month");
  } else {
    const categoryLabels = shouldBucket(categories) ? customerBucket.labels : categories.map(shortLabel);
    const categorySeries = [
      { label: `2025 ${metricLabel}`, records: current2025, color: palette.teal },
      { label: `2026 ${metricLabel}`, records: current2026, color: palette.blue },
      { label: `2026 Forecast ${metricLabel}`, records: forecast2026, color: palette.gold }
    ];
    Plotly.react("chart-monthly-category-comp", categorySeries.map((s) => ({
      name: s.label,
      x: categoryLabels,
      y: shouldBucket(categories)
        ? sumByCustomerBucket(s.records, metricKey, customerBucket)
        : categories.map((cat) => sumMetric(s.records.filter((r) => r.customer_category === cat), metricKey)),
      type: "bar",
      marker: { color: s.color },
      text: shouldBucket(categories)
        ? sumByCustomerBucket(s.records, metricKey, customerBucket).map((v) => formatShort(v))
        : categories.map((cat) => formatShort(sumMetric(s.records.filter((r) => r.customer_category === cat), metricKey))),
      textposition: "outside",
      textfont: { size: 12 },
      cliponaxis: false
    })), {
      height: 420,
      barmode: "group",
      margin: { t: 20, l: 90, r: 120, b: 100 },
      yaxis: { tickformat: ",.0f", automargin: true },
      xaxis: { tickangle: -10, automargin: true, tickfont: { size: 10 } },
      legend: { orientation: "h", x: 0, y: 1.12 },
      bargap: 0.25,
      bargroupgap: 0.12,
      uniformtext: { minsize: 10, mode: "show" },
      paper_bgcolor: "rgba(0,0,0,0)",
      plot_bgcolor: "rgba(0,0,0,0)"
    }, config);
  }

  const ytd2025 = applyMonthlyFilters(monthlyActualRecords.filter((r) => r.year === 2025 && r.month <= month));
  const ytdForecast = applyMonthlyFilters(monthlyForecastRecords.filter((r) => r.month <= month));

  const topCustomersYtd = aggregateBy(ytd2026, "customer_name_normalized", metricKey)
    .sort((a, b) => b.value - a.value)
    .slice(0, 10);

  if (!topCustomersYtd.length) {
    renderNoData("chart-monthly-top-customer-ytd", "No 2026 YTD data for this month");
  } else {
    const maxTopCustomerYtd = Math.max(...topCustomersYtd.map((d) => d.value), 1);
    Plotly.react("chart-monthly-top-customer-ytd", [{
      x: topCustomersYtd.map((d) => d.value).reverse(),
      y: topCustomersYtd.map((d) => d.name).reverse(),
      type: "bar",
      orientation: "h",
      marker: { color: palette.primary },
      text: topCustomersYtd.map((d) => d.value).reverse(),
      texttemplate: "%{text:,.0f}",
      textposition: "outside",
      cliponaxis: true
    }], {
      height: 420,
      margin: { t: 20, l: 220, r: 120, b: 40 },
      xaxis: { tickformat: ",.0f", range: [0, maxTopCustomerYtd * 1.45] },
      yaxis: { automargin: true, tickfont: { size: 10 } },
      annotations: [{
        x: 0,
        y: 1.12,
        xref: "paper",
        yref: "paper",
        text: "EUR",
        showarrow: false,
        font: { size: 11, color: "#6a7b8a" },
        xanchor: "left"
      }],
      paper_bgcolor: "rgba(0,0,0,0)",
      plot_bgcolor: "rgba(0,0,0,0)"
    }, config);
  }

  const ytdCompareTotals = [
    { name: `2025 ${metricLabel} (YTD)`, value: sumMetric(ytd2025, metricKey), color: palette.teal },
    { name: `2026 ${metricLabel} (YTD Actual)`, value: sumMetric(ytd2026, metricKey), color: palette.blue },
    { name: `2026 Forecast ${metricLabel} (YTD)`, value: sumMetric(ytdForecast, metricKey), color: palette.gold }
  ];

  Plotly.react("chart-monthly-compare-ytd", [{
    x: ytdCompareTotals.map((d) => d.name),
    y: ytdCompareTotals.map((d) => d.value),
    type: "bar",
    marker: { color: ytdCompareTotals.map((d) => d.color) },
    text: ytdCompareTotals.map((d) => d.value),
    texttemplate: "%{text:,.0f}",
    textposition: "outside",
    cliponaxis: false
  }], {
    height: 420,
    margin: { t: 70, l: 90, r: 30, b: 80 },
    bargap: 0.7,
    bargroupgap: 0.25,
    yaxis: { tickformat: ",.0f", automargin: true },
    xaxis: { tickangle: -8, automargin: true },
    annotations: (() => {
      const base2025 = ytdCompareTotals[0].value || 0;
      const actual2026 = ytdCompareTotals[1].value || 0;
      const fc2026 = ytdCompareTotals[2].value || 0;
      const deltaVs2025 = actual2026 - base2025;
      const deltaVsFc = actual2026 - fc2026;
      const pctVs2025 = base2025 ? (deltaVs2025 / base2025) * 100 : 0;
      const pctVsFc = fc2026 ? (deltaVsFc / fc2026) * 100 : 0;
      return [
        {
          x: 0,
          y: 1.12,
          xref: "paper",
          yref: "paper",
          text: `vs 2025: ${formatShort(deltaVs2025)} (${pctVs2025.toFixed(1)}%)`,
          showarrow: false,
          font: { size: 11, color: "#6a7b8a" },
          xanchor: "left"
        },
        {
          x: 0,
          y: 1.05,
          xref: "paper",
          yref: "paper",
          text: `vs 2026 Forecast: ${formatShort(deltaVsFc)} (${pctVsFc.toFixed(1)}%)`,
          showarrow: false,
          font: { size: 11, color: "#6a7b8a" },
          xanchor: "left"
        }
      ];
    })(),
    paper_bgcolor: "rgba(0,0,0,0)",
    plot_bgcolor: "rgba(0,0,0,0)"
  }, config);

  const ytdRegions = uniqueSorted([
    ...ytd2025.map((r) => r.region),
    ...ytd2026.map((r) => r.region),
    ...ytdForecast.map((r) => r.region)
  ]);
  if (!ytdRegions.length) {
    renderNoData("chart-monthly-region-comp-ytd", "No regional YTD data for this month");
  } else {
    const regionLabelsYtd = shouldBucket(ytdRegions) ? customerBucket.labels : ytdRegions;
    const regionSeriesYtd = [
      { label: `2025 ${metricLabel}`, records: ytd2025, color: palette.teal },
      { label: `2026 ${metricLabel}`, records: ytd2026, color: palette.blue },
      { label: `2026 Forecast ${metricLabel}`, records: ytdForecast, color: palette.gold }
    ];
    Plotly.react("chart-monthly-region-comp-ytd", regionSeriesYtd.map((s) => ({
      name: s.label,
      x: regionLabelsYtd,
      y: shouldBucket(ytdRegions)
        ? sumByCustomerBucket(s.records, metricKey, customerBucket)
        : ytdRegions.map((region) => sumMetric(s.records.filter((r) => r.region === region), metricKey)),
      type: "bar",
      marker: { color: s.color },
      text: shouldBucket(ytdRegions)
        ? sumByCustomerBucket(s.records, metricKey, customerBucket).map((v) => formatShort(v))
        : ytdRegions.map((region) => formatShort(sumMetric(s.records.filter((r) => r.region === region), metricKey))),
      textposition: "outside",
      textfont: { size: 12 },
      cliponaxis: false
    })), {
      height: 420,
      barmode: "group",
      margin: { t: 20, l: 90, r: 120, b: 70 },
      yaxis: { tickformat: ",.0f", automargin: true },
      xaxis: { automargin: true, tickangle: -10 },
      legend: { orientation: "h", x: 0, y: 1.12 },
      bargap: 0.25,
      bargroupgap: 0.12,
      uniformtext: { minsize: 10, mode: "show" },
      paper_bgcolor: "rgba(0,0,0,0)",
      plot_bgcolor: "rgba(0,0,0,0)"
    }, config);
  }

  const ytdCategories = uniqueSorted([
    ...ytd2025.map((r) => r.customer_category),
    ...ytd2026.map((r) => r.customer_category),
    ...ytdForecast.map((r) => r.customer_category)
  ]);
  if (!ytdCategories.length) {
    renderNoData("chart-monthly-category-comp-ytd", "No category YTD data for this month");
  } else {
    const categoryLabelsYtd = shouldBucket(ytdCategories) ? customerBucket.labels : ytdCategories.map(shortLabel);
    const categorySeriesYtd = [
      { label: `2025 ${metricLabel}`, records: ytd2025, color: palette.teal },
      { label: `2026 ${metricLabel}`, records: ytd2026, color: palette.blue },
      { label: `2026 Forecast ${metricLabel}`, records: ytdForecast, color: palette.gold }
    ];
    Plotly.react("chart-monthly-category-comp-ytd", categorySeriesYtd.map((s) => ({
      name: s.label,
      x: categoryLabelsYtd,
      y: shouldBucket(ytdCategories)
        ? sumByCustomerBucket(s.records, metricKey, customerBucket)
        : ytdCategories.map((cat) => sumMetric(s.records.filter((r) => r.customer_category === cat), metricKey)),
      type: "bar",
      marker: { color: s.color },
      text: shouldBucket(ytdCategories)
        ? sumByCustomerBucket(s.records, metricKey, customerBucket).map((v) => formatShort(v))
        : ytdCategories.map((cat) => formatShort(sumMetric(s.records.filter((r) => r.customer_category === cat), metricKey))),
      textposition: "outside",
      textfont: { size: 12 },
      cliponaxis: false
    })), {
      height: 420,
      barmode: "group",
      margin: { t: 20, l: 90, r: 120, b: 100 },
      yaxis: { tickformat: ",.0f", automargin: true },
      xaxis: { tickangle: -10, automargin: true, tickfont: { size: 10 } },
      legend: { orientation: "h", x: 0, y: 1.12 },
      bargap: 0.25,
      bargroupgap: 0.12,
      uniformtext: { minsize: 10, mode: "show" },
      paper_bgcolor: "rgba(0,0,0,0)",
      plot_bgcolor: "rgba(0,0,0,0)"
    }, config);
  }

  const ytd2025Map = aggregateCustomerTotals(ytd2025, metricKey);
  const ytd2026Map = aggregateCustomerTotals(ytd2026, metricKey);
  const ytdForecastMap = aggregateCustomerTotals(ytdForecast, metricKey);

  const inc2025Ytd = topDeltaFromMaps(ytd2025Map, ytd2026Map, 10, "up");
  const dec2025Ytd = topDeltaFromMaps(ytd2025Map, ytd2026Map, 10, "down");
  const beat2026Ytd = topDeltaFromMaps(ytdForecastMap, ytd2026Map, 10, "up");
  const miss2026Ytd = topDeltaFromMaps(ytdForecastMap, ytd2026Map, 10, "down", true);

  function renderMonthlyDelta(id, rows, color, message, mode, topInsideCount = 3) {
    const filteredRows = rows.filter((r) => Math.abs(r.delta) > 0);
    if (!filteredRows.length) {
      renderNoData(id, message);
      return;
    }
    const useInside = mode === "inside";
    const useAlignedOutside = mode === "alignedOutside";
    const displayRows = filteredRows.slice().reverse();
    const values = displayRows.map((d) => d.delta);
    const labels = displayRows.map((d) => d.name);
    const maxVal = Math.max(...values, 0);
    const minVal = Math.min(...values, 0);
    const span = Math.max(Math.abs(maxVal), Math.abs(minVal), 1);
    const pad = span * 0.08;
    const labelX = Math.max(0, maxVal) + pad;

    const textPositions = displayRows.map((_, idx) => {
      if (useAlignedOutside) return "none";
      if (!useInside) return "outside";
      return idx < topInsideCount ? "inside" : "outside";
    });
    const textFonts = displayRows.map((_, idx) => {
      if (useAlignedOutside) return { size: 11 };
      if (!useInside) return { size: 11 };
      return idx < topInsideCount ? { color: "#fff", size: 11 } : { size: 11 };
    });

    const annotations = useAlignedOutside
      ? displayRows.map((row) => ({
          x: labelX,
          y: row.name,
          xref: "x",
          yref: "y",
          text: Number(row.delta).toLocaleString(undefined, { maximumFractionDigits: 0 }),
          showarrow: false,
          xanchor: "left",
          align: "left",
          font: { size: 11, color: "#111" }
        }))
      : [];

    Plotly.react(id, [{
      x: values,
      y: labels,
      type: "bar",
      orientation: "h",
      marker: { color },
      text: values,
      texttemplate: "%{text:,.0f}",
      textposition: textPositions,
      insidetextanchor: useInside ? "middle" : undefined,
      textfont: textFonts,
      cliponaxis: true
    }], {
      height: 420,
      margin: { t: 20, l: 220, r: 130, b: 40 },
      xaxis: { tickformat: ",.0f", range: useAlignedOutside ? [minVal * 1.4, labelX + pad * 2] : (maxVal > 0 ? [Math.min(minVal * 1.45, 0), maxVal * 1.45] : [minVal * 1.45, Math.max(maxVal * 1.45, 0)]) },
      yaxis: { automargin: true, tickfont: { size: 10 } },
      annotations,
      paper_bgcolor: "rgba(0,0,0,0)",
      plot_bgcolor: "rgba(0,0,0,0)"
    }, config);
  }

  renderMonthlyDelta("chart-monthly-2025-inc-ytd", inc2025Ytd, palette.teal, "No 2025 vs 2024 YTD increases", "outside");
  renderMonthlyDelta("chart-monthly-2025-dec-ytd", dec2025Ytd, palette.plum, "No 2025 vs 2024 YTD decreases", "alignedOutside");
  renderMonthlyDelta("chart-monthly-2026-beat-ytd", beat2026Ytd, palette.gold, "No 2026 vs Forecast YTD increases", "outside");
  renderMonthlyDelta("chart-monthly-2026-miss-ytd", miss2026Ytd, palette.slate, "No 2026 vs Forecast YTD decreases", "alignedOutside");

  const mixCategories = uniqueSorted([
    ...ytd2025.map((r) => r.customer_category),
    ...ytd2026.map((r) => r.customer_category),
    ...ytdForecast.map((r) => r.customer_category)
  ]);
  const mixYearTypes = [
    { label: `2025 ${metricLabel}`, records: ytd2025 },
    { label: `2026 ${metricLabel}`, records: ytd2026 },
    { label: `2026 Forecast ${metricLabel}`, records: ytdForecast }
  ];
  const mixTotals = mixYearTypes.map((y) => sumMetric(y.records, metricKey) || 1);
  const mixValues = new Map();
  mixCategories.forEach((c) => {
    const vals = mixYearTypes.map((y) => sumMetric(y.records.filter((r) => r.customer_category === c), metricKey));
    mixValues.set(c, vals);
  });

  if (!mixCategories.length) {
    renderNoData("chart-monthly-category-mix-ytd", "No category mix data for this period");
  } else {
    const colorMap = new Map();
    mixCategories.forEach((c, i) => colorMap.set(c, categoryColors[i % categoryColors.length]));
    const stackTraces = mixCategories.map((c) => {
      const yVals = mixYearTypes.map((_, idx) => {
        const total = mixTotals[idx] || 1;
        const value = mixValues.get(c)?.[idx] || 0;
        return total ? value / total : 0;
      });
      const textVals = yVals.map((v) => (v > 0 ? (v * 100).toFixed(1) + "%\n" + c : ""));
      return {
        name: c,
        x: mixYearTypes.map((y) => y.label),
        y: yVals,
        type: "bar",
        marker: { color: colorMap.get(c) },
        text: textVals,
        textposition: "inside",
        textfont: { size: 10 },
        hoverinfo: "skip"
      };
    });
    Plotly.react("chart-monthly-category-mix-ytd", stackTraces, {
      height: 530,
      barmode: "stack",
      bargap: 0.4,
      margin: { t: 30, l: 50, r: 50, b: 120 },
      yaxis: { tickformat: ".0%", automargin: true },
      uniformtext: { minsize: 9, mode: "show" },
      paper_bgcolor: "rgba(0,0,0,0)",
      plot_bgcolor: "rgba(0,0,0,0)",
      legend: { x: 0.5, y: -0.12, xanchor: "center", yanchor: "top", orientation: "h", font: { size: 11 } }
    }, config);
  }

  renderMonthlyCategoryMixTable("monthly-category-mix-table", "monthly-category-mix-table-meta", mixCategories, mixYearTypes, mixValues, mixTotals);

  const monthlyRows = buildMonthlyTableRows(current2026, current2025, forecast2026);
  const ytdRows = buildMonthlyTableRows(ytd2026, ytd2025, ytdForecast);
  const sortKey = metricKey === "net" ? "sales_2026_net" : "sales_2026_gross";
  sortRowsByKey(monthlyRows, sortKey);
  sortRowsByKey(ytdRows, sortKey);
  renderMonthlyTable("monthly-table", "monthly-table-meta", monthlyRows, monthlyTableColumns);
  renderMonthlyTable("monthly-ytd-table", "monthly-ytd-table-meta", ytdRows, monthlyTableColumns);
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

  const monthSelect = document.getElementById("monthly-month");
  if (monthSelect) {
    monthSelect.addEventListener("change", (e) => {
      state.monthlyMonth = Number(e.target.value);
      renderMonthlyView();
    });
  }
  const monthlyRegionSelect = document.getElementById("monthly-region");
  if (monthlyRegionSelect) {
    monthlyRegionSelect.addEventListener("change", (e) => {
      state.monthlyRegion = e.target.value;
      renderMonthlyView();
    });
  }
  const monthlyCategorySelect = document.getElementById("monthly-category");
  if (monthlyCategorySelect) {
    monthlyCategorySelect.addEventListener("change", (e) => {
      state.monthlyCategory = e.target.value;
      renderMonthlyView();
    });
  }
  const monthlyCustomerSelect = document.getElementById("monthly-customer");
  if (monthlyCustomerSelect) {
    monthlyCustomerSelect.addEventListener("change", (e) => {
      state.monthlyCustomer = e.target.value;
      renderMonthlyView();
    });
  }
  const monthlyMetricSelect = document.getElementById("monthly-metric");
  if (monthlyMetricSelect) {
    monthlyMetricSelect.addEventListener("change", (e) => {
      state.monthlyMetric = e.target.value === "net" ? "net" : "gross";
      renderMonthlyView();
    });
  }

  const tabs = document.querySelectorAll('.tab');
  tabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      tabs.forEach((t) => t.classList.remove('active'));
      tab.classList.add('active');
      const target = tab.getAttribute('data-target');
      document.getElementById('board-view').classList.toggle('hidden', target !== 'board-view');
      document.getElementById('monthly-view').classList.toggle('hidden', target !== 'monthly-view');
      document.getElementById('yearly-table-section').classList.toggle('hidden', target !== 'board-view');
      document.getElementById('yearly-filters').classList.toggle('hidden', target !== 'board-view');
      document.getElementById('yearly-note').classList.toggle('hidden', target !== 'board-view');
      document.getElementById('kpis').classList.toggle('hidden', target !== 'board-view');
      if (target === "monthly-view") renderMonthlyView();
    });
  });
}

function initDashboard() {
  sourceRecords = (DATA.records || []).map((r, idx) => ({
    id: idx + 1,
    ...r
  }));
  initFilters();
  initMonthlyData();
  bindEvents();
  render();
  renderMonthlyView();
}
