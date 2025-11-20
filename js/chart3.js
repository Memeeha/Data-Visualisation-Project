// js/chart3.js

document.addEventListener("DOMContentLoaded", () => {
  renderChart3();
  window.addEventListener("resize", renderChart3);
});

function createTooltip3() {
  // remove any existing tooltip (e.g. on resize)
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

function renderChart3() {
  const container = document.getElementById("chart3");
  if (!container) return;

  // clear on resize
  container.innerHTML = "";

  const width  = container.clientWidth || 520;
  const height = 360;
  const padding = 20;
  const isWide = width > 640; // full / half screen handling

  let centerX, centerY, radius, legendX, legendY;

  if (isWide) {
    // Legend on the left, pie on the right
    const legendWidth = 220;
    const pieAreaWidth = width - legendWidth - padding * 3;

    radius = Math.min(pieAreaWidth, height - padding * 2) / 2;

    centerX = legendWidth + padding * 2 + pieAreaWidth / 2;
    centerY = height / 2;

    legendX = padding * 1.5;
    legendY = padding;
  } else {
    // Legend on top, pie in the middle
    const verticalSpaceForLegend = 60;
    radius = Math.min(width - padding * 2, height - verticalSpaceForLegend - padding * 2) / 2;

    centerX = width / 2;
    centerY = (height + verticalSpaceForLegend) / 2 + 10;

    // roughly centre the legend
    legendX = width / 2 - 90;
    legendY = padding;
  }

  const svg = d3.select(container)
    .append("svg")
    .attr("class", "svg-frame")
    .attr("viewBox", `0 0 ${width} ${height}`)
    .attr("preserveAspectRatio", "xMidYMid meet");

  const g = svg.append("g")
    .attr("transform", `translate(${centerX},${centerY})`);

  const tooltip = createTooltip3();

  // ⭐ Use the pre-aggregated KNIME output for Chart 3
  d3.csv("data/Chart 3.csv").then(raw => {
    // Expect columns: DETECTION_METHOD, Sum(COUNT)
    let data = raw.map(d => ({
      method: d.DETECTION_METHOD,
      value: +d["Sum(COUNT)"] || 0
    })).filter(d => d.method && d.value > 0);

    if (!data.length) {
      console.warn("Chart3: no data in Chart 3.csv");
      return;
    }

    const total = d3.sum(data, d => d.value);

    // Sort in stage order: Stage 1 → Stage 2 → Stage 3
    const stageOrder = {
      "Indicator (Stage 1)": 1,
      "Secondary Confirmatory (Stage 2)": 2,
      "Laboratory or Toxicology (Stage 3)": 3
    };

    data.sort((a, b) => stageOrder[a.method] - stageOrder[b.method]);

    // Colour palette in stage order
    const color = d3.scaleOrdinal()
      .domain([
        "Indicator (Stage 1)",
        "Secondary Confirmatory (Stage 2)",
        "Laboratory or Toxicology (Stage 3)"
      ])
      .range([
        "#3b82f6", // Stage 1 = blue
        "#facc15", // Stage 2 = yellow
        "#22c55e"  // Stage 3 = green
      ]);

    // Pure pie (no inner radius)
    const pie = d3.pie()
      .value(d => d.value)
      .sort(null);

    const arc = d3.arc()
      .outerRadius(radius)
      .innerRadius(0);

    const arcHover = d3.arc()
      .outerRadius(radius + 10)
      .innerRadius(0);

    const arcs = pie(data);

    // --- Draw slices ---
    g.selectAll("path.slice")
      .data(arcs)
      .enter()
      .append("path")
      .attr("class", "slice")
      .attr("d", arc)
      .attr("fill", d => color(d.data.method))
      .attr("stroke", "#ffffff")
      .attr("stroke-width", 2)
      .on("mouseenter", function (event, d) {
        d3.select(this)
          .transition()
          .duration(150)
          .attr("d", arcHover);

        const pct = ((d.data.value / total) * 100).toFixed(1);

        tooltip
          .style("opacity", 1)
          .html(`
            <div style="font-size:14px; font-weight:600;">
              ${d.data.method}
            </div>
            <div style="color:#1d4ed8; font-weight:600;">
              ${d.data.value.toLocaleString()} tests
            </div>
            <div style="margin-top:4px; color:#64748b;">
              ${pct}% of total
            </div>
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
        d3.select(this)
          .transition()
          .duration(150)
          .attr("d", arc);

        tooltip.style("opacity", 0);
      });

    // --- Legend in stage order ---
    const legend = svg.append("g")
      .attr("class", "chart3-legend")
      .attr("transform", `translate(${legendX}, ${legendY})`);

    const legendItems = legend.selectAll(".legend-item")
      .data(data)
      .enter()
      .append("g")
      .attr("class", "legend-item")
      .attr("transform", (d, i) => `translate(0, ${i * 22})`);

    legendItems.append("rect")
      .attr("width", 12)
      .attr("height", 12)
      .attr("rx", 3)
      .attr("ry", 3)
      .attr("fill", d => color(d.method));

    legendItems.append("text")
      .attr("x", 18)
      .attr("y", 10)
      .attr("fill", "#0f172a")
      .attr("font-size", 11)
      .text(d => d.method);
  });
}
