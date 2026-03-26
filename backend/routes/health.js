const express = require("express");
const router = express.Router();

// GET /health — Quick check to see if the server is running
router.get("/", (req, res) => {
  res.json({ status: "ok" });
});

module.exports = router;
