// js/chart5.js

let chart5Data = null;          // raw rows from CSV
let chart5Years = [];           // list of available years
let chart5AgeGroups = [];       // list of age groups

let chart5CurrentYear = "all";  // "all" or a number
let chart5CurrentAge = "all";   // "all" or age-group string

document.addEventListener("DOMContentLoaded", () => {
  d3.csv("data/Chart 5.csv").then(raw => {
    if (!raw.length) {
      console.warn("Chart5: no data in Chart 5.csv");
      return;
    }

    // Detect column names
    const cols = raw.columns.map(c => c.toLowerCase());
    const yearCol =
      raw.columns[cols.indexOf("year")] ??
      raw.columns[cols.indexOf("yr")] ??
      "YEAR";

    const ageCol =
      raw.columns[cols.indexOf("age_group")] ??
      raw.columns[cols.indexOf("age group")] ??
      "AGE_GROUP";

    const countCol =
      raw.columns.find(c => c.toLowerCase().includes("sum(count")) ||
      raw.columns.find(c => c.toLowerCase().includes("count")) ||
      "Sum(COUNT)";

    chart5Data = raw.map(d => ({
      year: d[yearCol] ? +d[yearCol] : null,
      ageGroup: d[ageCol],
      value: +d[countCol] || 0
    })).filter(d => d.ageGroup);

    // Years & age groups
    chart5Years = Array.from(
      new Set(chart5Data.map(d => d.year).filter(v => !isNaN(v)))
    ).sort(d3.ascending);

    chart5AgeGroups = Array.from(
      new Set(chart5Data.map(d => d.ageGroup))
    );

    setupYearControls5();
    buildAgeFilter5(chart5AgeGroups);

    updateChart5();

    window.addEventListener("resize", () => {
      updateChart5(true); // redraw only
    });
  });
});

// ---------- Tooltip ----------
function createTooltip5() {
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
    .style("transition", "opacity .15s ease")
    .style("z-index", 9999);
}

// ---------- KPI cards ----------
function generateKPI5(data) {
  const kpiContainer = document.getElementById("kpi5");
  if (!kpiContainer || !data.length) return;

  const sorted = [...data].sort((a, b) => d3.descending(a.value, b.value));
  const highest = sorted[0];
  const lowest = sorted[sorted.length - 1];
  const total = d3.sum(sorted, d => d.value);

  const yearLabel =
    chart5CurrentYear === "all"
      ? `${chart5Years[0]}–${chart5Years[chart5Years.length - 1]}`
      : chart5CurrentYear;

  const ageLabel =
    chart5CurrentAge === "all" ? "All age groups" : chart5CurrentAge;

  kpiContainer.innerHTML = `
    <div class="kpi">
      <h3>HIGHEST AGE GROUP</h3>
      <p>${highest.ageGroup}</p>
      <span class="kpi-sub">${highest.value.toLocaleString()} positives</span>
    </div>

    <div class="kpi">
      <h3>LOWEST AGE GROUP</h3>
      <p>${lowest.ageGroup}</p>
      <span class="kpi-sub">${lowest.value.toLocaleString()} positives</span>
    </div>

    <div class="kpi">
      <h3>TOTAL POSITIVES</h3>
      <p>${total.toLocaleString()}</p>
      <span class="kpi-sub">${ageLabel}, ${yearLabel}</span>
    </div>
  `;
}

// ---------- Year controls ----------
function setupYearControls5() {
  const slider = document.getElementById("yearSlider5");
  const labelBtn = document.getElementById("yearValue5");
  const allBtn = document.getElementById("yearAllBtn5");
  const chip = document.getElementById("yearValue5");
  const dropdown = document.getElementById("yearDropdown5");
  const yearButtons = document.querySelectorAll(".year-option5"); // ADDED

  // ADDED: helper to sync .active state on dropdown buttons
  const updateYearActiveButtons5 = () => {
    if (!yearButtons.length) return;
    yearButtons.forEach(b => b.classList.remove("active"));

    const target = chart5CurrentYear === "all"
      ? "all"
      : String(chart5CurrentYear);

    yearButtons.forEach(b => {
      if (b.dataset.year === target) {
        b.classList.add("active");
      }
    });
  };
  // --- end ADDED helper ---

  if (chip && dropdown) {
    chip.addEventListener("click", () => {
      dropdown.classList.toggle("hidden");
    });

    document.querySelectorAll(".year-option5").forEach(btn => {
      btn.addEventListener("click", () => {
        const y = btn.dataset.year;
        const minYear = chart5Years[0];
        const maxYear = chart5Years[chart5Years.length - 1];

        if (y === "all") {
          chart5CurrentYear = "all";
          slider.value = minYear;
          labelBtn.textContent = `All years (${minYear}–${maxYear})`;
          allBtn.classList.add("is-active");
          updateSliderTrack5(minYear);
        } else {
          const yearNum = +y;
          chart5CurrentYear = yearNum;
          slider.value = yearNum;
          labelBtn.textContent = y;
          allBtn.classList.remove("is-active");
          updateSliderTrack5(yearNum);
        }

        updateYearActiveButtons5(); // ADDED
        dropdown.classList.add("hidden");
        updateChart5();
      });
    });
  }

  if (!slider || !labelBtn || !allBtn || !chart5Years.length) return;

  const minYear = chart5Years[0];
  const maxYear = chart5Years[chart5Years.length - 1];

  slider.min = minYear;
  slider.max = maxYear;
  slider.value = minYear;

  chart5CurrentYear = "all";
  labelBtn.textContent = `All years (${minYear}–${maxYear})`;
  updateSliderTrack5(minYear);
  updateYearActiveButtons5(); // ADDED – initial state

  slider.addEventListener("input", e => {
    const y = +e.target.value;
    chart5CurrentYear = y;
    labelBtn.textContent = String(y);
    allBtn.classList.remove("is-active");
    updateSliderTrack5(y);
    updateYearActiveButtons5(); // ADDED – sync with slider
    updateChart5();
  });

  allBtn.addEventListener("click", () => {
    chart5CurrentYear = "all";
    slider.value = minYear;
    labelBtn.textContent = `All years (${minYear}–${maxYear})`;
    allBtn.classList.add("is-active");
    updateSliderTrack5(minYear);
    updateYearActiveButtons5(); // ADDED – highlight "All"
    updateChart5();
  });

  allBtn.classList.add("is-active");
}

function updateSliderTrack5(value) {
  const slider = document.getElementById("yearSlider5");
  if (!slider) return;
  const min = +slider.min;
  const max = +slider.max;
  const pct = max === min ? 0 : ((value - min) / (max - min)) * 100;
  slider.style.background = `linear-gradient(90deg,#6366f1 0%,#6366f1 ${pct}%,#e5e7eb ${pct}%,#e5e7eb 100%)`;
}

// ---------- Age filter pills ----------
function buildAgeFilter5(ageGroups) {
  const container = document.getElementById("ageFilter5");
  if (!container) return;

  container.innerHTML = "";

  const makePill = (label, value) => {
    const btn = document.createElement("button");
    btn.className = "age-pill";
    btn.dataset.value = value;
    btn.textContent = label;

    if (value === chart5CurrentAge) {
      btn.classList.add("is-active");
    }

    btn.addEventListener("click", () => {
      chart5CurrentAge = value;
      container.querySelectorAll(".age-pill").forEach(pill => {
        pill.classList.toggle(
          "is-active",
          pill.dataset.value === chart5CurrentAge
        );
      });
      updateChart5();
    });

    container.appendChild(btn);
  };

  // "All" pill first
  chart5CurrentAge = "all";
  makePill("All age groups", "all");

  ageGroups.forEach(g => makePill(g, g));
}

// ---------- Chart drawing ----------
function updateChart5(resizeOnly = false) {
  const container = document.getElementById("chart5");
  if (!container || !chart5Data) return;

  container.innerHTML = "";

  const margin = { top: 30, right: 20, bottom: 70, left: 80 };
  const width = container.clientWidth || 720;
  const height = 380;

  const svg = d3.select(container)
    .append("svg")
    .attr("class", "svg-frame")
    .attr("viewBox", `0 0 ${width} ${height}`)
    .attr("preserveAspectRatio", "xMidYMid meet");

  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;

  const g = svg.append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  const tooltip = createTooltip5();

  // Filter by year first
  let rows = chart5Data;

  if (chart5CurrentYear !== "all") {
    rows = rows.filter(d => d.year === chart5CurrentYear);
  }

  // Now aggregate depending on age filter
  let agg;

  if (chart5CurrentAge === "all") {
    // group by ageGroup
    const roll = d3.rollup(
      rows,
      v => d3.sum(v, d => d.value),
      d => d.ageGroup
    );
    agg = Array.from(roll, ([ageGroup, value]) => ({ ageGroup, value }));
  } else {
    const filtered = rows.filter(d => d.ageGroup === chart5CurrentAge);
    const total = d3.sum(filtered, d => d.value);
    agg = [{ ageGroup: chart5CurrentAge, value: total }];
  }

  if (!agg.length) return;

  // Sort descending for nicer layout
  agg.sort((a, b) => d3.descending(a.value, b.value));

  generateKPI5(agg);

  const x = d3.scaleBand()
    .domain(agg.map(d => d.ageGroup))
    .range([0, innerWidth])
    .padding(0.25);

  const y = d3.scaleLinear()
    .domain([0, d3.max(agg, d => d.value) * 1.1])
    .nice()
    .range([innerHeight, 0]);

  const colorScale = d3.scaleOrdinal()
    .domain(chart5AgeGroups)
    .range([
      "#60a5fa",
      "#3b82f6",
      "#2563eb",
      "#0ea5e9",
      "#10b981",
      "#34d399",
      "#6366f1",
      "#7c3aed"
    ]);


  // y-axis
  g.append("g")
    .attr("class", "axis")
    .call(d3.axisLeft(y).ticks(5).tickFormat(d3.format(",")));

  // x-axis
  const xAxis = g.append("g")
    .attr("class", "axis")
    .attr("transform", `translate(0,${innerHeight})`)
    .call(d3.axisBottom(x));

  xAxis.selectAll("text").attr("dy", "1em");

  // bars
  const bars = g.selectAll(".bar")
    .data(agg)
    .enter()
    .append("rect")
    .attr("class", "bar")
    .attr("x", d => x(d.ageGroup))
    .attr("width", x.bandwidth())
    .attr("y", innerHeight)
    .attr("height", 0)
    .attr("fill", d => colorScale(d.ageGroup))
    .attr("rx", 8);

  bars.transition()
    .duration(900)
    .delay((d, i) => i * 80)
    .attr("y", d => y(d.value))
    .attr("height", d => innerHeight - y(d.value));

  // labels
  g.selectAll(".bar-label")
    .data(agg)
    .enter()
    .append("text")
    .attr("class", "bar-label")
    .attr("text-anchor", "middle")
    .attr("x", d => x(d.ageGroup) + x.bandwidth() / 2)
    .attr("y", d => y(d.value) - 6)
    .attr("fill", "#0f172a")
    .attr("font-size", 11)
    .text(d => d3.format(",")(d.value));

  // hover
  bars
    .on("mouseenter", function (event, d) {
      const baseColor = d3.color(colorScale(d.ageGroup));
      const hoverColor = baseColor ? baseColor.darker(1) : "#4f46e5";

      d3.select(this)
        .transition()
        .duration(150)
        .attr("fill", hoverColor)
        .attr("y", y(d.value) - 4)
        .attr("height", innerHeight - y(d.value) + 4);

      tooltip
        .style("opacity", 1)
        .html(`
          <div style="font-size:14px; font-weight:600; margin-bottom:4px;">
            ${d.ageGroup}
          </div>
          <div style="color:${baseColor}; font-weight:600;">
            ${d.value.toLocaleString()} positive tests
          </div>
        `)
        .style("left", event.pageX + 12 + "px")
        .style("top", event.pageY - 40 + "px");
    })
    .on("mousemove", event => {
      tooltip
        .style("left", event.pageX + 12 + "px")
        .style("top", event.pageY - 40 + "px");
    })
    .on("mouseleave", function (event, d) {
      d3.select(this)
        .transition()
        .duration(150)
        .attr("fill", d => colorScale(d.ageGroup))
        .attr("y", d => y(d.value))
        .attr("height", innerHeight - y(d.value));

      tooltip.style("opacity", 0);
    });

  // axis labels
  g.append("text")
    .attr("x", innerWidth / 2)
    .attr("y", innerHeight + 55)
    .attr("text-anchor", "middle")
    .attr("fill", "#0f172a")
    .attr("font-size", 12)
    .text("Age group");

  g.append("text")
    .attr("x", -innerHeight / 2)
    .attr("y", -60)
    .attr("text-anchor", "middle")
    .attr("transform", "rotate(-90)")
    .attr("fill", "#0f172a")
    .attr("font-size", 12)
    .text("Positive detections (count)");
}
