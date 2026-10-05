const { THRESHOLDS, RECOMMENDATIONS, classifyLevel, classifyPH } = require("./knowledgeBase");

/**
 * @param {Object} soil - { nitrogen, phosphorus, potassium, ph, organicMatter, moisture }
 * @returns {Object} structured recommendation result
 */
function generateRecommendations(soil) {
  const nitrogenLevel = classifyLevel(soil.nitrogen, THRESHOLDS.nitrogen.low, THRESHOLDS.nitrogen.high);
  const phosphorusLevel = classifyLevel(soil.phosphorus, THRESHOLDS.phosphorus.low, THRESHOLDS.phosphorus.high);
  const potassiumLevel = classifyLevel(soil.potassium, THRESHOLDS.potassium.low, THRESHOLDS.potassium.high);
  const organicMatterLevel = classifyLevel(soil.organicMatter, THRESHOLDS.organicMatter.low, THRESHOLDS.organicMatter.high);
  const moistureLevel = classifyLevel(soil.moisture, THRESHOLDS.moisture.low, THRESHOLDS.moisture.high);
  const phLevel = classifyPH(soil.ph);

  const deficiencies = [
    { parameter: "nitrogen", label: "Nitrogen (N)", value: soil.nitrogen, unit: THRESHOLDS.nitrogen.unit, level: nitrogenLevel, ...RECOMMENDATIONS.nitrogen[nitrogenLevel] },
    { parameter: "phosphorus", label: "Phosphorus (P)", value: soil.phosphorus, unit: THRESHOLDS.phosphorus.unit, level: phosphorusLevel, ...RECOMMENDATIONS.phosphorus[phosphorusLevel] },
    { parameter: "potassium", label: "Potassium (K)", value: soil.potassium, unit: THRESHOLDS.potassium.unit, level: potassiumLevel, ...RECOMMENDATIONS.potassium[potassiumLevel] },
    { parameter: "organicMatter", label: "Organic Matter", value: soil.organicMatter, unit: THRESHOLDS.organicMatter.unit, level: organicMatterLevel, ...RECOMMENDATIONS.organicMatter[organicMatterLevel] },
    { parameter: "ph", label: "Soil pH", value: soil.ph, unit: "", level: phLevel, ...RECOMMENDATIONS.ph[phLevel] },
    { parameter: "moisture", label: "Soil Moisture", value: soil.moisture, unit: THRESHOLDS.moisture.unit, level: moistureLevel, ...RECOMMENDATIONS.moisture[moistureLevel] }
  ];

  const severityOrder = { high: 0, medium: 1, low: 2, none: 3 };
  deficiencies.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

  const fertilizerPlan = deficiencies
    .filter(d => d.fertilizers && d.fertilizers.length && d.severity !== "none")
    .map(d => ({ parameter: d.label, actions: d.fertilizers, application: d.application }));

  const managementPlan = deficiencies
    .filter(d => d.management && d.management.length && d.severity !== "none")
    .map(d => ({ parameter: d.label, actions: d.management }));

  const criticalIssues = deficiencies.filter(d => d.severity === "high").length;
  const moderateIssues = deficiencies.filter(d => d.severity === "medium").length;

  return {
    levels: { nitrogenLevel, phosphorusLevel, potassiumLevel, organicMatterLevel, moistureLevel, phLevel },
    deficiencies,
    fertilizerPlan,
    managementPlan,
    summary: { criticalIssues, moderateIssues, totalParametersChecked: deficiencies.length }
  };
}

module.exports = { generateRecommendations };
