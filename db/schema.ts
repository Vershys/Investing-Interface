import {sqliteTable,text,index} from 'drizzle-orm/sqlite-core';
export const journal=sqliteTable('journal',{id:text('id').primaryKey(),userId:text('user_id').notNull(),ticker:text('ticker').notNull(),body:text('body').notNull(),decision:text('decision').notNull(),createdAt:text('created_at').notNull()},t=>[index('journal_user_created').on(t.userId,t.createdAt)]);

// Append-only versions preserve original intent and support compare-and-swap writes.
import {integer,primaryKey,uniqueIndex} from 'drizzle-orm/sqlite-core';
export const memoryRecords=sqliteTable('memory_records',{
 userId:text('user_id').notNull(),id:text('id').notNull(),version:integer('version').notNull(),kind:text('kind').notNull(),ticker:text('ticker').notNull(),title:text('title').notNull(),body:text('body').notNull(),status:text('status').notNull(),payload:text('payload').notNull(),createdAt:text('created_at').notNull(),actor:text('actor').notNull(),
},t=>[primaryKey({columns:[t.userId,t.id,t.version]}),index('memory_scope').on(t.userId,t.ticker,t.kind),index('memory_created').on(t.userId,t.createdAt)]);
export const agentRuns=sqliteTable('agent_runs',{
 id:text('id').primaryKey(),userId:text('user_id').notNull(),threadId:text('thread_id').notNull(),ticker:text('ticker').notNull(),question:text('question').notNull(),answer:text('answer').notNull(),status:text('status').notNull(),manifest:text('manifest').notNull(),actions:text('actions').notNull(),checkpoint:text('checkpoint').notNull(),inputTokens:integer('input_tokens').notNull().default(0),outputTokens:integer('output_tokens').notNull().default(0),cachedTokens:integer('cached_tokens').notNull().default(0),createdAt:text('created_at').notNull(),updatedAt:text('updated_at').notNull(),model:text('model').notNull(),
},t=>[index('runs_thread').on(t.userId,t.threadId,t.createdAt),index('runs_user_date').on(t.userId,t.createdAt)]);
export const agentBudget=sqliteTable('agent_budget',{userId:text('user_id').notNull(),day:text('day').notNull(),reserved:integer('reserved').notNull().default(0),calls:integer('calls').notNull().default(0)},t=>[primaryKey({columns:[t.userId,t.day]})]);
export const monitorEvents=sqliteTable('monitor_events',{id:text('id').primaryKey(),userId:text('user_id').notNull(),ruleId:text('rule_id').notNull(),dedupeKey:text('dedupe_key').notNull(),ticker:text('ticker').notNull(),body:text('body').notNull(),status:text('status').notNull(),createdAt:text('created_at').notNull()},t=>[uniqueIndex('monitor_dedupe').on(t.userId,t.dedupeKey),index('monitor_user_time').on(t.userId,t.createdAt)]);
export const monitorChecks=sqliteTable('monitor_checks',{userId:text('user_id').primaryKey(),checkedAt:text('checked_at').notNull(),status:text('status').notNull(),detail:text('detail').notNull()});
