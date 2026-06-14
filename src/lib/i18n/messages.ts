export type MessageKey =
  | 'subjects.anatomy'
  | 'subjects.pathology'
  | 'subjects.physiology'
  | 'subjects.pharmacology'
  | 'subjects.microbiology'
  | 'subjects.biochemistry'
  | 'actions.copy'
  | 'actions.copied'
  | 'actions.generate'
  | 'inputs.topic.placeholder'
  | 'inputs.topic.label'
  | 'errors.generic'
  | 'errors.topic_invalid'
  | 'errors.subject_not_found';

export type Messages = Readonly<Record<MessageKey, string>>;

export const en: Messages = {
  'subjects.anatomy': 'Anatomy',
  'subjects.pathology': 'Pathology',
  'subjects.physiology': 'Physiology',
  'subjects.pharmacology': 'Pharmacology',
  'subjects.microbiology': 'Microbiology',
  'subjects.biochemistry': 'Biochemistry',
  'actions.copy': 'Copy',
  'actions.copied': 'Copied!',
  'actions.generate': 'Generate',
  'inputs.topic.placeholder': 'Enter a medical topic...',
  'inputs.topic.label': 'Topic',
  'errors.generic': 'An unexpected error occurred.',
  'errors.topic_invalid': 'The topic provided is invalid.',
  'errors.subject_not_found': 'The requested subject was not found.'
};

export const ar: Messages = {
  'subjects.anatomy': 'علم التشريح',
  'subjects.pathology': 'علم الأمراض',
  'subjects.physiology': 'علم وظائف الأعضاء',
  'subjects.pharmacology': 'علم الأدوية',
  'subjects.microbiology': 'علم الأحياء الدقيقة',
  'subjects.biochemistry': 'الكيمياء الحيوية',
  'actions.copy': 'نسخ',
  'actions.copied': 'تم النسخ!',
  'actions.generate': 'توليد',
  'inputs.topic.placeholder': 'أدخل موضوع طبي...',
  'inputs.topic.label': 'الموضوع',
  'errors.generic': 'حدث خطأ غير متوقع.',
  'errors.topic_invalid': 'الموضوع المقدم غير صالح.',
  'errors.subject_not_found': 'الموضوع المطلوب غير موجود.'
};

export function t(messages: Messages, key: MessageKey, vars?: Record<string, string | number>): string {
  let message = messages[key];
  if (vars) {
    for (const [k, v] of Object.entries(vars)) {
      message = message.split(`{{${k}}}`).join(String(v));
    }
  }
  return message;
}
