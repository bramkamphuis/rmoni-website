#!/usr/bin/env node
/**
 * analyzeAlarms.js — Standalone CLI script for McDonald's alarm analysis.
 *
 * Fetches alarm data from the Rmoni API and prints a structured analysis
 * report directly to the terminal.
 *
 * Usage:
 *   node scripts/analyzeAlarms.js
 *   node scripts/analyzeAlarms.js --from 2026-01-01 --to 2026-03-27
 *   node scripts/analyzeAlarms.js --json        (output raw JSON)
 *   node scripts/analyzeAlarms.js --top 10      (show top N sensor types)
 *
 * Requires .env with RMONI_API_BASE_URL and RMONI_API_TOKEN.
 */

require("dotenv").config({ path: require("path").resolve(__dirname, "../.env") });

const apiClient = require("../apiClient");
const { analyzeAlarms } = require("../analysis/alarmAnalysis");

// ─── CLI args ────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const getArg = (flag, fallback) => {
  const i = args.indexOf(flag);
  return i !== -1 && args[i + 1] ? args[i + 1] : fallback;
};
const hasFlag = (flag) => args.includes(flag);

const FROM = getArg("--from", "2026-01-01");
const TO = getArg("--to", new Date().toISOString().slice(0, 10));
const TOP_N = parseInt(getArg("--top", "20"), 10);
const JSON_OUTPUT = hasFlag("--json");

// ─── Formatting helpers ──────────────────────────────────────────────────────

const BOLD = (s) => `\x1b[1m${s}\x1b[0m`;
const DIM = (s) => `\x1b[2m${s}\x1b[0m`;
const RED = (s) => `\x1b[31m${s}\x1b[0m`;
const YELLOW = (s) => `\x1b[33m${s}\x1b[0m`;
const GREEN = (s) => `\x1b[32m${s}\x1b[0m`;
const CYAN = (s) => `\x1b[36m${s}\x1b[0m`;

function bar(count, max, width = 30) {
  const filled = Math.round((count / max) * width);
  return "█".repeat(filled) + "░".repeat(width - filled);
}

function printSection(title) {
  console.log("\n" + BOLD("═".repeat(70)));
  console.log(BOLD(`  ${title}`));
  console.log(BOLD("═".repeat(70)));
}

function printSeparator() {
  console.log(DIM("─".repeat(70)));
}

function formatTimeDistribution(dist) {
  const slots = ["morning", "afternoon", "evening", "night"];
  const total = slots.reduce((s, k) => s + (dist[k] || 0), 0);
  if (total === 0) return "  (no time data)";
  return slots
    .map((slot) => {
      const count = dist[slot] || 0;
      const pct = total > 0 ? Math.round((count / total) * 100) : 0;
      const label = slot.padEnd(11);
      return `    ${label} ${String(count).padStart(4)} alarms  ${bar(count, total, 20)} ${pct}%`;
    })
    .join("\n");
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  console.log(BOLD("\n🔔  McDonald's Alarm Analysis — RmoniWeb API"));
  console.log(DIM(`  Date range : ${FROM} → ${TO}`));
  console.log(DIM(`  Fetching alarm data...`));

  let raw;
  try {
    raw = await apiClient("/alarms", { dateFrom: FROM, dateTo: TO });
  } catch (err) {
    console.error(RED(`\nFailed to fetch alarms: ${err.message}`));
    process.exit(1);
  }

  // Normalise response shape
  let alarms;
  if (Array.isArray(raw)) {
    alarms = raw;
  } else if (Array.isArray(raw?.data)) {
    alarms = raw.data;
  } else if (Array.isArray(raw?.alarms)) {
    alarms = raw.alarms;
  } else {
    alarms = [];
  }

  console.log(DIM(`  Fetched     : ${alarms.length} alarms`));

  const report = analyzeAlarms(alarms);

  if (JSON_OUTPUT) {
    console.log(JSON.stringify(report, null, 2));
    return;
  }

  const { summary, sensors, crossLocationRanking, timePatterns, insights } = report;

  // ── Summary ──────────────────────────────────────────────────────────────
  printSection("SUMMARY");
  console.log(`  Total alarms    : ${BOLD(summary.totalAlarms)}`);
  console.log(`  Sensor types    : ${BOLD(summary.sensorTypes)}`);
  console.log(`  Locations       : ${BOLD(summary.locations)}`);
  console.log(`  Date range      : ${summary.dateRange.earliest} → ${summary.dateRange.latest}`);
  console.log(`  Top sensor      : ${BOLD(YELLOW(summary.topSensor || "—"))}`);
  console.log(`  Structural issues  : ${RED(summary.structuralIssues)} sensor types`);
  console.log(`  Incidental issues  : ${GREEN(summary.incidentalIssues)} sensor types`);

  // ── Ranking by alarm volume ───────────────────────────────────────────────
  printSection(`TOP ${Math.min(TOP_N, sensors.length)} SENSOR TYPES BY ALARM VOLUME`);

  const maxAlarms = sensors[0]?.totalAlarms || 1;
  const topSensors = sensors.slice(0, TOP_N);

  for (const s of topSensors) {
    const patternLabel = s.pattern === "structural" ? RED("[STRUCTURAL]") : GREEN("[incidental]");
    console.log(`\n  ${BOLD(`#${s.rank}`)} ${BOLD(s.sensorAlias)}`);
    console.log(`     ${bar(s.totalAlarms, maxAlarms, 35)} ${BOLD(s.totalAlarms)} alarms`);
    console.log(`     Locations : ${s.locationCount} site(s)  |  Avg/site: ${s.avgAlarmsPerLocation}  |  ${patternLabel}`);
    console.log(`     Peak time : ${s.dominantTimeSlot} (peak hour ${s.peakHour}:00)`);
    if (s.recurringLocations.length > 0) {
      const r = s.recurringLocations[0];
      console.log(`     Recurring : ${YELLOW(r.location)} — ${r.totalAlarms} alarms over ${r.daysActive} days`);
    }
    if (s.topMessages.length > 0) {
      console.log(`     Top msg   : "${DIM(s.topMessages[0].message)}" (${s.topMessages[0].count}×)`);
    }
    printSeparator();
  }

  // ── Cross-location ranking ────────────────────────────────────────────────
  printSection("SENSORS AFFECTING MOST LOCATIONS (Cross-site risk)");
  const topCross = crossLocationRanking.slice(0, 10);
  for (const s of topCross) {
    const locs = String(s.locationCount).padStart(3);
    console.log(`  ${locs} locations  |  ${String(s.totalAlarms).padStart(5)} alarms  |  ${s.sensorAlias}`);
  }

  // ── Time-of-day patterns ──────────────────────────────────────────────────
  if (timePatterns.length > 0) {
    printSection("TIME-OF-DAY PATTERNS (sensors concentrated in one slot)");
    for (const tp of timePatterns) {
      console.log(`\n  ${BOLD(tp.sensorAlias)} — concentrated in: ${CYAN(tp.concentratedIn.toUpperCase())} (peak hour ${tp.peakHour}:00)`);
      console.log(formatTimeDistribution(tp.distribution));
    }
  }

  // ── Insights & recommendations ────────────────────────────────────────────
  printSection("INSIGHTS & RECOMMENDATIONS");
  const typeOrder = ["cross_location", "high_volume", "recurring_failure", "time_pattern", "single_site_crisis"];
  const sortedInsights = [...insights].sort(
    (a, b) => typeOrder.indexOf(a.type) - typeOrder.indexOf(b.type)
  );

  for (const insight of sortedInsights) {
    const icon = {
      high_volume: "📊",
      cross_location: "🌐",
      recurring_failure: "🔁",
      time_pattern: "🕐",
      single_site_crisis: "🚨",
    }[insight.type] || "•";

    console.log(`\n  ${icon}  ${BOLD(insight.sensorAlias)}  ${DIM(`[${insight.type}]`)}`);
    console.log(`     ${insight.message}`);
    console.log(`     ${CYAN("→")} ${insight.recommendation}`);
    printSeparator();
  }

  console.log("\n" + DIM(`  Analysis complete. ${alarms.length} alarms processed across ${summary.sensorTypes} sensor types.\n`));
}

main().catch((err) => {
  console.error(RED(`Unexpected error: ${err.message}`));
  process.exit(1);
});
