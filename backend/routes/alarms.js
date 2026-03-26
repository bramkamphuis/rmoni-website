const express = require("express");
const apiClient = require("../apiClient");
const router = express.Router();

// GET /api/alarms — Fetch alarms from the Rmoni API
// Calls: /GetAlarms on the Rmoni API
router.get("/", async (req, res) => {
  try {
    const data = await apiClient("/GetAlarms");
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
