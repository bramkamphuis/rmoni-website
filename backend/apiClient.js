/**
 * apiClient.js — Reusable helper to call the Rmoni API.
 *
 * Every route uses this instead of duplicating fetch logic.
 * It automatically adds the Bearer token and base URL from your .env file.
 */

async function apiClient(path) {
  const baseUrl = process.env.RMONI_API_BASE_URL;
  const token = process.env.RMONI_API_TOKEN;

  if (!baseUrl || !token) {
    throw new Error(
      "Missing RMONI_API_BASE_URL or RMONI_API_TOKEN in your .env file. " +
        "Copy .env.example to .env and fill in your values."
    );
  }

  const url = `${baseUrl}${path}`;

  const response = await fetch(url, {
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
