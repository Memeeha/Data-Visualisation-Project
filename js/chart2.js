// js/chart2.js

// ----- Globals -----
const YEAR_MIN_2 = 2008;
const YEAR_MAX_2 = 2024;

let currentYear2 = "all";   // "all" or a specific year (number)
let cachedAgg2   = null;    // aggregated data cache
let chart2Width  = 0;       // for resize optimisation

// ---------- Tooltip factory ----------
function createTooltip2() {
  d3.selectAll(".chart-tooltip").remove();

  return d3.select("body")
    .append("div")
    .attr("class", "chart-tooltip")
    .style("position", "absolute")
    .style("pointer-events", "none")
    .style("padding", "10px 14px")
    .style("background", "rgba(255, 255, 255, 0.98)")
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

// ---------- Data loading & aggregation ----------
function loadAndAggregate2() {
  if (cachedAgg2) {
    return Promise.resolve(cachedAgg2);
  }

  return d3.csv("data/police_enforcement_2024_positive_drug_tests.csv").then(raw => {
    const agg = {}; // agg[year][jurisdiction] = sum of COUNT

    raw.forEach(d => {
      const year   = +d.YEAR;
      const metric = d.METRIC;
      if (!year || metric !== "positive_drug_tests") return;

      const j = d.JURISDICTION || "Unknown";
      const v = +d.COUNT || 0;

      if (!agg[year])    agg[year]    = {};
      if (!agg[year][j]) agg[year][j] = 0;
      agg[year][j] += v;
    });

    cachedAgg2 = agg;
    return agg;
  });
}

// ---------- KPI cards ----------
function generateKPISection2(data, yearLabel) {
  const sorted  = [...data].sort((a, b) => d3.descending(a.value, b.value));
  const highest = sorted[0];
  const lowest  = sorted[sorted.length - 1];
  const total   = d3.sum(sorted, d => d.value);

  const kpiContainer = document.getElementById("kpi2");
  if (!kpiContainer) return;

  kpiContainer.innerHTML = `
    <div class="kpi">
      <h3>HIGHEST JURISDICTION</h3>
      <p>${highest.jurisdiction}</p>
      <span class="kpi-sub">
        ${highest.value.toLocaleString()} positive tests (${yearLabel})
      </span>
    </div>

    <div class="kpi">
      <h3>LOWEST JURISDICTION</h3>
      <p>${lowest.jurisdiction}</p>
      <span class="kpi-sub">
        ${lowest.value.toLocaleString()} positive tests (${yearLabel})
      </span>
    </div>

    <div class="kpi">
      <h3>TOTAL POSITIVE</h3>
      <p>${total.toLocaleString()}</p>
      <span class="kpi-sub">${yearLabel}</span>
    </div>
  `;
}

// ---------- Main render ----------
function renderChart2() {
  const container = document.getElementById("chart2");
  if (!container) return;

  const newWidth = container.clientWidth || 720;
  container.innerHTML = "";
  chart2Width = newWidth;

  const margin      = { top: 30, right: 24, bottom: 60, left: 80 };
  const width       = newWidth;
  const height      = 380;
  const innerWidth  = width  - margin.left - margin.right;
  const innerHeight = height - margin.top  - margin.bottom;

  const svg = d3.select(container)
    .append("svg")
    .attr("class", "svg-frame")
    .attr("viewBox", `0 0 ${width} ${height}`)
    .attr("preserveAspectRatio", "xMidYMid meet");

  const g = svg.append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  const tooltip = createTooltip2();

  loadAndAggregate2().then(agg => {
    let data = [];

    if (currentYear2 === "all") {
      // sum across all years per jurisdiction
      const totals = {};
      Object.keys(agg).forEach(yearStr => {
        const yearData = agg[yearStr];
        Object.keys(yearData).forEach(jur => {
          totals[jur] = (totals[jur] || 0) + yearData[jur];
        });
      });

      data = Object.keys(totals).map(j => ({
        jurisdiction: j,
        value: totals[j]
      }));
    } else {
      const yearData = agg[currentYear2] || {};
      data = Object.keys(yearData).map(j => ({
        jurisdiction: j,
        value: yearData[j]
      }));
    }

    if (!data.length) return;

    data.sort((a, b) => d3.descending(a.value, b.value));

    const yearLabel =
      currentYear2 === "all" ? "Total 2008–2024" : `Year ${currentYear2}`;

    generateKPISection2(data, yearLabel);

    const x = d3.scaleBand()
      .domain(data.map(d => d.jurisdiction))
      .range([0, innerWidth])
      .padding(0.25);

    const y = d3.scaleLinear()
      .domain([0, d3.max(data, d => d.value) * 1.1])
      .nice()
      .range([innerHeight, 0]);

    const colorScale = d3.scaleOrdinal()
      .domain(data.map(d => d.jurisdiction))
      .range([
        "#60a5fa",
        "#3b82f6",
        "#2563eb",
        "#10b981",
        "#34d399",
        "#0ea5e9",
        "#6366f1",
        "#7c3aed"
      ]);


    // y axis
    g.append("g")
      .attr("class", "axis")
      .call(d3.axisLeft(y).ticks(5).tickFormat(d3.format(",")));

    // x axis
    g.append("g")
      .attr("class", "axis")
      .attr("transform", `translate(0,${innerHeight})`)
      .call(d3.axisBottom(x));

    // bars
    const bars = g.selectAll(".bar")
      .data(data, d => d.jurisdiction)
      .enter()
      .append("rect")
      .attr("class", "bar")
      .attr("x", d => x(d.jurisdiction))
      .attr("width", x.bandwidth())
      .attr("y", innerHeight)
      .attr("height", 0)
      .attr("fill", d => colorScale(d.jurisdiction))
      .attr("rx", 6)
      .attr("ry", 6);

    bars.transition()
      .duration(900)
      .delay((d, i) => i * 80)
      .attr("y", d => y(d.value))
      .attr("height", d => innerHeight - y(d.value));

    // value labels
    g.selectAll(".bar-label")
      .data(data)
      .enter()
      .append("text")
      .attr("class", "bar-label")
      .attr("text-anchor", "middle")
      .attr("x", d => x(d.jurisdiction) + x.bandwidth() / 2)
      .attr("y", d => y(d.value) - 6)
      .attr("fill", "#0f172a")
      .attr("font-size", 11)
      .text(d => d3.format(",")(d.value));

    // tooltips
    bars
      .on("mouseenter", function (event, d) {
        const baseColor  = d3.color(colorScale(d.jurisdiction));
        const hoverColor = baseColor ? baseColor.darker(0.8) : "#1d4ed8";

        d3.select(this)
          .transition()
          .duration(120)
          .attr("fill", hoverColor)
          .attr("y", y(d.value) - 4)
          .attr("height", innerHeight - y(d.value) + 4);

        tooltip
          .style("opacity", 1)
          .html(`
            <div style="font-size:14px; font-weight:600; margin-bottom:4px;">
              ${d.jurisdiction}
            </div>
            <div style="color:#1d4ed8; font-weight:600;">
              ${d.value.toLocaleString()} positive tests
              ${
                currentYear2 === "all"
                  ? "(2008–2024 total)"
                  : "in " + currentYear2
              }
            </div>
          `)
          .style("left", event.pageX + 14 + "px")
          .style("top",  event.pageY - 40 + "px");
      })
      .on("mousemove", function (event) {
        tooltip
          .style("left", event.pageX + 14 + "px")
          .style("top",  event.pageY - 40 + "px");
      })
      .on("mouseleave", function (event, d) {
        d3.select(this)
          .transition()
          .duration(120)
          .attr("fill", d => colorScale(d.jurisdiction))
          .attr("y", d => y(d.value))
          .attr("height", d => innerHeight - y(d.value));

        tooltip.style("opacity", 0);
      });

    // axis labels
    g.append("text")
      .attr("x", innerWidth / 2)
      .attr("y", innerHeight + 44)
      .attr("text-anchor", "middle")
      .attr("fill", "#0f172a")
      .attr("font-size", 12)
      .text("Jurisdiction");

    g.append("text")
      .attr("x", -innerHeight / 2)
      .attr("y", -60)
      .attr("text-anchor", "middle")
      .attr("transform", "rotate(-90)")
      .attr("fill", "#0f172a")
      .attr("font-size", 12)
      .text(
        currentYear2 === "all"
          ? "Total positive roadside drug tests (2008–2024)"
          : `Positive roadside drug tests (${currentYear2})`
      );
  });
}

// UI wiring (slider + chip + dropdown + all-years pill)
document.addEventListener("DOMContentLoaded", () => {
  const slider   = document.getElementById("yearSlider2");
  const yearChip = document.getElementById("yearChip2");      // <-- new id
  const allBtn   = document.getElementById("yearAllBtn2");
  const dropdown = document.getElementById("yearDropdown2");

  if (!slider || !yearChip || !dropdown) {
    renderChart2();
    return;
  }

  // Slider setup
  slider.min  = YEAR_MIN_2;
  slider.max  = YEAR_MAX_2;
  slider.step = 1;
  slider.value = YEAR_MIN_2;        

  // --- slider track fill ---
  function updateSliderTrack2(value) {
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

  // --- update chip label ---
  function updateChipLabel2() {
    if (currentYear2 === "all") {
      yearChip.innerHTML = "<strong>All years (2008–2024)</strong>";
    } else {
      yearChip.innerHTML = `<strong>${currentYear2}</strong>`;
    }
  }

  // --- highlight active year in dropdown ---
  function updateYearDropdownActive2() {
    const buttons = dropdown.querySelectorAll(".year-option2");
    const target = currentYear2 === "all" ? "all" : String(currentYear2);

    buttons.forEach(btn => {
      btn.classList.toggle("active", btn.dataset.year === target);
    });
  }

  // --- Slider input: change year ---
  slider.addEventListener("input", () => {
    currentYear2 = Number(slider.value);
    allBtn && allBtn.classList.remove("is-active");
    updateChipLabel2();
    updateSliderTrack2(currentYear2);
    updateYearDropdownActive2();
    renderChart2();
  });

  // --- All-years pill ---
  if (allBtn) {
    allBtn.addEventListener("click", () => {
      currentYear2 = "all";
      slider.value = YEAR_MIN_2;           
      allBtn.classList.add("is-active");
      updateChipLabel2();
      updateSliderTrack2(YEAR_MIN_2);
      updateYearDropdownActive2();
      renderChart2();
    });
  }

  // --- Year chip: open/close dropdown ---
  yearChip.addEventListener("click", (e) => {
    e.stopPropagation();
    dropdown.classList.toggle("hidden");
  });

  // --- Dropdown year buttons ---
  dropdown.querySelectorAll(".year-option2").forEach((btn) => {
    btn.addEventListener("click", () => {
      const val = btn.dataset.year;
      if (val === "all") {
        currentYear2 = "all";
        slider.value = YEAR_MIN_2;
        allBtn && allBtn.classList.add("is-active");
      } else {
        currentYear2 = Number(val);
        slider.value = currentYear2;
        allBtn && allBtn.classList.remove("is-active");
      }

      updateChipLabel2();
      updateSliderTrack2(
        currentYear2 === "all" ? YEAR_MIN_2 : currentYear2
      );
      updateYearDropdownActive2();
      dropdown.classList.add("hidden");
      renderChart2();
    });
  });

  // --- click outside closes dropdown ---
  document.addEventListener("click", (e) => {
    if (!dropdown.contains(e.target) && e.target !== yearChip) {
      dropdown.classList.add("hidden");
    }
  });

  // Initial UI + chart
  currentYear2 = "all";
  slider.value = YEAR_MIN_2;
  updateChipLabel2();
  updateSliderTrack2(YEAR_MIN_2);
  updateYearDropdownActive2();
  renderChart2();

  // Smooth resize: small debounce
  window.addEventListener("resize", () => {
    clearTimeout(window._chart2ResizeTimer);
    window._chart2ResizeTimer = setTimeout(renderChart2, 150);
  });
});
