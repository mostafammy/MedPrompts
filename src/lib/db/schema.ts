import { sqliteTable, text, integer, index, uniqueIndex } from 'drizzle-orm/sqlite-core';

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
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(false),
  changelog: text('changelog'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date())
}, (table) => ({
  activeSubjectIdx: index('active_subject_idx').on(table.subjectId, table.isActive)
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
export type PromptTemplate = typeof promptTemplates.$inferSelect;
export type TopicSeed = typeof topicsSeed.$inferSelect;
export type PromptEvent = typeof promptEvents.$inferSelect;
