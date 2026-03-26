# RmoniWeb API Backend

A simple Express.js backend that connects to the Rmoni API. Built as a beginner-friendly prototype for API analysis.

## What's in here?

```
backend/
  server.js          — The main file. Starts the Express server and loads all routes.
  apiClient.js       — A reusable helper that calls the Rmoni API with your token.
  .env.example       — Template for your secret environment variables.
  .gitignore         — Keeps node_modules/ and .env out of git.
  package.json       — Lists the project name and dependencies (express, dotenv).
  routes/
    health.js        — GET /health         → Returns { "status": "ok" } (server check)
    networks.js      — GET /api/networks   → Calls /GetNetworks on the Rmoni API
    sensors.js       — GET /api/sensors    → Calls /GetSensorsForDevice on the Rmoni API
    alarms.js        — GET /api/alarms     → Calls /GetAlarms on the Rmoni API
```

## Getting started

### 1. Install Node.js

If you don't have Node.js yet, download it from [nodejs.org](https://nodejs.org) (pick the LTS version).

### 2. Install dependencies

Open a terminal, navigate to the `backend/` folder, and run:

```bash
cd backend
npm install
```

This downloads Express and dotenv into a `node_modules/` folder.

### 3. Set up your environment variables

Copy the example file and fill in your real values:

```bash
cp .env.example .env
```

Then open `.env` in a text editor and replace the placeholder values:

```
RMONI_API_BASE_URL=https://your-real-api-url.com
RMONI_API_TOKEN=your-real-token
```

> **Important:** Never commit your `.env` file — it contains secrets. The `.gitignore` file already prevents this.

### 4. Start the server

```bash
npm start
```

You should see:

```
Server running at http://localhost:3000
Try: http://localhost:3000/health
```

### 5. Test the endpoints

Open your browser or use `curl`:

```bash
curl http://localhost:3000/health
curl http://localhost:3000/api/networks
curl "http://localhost:3000/api/sensors?unitId=123&mac=AA:BB:CC:DD"
curl http://localhost:3000/api/alarms
```

> **Note:** The `/api/sensors` endpoint requires `unitId` and `mac` query parameters
> because the Rmoni API fetches sensors per device (`/GetSensorsForDevice`).

## How it works

1. `server.js` loads your `.env` file so the API URL and token are available.
2. Each route file in `routes/` handles one endpoint.
3. When you hit an endpoint (e.g. `/api/networks`), the route calls `apiClient.js`.
4. `apiClient.js` makes a `fetch` request to the Rmoni API with your Bearer token.
5. The response is returned to you as JSON.

### Endpoint mapping

| Your server           | Rmoni API endpoint         |
|-----------------------|----------------------------|
| `GET /health`         | _(local check, no API call)_ |
| `GET /api/networks`   | `GET /GetNetworks`         |
| `GET /api/sensors`    | `GET /GetSensorsForDevice` |
| `GET /api/alarms`     | `GET /GetAlarms`           |

## Development mode

Use `npm run dev` instead of `npm start` — it auto-restarts the server when you edit files (requires Node.js 18+).
