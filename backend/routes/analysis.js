const express = require("express");
const apiClient = require("../apiClient");
const { analyzeAlarms } = require("../analysis/alarmAnalysis");
const router = express.Router();

/**
 * GET /api/analysis/alarms
 *
 * Fetches alarms from the Rmoni API for a given date range and returns
 * a full structured analysis grouped by sensor type.
 *
 * Query params:
 *   from  — start date (default: 2026-01-01)
 *   to    — end date   (default: today)
 *
 * Example:
 *   GET /api/analysis/alarms?from=2026-01-01&to=2026-03-27
 */
router.get("/alarms", async (req, res) => {
  try {
    const from = req.query.from || "2026-01-01";
    const to = req.query.to || new Date().toISOString().slice(0, 10);

    const raw = await apiClient("/alarms", { dateFrom: from, dateTo: to });

    // The Rmoni API may return the array directly or wrap it in a property.
    // Support both: raw array or { data: [...] } / { alarms: [...] }
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

    const report = analyzeAlarms(alarms);
    report.meta = { from, to, fetchedAt: new Date().toISOString() };

    res.json(report);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
