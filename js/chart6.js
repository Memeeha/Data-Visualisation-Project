// ---------------------------------------------------------
// CHART 6 — Drug Test Totals by State/Territory (2008–2024)
// CSV: YEAR | JURISDICTION | Sum(COUNT)
// GeoJSON: properties.STATE_NAME
// ---------------------------------------------------------

const CSV_PATH = "data/Chart 6.csv";
const GEO_PATH = "data/states.geojson";

// CSV columns
const COL_YEAR  = "YEAR";
const COL_STATE = "JURISDICTION";
const COL_COUNT = "Sum(COUNT)";

// Map GeoJSON state names to CSV abbreviations
const NAME_TO_ABBR = {
  "New South Wales": "NSW",
  "Victoria": "VIC",
  "Queensland": "QLD",
  "South Australia": "SA",
  "Western Australia": "WA",
  "Tasmania": "TAS",
  "Northern Territory": "NT",
  "Australian Capital Territory": "ACT"
};

Promise.all([
  d3.csv(CSV_PATH),
  d3.json(GEO_PATH)
]).then(([raw, geo]) => {

  // -------------------------------------------------------
  // CLEAN CSV
  // -------------------------------------------------------
  const data = raw.map(d => ({
    year:  +d[COL_YEAR],
    state: (d[COL_STATE] || "").trim(),
    count: +d[COL_COUNT]
  })).filter(d => !isNaN(d.year) && !isNaN(d.count) && d.state);

  const [minYear, maxYear] = d3.extent(data, d => d.year);

  // -------------------------------------------------------
  // ROLLUPS
  // -------------------------------------------------------
  // totalsByYearState: Map(year -> Map(stateAbbr -> total))
  const totalsByYearState = d3.rollup(
    data,
    v => d3.sum(v, d => d.count),
    d => d.year,
    d => d.state
  );

  // totalsAllYears: Map(stateAbbr -> total over all years)
  const totalsAllYears = d3.rollup(
    data,
    v => d3.sum(v, d => d.count),
    d => d.state
  );

  const globalMax = d3.max(totalsAllYears.values());

  // -------------------------------------------------------
  // DOM REFERENCES
  // -------------------------------------------------------
 const slider    = document.getElementById("yearSlider6");
const chip      = document.getElementById("yearChip6");
const allBtn    = document.getElementById("yearAllBtn6");
const tooltipEl = d3.select("#chart6Tooltip");
const helper    = document.getElementById("chart6HelperText");
const mapWrapper = document.getElementById("chart6MapWrapper"); // NEW


  const kpiVal    = document.getElementById("chart6TotalValue");
  const kpiLabel  = document.getElementById("chart6YearLabelKpi");
  const kpiSub    = document.getElementById("chart6KpiSubtitle");

  const pieSvg    = d3.select("#chart6Pie");
  const tableBody = document.getElementById("chart6TableBody");
  const pieCap    = document.getElementById("chart6PieCaption");

  const fsBtn     = document.getElementById("fsToggle6");
  const fsPanel   = document.getElementById("chart6Panel");

  const mapSvg    = d3.select("#chart6Map");

  // NEW: legend element for the pie
  const pieLegend = document.getElementById("chart6PieLegend"); // NEW

  // -------------------------------------------------------
  // SLIDER INIT
  // -------------------------------------------------------
  slider.min = minYear;
  slider.max = maxYear;
  slider.value = maxYear;

  // -------------------------------------------------------
  // GEO / MAP DRAW
  // -------------------------------------------------------
  const projection = d3.geoMercator().fitSize([800, 520], geo);
  const path       = d3.geoPath().projection(projection);

  const features = geo.features;

  const mapStates = mapSvg.append("g")
    .selectAll("path")
    .data(features)
    .enter()
    .append("path")
    .attr("d", path)
    .attr("stroke", "#cbd5e1")
    .attr("stroke-width", 1.2)
    .attr("fill", "#e2e8f0");

  // -------------------------------------------------------
  // COLOUR SCALE
  // -------------------------------------------------------
  const colorScale = d3.scaleSequential()
    .domain([0, globalMax])
    .interpolator(d3.interpolateBlues);

  // -------------------------------------------------------
  // PIE CHART SETUP
  // -------------------------------------------------------
  const pieGroup = pieSvg
    .attr("width", 260)
    .attr("height", 220)
    .append("g")
    .attr("transform", "translate(130,110)");

  const arc = d3.arc().innerRadius(55).outerRadius(95);
  const pie = d3.pie().value(d => d.value).sort(null);
  

  const pieColor = d3.scaleOrdinal(d3.schemeSet2);

  function getTotals(year) {
    if (year === "all") return new Map(totalsAllYears);
    return totalsByYearState.get(+year) || new Map();
  }

  let currentYear = "all";
  

  // -------------------------------------------------------
  // YEAR DROPDOWN (like Chart 3)
  // -------------------------------------------------------
  const dropdown = document.createElement("div");
  dropdown.id = "yearDropdown6";
  dropdown.classList.add("hidden");
  dropdown.innerHTML = `
    <div class="year-grid">
      <button class="year-option" data-year="all">
        All years (${minYear}–${maxYear})
      </button>
      ${d3.range(maxYear, minYear - 1, -1).map(y => `
        <button class="year-option" data-year="${y}">${y}</button>
      `).join("")}
    </div>
  `;
  chip.parentElement.style.position = "relative";
  chip.parentElement.appendChild(dropdown);

  dropdown.addEventListener("click", e => {
    const btn = e.target.closest(".year-option");
    if (!btn) return;
    const val = btn.dataset.year;
    currentYear = (val === "all") ? "all" : +val;
    if (currentYear === "all") {
      slider.value = maxYear;
    } else {
      slider.value = currentYear;
    }
    dropdown.classList.add("hidden");
    updateChart6();
  });

  chip.addEventListener("click", () => {
    dropdown.classList.toggle("hidden");
  });

  document.addEventListener("click", e => {
    if (!dropdown.contains(e.target) && e.target !== chip) {
      dropdown.classList.add("hidden");
    }
  });

  // -------------------------------------------------------
  // UPDATE FUNCTION
  // -------------------------------------------------------
  function updateChart6(animate = true) {
    const totals = getTotals(currentYear);

    const rows = Array.from(totals, ([state, value]) => ({ state, value }))
      .sort((a, b) => d3.descending(a.value, b.value));

    const localMax = d3.max(rows, d => d.value) || 1;
    colorScale.domain([0, localMax]);

    const label = currentYear === "all"
      ? `${minYear}–${maxYear}`
      : currentYear;

    chip.textContent = currentYear === "all"
      ? `All years (${minYear}–${maxYear})`
      : String(label);

    helper.textContent =
      `Hover a state to see its positive drug tests in ${label}.`;

    kpiLabel.textContent = label;
    pieCap.textContent = `Share by state · ${label}`;

    const totalSum = d3.sum(rows, d => d.value);
    kpiVal.textContent = totalSum.toLocaleString("en-AU");
    kpiSub.textContent = totalSum === 0
      ? "No data for this year."
      : "Across all states";

    // ------------------- MAP COLOURS + HOVER -------------------
mapStates.transition().duration(animate ? 600 : 0)
  .attr("fill", d => {
    const name = d.properties.STATE_NAME;
    const code = NAME_TO_ABBR[name] || name;
    const v = totals.get(code) || 0;
    return colorScale(v);
  });

mapStates
  .on("mouseenter", function (event, d) {
    const name = d.properties.STATE_NAME;
    const code = NAME_TO_ABBR[name] || name;
    const val  = totals.get(code) || 0;

    d3.select(this)
      .attr("stroke", "#0f172a")
      .attr("stroke-width", 2);

    const labelText = currentYear === "all"
      ? `${minYear}–${maxYear}`
      : currentYear;

    // Tooltip content: state + sum + year
    tooltipEl
      .classed("hidden", false)
      .html(`
        <strong>${name} (${code})</strong><br>
        ${val.toLocaleString("en-AU")} positives<br>
        <span style="font-size:12px">Year: ${labelText}</span>
      `);
  })
  .on("mousemove", function (event) {
  // position relative to the map wrapper so it works at any window size
  const rect = mapWrapper.getBoundingClientRect();
  const x = event.clientX - rect.left + 14;
  const y = event.clientY - rect.top + 14;

  tooltipEl
    .style("left", x + "px")
    .style("top",  y + "px");
})

  .on("mouseleave", function () {
    tooltipEl.classed("hidden", true);
    d3.select(this)
      .attr("stroke", "#cbd5e1")
      .attr("stroke-width", 1.2);
  });

    // ------------------- PIE CHART -------------------
    const arcs = pie(rows);

    const piePaths = pieGroup.selectAll("path")
      .data(arcs, d => d.data.state);

    piePaths.enter()
      .append("path")
      .attr("fill", d => pieColor(d.data.state))
      .attr("stroke", "#ffffff")
      .attr("stroke-width", 1)
      .each(function (d) { this._current = d; })
      .merge(piePaths)
      .transition().duration(600)
      .attrTween("d", function (d) {
        const i = d3.interpolate(this._current, d);
        this._current = i(0);
        return t => arc(i(t));
      });

    piePaths.exit().remove();

    // NEW: Pie legend (uses same colours + shows value + %)
    if (pieLegend) {
      pieLegend.innerHTML = "";
      rows.forEach(r => {
        const li = document.createElement("li");
        li.className = "chart6-pie-legend-item";

        const swatch = document.createElement("span");
        swatch.className = "chart6-pie-swatch";
        swatch.style.backgroundColor = pieColor(r.state);

        const pct = totalSum ? (r.value / totalSum) * 100 : 0;
        const text = document.createElement("span");
        text.textContent =
          `${r.state} · ${r.value.toLocaleString("en-AU")} (${pct.toFixed(1)}%)`;

        li.appendChild(swatch);
        li.appendChild(text);
        pieLegend.appendChild(li);
      });
    }

    // optional: simple labels in the middle with total
    const pieText = pieGroup.selectAll("text.total-label").data([totalSum]);
    pieText.enter().append("text")
      .attr("class", "total-label")
      .attr("text-anchor", "middle")
      .attr("dy", "0.35em")
      .style("font-size", "12px")
      .style("fill", "#0f172a")
      .merge(pieText)
      .text(d => d ? d.toLocaleString("en-AU") : "");
    pieText.exit().remove();

    // ------------------- TABLE -------------------
    tableBody.innerHTML = rows.map(r => `
      <tr>
        <td>${r.state}</td>
        <td style="text-align:right">${r.value.toLocaleString("en-AU")}</td>
      </tr>
    `).join("");
  }

  // -------------------------------------------------------
  // INTERACTIONS
  // -------------------------------------------------------
 slider.addEventListener("input", () => {
  currentYear = +slider.value;
  dropdown.classList.add("hidden");
  // no animation while dragging – makes it feel smooth/snappy
  updateChart6(false);
});
// Make the slider fill color follow its value like Chart 2
function updateSliderFill() {
  const min = slider.min;
  const max = slider.max;
  const val = slider.value;
  const percent = ((val - min) / (max - min)) * 100;
  slider.style.setProperty("--percent", percent + "%");
}
slider.addEventListener("input", updateSliderFill);
updateSliderFill(); // initialize


  allBtn.addEventListener("click", () => {
    currentYear = "all";
    slider.value = maxYear;
    dropdown.classList.add("hidden");
    updateChart6();
  });

  fsBtn.addEventListener("click", () => {
    const isFull = fsPanel.classList.toggle("is-fullscreen");
    document.body.classList.toggle("chart6-lock-scroll", isFull);
    fsBtn.textContent = isFull ? "Close view" : "Full view";
  });

  // -------------------------------------------------------
  // INITIAL RENDER
  // -------------------------------------------------------
  updateChart6(false);
}).catch(err => {
  console.error("Error loading data for Chart 6:", err);
});
