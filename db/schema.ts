import {sqliteTable,text,index} from 'drizzle-orm/sqlite-core';
export const journal=sqliteTable('journal',{id:text('id').primaryKey(),userId:text('user_id').notNull(),ticker:text('ticker').notNull(),body:text('body').notNull(),decision:text('decision').notNull(),createdAt:text('created_at').notNull()},t=>[index('journal_user_created').on(t.userId,t.createdAt)]);
