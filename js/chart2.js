// js/chart2.js

document.addEventListener("DOMContentLoaded", () => {
  renderChart2();
  window.addEventListener("resize", renderChart2);
});

function createTooltip2() {
  // remove any existing tooltip (e.g., on resize)
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

function renderChart2() {
  const container = document.getElementById("chart2");
  if (!container) return;

  // clear on resize
  container.innerHTML = "";

  const margin = { top: 30, right: 24, bottom: 60, left: 80 };
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

  const tooltip = createTooltip2();

  d3.csv("data/police_enforcement_2024_positive_drug_tests.csv").then(raw => {
    // --- 1) Filter for 2024 positive drug tests ---
    const filtered = raw.filter(d => {
      const year = +d.YEAR;
      return year === 2024 && d.METRIC === "positive_drug_tests";
    });

    // --- 2) Aggregate COUNT by JURISDICTION ---
    const totalsByJurisdiction = {};
    filtered.forEach(d => {
      const j = d.JURISDICTION || "Unknown";
      const v = +d.COUNT || 0;
      totalsByJurisdiction[j] = (totalsByJurisdiction[j] || 0) + v;
    });

    let data = Object.keys(totalsByJurisdiction).map(j => ({
      jurisdiction: j,
      value: totalsByJurisdiction[j]
    }));

    if (!data.length) {
      console.warn("Chart2: no data for 2024");
      return;
    }

    // sort descending (highest positive tests first)
    data.sort((a, b) => d3.descending(a.value, b.value));

    // --- 3) Scales ---
    const x = d3.scaleBand()
      .domain(data.map(d => d.jurisdiction))
      .range([0, innerWidth])
      .padding(0.25);

    const y = d3.scaleLinear()
      .domain([0, d3.max(data, d => d.value) * 1.1])
      .nice()
      .range([innerHeight, 0]);

    // --- 3b) Colour scale – one colour per jurisdiction ---
    const colorScale = d3.scaleOrdinal()
      .domain(data.map(d => d.jurisdiction))
      .range([
        "#60a5fa",  // light blue
        "#3b82f6",  // blue
        "#2563eb",  // deep blue
        "#10b981",  // green
        "#34d399",  // light green
        "#0ea5e9",  // cyan
        "#6366f1",  // indigo
        "#7c3aed"   // violet
      ]);

    // --- 4) Grid + axes ---
    g.append("g")
      .attr("class", "grid")
      .call(
        d3.axisLeft(y)
          .ticks(5)
          .tickSize(-innerWidth)
          .tickFormat("")
      );

    g.append("g")
      .attr("class", "axis")
      .call(d3.axisLeft(y).ticks(5).tickFormat(d3.format(",")));

    g.append("g")
      .attr("class", "axis")
      .attr("transform", `translate(0,${innerHeight})`)
      .call(d3.axisBottom(x));

    // --- 5) Bars with grow animation ---
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

    // --- 6) Value labels above each bar ---
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

    // --- 7) Hover interaction + tooltip ---
    bars
      .on("mouseenter", function(event, d) {
        const baseColor = d3.color(colorScale(d.jurisdiction));
        const hoverColor = baseColor ? baseColor.darker(1) : "#1d4ed8";

        d3.select(this)
          .transition().duration(120)
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
              ${d.value.toLocaleString()} positive tests in 2024
            </div>
          `)
          .style("left", event.pageX + 14 + "px")
          .style("top", event.pageY - 40 + "px");
      })
      .on("mousemove", function(event) {
        tooltip
          .style("left", event.pageX + 14 + "px")
          .style("top", event.pageY - 40 + "px");
      })
      .on("mouseleave", function(event, d) {
        d3.select(this)
          .transition().duration(120)
          .attr("fill", d => colorScale(d.jurisdiction))
          .attr("y", y(d.value))
          .attr("height", innerHeight - y(d.value));

        tooltip.style("opacity", 0);
      });

    // --- 8) Axis labels ---
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
      .text("Positive roadside drug tests (count), 2024");
  });
}
