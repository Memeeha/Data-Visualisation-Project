// js/chart4.js

document.addEventListener("DOMContentLoaded", () => {
  renderChart4();
  window.addEventListener("resize", renderChart4);
});

function createTooltip4() {
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

function renderChart4() {
  const container = document.getElementById("chart4");
  if (!container) return;

  container.innerHTML = "";

  const margin = { top: 50, right: 24, bottom: 70, left: 80 };
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

  const tooltip = createTooltip4();

  const ACTIONS = [
    { key: "Sum(FINES)", label: "Fines", color: "#3b82f6" },
    { key: "Sum(ARRESTS)", label: "Arrests", color: "#f97316" },
    { key: "Sum(CHARGES)", label: "Charges", color: "#22c55e" }
  ];

  d3.csv("data/Chart 4.csv").then(raw => {

    raw.forEach(d => {
      d.fines = +d["Sum(FINES)"] || 0;
      d.arrests = +d["Sum(ARRESTS)"] || 0;
      d.charges = +d["Sum(CHARGES)"] || 0;
      d.total = d.fines + d.arrests + d.charges;
    });

    raw.sort((a, b) => d3.descending(a.total, b.total));
    const jurisdictions = raw.map(d => d.JURISDICTION);

    const x0 = d3.scaleBand()
      .domain(jurisdictions)
      .range([0, innerWidth])
      .padding(0.18);

    const x1 = d3.scaleBand()
      .domain(ACTIONS.map(a => a.key))
      .range([0, x0.bandwidth()])
      .padding(0.12);

    const y = d3.scaleLinear()
      .domain([
        0,
        d3.max(raw, d =>
          d3.max(ACTIONS, a => +d[a.key] || 0)
        ) * 1.1
      ])
      .nice()
      .range([innerHeight, 0]);

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

    const xAxis = g.append("g")
      .attr("class", "axis")
      .attr("transform", `translate(0,${innerHeight})`)
      .call(d3.axisBottom(x0));

    xAxis.selectAll("text")
      .attr("dy", "1em");

    const groups = g.selectAll(".juris-group")
      .data(raw)
      .enter()
      .append("g")
      .attr("transform", d => `translate(${x0(d.JURISDICTION)},0)`);

    groups.selectAll("rect")
      .data(d => ACTIONS.map(a => ({
        jurisdiction: d.JURISDICTION,
        actionKey: a.key,
        actionLabel: a.label,
        color: a.color,
        value: +d[a.key] || 0,
        fines: d.fines,
        arrests: d.arrests,
        charges: d.charges,
        total: d.total
      })))
      .enter()
      .append("rect")
      .attr("x", d => x1(d.actionKey))
      .attr("y", innerHeight)
      .attr("width", x1.bandwidth())
      .attr("height", 0)
      .attr("fill", d => d.color)
      .attr("rx", 4)
      .on("mouseenter", function (event, d) {
        d3.select(this)
          .transition()
          .duration(150)
          .attr("y", y(d.value) - 4)
          .attr("height", innerHeight - y(d.value) + 4);

        tooltip
          .style("opacity", 1)
          .html(`
            <div style="font-size:14px; font-weight:600; margin-bottom:4px;">
              ${d.jurisdiction}
            </div>
            <div>Fines: <strong>${d.fines.toLocaleString()}</strong></div>
            <div>Arrests: <strong>${d.arrests.toLocaleString()}</strong></div>
            <div>Charges: <strong>${d.charges.toLocaleString()}</strong></div>
            <div style="margin-top:6px; color:#64748b;">
              Total: <strong>${d.total.toLocaleString()}</strong>
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
      .on("mouseleave", function (event, d) {
        d3.select(this)
          .transition()
          .duration(150)
          .attr("y", y(d.value))
          .attr("height", innerHeight - y(d.value));

        tooltip.style("opacity", 0);
      })
      .transition()
      .duration(900)
      .delay((d, i) => i * 60)
      .attr("y", d => y(d.value))
      .attr("height", d => innerHeight - y(d.value));

    // TOTAL label above each group
    g.selectAll(".total-label")
      .data(raw)
      .enter()
      .append("text")
      .attr("class", "total-label")
      .attr("text-anchor", "middle")
      .attr("x", d => x0(d.JURISDICTION) + x0.bandwidth() / 2)
      .attr("y", d => {
        const maxVal = Math.max(d.fines, d.arrests, d.charges);
        return y(maxVal) - 10;
      })
      .attr("fill", "#0f172a")
      .attr("font-size", 11)
      .attr("font-weight", "600")
      .text(d => d3.format(",")(d.total));

    // ====== Simple floating legend ======
    const legend = g.append("g")
      .attr("class", "simple-legend")
      .attr("transform", `translate(0, -20)`);

    const legendItems = legend.selectAll(".legend-item")
      .data(ACTIONS)
      .enter()
      .append("g")
      .attr("transform", (d, i) => `translate(${i * 110}, 0)`);

    legendItems.append("rect")
      .attr("width", 12)
      .attr("height", 12)
      .attr("rx", 3)
      .attr("ry", 3)
      .attr("fill", d => d.color);

    legendItems.append("text")
      .attr("x", 18)
      .attr("y", 10)
      .attr("fill", "#0f172a")
      .attr("font-size", 12)
      .text(d => d.label);

    // Axis labels
    g.append("text")
      .attr("x", innerWidth / 2)
      .attr("y", innerHeight + 50)
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
      .text("Enforcement actions (count)");

  });
}
