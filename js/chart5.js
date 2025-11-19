// js/chart5.js

document.addEventListener("DOMContentLoaded", () => {
  renderChart5();
  window.addEventListener("resize", renderChart5);
});

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

// === KPI STATISTICS FOR CHART 5 ===
function generateKPI5(data) {
  const sorted = [...data].sort((a, b) => d3.descending(a.value, b.value));
  const highest = sorted[0];
  const lowest = sorted[sorted.length - 1];
  const total   = d3.sum(sorted, d => d.value);

  const kpiContainer = document.getElementById("kpi5");
  if (!kpiContainer) return;

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
      <h3>TOTAL POSITIVES (2024)</h3>
      <p>${total.toLocaleString()}</p>
      <span class="kpi-sub">All age groups</span>
    </div>
  `;
}

function renderChart5() {
  const container = document.getElementById("chart5");
  if (!container) return;

  container.innerHTML = "";

  const margin = { top: 30, right: 20, bottom: 70, left: 80 };
  const width  = container.clientWidth || 720;
  const height = 360;

  const svg = d3.select(container)
    .append("svg")
    .attr("class", "svg-frame")
    .attr("viewBox", `0 0 ${width} ${height}`)
    .attr("preserveAspectRatio", "xMidYMid meet");

  const innerWidth  = width  - margin.left - margin.right;
  const innerHeight = height - margin.top  - margin.bottom;

  const g = svg.append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  const tooltip = createTooltip5();

  d3.csv("data/Chart 5.csv").then(raw => {
    if (!raw.length) {
      console.warn("Chart5: no data in Chart 5.csv");
      return;
    }

    const data = raw.map(d => ({
      ageGroup: d.AGE_GROUP,
      value: +d["Sum(COUNT)"] || 0
    }));

    // sort descending by count (highest bar first)
    data.sort((a, b) => d3.descending(a.value, b.value));

    // generate KPI cards in hero
    generateKPI5(data);

    const x = d3.scaleBand()
      .domain(data.map(d => d.ageGroup))
      .range([0, innerWidth])
      .padding(0.25);

    const y = d3.scaleLinear()
      .domain([0, d3.max(data, d => d.value) * 1.1])
      .nice()
      .range([innerHeight, 0]);

    // grid
    g.append("g")
      .attr("class", "grid")
      .call(
        d3.axisLeft(y)
          .ticks(5)
          .tickSize(-innerWidth)
          .tickFormat("")
      );

    // y-axis
    g.append("g")
      .attr("class", "axis")
      .call(d3.axisLeft(y).ticks(5).tickFormat(d3.format(",")));

    // x-axis
    const xAxis = g.append("g")
      .attr("class", "axis")
      .attr("transform", `translate(0,${innerHeight})`)
      .call(d3.axisBottom(x));

    xAxis.selectAll("text")
      .attr("dy", "1em");

    // bars
    const bars = g.selectAll(".bar")
      .data(data)
      .enter()
      .append("rect")
      .attr("class", "bar")
      .attr("x", d => x(d.ageGroup))
      .attr("width", x.bandwidth())
      .attr("y", innerHeight)
      .attr("height", 0)
      .attr("fill", "#6366f1")
      .attr("rx", 8);

    bars.transition()
      .duration(900)
      .delay((d, i) => i * 80)
      .attr("y", d => y(d.value))
      .attr("height", d => innerHeight - y(d.value));

    // labels above bars
    g.selectAll(".bar-label")
      .data(data)
      .enter()
      .append("text")
      .attr("class", "bar-label")
      .attr("text-anchor", "middle")
      .attr("x", d => x(d.ageGroup) + x.bandwidth() / 2)
      .attr("y", d => y(d.value) - 6)
      .attr("fill", "#0f172a")
      .attr("font-size", 11)
      .text(d => d3.format(",")(d.value));

    // hover interactions
    bars
      .on("mouseenter", function(event, d) {
        d3.select(this)
          .transition().duration(150)
          .attr("fill", "#4f46e5")
          .attr("y", y(d.value) - 4)
          .attr("height", innerHeight - y(d.value) + 4);

        tooltip
          .style("opacity", 1)
          .html(`
            <div style="font-size:14px; font-weight:600; margin-bottom:4px;">
              ${d.ageGroup}
            </div>
            <div style="color:#4f46e5; font-weight:600;">
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
      .on("mouseleave", function(event, d) {
        d3.select(this)
          .transition().duration(150)
          .attr("fill", "#6366f1")
          .attr("y", y(d.value))
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
  });
}
