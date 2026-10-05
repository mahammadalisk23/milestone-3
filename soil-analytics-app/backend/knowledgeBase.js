/**
 * Agricultural Knowledge Base
 * ----------------------------------------------------------------------------
 * Reference thresholds are simplified versions of commonly used Indian soil
 * testing categories (available N/P/K in kg/ha, organic carbon in %, pH scale).
 * These are meant for a decision-support demo, not a substitute for an
 * accredited soil-testing laboratory or local agricultural extension office.
 */

const THRESHOLDS = {
  nitrogen: { low: 280, high: 560, unit: "kg/ha" },       // available N
  phosphorus: { low: 10, high: 25, unit: "kg/ha" },       // available P (Olsen)
  potassium: { low: 110, high: 280, unit: "kg/ha" },      // available K
  organicMatter: { low: 0.5, high: 1.0, unit: "%" },      // organic carbon %
  moisture: { low: 20, high: 40, unit: "%" },             // volumetric moisture
  ph: {
    stronglyAcidic: 5.5,
    moderatelyAcidic: 6.5,
    neutralLow: 6.5,
    neutralHigh: 7.5,
    moderatelyAlkaline: 8.5
  }
};

function classifyLevel(value, low, high) {
  if (value < low) return "low";
  if (value > high) return "high";
  return "medium";
}

function classifyPH(ph) {
  if (ph < THRESHOLDS.ph.stronglyAcidic) return "strongly_acidic";
  if (ph < THRESHOLDS.ph.moderatelyAcidic) return "moderately_acidic";
  if (ph <= THRESHOLDS.ph.neutralHigh) return "neutral";
  if (ph <= THRESHOLDS.ph.moderatelyAlkaline) return "moderately_alkaline";
  return "strongly_alkaline";
}

/** Fertilizer & management recommendation rules keyed by nutrient/condition + level */
const RECOMMENDATIONS = {
  nitrogen: {
    low: {
      title: "Nitrogen deficiency",
      severity: "high",
      fertilizers: [
        "Apply Urea (46% N) in 2-3 split doses instead of one single dose",
        "Use ammonium sulphate on soils that also need sulphur",
        "Incorporate well-decomposed farmyard manure (FYM) at 8-10 tonnes/acre"
      ],
      management: [
        "Grow a leguminous green-manure or intercrop (dhaincha, cowpea) to fix atmospheric nitrogen",
        "Avoid over-irrigation right after top-dressing, it leaches nitrogen away",
        "Apply nitrogen close to the crop's peak growth stage for better uptake"
      ],
      application: "Split total nitrogen dose: 50% at sowing/basal, 25% at tillering/vegetative stage, 25% at flowering/panicle stage."
    },
    medium: {
      title: "Nitrogen - adequate but monitor",
      severity: "low",
      fertilizers: ["Maintain a light maintenance dose of urea or compost as per crop stage"],
      management: ["Continue crop rotation with legumes to sustain nitrogen levels"],
      application: "Apply a single maintenance top-dressing at the vegetative stage."
    },
    high: {
      title: "Nitrogen - excess",
      severity: "medium",
      fertilizers: ["Avoid further nitrogenous fertilizer this season"],
      management: [
        "Excess nitrogen delays maturity and increases pest/lodging risk - balance with adequate potassium",
        "Consider a non-leguminous, nitrogen-hungry crop next season to draw down residual nitrogen"
      ],
      application: "Skip nitrogen top-dressing until the next soil test confirms levels have normalised."
    }
  },
  phosphorus: {
    low: {
      title: "Phosphorus deficiency",
      severity: "high",
      fertilizers: [
        "Apply DAP (Di-ammonium Phosphate) or Single Super Phosphate (SSP) at sowing",
        "On acidic soils, rock phosphate is a slow-release, cost-effective option",
        "Add phosphate-solubilising bacteria (PSB) bio-fertilizer to improve uptake"
      ],
      management: [
        "Band-place phosphorus close to the root zone rather than broadcasting - it is immobile in soil",
        "Correct soil pH first if strongly acidic or alkaline, since it locks up phosphorus"
      ],
      application: "Apply the full phosphorus dose as basal placement at sowing time."
    },
    medium: {
      title: "Phosphorus - adequate",
      severity: "low",
      fertilizers: ["Maintain a light basal dose of SSP/DAP as per crop requirement"],
      management: ["Continue banded placement at sowing for efficient use"],
      application: "Apply full dose as basal at sowing."
    },
    high: {
      title: "Phosphorus - excess",
      severity: "medium",
      fertilizers: ["Skip phosphorus fertilizer application this season"],
      management: ["Excess phosphorus can restrict zinc and iron uptake - watch for micronutrient deficiency symptoms"],
      application: "No additional phosphorus needed until next soil test."
    }
  },
  potassium: {
    low: {
      title: "Potassium deficiency",
      severity: "high",
      fertilizers: [
        "Apply Muriate of Potash (MOP) or Sulphate of Potash (SOP) for chloride-sensitive crops",
        "Wood ash and well-rotted compost also supply potassium in organic systems"
      ],
      management: [
        "Potassium strengthens stems and improves drought and disease resistance - prioritise it before flowering",
        "Split potassium application on sandy soils to reduce leaching losses"
      ],
      application: "Apply 50% as basal dose, remaining 50% at flowering/fruit development stage."
    },
    medium: {
      title: "Potassium - adequate",
      severity: "low",
      fertilizers: ["Maintain a light maintenance dose of MOP/SOP"],
      management: ["Monitor crop for early potassium-deficiency leaf symptoms (scorched leaf margins)"],
      application: "Apply a single basal dose at sowing."
    },
    high: {
      title: "Potassium - excess",
      severity: "medium",
      fertilizers: ["Avoid further potash application this season"],
      management: ["Very high potassium can interfere with magnesium/calcium uptake - watch for deficiency symptoms"],
      application: "Skip potassium fertilizer until next soil test."
    }
  },
  organicMatter: {
    low: {
      title: "Low organic matter",
      severity: "high",
      fertilizers: [
        "Apply farmyard manure (FYM) or compost at 8-10 tonnes/acre before land preparation",
        "Use vermicompost at 2-3 tonnes/acre for a faster nutrient release"
      ],
      management: [
        "Incorporate crop residues back into the soil instead of burning them",
        "Practice green manuring with dhaincha, sunhemp or cowpea",
        "Adopt minimum tillage where feasible to preserve soil structure and microbial life",
        "Introduce a cover crop during fallow periods to protect and build topsoil"
      ],
      application: "Apply organic amendments 2-3 weeks before sowing so they partially decompose."
    },
    medium: {
      title: "Organic matter - moderate",
      severity: "low",
      fertilizers: ["Continue annual FYM/compost application to sustain levels"],
      management: ["Maintain crop residue incorporation and periodic green manuring"],
      application: "Apply a maintenance dose of compost each season."
    },
    high: {
      title: "Organic matter - good",
      severity: "none",
      fertilizers: ["No additional organic amendment required"],
      management: ["Maintain current residue-management and composting practices"],
      application: "Continue current practice."
    }
  },
  ph: {
    strongly_acidic: {
      title: "Strongly acidic soil (pH < 5.5)",
      severity: "high",
      fertilizers: ["Apply agricultural lime (calcium carbonate) to raise pH", "Dolomite lime also supplies magnesium alongside liming"],
      management: ["Avoid ammonium-based fertilizers which further acidify soil", "Grow acid-tolerant crops (tea, potato) until pH is corrected"],
      application: "Broadcast lime and mix into the top 15 cm of soil, 3-4 weeks before sowing."
    },
    moderately_acidic: {
      title: "Moderately acidic soil (pH 5.5-6.5)",
      severity: "medium",
      fertilizers: ["Light liming may help if growing pH-sensitive crops"],
      management: ["Monitor calcium and magnesium availability", "Most cereals and pulses tolerate this range reasonably well"],
      application: "Apply lime only if the target crop needs a higher pH; otherwise no action needed."
    },
    neutral: {
      title: "Neutral / optimal pH (6.5-7.5)",
      severity: "none",
      fertilizers: ["No pH correction needed"],
      management: ["Ideal range for most field crops - maintain current practices"],
      application: "No action required."
    },
    moderately_alkaline: {
      title: "Moderately alkaline soil (7.5-8.5)",
      severity: "medium",
      fertilizers: ["Apply gypsum to improve soil structure and supply calcium/sulphur"],
      management: ["Use acid-forming fertilizers like ammonium sulphate", "Add organic matter to buffer pH over time"],
      application: "Apply gypsum before land preparation and incorporate into topsoil."
    },
    strongly_alkaline: {
      title: "Strongly alkaline soil (pH > 8.5)",
      severity: "high",
      fertilizers: ["Apply gypsum or elemental sulphur to reduce pH over time", "Use iron/zinc chelates to correct micronutrient lock-up"],
      management: ["Improve drainage - alkalinity is often linked with salinity/waterlogging", "Grow alkaline-tolerant crops (barley, sugar beet) meanwhile"],
      application: "Apply elemental sulphur 2-3 months ahead of sowing to allow soil microbes time to convert it."
    }
  },
  moisture: {
    low: {
      title: "Low soil moisture",
      severity: "medium",
      fertilizers: [],
      management: [
        "Increase irrigation frequency, or apply mulch to reduce evaporation losses",
        "Consider drip irrigation for water-use efficiency in water-scarce areas"
      ],
      application: "Irrigate lightly and frequently rather than one heavy irrigation."
    },
    medium: {
      title: "Moisture - optimal",
      severity: "none",
      fertilizers: [],
      management: ["Maintain current irrigation schedule"],
      application: "No change needed."
    },
    high: {
      title: "Excess soil moisture / waterlogging risk",
      severity: "high",
      fertilizers: [],
      management: [
        "Improve field drainage with channels or raised beds",
        "Avoid irrigation until soil moisture drops back to the optimal range",
        "Watch for root-rot and fungal disease under waterlogged conditions"
      ],
      application: "Suspend irrigation and improve drainage before the next input application."
    }
  }
};

module.exports = { THRESHOLDS, RECOMMENDATIONS, classifyLevel, classifyPH };
