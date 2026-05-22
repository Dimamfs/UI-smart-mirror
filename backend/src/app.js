const express = require("express");
const cors = require("cors");
const path = require("path");

const authRoutes = require("./routes/auth");
const householdRoutes = require("./routes/households");
const profileRoutes = require("./routes/profiles");
const gmailRoutes = require("./routes/gmail");
const spotifyRoutes = require("./routes/spotify");
const mirrorsRoutes = require("./routes/mirrors");
const aiSettingsRoutes = require("./routes/ai_settings");
const { getByMirrorId } = require("./controllers/profileController");

const app = express();

// Open CORS for development — allows:
//   - Mirror UI on the same machine (localhost:3001)
//   - Mirror UI served from the Pi over the LAN (192.168.x.x:3001)
//   - Flutter web preview (localhost:8080)
// Lock this down to specific origins before any public deployment.
app.use(cors());
app.use(express.json());

// Serve uploaded faces statically at http://127.0.0.1:3000/faces/filename.jpg
app.use("/faces", express.static(path.join(__dirname, "../data/faces")));

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/households", householdRoutes);
app.use("/api/profiles", profileRoutes);
// Gmail OAuth callback — Google calls this directly, no JWT
app.use("/api/gmail", gmailRoutes);
// Spotify OAuth callback — Spotify calls this directly, no JWT
app.use("/api/spotify", spotifyRoutes);

// Public mirror endpoint — no auth, used by the mirror display (profile list)
app.get("/api/mirror/:mirrorId/profiles", getByMirrorId);

// Mirror routes — active user polling, Gmail status, Gmail messages
app.use("/api/mirrors", mirrorsRoutes);

// AI assistant settings (household-scoped, authenticated)
app.use("/api/ai-settings", aiSettingsRoutes);

// Health check — useful for the mirror to verify connectivity
app.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// 404
app.use((req, res) => {
  res.status(404).json({ error: "Not found" });
});

// Central error handler — reads the .status property thrown by services
app.use((err, req, res, next) => {
  const status = err.status || 500;
  if (status === 500) console.error(err);
  res.status(status).json({ error: err.message || "Internal server error" });
});

module.exports = app;
