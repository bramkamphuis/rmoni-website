const express = require("express");
const apiClient = require("../apiClient");
const router = express.Router();

// GET /api/networks — Fetch the list of networks from the Rmoni API
// Calls: /GetNetworks on the Rmoni API
router.get("/", async (req, res) => {
  try {
    const data = await apiClient("/GetNetworks");
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
