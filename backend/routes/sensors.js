const express = require("express");
const apiClient = require("../apiClient");
const router = express.Router();

// GET /api/sensors — Fetch sensors for a specific device from the Rmoni API
// Calls: /GetSensorsForDevice on the Rmoni API
//
// Query parameters (pass through from your request):
//   ?unitId=123          — The unit/account ID
//   ?mac=AA:BB:CC:DD     — The MAC address of the device
//   ?limitSensors=50     — Max number of sensors to return (optional)
router.get("/", async (req, res) => {
  try {
    const { unitId, mac, limitSensors } = req.query;
    const data = await apiClient("/GetSensorsForDevice", {
      unitId,
      mac,
      limitSensors,
    });
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
