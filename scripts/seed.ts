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
const masterTemplate = fs.readFileSync(path.resolve(__dirname, '../Master Prompt V2/Medical tutor master prompt template.md'), 'utf-8');

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
