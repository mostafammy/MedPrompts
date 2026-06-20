import { createClient } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import { sql } from 'drizzle-orm';
import * as schema from '../src/lib/db/schema';
import { slugifyTopic } from '../src/lib/prompts/slugifier';
import * as dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

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

const templates: Record<string, { id: string; name: string; content: string }> = {
  pathology: { id: 'pt_path_001', name: 'Master tutor template v2.0', content: masterTemplate },
  anatomy: { id: 'pt_anat_001', name: 'Master tutor template v2.0', content: masterTemplate },
  physiology: { id: 'pt_phys_001', name: 'Master tutor template v2.0', content: masterTemplate },
  pharmacology: { id: 'pt_phar_001', name: 'Master tutor template v2.0', content: masterTemplate },
  microbiology: { id: 'pt_micr_001', name: 'Master tutor template v2.0', content: masterTemplate },
  biochemistry: { id: 'pt_bioc_001', name: 'Master tutor template v2.0', content: masterTemplate },
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
    console.log('Ensuring tables exist...');
    await client.execute('CREATE TABLE IF NOT EXISTS subjects (id TEXT PRIMARY KEY, label TEXT NOT NULL, icon TEXT NOT NULL, sort_order INTEGER NOT NULL, is_active INTEGER NOT NULL DEFAULT 1, created_at INTEGER NOT NULL)');
    await client.execute('CREATE TABLE IF NOT EXISTS prompt_templates (id TEXT PRIMARY KEY, subject_id TEXT NOT NULL, template TEXT NOT NULL, version INTEGER NOT NULL, semver TEXT NOT NULL DEFAULT \'1.0.0\', version_major INTEGER NOT NULL DEFAULT 1, version_minor INTEGER NOT NULL DEFAULT 0, version_patch INTEGER NOT NULL DEFAULT 0, checksum TEXT NOT NULL DEFAULT \'\', is_active INTEGER NOT NULL DEFAULT 0, changelog TEXT, created_at INTEGER NOT NULL, is_interactive INTEGER NOT NULL DEFAULT 0, required_variables TEXT NOT NULL DEFAULT \'[]\', FOREIGN KEY (subject_id) REFERENCES subjects(id))');
    await client.execute('CREATE TABLE IF NOT EXISTS template_versions (id TEXT PRIMARY KEY, template_id TEXT NOT NULL, semver TEXT NOT NULL, template TEXT NOT NULL, checksum TEXT NOT NULL, changelog TEXT, parent_semver TEXT, activated_by TEXT NOT NULL, activated_at INTEGER NOT NULL, deactivated_at INTEGER, FOREIGN KEY (template_id) REFERENCES prompt_templates(id))');
    await client.execute('CREATE TABLE IF NOT EXISTS topics_seed (id TEXT PRIMARY KEY, subject_id TEXT NOT NULL, slug TEXT NOT NULL, topic TEXT NOT NULL, is_high_yield INTEGER NOT NULL DEFAULT 0, FOREIGN KEY (subject_id) REFERENCES subjects(id))');
    await client.execute('CREATE TABLE IF NOT EXISTS prompt_events (id TEXT PRIMARY KEY, subject_id TEXT NOT NULL, slug TEXT NOT NULL, copied_at INTEGER NOT NULL, copy_method TEXT)');

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
        label: sql`excluded.label`,
        icon: sql`excluded.icon`,
        sortOrder: sql`excluded.sort_order`,
        isActive: sql`excluded.is_active`
      }
    });

    console.log('Inserting prompt templates...');
    for (const [subjectId, info] of Object.entries(templates)) {
      await db.insert(schema.promptTemplates).values({
        id: info.id,
        subjectId,
        template: info.content,
        version: 2,
        isActive: true,
        changelog: info.name,
        createdAt: new Date(),
        isInteractive: true,
        requiredVariables: [
          { key: 'OUTPUT_LANGUAGE', label: 'Output Language', control: 'select', defaultValue: 'German', options: ['German', 'English', 'Spanish', 'French', 'Arabic'], required: true },
          { key: 'ANALOGY_DOMAIN', label: 'Analogy Domain', control: 'select', defaultValue: 'Cooking and Culinary Arts', options: ['Cooking and Culinary Arts', 'Construction and Architecture', 'Music and Orchestra', 'Sports and Athletics', 'Transportation and Mechanics'], required: true },
          { key: 'MAX_REMEDIATION_CYCLES', label: 'Max Remediation Cycles', control: 'select', defaultValue: '2', options: ['1', '2', '3', '4', '5'], required: true },
          { key: 'TERMINOLOGY_STANDARD', label: 'Terminology Standard', control: 'text', defaultValue: 'Standard', required: true }
        ]
      }).onConflictDoUpdate({
        target: schema.promptTemplates.id,
        set: {
          template: info.content,
          version: 2,
          isActive: true,
          changelog: info.name,
          isInteractive: true,
          requiredVariables: [
            { key: 'OUTPUT_LANGUAGE', label: 'Output Language', control: 'select', defaultValue: 'German', options: ['German', 'English', 'Spanish', 'French', 'Arabic'], required: true },
            { key: 'ANALOGY_DOMAIN', label: 'Analogy Domain', control: 'select', defaultValue: 'Cooking and Culinary Arts', options: ['Cooking and Culinary Arts', 'Construction and Architecture', 'Music and Orchestra', 'Sports and Athletics', 'Transportation and Mechanics'], required: true },
            { key: 'MAX_REMEDIATION_CYCLES', label: 'Max Remediation Cycles', control: 'select', defaultValue: '2', options: ['1', '2', '3', '4', '5'], required: true },
            { key: 'TERMINOLOGY_STANDARD', label: 'Terminology Standard', control: 'text', defaultValue: 'Standard', required: true }
          ]
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
            topic: topic,
            isHighYield: true
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
