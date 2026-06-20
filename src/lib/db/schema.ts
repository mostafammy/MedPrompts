import { sqliteTable, text, integer, index, uniqueIndex } from 'drizzle-orm/sqlite-core';
import type { TemplateVariableDefinition } from '../prompts/variable-schema';

export const subjects = sqliteTable('subjects', {
  id: text('id').primaryKey(),
  label: text('label').notNull(),
  icon: text('icon').notNull(),
  sortOrder: integer('sort_order').notNull(),
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date())
}, (table) => ({
  sortIdx: index('sort_idx').on(table.sortOrder)
}));

export const promptTemplates = sqliteTable('prompt_templates', {
  id: text('id').primaryKey(),
  subjectId: text('subject_id').notNull().references(() => subjects.id),
  template: text('template').notNull(),
  version: integer('version').notNull(),
  semver: text('semver').notNull().default('1.0.0'),
  versionMajor: integer('version_major').notNull().default(1),
  versionMinor: integer('version_minor').notNull().default(0),
  versionPatch: integer('version_patch').notNull().default(0),
  checksum: text('checksum').notNull().default(''),
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(false),
  changelog: text('changelog'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  isInteractive: integer('is_interactive', { mode: 'boolean' }).notNull().default(false),
  requiredVariables: text('required_variables', { mode: 'json' })
    .$type<TemplateVariableDefinition[]>()
    .notNull()
    .$defaultFn(() => []),
}, (table) => ({
  activeSubjectIdx: index('active_subject_idx').on(table.subjectId, table.isActive),
  semverLookupIdx: index('semver_lookup_idx').on(table.subjectId, table.versionMajor, table.versionMinor),
  checksumIdx: index('checksum_idx').on(table.subjectId, table.checksum),
}));

export const templateVersions = sqliteTable('template_versions', {
  id: text('id').primaryKey(),
  templateId: text('template_id').notNull().references(() => promptTemplates.id),
  semver: text('semver').notNull(),
  template: text('template').notNull(),
  checksum: text('checksum').notNull(),
  changelog: text('changelog'),
  parentSemver: text('parent_semver'),
  activatedBy: text('activated_by').notNull(),
  activatedAt: integer('activated_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  deactivatedAt: integer('deactivated_at', { mode: 'timestamp' }),
}, (table) => ({
  historyIdx: index('version_history_idx').on(table.templateId, table.activatedAt),
  parentLookupIdx: index('version_parent_lookup_idx').on(table.templateId, table.parentSemver),
}));

export const topicsSeed = sqliteTable('topics_seed', {
  id: text('id').primaryKey(),
  subjectId: text('subject_id').notNull().references(() => subjects.id),
  slug: text('slug').notNull(),
  topic: text('topic').notNull(),
  isHighYield: integer('is_high_yield', { mode: 'boolean' }).notNull().default(false)
}, (table) => ({
  uniqueSubjectSlug: uniqueIndex('unique_subject_slug_idx').on(table.subjectId, table.slug),
  highYieldIdx: index('high_yield_idx').on(table.isHighYield)
}));

export const promptEvents = sqliteTable('prompt_events', {
  id: text('id').primaryKey(),
  subjectId: text('subject_id').notNull(),
  slug: text('slug').notNull(),
  copiedAt: integer('copied_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  copyMethod: text('copy_method')
}, (table) => ({
  copiedAtIdx: index('copied_at_idx').on(table.copiedAt)
}));

export type Subject = typeof subjects.$inferSelect;
export type PromptTemplate = typeof promptTemplates.$inferSelect & {
  isInteractive: boolean;
  requiredVariables: TemplateVariableDefinition[];
};
export type TemplateVersion = typeof templateVersions.$inferSelect;
export type TopicSeed = typeof topicsSeed.$inferSelect;
export type PromptEvent = typeof promptEvents.$inferSelect;
