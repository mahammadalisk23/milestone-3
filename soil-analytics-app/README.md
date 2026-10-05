# AI Soil Analytics

A complete, self-contained web application for farmer-friendly soil analysis:
a rule-based **recommendation engine**, a **crop suitability** ranking module,
a **soil-health scoring** system, and a mobile-first, installable **PWA**
front end with Hindi/Kannada language support, voice output and downloadable
PDF reports.

Everything — backend and frontend — lives in this one folder.

## What's inside

```
soil-analytics-app/
├── server.js                  Express server (API + static file hosting)
├── package.json
├── backend/
│   ├── knowledgeBase.js        Deficiency thresholds & fertilizer/management rules
│   ├── recommendationEngine.js Rule-based recommendation engine
│   ├── cropData.js             Crop-soil compatibility dataset (15 crops)
│   ├── cropSuitability.js      Crop scoring/ranking logic
│   └── soilHealth.js           Soil-health indicator scoring
├── data/
│   └── db.json                  Saved analysis history (auto-created/updated)
├── uploads/                     Uploaded soil photos (auto-created)
└── public/                      Front-end PWA (plain HTML/CSS/JS)
    ├── index.html
    ├── manifest.json            PWA manifest
    ├── service-worker.js        Offline caching
    ├── css/style.css
    ├── js/app.js, js/i18n.js
    ├── locales/en.json, hi.json, kn.json
    └── icons/
```

## Requirements

- [Node.js](https://nodejs.org) v16 or later (includes npm)

## Setup & run (in VS Code)

1. Open this folder in VS Code (`File > Open Folder...`).
2. Open a terminal in VS Code (`` Ctrl+` ``) and install dependencies:

   ```bash
   npm install
   ```

3. Start the server:

   ```bash
   npm start
   ```

4. Open your browser at **http://localhost:3000**

That's it — the same server serves the API and the front end, so there is
nothing else to configure.

## Using the app

1. **New Test** tab — enter Nitrogen, Phosphorus, Potassium (kg/ha), pH,
   Organic Matter (%) and Moisture (%). Optionally attach/capture a soil
   photo. Tap **Analyze My Soil**.
2. **Results** tab — soil health score, per-parameter status, fertilizer
   recommendations, soil-management advice and top suitable crops. You can:
   - Tap **Listen** to hear a spoken summary (uses the browser's built-in
     text-to-speech, in the selected app language where supported).
   - Tap **Download PDF Report** to save a shareable PDF.
   - Tap **Save to History** to keep the analysis for later.
3. **Crops** tab — full ranked list of all 15 crops in the dataset against
   your most recent test.
4. **History** tab — revisit or delete past saved analyses.
5. Use the language dropdown in the header to switch between **English**,
   **हिंदी (Hindi)** and **ಕನ್ನಡ (Kannada)** for the app's interface.

> Note: the agronomic recommendation text itself (fertilizer/management
> wording) is authored in English in this demo's knowledge base; the app
> chrome, labels, and navigation are fully localized.

## Installing as an app (PWA)

Once running, most browsers show an "Install" icon in the address bar (or
use the install button that appears in the app header on supported
browsers/devices). On Android Chrome, use the "Add to Home Screen" option
in the browser menu.

## How the recommendation logic works

- **Deficiency detection** (`backend/knowledgeBase.js`): classifies N, P, K,
  organic matter and moisture as Low/Medium/High against standard Indian
  soil-testing reference ranges, and classifies pH into five bands
  (strongly acidic → strongly alkaline).
- **Recommendation engine** (`backend/recommendationEngine.js`): maps each
  classification to fertilizer choices, management practices and an
  application method, then ranks issues by severity.
- **Crop suitability** (`backend/cropData.js` + `cropSuitability.js`): scores
  each of 15 common crops by how closely your soil's N/P/K/pH/organic
  matter/moisture fall inside that crop's ideal range, producing a 0-100
  suitability score and category.
- **Soil health score** (`backend/soilHealth.js`): a weighted composite
  (0-100) across all six indicators, rated Poor/Fair/Good/Excellent.

This is a decision-support demo built on commonly used agronomic reference
ranges — it is not a substitute for a certified soil-testing laboratory or
your local agricultural extension office.

## Customizing

- **Thresholds & recommendations**: edit `backend/knowledgeBase.js`.
- **Crops / ideal ranges**: edit `backend/cropData.js`.
- **Scoring weights**: edit the `WEIGHTS`/`INDICATOR_WEIGHTS` objects in
  `backend/cropSuitability.js` and `backend/soilHealth.js`.
- **Translations**: edit the JSON files in `public/locales/`. Add a new
  language by adding a `<code>.json` file with the same keys and adding an
  `<option>` to the language selector in `public/index.html`.
- **Styling**: all design tokens (colors, fonts, spacing) are CSS variables
  at the top of `public/css/style.css`.

## Notes on image upload

The soil-photo feature accepts JPG/PNG/WEBP up to 8 MB, previews it in the
browser, and stores it on the server under `/uploads`. This build performs a
basic file-quality check only — it does not run an image-based ML nutrient
model. All nutrient/health analysis comes from the manual test values you
enter, which keeps the recommendation logic transparent and auditable.
