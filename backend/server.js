// backend/server.js
import express from "express";
import cors from "cors";
import multer from "multer";

const app = express();
const upload = multer({ dest: "uploads/" });

app.use(cors());
app.use(express.json());

const drops = {}; // { ip: lastDropTime }

// Route for image drops
app.post("/api/drop", upload.single("image"), (req, res) => {
  const ip = req.ip;
  const now = Date.now();

  if (drops[ip] && now - drops[ip] < 10000) {
    return res.status(429).json({ error: "Cooldown, wait before dropping again." });
  }

  if (!req.file) {
    return res.status(400).json({ error: "No file uploaded" });
  }

  console.log("📸 Image dropped:", {
    filename: req.file.filename,
    coords: { x: req.body.x, y: req.body.y }
  });

  drops[ip] = now;
  res.json({ success: true });
});

app.listen(4000, () => {
  console.log("🚀 Backend running on http://localhost:4000");
});
