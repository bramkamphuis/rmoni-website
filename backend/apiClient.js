/**
 * apiClient.js — Reusable helper to call the Rmoni API.
 *
 * Every route uses this instead of duplicating fetch logic.
 * It automatically adds the Bearer token and base URL from your .env file.
 *
 * The Rmoni API uses flat endpoint names like /GetNetworks, /GetSensorsForDevice
 * (not REST-style paths like /api/networks).
 * Query parameters can be passed as an object: apiClient("/GetNetworks", { unitId: 1 })
 */

async function apiClient(path, params = {}) {
  const baseUrl = process.env.RMONI_API_BASE_URL;
  const token = process.env.RMONI_API_TOKEN;

  if (!baseUrl || !token) {
    throw new Error(
      "Missing RMONI_API_BASE_URL or RMONI_API_TOKEN in your .env file. " +
        "Copy .env.example to .env and fill in your values."
    );
  }

  // Build the full URL with query parameters
  const url = new URL(path, baseUrl);
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null) {
      url.searchParams.set(key, value);
    }
  }

  const response = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`API request failed (${response.status}): ${text}`);
  }

  return response.json();
}

module.exports = apiClient;
