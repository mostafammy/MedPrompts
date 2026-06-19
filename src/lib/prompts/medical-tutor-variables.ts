import type { TemplateVariableDefinition } from './variable-schema';

export const MEDICAL_TUTOR_VARIABLES = [
  {
    key: 'OUTPUT_LANGUAGE',
    label: 'Language',
    control: 'select',
    defaultValue: 'German',
    options: ['German', 'English', 'Spanish', 'French', 'Arabic'],
    required: true,
  },
  {
    key: 'ANALOGY_DOMAIN',
    label: 'Analogy Domain',
    control: 'select',
    defaultValue: 'Cooking and Culinary Arts',
    options: [
      'Cooking and Culinary Arts',
      'Construction and Architecture',
      'Music and Orchestra',
      'Sports and Athletics',
      'Transportation and Mechanics',
    ],
    required: true,
  },
  {
    key: 'MAX_REMEDIATION_CYCLES',
    label: 'Max Remediation Cycles',
    control: 'select',
    defaultValue: '2',
    options: ['1', '2', '3', '4', '5'],
    required: true,
  },
] satisfies TemplateVariableDefinition[];

export function terminologyStandardForSubject(subjectId: string): string {
  const standards: Record<string, string> = {
    anatomy: 'Terminologia Anatomica',
    physiology: 'IUPS-recognized physiological nomenclature',
    pharmacology: 'INN (International Nonproprietary Names)',
    pathology: 'WHO / ICD-O classification',
    microbiology: 'Current accepted taxonomic nomenclature',
  };

  return standards[subjectId] ?? 'the most authoritative current international nomenclature/classification body for this subject';
}
