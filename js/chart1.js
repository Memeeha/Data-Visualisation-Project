// js/chart1.js

document.addEventListener("DOMContentLoaded", () => {
  renderChart1();
  window.addEventListener("resize", renderChart1);
});

// ----------------------------------------------------------
// TOOLTIP (cleaner styling, stronger contrast, soft shadow)
// ----------------------------------------------------------
function createTooltip() {
  d3.selectAll(".chart-tooltip").remove(); // remove duplicates

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

function renderChart1() {
  const container = document.getElementById("chart1");
  if (!container) return;

  container.innerHTML = "";

  const margin = { top: 30, right: 30, bottom: 50, left: 70 };
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

  const tooltip = createTooltip();

  // =========================================================
  // LOAD CSV + MANUAL AGGREGATION (cleanest + safest)
  // =========================================================
  d3.csv("data/police_enforcement_2024_positive_drug_tests.csv").then(raw => {

    const totalsByYear = {};

    raw.forEach(d => {
      const year = +d.YEAR;
      const count = +d.COUNT || 0;
      if (Number.isFinite(year)) {
        totalsByYear[year] = (totalsByYear[year] || 0) + count;
      }
    });

    const data = Object.keys(totalsByYear)
      .map(y => ({ year: +y, value: totalsByYear[y] }))
      .sort((a, b) => d3.ascending(a.year, b.year));

    if (!data.length) {
      console.warn("Chart1: No data found");
      return;
    }

    // =========================================================
    // SCALES
    // =========================================================
    const x = d3.scaleBand()
      .domain(data.map(d => d.year))
      .range([0, innerWidth])
      .padding(0.25);

    const y = d3.scaleLinear()
      .domain([0, d3.max(data, d => d.value) * 1.1])
      .nice()
      .range([innerHeight, 0]);

    const getX = d => x(d.year) + x.bandwidth() / 2;

    // =========================================================
    // GRID
    // =========================================================
    g.append("g")
      .attr("class", "grid")
      .call(
        d3.axisLeft(y)
          .ticks(6)
          .tickSize(-innerWidth)
          .tickFormat("")
      );

    // =========================================================
    // AXES
    // =========================================================
    g.append("g")
      .attr("class", "axis")
      .call(d3.axisLeft(y).ticks(6).tickFormat(d3.format(",")));  // ★ FIXED

    g.append("g")
      .attr("class", "axis")
      .attr("transform", `translate(0,${innerHeight})`)
      .call(d3.axisBottom(x));

    // =========================================================
    // LINE
    // =========================================================
    const line = d3.line()
      .x(d => getX(d))
      .y(d => y(d.value))
      .curve(d3.curveMonotoneX);

    g.append("path")
      .datum(data)
      .attr("fill", "none")
      .attr("stroke", "#3b82f6")
      .attr("stroke-width", 3)
      .attr("d", line);

    // =========================================================
    // DOTS + TOOLTIP INTERACTION
    // =========================================================
    g.selectAll(".dot")
      .data(data)
      .enter()
      .append("circle")
      .attr("class", "dot")
      .attr("cx", d => getX(d))
      .attr("cy", d => y(d.value))
      .attr("r", 4)
      .attr("fill", "#3b82f6")
      .attr("stroke", "#ffffff")
      .attr("stroke-width", 1.5)
      .on("mouseenter", function (event, d) {

        d3.select(this).transition().duration(120).attr("r", 7);

        const idx = data.findIndex(p => p.year === d.year);
        const prev = data[idx - 1];
        const diff = prev ? d.value - prev.value : null;
        const pct = prev && prev.value > 0
          ? ((diff / prev.value) * 100).toFixed(1)
          : null;

        // Build extra stats
        let extra = "";
        if (pct !== null) {
          const sign = diff >= 0 ? "+" : "";
          extra =
            `<div style="margin-top:4px; color:#64748b;">
              vs prev year: ${sign}${diff.toLocaleString()} (${sign}${pct}%)
            </div>`;
        }

        // ----------------------------------------------
        // NEW TOOLTIP LOOK
        // ----------------------------------------------
        tooltip
          .style("opacity", 1)
          .html(`
            <div style="font-size:14px; font-weight:600; margin-bottom:4px;">
              Year ${d.year}
            </div>
            <div style="color:#1d4ed8; font-weight:600;">
              ${d.value.toLocaleString()} positive tests
            </div>
            ${extra}
          `)
          .style("left", event.pageX + 14 + "px")
          .style("top", event.pageY - 40 + "px");
      })
      .on("mousemove", function (event) {
        tooltip
          .style("left", event.pageX + 14 + "px")
          .style("top", event.pageY - 40 + "px");
      })
      .on("mouseleave", function () {
        d3.select(this).transition().duration(120).attr("r", 4);
        tooltip.style("opacity", 0);
      });

    // =========================================================
    // AXIS LABELS
    // =========================================================
    g.append("text")
      .attr("x", innerWidth / 2)
      .attr("y", innerHeight + 40)
      .attr("text-anchor", "middle")
      .attr("fill", "#0f172a")
      .attr("font-size", 12)
      .text("Year");

    g.append("text")
      .attr("x", -innerHeight / 2)
      .attr("y", -50)
      .attr("text-anchor", "middle")
      .attr("transform", "rotate(-90)")
      .attr("fill", "#0f172a")
      .attr("font-size", 12)
      .text("Positive roadside drug tests (count)");
  });
}
