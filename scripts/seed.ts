import { createClient } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import * as schema from '../src/lib/db/schema';
import { slugifyTopic } from '../src/lib/prompts/slugifier';
import * as dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

// Define high-yield templates for all subjects
const templates: Record<string, { id: string; name: string; content: string }> = {
  pathology: {
    id: 'pt_path_001',
    name: 'Initial pathology template',
    content: `
## Pathogenesis
Act as an expert pathologist. Explain the pathogenesis of {{TOPIC}}. Focus on the sequence of events from initial injury to morphological changes.

## Gross Morphology
Describe the macroscopic appearance of the affected organs in {{TOPIC}}.

## Microscopic Morphology
Describe the key histological features and findings on light microscopy for {{TOPIC}}.

## Clinical Correlation
How do the pathological changes in {{TOPIC}} translate into the patient's signs and symptoms?

## Complications
What are the major pathological and clinical complications of {{TOPIC}}?

## Diagnostic Markers
List any relevant immunohistochemical stains, genetic markers, or special stains useful for diagnosing {{TOPIC}}.

## Differential Diagnosis
List the top pathological differential diagnoses for {{TOPIC}} and how to distinguish them microscopically.

⚠️ Verify this info. Medical knowledge rapidly evolves, always correlate with recent guidelines.
`.trim(),
  },
  anatomy: {
    id: 'pt_anat_001',
    name: 'Initial anatomy template',
    content: `
## Anatomical Overview
Act as an expert anatomist. Provide a comprehensive anatomical overview of {{TOPIC}}. Include its main subdivisions or components.

## Relations and Location
Describe the anatomical relations, borders, and location of {{TOPIC}} relative to surrounding structures.

## Vascular Supply and Lymphatics
Detail the arterial supply, venous drainage, and lymphatic drainage of {{TOPIC}}.

## Innervation
Describe the nerve supply (sensory, motor, and autonomic if applicable) of {{TOPIC}}.

## Histology and Microanatomy
Detail the microscopic structure, epithelial lining, and cellular composition of {{TOPIC}}.

## Embryology and Development
Briefly explain the embryological origin and development of {{TOPIC}}, including any key developmental milestones.

## Clinical Anatomy
Correlate the anatomical features of {{TOPIC}} with common clinical procedures, injuries, or pathologies (e.g., surgical access points, referred pain).

⚠️ Verify this info. Medical knowledge rapidly evolves, always correlate with recent guidelines.
`.trim(),
  },
  physiology: {
    id: 'pt_phys_001',
    name: 'Initial physiology template',
    content: `
## Physiological Mechanisms
Act as an expert physiologist. Explain the normal physiological processes and pathways of {{TOPIC}}.

## Cellular and Molecular Functions
Describe the cellular and molecular mechanisms underlying {{TOPIC}}.

## Regulation and Control
How is {{TOPIC}} regulated (e.g., feedback loops, neural/hormonal controls) to maintain homeostasis?

## Integration with Other Systems
Explain how {{TOPIC}} interacts with and affects other organ systems in the body.

## Physiological Response to Stress/Exercise
Describe how {{TOPIC}} responds or adapts to stressors, exercise, or environmental changes.

## Clinical Correlation
Explain how pathophysiological disruptions of {{TOPIC}} lead to clinical manifestations.

⚠️ Verify this info. Medical knowledge rapidly evolves, always correlate with recent guidelines.
`.trim(),
  },
  pharmacology: {
    id: 'pt_phar_001',
    name: 'Initial pharmacology template',
    content: `
## Drug Class and Mechanism of Action
Act as an expert pharmacologist. Explain the drug class, chemical structure (if relevant), and molecular mechanism of action of {{TOPIC}}.

## Pharmacokinetics
Detail the absorption, distribution, metabolism, and excretion (ADME) of {{TOPIC}}.

## Clinical Indications
What are the FDA-approved and off-label clinical uses of {{TOPIC}}?

## Adverse Effects and Toxicity
List the common and severe side effects, toxicity profile, and antidote (if applicable) for {{TOPIC}}.

## Contraindications and Drug Interactions
Describe the absolute and relative contraindications, and major drug-drug or drug-food interactions of {{TOPIC}}.

## Resistance Mechanisms
If applicable, explain the mechanisms of drug resistance associated with {{TOPIC}}.

⚠️ Verify this info. Medical knowledge rapidly evolves, always correlate with recent guidelines.
`.trim(),
  },
  microbiology: {
    id: 'pt_micr_001',
    name: 'Initial microbiology template',
    content: `
## Classification and Characteristics
Act as an expert microbiologist. Classify {{TOPIC}} (bacterial, viral, fungal, parasitic) and detail its morphologic and staining characteristics.

## Pathogenicity and Virulence Factors
Explain how {{TOPIC}} causes disease, including its key virulence factors (toxins, capsules, enzymes).

## Transmission and Epidemiology
Describe the reservoir, modes of transmission, risk factors, and epidemiology of {{TOPIC}}.

## Clinical Manifestations
What are the key clinical presentations, syndromes, and diseases caused by {{TOPIC}}?

## Laboratory Diagnosis
Detail the methods used to identify {{TOPIC}} (e.g., cultures, staining, PCR, serology, special media).

## Prevention and Treatment
Describe the vaccines, prophylactic measures, and primary antimicrobial treatments for {{TOPIC}}.

⚠️ Verify this info. Medical knowledge rapidly evolves, always correlate with recent guidelines.
`.trim(),
  },
  biochemistry: {
    id: 'pt_bioc_001',
    name: 'Initial biochemistry template',
    content: `
## Metabolic Pathways and Cycles
Act as an expert biochemist. Describe the major metabolic pathways, cycles, or biochemical processes involving {{TOPIC}}.

## Key Enzymes and Regulation
Identify the rate-limiting and key regulatory enzymes, cofactors, and allosteric/hormonal regulators of {{TOPIC}}.

## Molecular Structures and Reactions
Detail the chemical structures, substrates, products, and thermodynamics of key reactions in {{TOPIC}}.

## Cellular Localization
Where do the biochemical events of {{TOPIC}} take place within the cell (e.g., mitochondria, cytosol)?

## Clinical/Inborn Errors of Metabolism
Explain the clinical disorders, genetic mutations, and enzyme deficiencies associated with {{TOPIC}} (e.g., inborn errors of metabolism).

## Diagnostic Tests and Indicators
Describe biochemically relevant lab tests or markers used to assess {{TOPIC}}.

⚠️ Verify this info. Medical knowledge rapidly evolves, always correlate with recent guidelines.
`.trim(),
  }
};

const topicsSeedData: Record<string, string[]> = {
  pathology: [
    'Myocardial Infarction',
    'Pneumonia',
    'Cirrhosis',
    'Glomerulonephritis',
    'Stroke',
    'Tuberculosis',
    'Asthma',
    "Crohn's Disease",
    'Ulcerative Colitis',
    'Rheumatoid Arthritis',
    'Systemic Lupus Erythematosus',
    'Peptic Ulcer Disease',
    'Acute Pancreatitis',
    'Appendicitis',
    'Breast Cancer',
    'Prostate Cancer',
    'Lung Cancer',
    'Colorectal Cancer',
    'Melanoma',
    'Leukemia'
  ],
  anatomy: [
    'Heart',
    'Lungs',
    'Liver',
    'Kidneys',
    'Brain',
    'Brachial Plexus',
    'Cranial Nerves',
    'Circle of Willis',
    'Femoral Triangle',
    'Inguinal Canal'
  ],
  physiology: [
    'Action Potential',
    'Cardiac Cycle',
    'Glomerular Filtration Rate',
    'Respiratory Regulation',
    'Renin-Angiotensin System',
    'Thyroid Hormone Regulation',
    'Oxygen-Hemoglobin Dissociation',
    'Acid-Base Balance',
    'Neuromuscular Junction',
    'Hypothalamic-Pituitary Axis'
  ],
  pharmacology: [
    'Beta Blockers',
    'ACE Inhibitors',
    'Penicillin',
    'Metformin',
    'Aspirin',
    'Statins',
    'Furosemide',
    'Morphine',
    'Warfarin',
    'Albuterol'
  ],
  microbiology: [
    'Staphylococcus aureus',
    'Escherichia coli',
    'Mycobacterium tuberculosis',
    'Influenza Virus',
    'Candida albicans',
    'Plasmodium falciparum',
    'Pseudomonas aeruginosa',
    'Streptococcus pneumoniae',
    'HIV',
    'Hepatitis B Virus'
  ],
  biochemistry: [
    'Glycolysis',
    'Krebs Cycle',
    'Oxidative Phosphorylation',
    'Gluconeogenesis',
    'Urea Cycle',
    'DNA Replication',
    'Translation',
    'Transcription',
    'Heme Synthesis',
    'Cholesterol Synthesis'
  ]
};

async function seedDatabase(url: string, authToken?: string, name = 'Database') {
  console.log(`\n--- Seeding ${name} at ${url} ---`);
  const client = createClient(authToken ? { url, authToken } : { url });
  const db = drizzle(client, { schema });

  try {
    console.log('Inserting subjects...');
    await db.insert(schema.subjects).values([
      { id: 'pathology', label: 'Pathology', icon: 'microscope', sortOrder: 1, isActive: true },
      { id: 'anatomy', label: 'Anatomy', icon: 'bone', sortOrder: 2, isActive: true },
      { id: 'physiology', label: 'Physiology', icon: 'activity', sortOrder: 3, isActive: true },
      { id: 'pharmacology', label: 'Pharmacology', icon: 'pill', sortOrder: 4, isActive: true },
      { id: 'microbiology', label: 'Microbiology', icon: 'bug', sortOrder: 5, isActive: true },
      { id: 'biochemistry', label: 'Biochemistry', icon: 'flask-conical', sortOrder: 6, isActive: true },
    ]).onConflictDoUpdate({
      target: schema.subjects.id,
      set: {
        label: schema.subjects.label,
        icon: schema.subjects.icon,
        sortOrder: schema.subjects.sortOrder,
        isActive: schema.subjects.isActive
      }
    });

    console.log('Inserting prompt templates...');
    for (const [subjectId, info] of Object.entries(templates)) {
      await db.insert(schema.promptTemplates).values({
        id: info.id,
        subjectId,
        template: info.content,
        version: 1,
        isActive: true,
        changelog: info.name,
        createdAt: new Date()
      }).onConflictDoUpdate({
        target: schema.promptTemplates.id,
        set: {
          template: schema.promptTemplates.template,
          isActive: schema.promptTemplates.isActive,
          changelog: schema.promptTemplates.changelog
        }
      });
    }

    console.log('Inserting high-yield topics...');
    for (const [subjectId, topics] of Object.entries(topicsSeedData)) {
      for (const topic of topics) {
        const slug = slugifyTopic(topic);
        await db.insert(schema.topicsSeed).values({
          id: `${subjectId}_${slug}`,
          slug,
          subjectId,
          topic,
          isHighYield: true,
        }).onConflictDoUpdate({
          target: [schema.topicsSeed.subjectId, schema.topicsSeed.slug],
          set: {
            topic: schema.topicsSeed.topic,
            isHighYield: schema.topicsSeed.isHighYield
          }
        });
      }
    }

    console.log(`Seeding of ${name} completed successfully.`);
  } catch (err: any) {
    console.error(`Error seeding ${name}:`, err.message);
    throw err;
  } finally {
    await client.close();
  }
}

async function run() {
  // 1. Seed Local DB
  try {
    await seedDatabase('file:./local.db', undefined, 'Local SQLite File');
  } catch (err) {
    console.error('Local seeding failed.');
  }

  // 2. Seed Turso Cloud DB (if credentials exist)
  const tursoUrl = process.env.TURSO_DATABASE_URL;
  const tursoToken = process.env.TURSO_AUTH_TOKEN;
  if (tursoUrl) {
    try {
      await seedDatabase(tursoUrl, tursoToken, 'Turso Cloud Database');
    } catch (err) {
      console.error('Turso Cloud seeding failed.');
    }
  } else {
    console.log('No TURSO_DATABASE_URL environment variable found. Skipping cloud seeding.');
  }

  console.log('\nSeeding pipeline finished.');
  process.exit(0);
}

run().catch((err) => {
  console.error('Global seeding process failed:', err);
  process.exit(1);
});
