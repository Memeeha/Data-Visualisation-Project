// js/chart1.js

document.addEventListener("DOMContentLoaded", () => {
  renderChart1();
  window.addEventListener("resize", renderChart1);
});

// ----------------------------------------------------------
// Tooltip styling (shared)
// ----------------------------------------------------------
function createTooltip() {
  d3.selectAll(".chart-tooltip").remove(); // avoid duplicates

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
  const width  = container.clientWidth || 720;
  const height = 380;

  const svg = d3.select(container)
    .append("svg")
    .attr("class", "svg-frame")
    .attr("viewBox", `0 0 ${width} ${height}`)
    .attr("preserveAspectRatio", "xMidYMid meet");

  const innerWidth  = width  - margin.left - margin.right;
  const innerHeight = height - margin.top  - margin.bottom;

  const g = svg.append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  const tooltip = createTooltip();

  d3.csv("data/police_enforcement_2024_positive_drug_tests.csv").then(raw => {
    // ------------------------------------------------------
    // 1) Aggregate COUNT per YEAR
    // ------------------------------------------------------
    const totalsByYear = {};

    raw.forEach(d => {
      const year  = +d.YEAR;
      const count = +d.COUNT || 0;
      if (Number.isFinite(year)) {
        totalsByYear[year] = (totalsByYear[year] || 0) + count;
      }
    });

    const data = Object.keys(totalsByYear)
      .map(y => ({ year: +y, value: totalsByYear[y] }))
      .sort((a, b) => d3.ascending(a.year, b.year));

    if (!data.length) {
      console.warn("Chart1: no data after aggregation");
      return;
    }

    // ------------------------------------------------------
    // 2) Scales
    // ------------------------------------------------------
    const x = d3.scaleBand()
      .domain(data.map(d => d.year))
      .range([0, innerWidth])
      .padding(0.25);

    const y = d3.scaleLinear()
      .domain([0, d3.max(data, d => d.value) * 1.1])
      .nice()
      .range([innerHeight, 0]);

    const getX = d => x(d.year) + x.bandwidth() / 2;

    // ------------------------------------------------------
    // 3) Grid + axes
    // ------------------------------------------------------
    g.append("g")
      .attr("class", "grid")
      .call(
        d3.axisLeft(y)
          .ticks(6)
          .tickSize(-innerWidth)
          .tickFormat("")
      );

    g.append("g")
      .attr("class", "axis")
      .call(d3.axisLeft(y).ticks(6).tickFormat(d3.format(",")));

    g.append("g")
      .attr("class", "axis")
      .attr("transform", `translate(0,${innerHeight})`)
      .call(d3.axisBottom(x));

    // ------------------------------------------------------
    // 4) Line with draw animation
    // ------------------------------------------------------
    const line = d3.line()
      .x(d => getX(d))
      .y(d => y(d.value))
      .curve(d3.curveMonotoneX);

    const linePath = g.append("path")
      .datum(data)
      .attr("fill", "none")
      .attr("stroke", "#3b82f6")
      .attr("stroke-width", 3)
      .attr("d", line);

    const totalLength = linePath.node().getTotalLength();
    linePath
      .attr("stroke-dasharray", `${totalLength} ${totalLength}`)
      .attr("stroke-dashoffset", totalLength)
      .transition()
      .duration(1200)
      .ease(d3.easeCubicOut)
      .attr("stroke-dashoffset", 0);

    // ------------------------------------------------------
    // 5) Static dots (for visual emphasis)
    // ------------------------------------------------------
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
      .attr("stroke-width", 1.5);

    // ------------------------------------------------------
    // 6) Interactive focus line + dot + tooltip
    // ------------------------------------------------------
    const focusLine = g.append("line")
      .attr("class", "focus-line")
      .attr("stroke", "#93c5fd")
      .attr("stroke-width", 1.5)
      .attr("stroke-dasharray", "4 4")
      .style("opacity", 0);

    const focusDot = g.append("circle")
      .attr("class", "focus-dot")
      .attr("r", 6)
      .attr("fill", "#1d4ed8")
      .attr("stroke", "#ffffff")
      .attr("stroke-width", 2)
      .style("opacity", 0);

    // precompute x-pixel positions for each point
    const xPositions = data.map(d => getX(d));

    // big transparent rect to capture mouse movement
    g.append("rect")
      .attr("class", "overlay")
      .attr("fill", "transparent")
      .attr("pointer-events", "all")
      .attr("width", innerWidth)
      .attr("height", innerHeight)
      .on("mousemove", function (event) {
        const [mx] = d3.pointer(event, this);

        // guard if mouse is completely outside
        if (mx < 0 || mx > innerWidth) {
          focusLine.style("opacity", 0);
          focusDot.style("opacity", 0);
          tooltip.style("opacity", 0);
          return;
        }

        // find closest data point to mouse x
        let closestIndex = 0;
        let minDist = Infinity;
        xPositions.forEach((px, i) => {
          const dist = Math.abs(mx - px);
          if (dist < minDist) {
            minDist = dist;
            closestIndex = i;
          }
        });

        const d  = data[closestIndex];
        const cx = getX(d);
        const cy = y(d.value);

        // move guide line + focus dot
        focusLine
          .attr("x1", cx)
          .attr("x2", cx)
          .attr("y1", 0)
          .attr("y2", innerHeight)
          .style("opacity", 1);

        focusDot
          .attr("cx", cx)
          .attr("cy", cy)
          .style("opacity", 1);

        // build "change vs previous year" info
        const prev = data[closestIndex - 1];
        const diff = prev ? d.value - prev.value : null;
        const pct  = prev && prev.value > 0
          ? ((diff / prev.value) * 100).toFixed(1)
          : null;

        let extraHtml = "";
        if (pct !== null) {
          const sign = diff >= 0 ? "+" : "";
          extraHtml =
            `<div style="margin-top:4px; color:#64748b;">
               vs prev year: ${sign}${diff.toLocaleString()} (${sign}${pct}%)
             </div>`;
        }

        // tooltip content
        tooltip
          .style("opacity", 1)
          .html(`
            <div style="font-size:14px; font-weight:600; margin-bottom:4px;">
              Year ${d.year}
            </div>
            <div style="color:#1d4ed8; font-weight:600;">
              ${d.value.toLocaleString()} positive tests
            </div>
            ${extraHtml}
          `)
          .style("left", event.pageX + 14 + "px")
          .style("top", event.pageY - 40 + "px");
      })
      .on("mouseleave", function () {
        focusLine.style("opacity", 0);
        focusDot.style("opacity", 0);
        tooltip.style("opacity", 0);
      });

    // ------------------------------------------------------
    // 7) Axis labels
    // ------------------------------------------------------
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
