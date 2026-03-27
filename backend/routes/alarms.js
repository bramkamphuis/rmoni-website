const express = require("express");
const apiClient = require("../apiClient");
const router = express.Router();

// GET /api/alarms — Fetch alarms from the Rmoni API
// Query params (all optional):
//   from       — start date, e.g. 2026-01-01  (maps to API param dateFrom)
//   to         — end date,   e.g. 2026-03-27  (maps to API param dateTo)
//   network    — filter by networkAlias
//   sensor     — filter by sensorAlias
router.get("/", async (req, res) => {
  try {
    const { from, to, network, sensor } = req.query;

    const params = {};
    if (from) params.dateFrom = from;
    if (to) params.dateTo = to;
    if (network) params.networkAlias = network;
    if (sensor) params.sensorAlias = sensor;

    const data = await apiClient("/alarms", params);
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
