// js/chart3.js

let chart3Data = null;
let chart3Years = [];
let chart3CurrentYear = "all";

// Stage order + colours
const CHART3_METHODS = [
  "Indicator (Stage 1)",
  "Secondary Confirmatory (Stage 2)",
  "Laboratory or Toxicology (Stage 3)",
];

const CHART3_COLOURS = d3
  .scaleOrdinal()
  .domain(CHART3_METHODS)
  .range(["#3b82f6", "#facc15", "#22c55e"]); // blue, yellow, green

document.addEventListener("DOMContentLoaded", () => {
  d3.csv("data/Chart 3.csv").then(raw => {
    if (!raw || !raw.length) {
      console.warn("Chart3: no data in Chart 3.csv");
      return;
    }

    // ---- detect columns safely ----
    const colsLower = raw.columns.map(c => c.toLowerCase());

    const yearCol =
      raw.columns[colsLower.indexOf("year")] ??
      raw.columns[colsLower.indexOf("yr")] ??
      "YEAR";

    const methodCol =
      raw.columns[colsLower.indexOf("detection_method")] ??
      raw.columns[colsLower.indexOf("detection method")] ??
      "DETECTION_METHOD";

    const countCol =
      raw.columns.find(c => c.toLowerCase().includes("sum(count")) ||
      raw.columns.find(c => c.toLowerCase().includes("count")) ||
      "Sum(COUNT)";

    chart3Data = raw
      .map(d => ({
        year: d[yearCol] ? +d[yearCol] : null,
        method: d[methodCol],
        value: +d[countCol] || 0
      }))
      .filter(d => d.method && !isNaN(d.value));

    chart3Years = Array.from(
      new Set(chart3Data.map(d => d.year).filter(y => !isNaN(y)))
    ).sort(d3.ascending);

    setupYearControls3();
    renderChart3();

    window.addEventListener("resize", () => renderChart3(true));
  });
});

// ----------------- tooltip -----------------
function createTooltip3() {
  d3.selectAll(".chart-tooltip").remove();

  return d3.select("body")
    .append("div")
    .attr("class", "chart-tooltip")
    .style("position", "absolute")
    .style("pointer-events", "none")
    .style("padding", "10px 14px")
    .style("background", "rgba(255,255,255,0.98)")
    .style("border", "1px solid #d0d7e2")
    .style("border-radius", "10px")
    .style("font-size", "13px")
    .style("font-weight", "500")
    .style("color", "#0f172a")
    .style("box-shadow", "0 8px 20px rgba(0,0,0,0.12)")
    .style("backdrop-filter", "blur(6px)")
    .style("opacity", 0)
    .style("transition", "opacity 0.15s ease")
    .style("z-index", 9999);
}

// ----------------- KPI cards -----------------
function generateKPI3(agg) {
  const kpiContainer = document.getElementById("kpi3");
  if (!kpiContainer || !agg.length) return;

  const sorted = [...agg].sort((a, b) => d3.descending(a.value, b.value));
  const highest = sorted[0];
  const lowest = sorted[sorted.length - 1];
  const total = d3.sum(sorted, d => d.value);

  const yearLabel =
    chart3CurrentYear === "all"
      ? `${chart3Years[0]}–${chart3Years[chart3Years.length - 1]}`
      : chart3CurrentYear;

  kpiContainer.innerHTML = `
    <div class="kpi">
      <h3>HIGHEST METHOD</h3>
      <p>${highest.method.replace("(Stage", "<br/>(Stage")}</p>
      <span class="kpi-sub">
        ${highest.value.toLocaleString()} positives
      </span>
    </div>
    <div class="kpi">
      <h3>LOWEST METHOD</h3>
      <p>${lowest.method.replace("(Stage", "<br/>(Stage")}</p>
      <span class="kpi-sub">
        ${lowest.value.toLocaleString()} positives
      </span>
    </div>
    <div class="kpi">
      <h3>TOTAL POSITIVES</h3>
      <p>${total.toLocaleString()}</p>
      <span class="kpi-sub">All methods, ${yearLabel}</span>
    </div>
  `;
}

// ----------------- year controls (chip + dropdown + slider) -----------------
function setupYearControls3() {
  const slider   = document.getElementById("yearSlider3");
  const chipBtn  = document.getElementById("yearChip3");
  const allBtn   = document.getElementById("yearAllBtn3");
  const dropdown = document.getElementById("yearDropdown3");
  const yearGrid = dropdown ? dropdown.querySelector(".year-grid") : null;

  if (!slider || !chipBtn || !allBtn || !dropdown || !yearGrid) return;
  if (!chart3Years.length) return;

  const minYear = chart3Years[0];
  const maxYear = chart3Years[chart3Years.length - 1];

  // configure slider
  slider.min = minYear;
  slider.max = maxYear;
  slider.step = 1;

  // 🔹 Start in "all years" mode, slider at the LATEST year (same as Chart 2)
  slider.value = maxYear;
  chart3CurrentYear = "all";
  chipBtn.textContent = `All years (${minYear}–${maxYear})`;
  allBtn.classList.add("is-active");
  updateSliderTrack3(maxYear);

  // build dropdown buttons
  yearGrid.innerHTML = "";

  const makeYearBtn = (label, value) => {
    const b = document.createElement("button");
    b.className = "year-option";
    b.dataset.year = String(value);
    b.textContent = label;
    yearGrid.appendChild(b);
  };

  // All-years option (top)
  makeYearBtn(`All years (${minYear}–${maxYear})`, "all");
  // Individual years
  chart3Years.forEach(y => makeYearBtn(String(y), y));

  const setActiveYearOption = () => {
    yearGrid.querySelectorAll(".year-option").forEach(btn => {
      const val = btn.dataset.year;
      const isActive =
        (chart3CurrentYear === "all" && val === "all") ||
        (chart3CurrentYear !== "all" &&
          val !== "all" &&
          +val === chart3CurrentYear);
      btn.classList.toggle("active", isActive);
    });
  };
  setActiveYearOption();

  // slider -> year
  slider.addEventListener("input", e => {
    const y = +e.target.value;
    chart3CurrentYear = y;
    chipBtn.textContent = String(y);
    allBtn.classList.remove("is-active");
    updateSliderTrack3(y);
    setActiveYearOption();
    renderChart3();
  });

  // All years button (same behaviour as Chart 2)
  allBtn.addEventListener("click", () => {
    chart3CurrentYear = "all";
    chipBtn.textContent = `All years (${minYear}–${maxYear})`;
    slider.value = maxYear;
    allBtn.classList.add("is-active");
    updateSliderTrack3(maxYear);
    setActiveYearOption();
    renderChart3();
  });

  // chip click -> toggle dropdown
  chipBtn.addEventListener("click", e => {
    e.stopPropagation();
    dropdown.classList.toggle("hidden");
  });

  // dropdown year click
  yearGrid.addEventListener("click", e => {
    const btn = e.target.closest(".year-option");
    if (!btn) return;
    const val = btn.dataset.year;

    if (val === "all") {
      chart3CurrentYear = "all";
      chipBtn.textContent = `All years (${minYear}–${maxYear})`;
      slider.value = maxYear;
      allBtn.classList.add("is-active");
      updateSliderTrack3(maxYear);
    } else {
      const year = +val;
      chart3CurrentYear = year;
      chipBtn.textContent = String(year);
      slider.value = year;
      allBtn.classList.remove("is-active");
      updateSliderTrack3(year);
    }

    setActiveYearOption();
    dropdown.classList.add("hidden");
    renderChart3();
  });

  // click outside -> close dropdown
  document.addEventListener("click", e => {
    if (!dropdown.contains(e.target) && !chipBtn.contains(e.target)) {
      dropdown.classList.add("hidden");
    }
  });
}

function updateSliderTrack3(value) {
  const slider = document.getElementById("yearSlider3");
  if (!slider) return;
  const min = +slider.min;
  const max = +slider.max;
  const pct = max === min ? 0 : ((value - min) / (max - min)) * 100;
  slider.style.background = `linear-gradient(
    90deg,
    #6366f1 0%,
    #6366f1 ${pct}%,
    #e5e7eb ${pct}%,
    #e5e7eb 100%
  )`;
}

// ----------------- donut chart rendering -----------------
function renderChart3() {
  const container = document.getElementById("chart3");
  if (!container || !chart3Data) return;

  container.innerHTML = "";

  const width  = container.clientWidth || 720;
  const height = 380;
  const padding = 30;
  const isWide = width > 640;

  const radius = Math.min(width * 0.5, height - padding * 2) / 2;
  const centerX = isWide ? width * 0.62 : width / 2;
  const centerY = height / 2;

  const svg = d3.select(container)
    .append("svg")
    .attr("class", "svg-frame")
    .attr("viewBox", `0 0 ${width} ${height}`)
    .attr("preserveAspectRatio", "xMidYMid meet");

  const g = svg.append("g")
    .attr("transform", `translate(${centerX},${centerY})`);

  const tooltip = createTooltip3();

  // filter by year
  let rows = chart3Data;
  if (chart3CurrentYear !== "all") {
    rows = rows.filter(d => d.year === chart3CurrentYear);
  }

  // aggregate by method
  const roll = d3.rollup(
    rows,
    v => d3.sum(v, d => d.value),
    d => d.method
  );

  let data = Array.from(roll, ([method, value]) => ({ method, value }))
    .filter(d => d.value > 0 && CHART3_METHODS.includes(d.method))
    .sort(
      (a, b) =>
        CHART3_METHODS.indexOf(a.method) - CHART3_METHODS.indexOf(b.method)
    );

  if (!data.length) return;

  const total = d3.sum(data, d => d.value);

  // update KPI cards
  generateKPI3(data);

  const pie = d3.pie()
    .value(d => d.value)
    .sort(null);

  const arc = d3.arc()
    .outerRadius(radius)
    .innerRadius(radius * 0.55);

  const arcHover = d3.arc()
    .outerRadius(radius + 8)
    .innerRadius(radius * 0.55);

  const arcs = pie(data);

  g.selectAll("path.slice")
    .data(arcs)
    .enter()
    .append("path")
    .attr("class", "slice")
    .attr("d", arc)
    .attr("fill", d => CHART3_COLOURS(d.data.method))
    .attr("stroke", "#ffffff")
    .attr("stroke-width", 2)
    .on("mouseenter", function (event, d) {
      d3.select(this).transition().duration(150).attr("d", arcHover);

      const pct = ((d.data.value / total) * 100).toFixed(1);

      tooltip
        .style("opacity", 1)
        .html(`
          <div style="font-size:14px; font-weight:600;">
            ${d.data.method}
          </div>
          <div style="color:#1d4ed8; font-weight:600;">
            ${d.data.value.toLocaleString()} positives
          </div>
          <div style="margin-top:4px; color:#64748b;">
            ${pct}% of total
          </div>
        `)
        .style("left", event.pageX + 14 + "px")
        .style("top", event.pageY - 40 + "px");
    })
    .on("mousemove", event => {
      tooltip
        .style("left", event.pageX + 14 + "px")
        .style("top", event.pageY - 40 + "px");
    })
    .on("mouseleave", function () {
      d3.select(this).transition().duration(150).attr("d", arc);
      tooltip.style("opacity", 0);
    });

  // centre label
  const yearLabel =
    chart3CurrentYear === "all"
      ? `${chart3Years[0]}–${chart3Years[chart3Years.length - 1]} total`
      : `${chart3CurrentYear}`;

  g.append("text")
    .attr("text-anchor", "middle")
    .attr("dy", "-4")
    .attr("fill", "#0f172a")
    .style("font-size", "18px")
    .style("font-weight", "700")
    .text(total.toLocaleString());

  g.append("text")
    .attr("text-anchor", "middle")
    .attr("dy", "16")
    .attr("fill", "#64748b")
    .style("font-size", "11px")
    .text(`positives (${yearLabel})`);

  // legend
  const legend = svg.append("g")
    .attr("class", "chart3-legend")
    .attr(
      "transform",
      isWide ? `translate(${32}, ${60})` : `translate(${width / 2 - 120}, 32)`
    );

  const legendItems = legend.selectAll(".legend-item")
    .data(CHART3_METHODS)
    .enter()
    .append("g")
    .attr("class", "legend-item")
    .attr("transform", (d, i) => `translate(0, ${i * 22})`);

  legendItems.append("rect")
    .attr("width", 12)
    .attr("height", 12)
    .attr("rx", 3)
    .attr("ry", 3)
    .attr("fill", d => CHART3_COLOURS(d));

  legendItems.append("text")
    .attr("x", 18)
    .attr("y", 10)
    .attr("fill", "#0f172a")
    .attr("font-size", 12)
    .text(d => d);
}
