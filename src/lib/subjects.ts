export type SubjectId =
  | 'anatomy'
  | 'histology'
  | 'physiology'
  | 'microbiology'
  | 'pathology'
  | 'parasitology';

export interface Subject {
  id: SubjectId;
  label: string;
  icon: string;
  sortOrder: number;
  slug: string;
}

export const SUBJECTS: Subject[] = [
  { id: 'anatomy', label: 'Anatomy', icon: 'bone', sortOrder: 0, slug: 'anatomy' },
  { id: 'histology', label: 'Histology', icon: 'microscope', sortOrder: 1, slug: 'histology' },
  { id: 'physiology', label: 'Physiology', icon: 'heart-pulse', sortOrder: 2, slug: 'physiology' },
  { id: 'microbiology', label: 'Microbiology', icon: 'bacteria', sortOrder: 3, slug: 'microbiology' },
  { id: 'pathology', label: 'Pathology', icon: 'flask', sortOrder: 4, slug: 'pathology' },
  { id: 'parasitology', label: 'Parasitology', icon: 'bug', sortOrder: 5, slug: 'parasitology' },
];

export function getSubject(id: string): Subject | undefined {
  return SUBJECTS.find(s => s.id === id);
}

export function isValidSubjectId(id: string): id is SubjectId {
  return SUBJECTS.some(s => s.id === id);
}
