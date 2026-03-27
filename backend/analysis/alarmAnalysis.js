/**
 * alarmAnalysis.js — Core alarm analysis logic for McDonald's sensor data.
 *
 * Accepts a raw array of alarm objects (each with networkAlias, sensorAlias,
 * alarmTimeStamp, alarmValue, alarmMessage) and returns a structured report
 * grouping patterns by sensor type across all locations.
 */

// ─── Helpers ────────────────────────────────────────────────────────────────

function hourOfDay(timestamp) {
  const d = new Date(timestamp);
  return isNaN(d) ? null : d.getUTCHours();
}

function toDateString(timestamp) {
  const d = new Date(timestamp);
  return isNaN(d) ? null : d.toISOString().slice(0, 10);
}

function timeSlot(hour) {
  if (hour === null) return "unknown";
  if (hour >= 6 && hour < 12) return "morning";
  if (hour >= 12 && hour < 17) return "afternoon";
  if (hour >= 17 && hour < 22) return "evening";
  return "night";
}

// ─── Main export ─────────────────────────────────────────────────────────────

/**
 * @param {Array<{networkAlias:string, sensorAlias:string, alarmTimeStamp:string, alarmValue:*, alarmMessage:string}>} alarms
 * @returns {object} Structured analysis report
 */
function analyzeAlarms(alarms) {
  if (!Array.isArray(alarms) || alarms.length === 0) {
    return { summary: { totalAlarms: 0, sensorTypes: 0, locations: 0 }, sensors: [], insights: [] };
  }

  // ── 1. Group alarms by sensorAlias ─────────────────────────────────────
  const bySensor = {};

  for (const alarm of alarms) {
    const sensor = alarm.sensorAlias || "Unknown";
    if (!bySensor[sensor]) {
      bySensor[sensor] = {
        sensorAlias: sensor,
        alarms: [],
        locations: new Set(),
        hourCounts: Array(24).fill(0),
        slotCounts: { morning: 0, afternoon: 0, evening: 0, night: 0, unknown: 0 },
        // location → day → count  (for recurring detection)
        locationDayMap: {},
        messages: {},
      };
    }

    const entry = bySensor[sensor];
    entry.alarms.push(alarm);
    entry.locations.add(alarm.networkAlias || "Unknown");

    const hour = hourOfDay(alarm.alarmTimeStamp);
    if (hour !== null) {
      entry.hourCounts[hour]++;
      entry.slotCounts[timeSlot(hour)]++;
    } else {
      entry.slotCounts.unknown++;
    }

    // Recurring detection: track (location, date) pairs
    const loc = alarm.networkAlias || "Unknown";
    const day = toDateString(alarm.alarmTimeStamp) || "unknown";
    if (!entry.locationDayMap[loc]) entry.locationDayMap[loc] = {};
    entry.locationDayMap[loc][day] = (entry.locationDayMap[loc][day] || 0) + 1;

    // Message frequency
    const msg = alarm.alarmMessage || "No message";
    entry.messages[msg] = (entry.messages[msg] || 0) + 1;
  }

  // ── 2. Build per-sensor stats ───────────────────────────────────────────
  const sensorStats = Object.values(bySensor).map((entry) => {
    const totalAlarms = entry.alarms.length;
    const locationCount = entry.locations.size;
    const locationList = [...entry.locations];

    // Peak hour
    const peakHour = entry.hourCounts.indexOf(Math.max(...entry.hourCounts));
    const dominantSlot = Object.entries(entry.slotCounts)
      .filter(([k]) => k !== "unknown")
      .sort((a, b) => b[1] - a[1])[0][0];

    // Recurring: locations with more than one alarm per day on average
    const recurringLocations = [];
    for (const [loc, days] of Object.entries(entry.locationDayMap)) {
      const dayCounts = Object.values(days);
      const totalForLoc = dayCounts.reduce((s, n) => s + n, 0);
      const daysActive = dayCounts.length;
      const avgPerDay = totalForLoc / daysActive;
      const maxOnOneDay = Math.max(...dayCounts);
      if (daysActive >= 3 || maxOnOneDay >= 3) {
        recurringLocations.push({ location: loc, daysActive, totalAlarms: totalForLoc, avgPerDay: +avgPerDay.toFixed(2), maxOnOneDay });
      }
    }
    recurringLocations.sort((a, b) => b.totalAlarms - a.totalAlarms);

    // Top messages
    const topMessages = Object.entries(entry.messages)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([message, count]) => ({ message, count }));

    // Structural vs incidental classification
    const isStructural = locationCount >= 3 && totalAlarms >= 10;
    const pattern = isStructural ? "structural" : "incidental";

    // Spread score: how many locations vs total alarms (higher = spread across many sites)
    const spreadScore = locationCount > 0 ? +(totalAlarms / locationCount).toFixed(1) : 0;

    return {
      sensorAlias: entry.sensorAlias,
      totalAlarms,
      locationCount,
      locations: locationList,
      peakHour,
      dominantTimeSlot: dominantSlot,
      timeDistribution: entry.slotCounts,
      hourlyDistribution: entry.hourCounts,
      recurringLocations,
      topMessages,
      pattern,
      avgAlarmsPerLocation: spreadScore,
    };
  });

  // ── 3. Rank sensors ────────────────────────────────────────────────────
  sensorStats.sort((a, b) => b.totalAlarms - a.totalAlarms);
  sensorStats.forEach((s, i) => { s.rank = i + 1; });

  // ── 4. Cross-location ranking (sensors affecting the most sites) ────────
  const crossLocationRanking = [...sensorStats]
    .sort((a, b) => b.locationCount - a.locationCount || b.totalAlarms - a.totalAlarms)
    .map((s) => ({ sensorAlias: s.sensorAlias, locationCount: s.locationCount, totalAlarms: s.totalAlarms }));

  // ── 5. Time-of-day insights ────────────────────────────────────────────
  const timePatterns = sensorStats
    .filter((s) => {
      const counts = Object.entries(s.timeDistribution).filter(([k]) => k !== "unknown");
      const total = counts.reduce((sum, [, v]) => sum + v, 0);
      if (total === 0) return false;
      const maxCount = Math.max(...counts.map(([, v]) => v));
      // Flag if >50% of alarms concentrate in one slot
      return maxCount / total > 0.5;
    })
    .map((s) => ({
      sensorAlias: s.sensorAlias,
      concentratedIn: s.dominantTimeSlot,
      peakHour: s.peakHour,
      distribution: s.timeDistribution,
    }));

  // ── 6. Generate actionable insights ────────────────────────────────────
  const insights = generateInsights(sensorStats, crossLocationRanking);

  // ── 7. Summary ─────────────────────────────────────────────────────────
  const allLocations = new Set(alarms.map((a) => a.networkAlias));
  const summary = {
    totalAlarms: alarms.length,
    sensorTypes: sensorStats.length,
    locations: allLocations.size,
    dateRange: {
      earliest: alarms.map((a) => a.alarmTimeStamp).sort()[0] || null,
      latest: alarms.map((a) => a.alarmTimeStamp).sort().at(-1) || null,
    },
    topSensor: sensorStats[0]?.sensorAlias || null,
    structuralIssues: sensorStats.filter((s) => s.pattern === "structural").length,
    incidentalIssues: sensorStats.filter((s) => s.pattern === "incidental").length,
  };

  return {
    summary,
    sensors: sensorStats,
    crossLocationRanking,
    timePatterns,
    insights,
  };
}

// ─── Insight generator ────────────────────────────────────────────────────────

function generateInsights(sensorStats, crossLocationRanking) {
  const insights = [];

  // Top 3 sensors by volume
  const top3 = sensorStats.slice(0, 3);
  for (const s of top3) {
    insights.push({
      type: "high_volume",
      sensorAlias: s.sensorAlias,
      message: `"${s.sensorAlias}" generated ${s.totalAlarms} alarms across ${s.locationCount} location(s) — highest alarm volume.`,
      recommendation: s.pattern === "structural"
        ? "Systemic issue. Inspect all units of this type; consider firmware/calibration standardisation."
        : "Isolated incidents. Investigate specific failing units; check age and maintenance records.",
    });
  }

  // Sensors with highest location spread (potential systemic issues)
  const widespreadSensors = crossLocationRanking.filter((s) => s.locationCount >= 3).slice(0, 5);
  for (const s of widespreadSensors) {
    const stat = sensorStats.find((x) => x.sensorAlias === s.sensorAlias);
    if (!stat) continue;
    insights.push({
      type: "cross_location",
      sensorAlias: s.sensorAlias,
      message: `"${s.sensorAlias}" failed at ${s.locationCount} locations — likely a systemic or brand-level issue, not site-specific.`,
      recommendation: "Escalate to equipment supplier. Possible manufacturing defect, incorrect set-points, or inadequate maintenance protocol.",
    });
  }

  // Sensors with strong recurring failures
  const recurringIssues = sensorStats.filter((s) => s.recurringLocations.length > 0);
  for (const s of recurringIssues) {
    const worst = s.recurringLocations[0];
    insights.push({
      type: "recurring_failure",
      sensorAlias: s.sensorAlias,
      message: `"${s.sensorAlias}" at "${worst.location}" shows recurring alarms: ${worst.totalAlarms} alarms over ${worst.daysActive} days (avg ${worst.avgPerDay}/day).`,
      recommendation: "Schedule a dedicated inspection at this location. Recurring daily alarms suggest an unresolved root cause: door seals, ambient temperature, refrigerant levels, or blocked airflow.",
    });
  }

  // Sensors concentrated at night/early morning (risk of undetected issues)
  const nightSensors = sensorStats.filter(
    (s) => s.dominantTimeSlot === "night" && s.totalAlarms >= 5
  );
  for (const s of nightSensors.slice(0, 3)) {
    insights.push({
      type: "time_pattern",
      sensorAlias: s.sensorAlias,
      message: `"${s.sensorAlias}" alarms cluster at night (peak hour: ${s.peakHour}:00). Equipment may be recovering after closing or failing overnight when staff are absent.`,
      recommendation: "Check defrost cycles, overnight temperature recovery, and whether door-open alarms correlate with closing time. Consider automated alerts to on-call staff.",
    });
  }

  // Sensors hitting one location very hard (single-site crisis)
  const singleSiteHeavy = sensorStats.filter(
    (s) => s.locationCount === 1 && s.totalAlarms >= 10
  );
  for (const s of singleSiteHeavy.slice(0, 3)) {
    insights.push({
      type: "single_site_crisis",
      sensorAlias: s.sensorAlias,
      message: `"${s.sensorAlias}" generated ${s.totalAlarms} alarms but only at 1 location — that unit is in chronic failure.`,
      recommendation: "Prioritise on-site service visit. If this unit has been repaired before, consider full replacement.",
    });
  }

  return insights;
}

module.exports = { analyzeAlarms };
