// js/chart4.js

let currentJuris4 = "all";     // "all" or one of NSW, QLD, ...
let cachedAgg4 = null;
let chart4Width = null;        // (currently unused, but kept in case you use it later)

// Enforcement action definitions
const ACTIONS_4 = [
  { id: "fines",   label: "Fines",   col: "Sum(FINES)" },
  { id: "arrests", label: "Arrests", col: "Sum(ARRESTS)" },
  { id: "charges", label: "Charges", col: "Sum(CHARGES)" }
];

// Fixed jurisdiction order
const JURIS_ORDER_4 = ["NSW", "QLD", "WA", "SA", "VIC", "TAS", "NT", "ACT"];

// Colours per jurisdiction
const JURIS_COLOURS_4 = [
  "#3b82f6", // NSW
  "#f97316", // QLD
  "#22c55e", // WA
  "#0ea5e9", // SA
  "#6366f1", // VIC
  "#a855f7", // TAS
  "#14b8a6", // NT
  "#e11d48"  // ACT
];

document.addEventListener("DOMContentLoaded", () => {
  initJurisControls4();
  renderChart4();
  window.addEventListener("resize", renderChart4);
});

/* ---------------- Tooltip helper ---------------- */

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

/* ---------------- Load + aggregate CSV once ---------------- */

function loadAndAggregate4() {
  if (cachedAgg4) return Promise.resolve(cachedAgg4);

  return d3.csv("data/Chart 4.csv").then(raw => {
    const agg = {};

    raw.forEach(d => {
      const jur = d.JURISDICTION;
      if (!jur) return;

      if (!agg[jur]) {
        agg[jur] = { fines: 0, arrests: 0, charges: 0 };
      }

      ACTIONS_4.forEach(a => {
        const val = +d[a.col] || 0;
        agg[jur][a.id] += val;
      });
    });

    cachedAgg4 = agg;
    return agg;
  });
}

/* ---------------- Controls (chip + dropdown) ---------------- */

function initJurisControls4() {
  const chip     = document.getElementById("jurisValue4");
  const dropdown = document.getElementById("jurisDropdown4");
  const buttons  = dropdown ? dropdown.querySelectorAll(".juris-option4") : [];
  const resetBtn = document.getElementById("jurisReset4");

  if (!chip || !dropdown) return;

  const updateLabel = () => {
    chip.textContent =
      currentJuris4 === "all" ? "All jurisdictions" : currentJuris4;
  };

  // helper to update .is-active on the dropdown pills
  const updateActiveButtons = () => {
    if (!buttons.length) return;
    buttons.forEach(b => b.classList.remove("is-active"));

    const target = currentJuris4 === "all" ? "all" : currentJuris4;
    buttons.forEach(b => {
      if (b.dataset.juris === target) {
        b.classList.add("is-active");
      }
    });
  };

  // Open / close dropdown when clicking the chip
  chip.addEventListener("click", e => {
    e.stopPropagation();
    dropdown.classList.toggle("hidden");
  });

  // Select a jurisdiction
  buttons.forEach(btn => {
    btn.addEventListener("click", () => {
      const j = btn.dataset.juris;
      currentJuris4 = j === "all" ? "all" : j;
      dropdown.classList.add("hidden");
      updateLabel();
      updateActiveButtons();
      renderChart4();
    });
  });

  // Reset back to all
  if (resetBtn) {
    resetBtn.addEventListener("click", () => {
      currentJuris4 = "all";
      updateLabel();
      updateActiveButtons();
      renderChart4();
    });
  }

  // Close dropdown when clicking outside
  document.addEventListener("click", () => {
    dropdown.classList.add("hidden");
  });

  updateLabel();
  updateActiveButtons(); // initial state
}

/* ---------------- Main render ---------------- */

function renderChart4() {
  const container = document.getElementById("chart4");
  if (!container) return;

  const width  = container.clientWidth || 720;
  const height = 380;
  const margin = { top: 80, right: 24, bottom: 70, left: 80 }; // extra top for view label

  const innerWidth  = width  - margin.left - margin.right;
  const innerHeight = height - margin.top  - margin.bottom;

  container.innerHTML = "";

  const svg = d3.select(container)
    .append("svg")
    .attr("class", "svg-frame")
    .attr("viewBox", `0 0 ${width} ${height}`)
    .attr("preserveAspectRatio", "xMidYMid meet");

  const g = svg.append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  const tooltip = createTooltip4();

  loadAndAggregate4().then(agg => {
    // 1. Decide which jurisdictions are shown
    let jurisList = Object.keys(agg);

    if (currentJuris4 !== "all") {
      jurisList = agg[currentJuris4] ? [currentJuris4] : [];
    }

    if (!jurisList.length) {
      console.warn("Chart4: no data for current filter");
      return;
    }

    jurisList = JURIS_ORDER_4.filter(j => jurisList.includes(j));

    // 2. Build grouped data: action -> bars
    const groups = ACTIONS_4.map(act => ({
      actionId: act.id,
      label: act.label,
      bars: jurisList.map(jur => ({
        actionId: act.id,
        actionLabel: act.label,
        jurisdiction: jur,
        value: agg[jur] ? agg[jur][act.id] : 0
      }))
    }));

    const yMax = d3.max(groups, grp => d3.max(grp.bars, b => b.value)) || 0;

    const x0 = d3.scaleBand()
      .domain(groups.map(g => g.label))
      .range([0, innerWidth])
      .paddingInner(0.25);

    const x1 = d3.scaleBand()
      .domain(jurisList)
      .range([0, x0.bandwidth()])
      .padding(0.18);

    // EXTRA headroom at top so labels don't hit the axis line
    const y = d3.scaleLinear()
      .domain([0, yMax * 1.25])
      .nice()
      .range([innerHeight, 0]);

    const colorScale = d3.scaleOrdinal()
      .domain(JURIS_ORDER_4)
      .range(JURIS_COLOURS_4);

    // Helper: compute draw y + height with a minimum visible bar height
    const MIN_BAR_HEIGHT = 4;
    function getBarGeom(value) {
      if (!value) return { y: innerHeight, h: 0 };

      const actualY = y(value);
      const actualH = innerHeight - actualY;

      if (actualH < MIN_BAR_HEIGHT) {
        return {
          y: innerHeight - MIN_BAR_HEIGHT,
          h: MIN_BAR_HEIGHT
        };
      }
      return { y: actualY, h: actualH };
    }

    // 2b. Friendly "view" label above plot
    const isAllMode = currentJuris4 === "all";
    let viewText;

    if (isAllMode) {
      viewText = "Viewing all jurisdictions – hover a bar to compare states.";
    } else {
      const stateAgg = agg[currentJuris4];
      const total = (stateAgg.fines || 0) +
                    (stateAgg.arrests || 0) +
                    (stateAgg.charges || 0);
      viewText =
        `${currentJuris4} only – axis scaled to this state ` +
        `(${d3.format(",")(total)} total actions, 2008–2024).`;
    }

    g.append("text")
      .attr("x", 0)
      .attr("y", -40)
      .attr("fill", "#64748b")
      .attr("font-size", 12)
      .text(viewText);

    // 3. Axes
    g.append("g")
      .attr("class", "axis")
      .call(d3.axisLeft(y).ticks(5).tickFormat(d3.format(",")));

    const xAxis = g.append("g")
      .attr("class", "axis")
      .attr("transform", `translate(0,${innerHeight})`)
      .call(d3.axisBottom(x0));

    xAxis.selectAll("text").attr("dy", "1.2em");

    // 4. Draw grouped bars
    const groupG = g.selectAll(".action-group")
      .data(groups)
      .enter()
      .append("g")
      .attr("class", "action-group")
      .attr("transform", d => `translate(${x0(d.label)},0)`);

    const bars = groupG.selectAll("rect.bar")
      .data(d => d.bars)
      .enter()
      .append("rect")
      .attr("class", "bar")
      .attr("x", d => x1(d.jurisdiction))
      .attr("width", x1.bandwidth())
      .attr("y", innerHeight)
      .attr("height", 0)
      .attr("fill", d => colorScale(d.jurisdiction))
      .attr("rx", 6);

    bars.transition()
      .duration(900)
      .delay((d, i) => i * 70)
      .attr("y", d => getBarGeom(d.value).y)
      .attr("height", d => getBarGeom(d.value).h);

    // 5. Value labels – friendly / non-overlapping
    const maxByAction = {};
    groups.forEach(grp => {
      maxByAction[grp.actionId] = d3.max(grp.bars, b => b.value);
    });

    groupG.selectAll("text.bar-label")
      .data(d => d.bars)
      .enter()
      .append("text")
      .attr("class", "bar-label")
      .attr("text-anchor", "middle")
      .attr("x", d => x1(d.jurisdiction) + x1.bandwidth() / 2)
      .attr("y", d => {
        if (!d.value) return innerHeight;
        const rawY = y(d.value);
        // Put label above bar, but never higher than 12px from top of plot
        return Math.max(rawY - 18, 12);
      })
      .attr("fill", "#0f172a")
      .attr("font-size", 11)
      .style("letter-spacing", "0.03em")
      .text(d => {
        if (!d.value) return ""; // hide true zeros

        if (isAllMode) {
          // Only label tallest bar in each action group in "all" mode
          if (d.value < maxByAction[d.actionId]) return "";
        }

        return d3.format(",")(d.value);
      });

    // 6. Hover interaction with clear highlight
    bars
      .on("mouseenter", function (event, d) {
        const geom = getBarGeom(d.value);

        d3.select(this)
          .raise()
          .transition().duration(120)
          .attr("y", geom.y - 4)
          .attr("height", geom.h + 4)
          .attr("stroke", "#0f172a")
          .attr("stroke-width", 1.5);

        tooltip
          .style("opacity", 1)
          .html(`
            <div style="font-size:14px; font-weight:600; margin-bottom:4px;">
              ${d.jurisdiction} – ${d.actionLabel}
            </div>
            <div style="color:#1d4ed8; font-weight:600;">
              ${d.value.toLocaleString()} enforcement actions (2008–2024 total)
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
        const geom = getBarGeom(d.value);

        d3.select(this)
          .transition().duration(120)
          .attr("y", geom.y)
          .attr("height", geom.h)
          .attr("stroke", "none");

        tooltip.style("opacity", 0);
      });

    // 7. Legend for shown jurisdictions
    const legend = g.append("g")
      .attr("class", "simple-legend")
      .attr("transform", `translate(0, -15)`);

    const legendItems = legend.selectAll(".legend-item")
      .data(jurisList)
      .enter()
      .append("g")
      .attr("class", "legend-item")
      .attr("transform", (d, i) => `translate(${i * 90}, 0)`);

    legendItems.append("rect")
      .attr("width", 12)
      .attr("height", 12)
      .attr("rx", 3)
      .attr("ry", 3)
      .attr("fill", d => colorScale(d));

    legendItems.append("text")
      .attr("x", 18)
      .attr("y", 10)
      .attr("fill", "#0f172a")
      .attr("font-size", 12)
      .text(d => d);

    // 8. Axis labels
    g.append("text")
      .attr("x", innerWidth / 2)
      .attr("y", innerHeight + 50)
      .attr("text-anchor", "middle")
      .attr("fill", "#0f172a")
      .attr("font-size", 12)
      .text("Enforcement action type");

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
