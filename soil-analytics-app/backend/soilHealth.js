const { THRESHOLDS } = require("./knowledgeBase");

/**
 * Soil-health indicators and their relative weight in the composite score.
 * Each indicator is scored 0-100 based on distance from its "ideal" band,
 * then combined into a single weighted soil-health score.
 */
const INDICATOR_WEIGHTS = {
  nitrogen: 0.2,
  phosphorus: 0.15,
  potassium: 0.15,
  ph: 0.2,
  organicMatter: 0.2,
  moisture: 0.1
};

function scoreBand(value, low, high, idealMid) {
  if (value >= low && value <= high) {
    // Inside the acceptable band - closer to the high end scores higher (more fertile),
    // except we still reward proximity to the ideal midpoint to avoid rewarding extremes.
    const width = Math.max(high - low, 1e-6);
    const distanceFromMid = Math.abs(value - idealMid) / (width / 2);
    return Math.max(70, Math.round(100 - distanceFromMid * 20));
  }
  const width = Math.max(high - low, 1e-6);
  const distance = value < low ? low - value : value - high;
  const penalty = (distance / width) * 100;
  return Math.max(0, Math.round(70 - penalty));
}

function scorePH(ph) {
  // Ideal: 6.5 - 7.5 (neutral). Score decays outside this band.
  if (ph >= 6.5 && ph <= 7.5) return 100;
  if (ph >= 6.0 && ph < 6.5) return 80;
  if (ph > 7.5 && ph <= 8.0) return 80;
  if (ph >= 5.5 && ph < 6.0) return 55;
  if (ph > 8.0 && ph <= 8.5) return 55;
  if (ph >= 5.0 && ph < 5.5) return 30;
  if (ph > 8.5 && ph <= 9.0) return 30;
  return 10;
}

function computeSoilHealth(soil) {
  const indicatorScores = {
    nitrogen: scoreBand(soil.nitrogen, THRESHOLDS.nitrogen.low, THRESHOLDS.nitrogen.high, (THRESHOLDS.nitrogen.low + THRESHOLDS.nitrogen.high) / 2),
    phosphorus: scoreBand(soil.phosphorus, THRESHOLDS.phosphorus.low, THRESHOLDS.phosphorus.high, (THRESHOLDS.phosphorus.low + THRESHOLDS.phosphorus.high) / 2),
    potassium: scoreBand(soil.potassium, THRESHOLDS.potassium.low, THRESHOLDS.potassium.high, (THRESHOLDS.potassium.low + THRESHOLDS.potassium.high) / 2),
    ph: scorePH(soil.ph),
    organicMatter: scoreBand(soil.organicMatter, THRESHOLDS.organicMatter.low, THRESHOLDS.organicMatter.high, (THRESHOLDS.organicMatter.low + THRESHOLDS.organicMatter.high) / 2),
    moisture: scoreBand(soil.moisture, THRESHOLDS.moisture.low, THRESHOLDS.moisture.high, (THRESHOLDS.moisture.low + THRESHOLDS.moisture.high) / 2)
  };

  const overallScore = Math.round(
    Object.keys(INDICATOR_WEIGHTS).reduce((sum, key) => sum + indicatorScores[key] * INDICATOR_WEIGHTS[key], 0)
  );

  let rating, ratingColor;
  if (overallScore >= 85) { rating = "Excellent"; ratingColor = "excellent"; }
  else if (overallScore >= 65) { rating = "Good"; ratingColor = "good"; }
  else if (overallScore >= 45) { rating = "Fair"; ratingColor = "fair"; }
  else { rating = "Poor"; ratingColor = "poor"; }

  return { overallScore, rating, ratingColor, indicatorScores };
}

module.exports = { computeSoilHealth };
