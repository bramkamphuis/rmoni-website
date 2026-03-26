const express = require("express");
const apiClient = require("../apiClient");
const router = express.Router();

// GET /api/networks — Returns all networks for your account
// Calls: /GetNetworksForLoginAccount on the Rmoni API
router.get("/", async (req, res) => {
  try {
    const data = await apiClient("/GetNetworksForLoginAccount");
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
