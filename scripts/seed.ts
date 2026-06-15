import { createClient } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import * as schema from '../src/lib/db/schema';
import { slugifyTopic } from '../src/lib/prompts/slugifier';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

async function seed() {
  const url = process.env.TURSO_DATABASE_URL || 'file:./local.db';
  const authToken = process.env.TURSO_AUTH_TOKEN;

  console.log(`Connecting to database at ${url}...`);
  const client = createClient(authToken ? { url, authToken } : { url });
  const db = drizzle(client, { schema });

  console.log('Seeding subjects...');
  await db.insert(schema.subjects).values([
    { id: 'pathology', label: 'Pathology', icon: 'microscope', sortOrder: 1, isActive: true },
    { id: 'anatomy', label: 'Anatomy', icon: 'bone', sortOrder: 2, isActive: true },
    { id: 'physiology', label: 'Physiology', icon: 'activity', sortOrder: 3, isActive: true },
    { id: 'pharmacology', label: 'Pharmacology', icon: 'pill', sortOrder: 4, isActive: true },
    { id: 'microbiology', label: 'Microbiology', icon: 'bug', sortOrder: 5, isActive: true },
    { id: 'biochemistry', label: 'Biochemistry', icon: 'flask-conical', sortOrder: 6, isActive: true },
  ]).onConflictDoNothing();

  console.log('Seeding prompt templates...');
  const pathologyTemplate = `
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
`;

  await db.insert(schema.promptTemplates).values({
    id: 'pt_path_001',
    subjectId: 'pathology',
    template: pathologyTemplate.trim(),
    version: 1,
    isActive: true,
    changelog: 'Initial pathology template',
    createdAt: new Date()
  }).onConflictDoNothing();

  console.log('Seeding topics...');
  const highYieldTopics = [
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
  ];

  for (const topic of highYieldTopics) {
    const slug = slugifyTopic(topic);
    await db.insert(schema.topicsSeed).values({
      id: "pathology_" + slug,
      slug,
      subjectId: 'pathology',
      topic: topic,
      isHighYield: true,
    }).onConflictDoNothing();
  }

  console.log('Seeding complete!');
  process.exit(0);
}

seed().catch((err) => {
  console.error('Seeding failed:', err);
  process.exit(1);
});
