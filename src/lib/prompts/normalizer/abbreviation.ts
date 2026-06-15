import { TopicNormalizer, NormalizationResult, NormalizerContext, NormalizerEnv } from './contract';

const ABBREVIATION_MAP: Record<string, string> = {
  MI: 'Myocardial Infarction',
  ACS: 'Acute Coronary Syndrome',
  AFIB: 'Atrial Fibrillation',
  COPD: 'Chronic Obstructive Pulmonary Disease',
  PE: 'Pulmonary Embolism',
  DVT: 'Deep Vein Thrombosis',
  UTI: 'Urinary Tract Infection',
  CKD: 'Chronic Kidney Disease',
  SLE: 'Systemic Lupus Erythematosus',
  RA: 'Rheumatoid Arthritis',
  TB: 'Tuberculosis',
  HIV: 'Human Immunodeficiency Virus',
  ARF: 'Acute Renal Failure',
  ARDS: 'Acute Respiratory Distress Syndrome',
  SIDS: 'Sudden Infant Death Syndrome',
  IBS: 'Irritable Bowel Syndrome',
  GERD: 'Gastroesophageal Reflux Disease',
  CAD: 'Coronary Artery Disease',
  CHF: 'Congestive Heart Failure',
  DM: 'Diabetes Mellitus'
};

const TYPO_MAP: Record<string, string> = {
  alzhimers: "Alzheimer's Disease",
  parkinsins: "Parkinson's Disease",
  brcal: 'BRCA1',
  mycardl: 'Myocardial',
  infarshon: 'Infarction',
  pnumonia: 'Pneumonia',
  cirhosis: 'Cirrhosis',
  diabitis: 'Diabetes',
  arthritus: 'Arthritis',
  hemmorhage: 'Hemorrhage'
};

export const abbreviationNormalizer: TopicNormalizer = {
  name: 'abbreviation',
  requiresNetwork: false,
  isEnabled(_env: NormalizerEnv): boolean {
    return true;
  },
  async normalize(raw: string, _ctx: NormalizerContext): Promise<NormalizationResult> {
    const trimmed = raw.trim();
    const upper = trimmed.toUpperCase();
    const lower = trimmed.toLowerCase();

    if (ABBREVIATION_MAP[upper]) {
      return {
        cleaned: ABBREVIATION_MAP[upper],
        confidence: 0.95,
        strategy: 'abbreviation',
        corrections: [{ from: trimmed, to: ABBREVIATION_MAP[upper], reason: 'Known medical abbreviation' }]
      };
    }

    if (TYPO_MAP[lower]) {
      return {
        cleaned: TYPO_MAP[lower],
        confidence: 0.85,
        strategy: 'abbreviation',
        corrections: [{ from: trimmed, to: TYPO_MAP[lower], reason: 'Known medical typo' }]
      };
    }

    return {
      cleaned: trimmed,
      confidence: 1.0,
      strategy: 'unchanged'
    };
  }
};
