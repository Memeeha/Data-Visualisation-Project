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
  const totalsByYearState = d3.rollup(
    data,
    v => d3.sum(v, d => d.count),
    d => d.year,
    d => d.state
  );

  const totalsAllYears = d3.rollup(
    data,
    v => d3.sum(v, d => d.count),
    d => d.state
  );

  const globalMax = d3.max(totalsAllYears.values());

  // -------------------------------------------------------
  // DOM REFERENCES
  // -------------------------------------------------------
  const slider     = document.getElementById("yearSlider6");
  const chip       = document.getElementById("yearChip6");
  const allBtn     = document.getElementById("yearAllBtn6");
  const helper     = document.getElementById("chart6HelperText");
  const mapWrapper = document.getElementById("chart6MapWrapper");
  const mapTooltip = d3.select("#chart6Tooltip");      // map tooltip

  const kpiVal     = document.getElementById("chart6TotalValue");
  const kpiLabel   = document.getElementById("chart6YearLabelKpi");
  const kpiSub     = document.getElementById("chart6KpiSubtitle");

  const pieSvg     = d3.select("#chart6Pie");
  const pieLegend  = document.getElementById("chart6PieLegend");
  const pieTooltip = d3.select("#chart6PieTooltip");   // PIE tooltip (different id)
  const pieCard    = document.querySelector(".chart6-pie-card");

  const tableBody  = document.getElementById("chart6TableBody");

  const fsBtn      = document.getElementById("fsToggle6");
  const fsPanel    = document.getElementById("chart6Panel");

  const mapSvg     = d3.select("#chart6Map");
  const insightTopEl   = document.getElementById("chart6InsightTopState");
  const insightTotalEl = document.getElementById("chart6InsightTotal");


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
  // YEAR DROPDOWN
  // -------------------------------------------------------
const dropdown = document.createElement("div");
dropdown.id = "yearDropdown6";
dropdown.classList.add("hidden");
dropdown.innerHTML = `
  <div class="year-grid">
    <button class="year-option" data-year="all">
      All years (${minYear}–${maxYear})
    </button>
    ${d3.range(minYear, maxYear + 1, 1).map(y => `
      <button class="year-option" data-year="${y}">${y}</button>
    `).join("")}
  </div>
`;

  chip.parentElement.style.position = "relative";
  chip.parentElement.appendChild(dropdown);

 
  function updateYearActiveButtons6() {
    const buttons = dropdown.querySelectorAll(".year-option");
    buttons.forEach(b => b.classList.remove("active"));

    const target = currentYear === "all" ? "all" : String(currentYear);
    buttons.forEach(b => {
      if (b.dataset.year === target) {
        b.classList.add("active");
      }
    });
  }


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
    updateSliderFill();
    updateYearActiveButtons6();   
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

  
  function updateChart6(animate = true) {
    const totals = getTotals(currentYear);

    const rows = Array.from(totals, ([state, value]) => ({ state, value }))
      .sort((a, b) => d3.descending(a.value, b.value));

    const localMax = d3.max(rows, d => d.value) || 1;

   
    const top = rows[0];

    if (insightTopEl) {
      if (top) {
        insightTopEl.textContent =
          `${top.state} (${top.value.toLocaleString("en-AU")})`;
      } else {
        insightTopEl.textContent = "No data";
      }
    }

    if (insightTotalEl) {
      const totalSumForInsight = d3.sum(rows, d => d.value);
      insightTotalEl.textContent =
        totalSumForInsight.toLocaleString("en-AU");
    }

    colorScale.domain([0, localMax]);

    const label = currentYear === "all"
      ? `${minYear}–${maxYear}`
      : currentYear;

    chip.textContent = currentYear === "all"
      ? `All years (${minYear}–${maxYear})`
      : String(label);

    helper.textContent =
      `Hover a state or slice to see its positive drug tests in ${label}.`;

    kpiLabel.textContent = label;

    const totalSum = d3.sum(rows, d => d.value);
    kpiVal.textContent = totalSum.toLocaleString("en-AU");
    kpiSub.textContent = totalSum === 0
      ? "No data for this period."
      : "Across all states and territories";

    // ------------------- MAP: COLOURS + HOVER -------------------
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

        mapTooltip
          .classed("hidden", false)
          .html(`
            <strong>${name} (${code})</strong><br>
            ${val.toLocaleString("en-AU")} positives<br>
            <span style="font-size:12px">Year: ${label}</span>
          `);
      })
      .on("mousemove", function (event) {
        const rect = mapWrapper.getBoundingClientRect();
        const x = event.clientX - rect.left + 14;
        const y = event.clientY - rect.top + 14;

        mapTooltip
          .style("left", x + "px")
          .style("top",  y + "px");
      })
      .on("mouseleave", function () {
        mapTooltip.classed("hidden", true);
        d3.select(this)
          .attr("stroke", "#cbd5e1")
          .attr("stroke-width", 1.2);
      });

    // ------------------- PIE CHART -------------------
    const arcs = pie(rows);

    const piePaths = pieGroup.selectAll("path")
      .data(arcs, d => d.data.state);

    const mergedPie = piePaths.enter()
      .append("path")
      .attr("fill", d => pieColor(d.data.state))
      .attr("stroke", "#ffffff")
      .attr("stroke-width", 1)
      .each(function (d) { this._current = d; })
      .merge(piePaths);

    mergedPie
      .transition().duration(600)
      .attrTween("d", function (d) {
        const i = d3.interpolate(this._current, d);
        this._current = i(0);
        return t => arc(i(t));
      });

    // PIE HOVER TOOLTIP 
    mergedPie
      .on("mouseenter", function (event, d) {
        const state = d.data.state;
        const val   = d.data.value;
        const pct   = totalSum ? (val / totalSum) * 100 : 0;

        pieTooltip
          .classed("hidden", false)
          .html(`
            <strong>${state}</strong><br>
            ${val.toLocaleString("en-AU")} positives<br>
            ${pct.toFixed(1)}% of total<br>
            <span style="font-size:12px">Year: ${label}</span>
          `);
      })
      //  keep tooltip close to the cursor
      .on("mousemove", function (event) {
        pieTooltip
          .style("left", (event.clientX + 12) + "px")
          .style("top",  (event.clientY + 12) + "px");
      })
      .on("mouseleave", function () {
        pieTooltip.classed("hidden", true);
      });

    piePaths.exit().remove();

    // centre total text in the middle of the donut
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

    // ------------------- PIE LEGEND -------------------
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

    // ------------------- TABLE (with colour dots) -------------------
    tableBody.innerHTML = rows.map(r => `
      <tr>
        <td>
          <span class="chart6-table-swatch"
                style="background-color:${pieColor(r.state)}"></span>
          ${r.state}
        </td>
        <td style="text-align:right">${r.value.toLocaleString("en-AU")}</td>
      </tr>
    `).join("");
  }

  // -------------------------------------------------------
  // SLIDER FILL
  // -------------------------------------------------------
  function updateSliderFill() {
  const min = +slider.min;
  const max = +slider.max;
  const val = +slider.value;

  const pct = max === min ? 0 : ((val - min) / (max - min)) * 100;

  slider.style.background =
    `linear-gradient(90deg,
      #6366f1 0%,
      #6366f1 ${pct}%,
      #e5e7eb ${pct}%,
      #e5e7eb 100%)`;
}


  slider.addEventListener("input", () => {
    currentYear = +slider.value;
    dropdown.classList.add("hidden");
    updateSliderFill();
    updateYearActiveButtons6();     
    updateChart6(false); 
  });

  updateSliderFill();
  updateYearActiveButtons6();       

  // -------------------------------------------------------
  // BUTTONS
  // -------------------------------------------------------
  allBtn.addEventListener("click", () => {
    currentYear = "all";
    slider.value = maxYear;
    updateSliderFill();
    dropdown.classList.add("hidden");
    updateYearActiveButtons6();    
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
