// Holgate Protocol → Formulary Medication Mapping
// Maps lab analysis recommendations to specific pharmacy medications

import { ClinicalImpression, LabValues } from './holgateLogic';

export interface MedicationRecommendation {
  formularyId: string;
  name: string;
  strength: string;
  rationale: string;
  priority: number;
}

// Male testosterone dosing based on lab values (per Dr. Holgate)
// No 50mg option - "doesn't work" per clinical guidance
export function getMaleTestosteroneDose(testosteroneLevel: number | null): MedicationRecommendation | null {
  if (testosteroneLevel === null) return null;
  
  if (testosteroneLevel < 30) {
    return {
      formularyId: 'male_test_200',
      name: 'Testosterone Cream - Male 200mg',
      strength: '200mg/g (Liposomal Base)',
      rationale: 'Severely low testosterone (<30 pg/mL) requires maximum dosing',
      priority: 1,
    };
  } else if (testosteroneLevel < 50) {
    return {
      formularyId: 'male_test_150',
      name: 'Testosterone Cream - Male 150mg',
      strength: '150mg/g (Liposomal Base)',
      rationale: 'Low testosterone (30-50 pg/mL) requires moderate-high dosing',
      priority: 1,
    };
  } else if (testosteroneLevel < 80) {
    return {
      formularyId: 'male_test_100',
      name: 'Testosterone Cream - Male 100mg',
      strength: '100mg/g (Liposomal Base)',
      rationale: 'Suboptimal testosterone (50-80 pg/mL) requires maintenance dosing',
      priority: 2,
    };
  }
  
  return null; // Testosterone adequate, no Rx needed
}

// Female testosterone dosing
export function getFemaleTestosteroneDose(testosteroneLevel: number | null): MedicationRecommendation | null {
  if (testosteroneLevel === null) return null;
  
  if (testosteroneLevel < 15) {
    return {
      formularyId: 'female_testosterone',
      name: 'Testosterone Cream - Female (Vitality)',
      strength: '10mg/g (Topiclick)',
      rationale: 'Low testosterone (<15 pg/mL) affecting energy, libido, muscle',
      priority: 1,
    };
  }
  
  return null;
}

// Progesterone dosing (female)
export function getProgesteroneDose(progesteroneLevel: number | null): MedicationRecommendation | null {
  if (progesteroneLevel === null) return null;
  
  if (progesteroneLevel < 50) {
    return {
      formularyId: 'progesterone_sleep',
      name: 'Progesterone Cream (Sleep Stack)',
      strength: '40mg/click (Topiclick)',
      rationale: 'Low progesterone (<50 pg/mL) correlates with sleep/anxiety issues',
      priority: 2,
    };
  }
  
  return null;
}

// Main function to generate medication recommendations from lab analysis
export function generateMedicationRecommendations(
  impression: ClinicalImpression,
  labValues: LabValues,
  gender: string
): MedicationRecommendation[] {
  const recommendations: MedicationRecommendation[] = [];
  const patterns = impression.findings.map(f => f.pattern);
  
  // Skip hormone Rx if burnout pattern detected (adrenal first)
  const hasBurnout = patterns.includes('Burnout Pattern') || patterns.includes('Adrenal Exhaustion');
  
  if (!hasBurnout) {
    // Testosterone recommendations
    if (patterns.includes('Low Testosterone')) {
      if (gender === 'male') {
        const testRec = getMaleTestosteroneDose(labValues.testosterone_t || null);
        if (testRec) recommendations.push(testRec);
      } else {
        const testRec = getFemaleTestosteroneDose(labValues.testosterone_t || null);
        if (testRec) recommendations.push(testRec);
      }
    }
    
    // Progesterone recommendations (female)
    if (gender === 'female' && patterns.includes('Progesterone Deficiency')) {
      const progRec = getProgesteroneDose(labValues.progesterone_pg || null);
      if (progRec) recommendations.push(progRec);
    }
  }
  
  // GLP-1 for insulin resistance (applies regardless of burnout)
  if (patterns.includes('Insulin Resistance Detected')) {
    recommendations.push({
      formularyId: 'semaglutide',
      name: 'Semaglutide/Pyridoxine Injection',
      strength: '0.25mg-1mg/B6 40mg',
      rationale: 'Insulin resistance requires GLP-1 therapy to unlock fat loss',
      priority: 1,
    });
  }
  
  // Sort by priority
  recommendations.sort((a, b) => a.priority - b.priority);
  
  return recommendations;
}

// Get the primary recommended medication (first one) for quick action
export function getPrimaryMedication(
  impression: ClinicalImpression,
  labValues: LabValues,
  gender: string
): MedicationRecommendation | null {
  const recommendations = generateMedicationRecommendations(impression, labValues, gender);
  return recommendations.length > 0 ? recommendations[0] : null;
}
