// Load environment variables from .env BEFORE anything else
require("dotenv").config();

const express = require("express");
const app = express();

// --- Routes ---
app.use("/health", require("./routes/health"));
app.use("/api/networks", require("./routes/networks"));
app.use("/api/sensors", require("./routes/sensors"));
app.use("/api/alarms", require("./routes/alarms"));

// --- Start the server ---
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
  console.log(`Try: http://localhost:${PORT}/health`);
});
