const express = require("express");
const apiClient = require("../apiClient");
const router = express.Router();

// GET /api/alarms — Returns all alarms for a network
// Calls: /GetAlarmEventsForNetWork on the Rmoni API
//
// Query parameters (pass through from your request):
//   ?networkId=123       — The network ID (get this from /api/networks first)
//   ?from=2024-01-01     — Start date (optional)
//   ?till=2024-12-31     — End date (optional)
router.get("/", async (req, res) => {
  try {
    const { networkId, from, till } = req.query;
    const data = await apiClient("/GetAlarmEventsForNetWork", {
      networkId,
      from,
      till,
    });
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
