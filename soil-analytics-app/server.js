const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const { generateRecommendations } = require("./backend/recommendationEngine");
const { rankCrops } = require("./backend/cropSuitability");
const { computeSoilHealth } = require("./backend/soilHealth");

const app = express();
const PORT = process.env.PORT || 3000;

const DB_PATH = path.join(__dirname, "data", "db.json");
const UPLOADS_DIR = path.join(__dirname, "uploads");

if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });
if (!fs.existsSync(DB_PATH)) fs.writeFileSync(DB_PATH, JSON.stringify({ history: [] }, null, 2));

// ---------- middleware ----------
app.use(express.json({ limit: "2mb" }));
app.use(express.static(path.join(__dirname, "public")));
app.use("/uploads", express.static(UPLOADS_DIR));

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOADS_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname || "").toLowerCase() || ".jpg";
    cb(null, `soil_${Date.now()}${ext}`);
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 8 * 1024 * 1024 }, // 8 MB
  fileFilter: (req, file, cb) => {
    const allowed = [".jpg", ".jpeg", ".png", ".webp"];
    const ext = path.extname(file.originalname || "").toLowerCase();
    if (!allowed.includes(ext)) return cb(new Error("Only JPG, PNG or WEBP images are allowed"));
    cb(null, true);
  }
});

// ---------- helpers ----------
function readDB() {
  try {
    return JSON.parse(fs.readFileSync(DB_PATH, "utf-8"));
  } catch (e) {
    return { history: [] };
  }
}
function writeDB(db) {
  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
}

function parseSoilInput(body) {
  const num = (v, fallback) => {
    const n = parseFloat(v);
    return Number.isFinite(n) ? n : fallback;
  };
  return {
    nitrogen: num(body.nitrogen, 0),
    phosphorus: num(body.phosphorus, 0),
    potassium: num(body.potassium, 0),
    ph: num(body.ph, 7),
    organicMatter: num(body.organicMatter, 0),
    moisture: num(body.moisture, 0)
  };
}

function validateSoil(soil) {
  const errors = [];
  if (soil.nitrogen < 0 || soil.nitrogen > 2000) errors.push("Nitrogen must be between 0 and 2000 kg/ha");
  if (soil.phosphorus < 0 || soil.phosphorus > 500) errors.push("Phosphorus must be between 0 and 500 kg/ha");
  if (soil.potassium < 0 || soil.potassium > 1000) errors.push("Potassium must be between 0 and 1000 kg/ha");
  if (soil.ph < 0 || soil.ph > 14) errors.push("pH must be between 0 and 14");
  if (soil.organicMatter < 0 || soil.organicMatter > 20) errors.push("Organic matter must be between 0 and 20%");
  if (soil.moisture < 0 || soil.moisture > 100) errors.push("Moisture must be between 0 and 100%");
  return errors;
}

/** Very lightweight heuristic image analysis (demo-grade, no ML model). */
function analyzeImageHeuristic(filePath) {
  try {
    const stats = fs.statSync(filePath);
    return {
      note: "Basic image quality check only. Nutrient values above come from your manual soil-test entry.",
      fileSizeKB: Math.round(stats.size / 1024)
    };
  } catch (e) {
    return { note: "Image received." };
  }
}

// ---------- routes ----------
app.post("/api/analyze", upload.single("soilImage"), (req, res) => {
  try {
    const soil = parseSoilInput(req.body);
    const errors = validateSoil(soil);
    if (errors.length) return res.status(400).json({ success: false, errors });

    const recommendations = generateRecommendations(soil);
    const soilHealth = computeSoilHealth(soil);
    const crops = rankCrops(soil);

    let imageInfo = null;
    if (req.file) {
      imageInfo = {
        url: `/uploads/${req.file.filename}`,
        ...analyzeImageHeuristic(req.file.path)
      };
    }

    const result = {
      id: `analysis_${Date.now()}`,
      timestamp: new Date().toISOString(),
      input: soil,
      soilHealth,
      recommendations,
      crops: {
        top: crops.slice(0, 5),
        all: crops
      },
      image: imageInfo
    };

    res.json({ success: true, result });
  } catch (err) {
    res.status(500).json({ success: false, errors: [err.message || "Analysis failed"] });
  }
});

app.get("/api/history", (req, res) => {
  const db = readDB();
  res.json({ success: true, history: db.history.slice().reverse() });
});

app.post("/api/history", (req, res) => {
  const db = readDB();
  const record = req.body;
  if (!record || !record.id) return res.status(400).json({ success: false, errors: ["Missing analysis record"] });
  db.history.push(record);
  if (db.history.length > 200) db.history = db.history.slice(-200); // cap stored history
  writeDB(db);
  res.json({ success: true });
});

app.delete("/api/history/:id", (req, res) => {
  const db = readDB();
  db.history = db.history.filter(h => h.id !== req.params.id);
  writeDB(db);
  res.json({ success: true });
});

app.delete("/api/history", (req, res) => {
  writeDB({ history: [] });
  res.json({ success: true });
});

// Fallback to index.html for any unknown route (single-page app)
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(PORT, () => {
  console.log(`\n  AI Soil Analytics server running`);
  console.log(`  Local:  http://localhost:${PORT}\n`);
});
