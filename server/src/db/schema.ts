
import { serial, text, pgTable, timestamp, integer, pgEnum } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Enums
export const userRoleEnum = pgEnum('user_role', ['Manager', 'Team Member']);
export const presenceStatusEnum = pgEnum('presence_status', ['In office', 'Working from home', 'On vacation']);

// Users table
export const usersTable = pgTable('users', {
  id: serial('id').primaryKey(),
  email: text('email').notNull().unique(),
  name: text('name').notNull(),
  password_hash: text('password_hash').notNull(),
  role: userRoleEnum('role').notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull()
});

// Presence entries table
export const presenceEntriesTable = pgTable('presence_entries', {
  id: serial('id').primaryKey(),
  user_id: integer('user_id').notNull().references(() => usersTable.id, { onDelete: 'cascade' }),
  status: presenceStatusEnum('status').notNull(),
  date: timestamp('date', { mode: 'date' }).notNull(), // Date only, no time
  created_by: integer('created_by').notNull().references(() => usersTable.id),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull()
});

// Relations
export const usersRelations = relations(usersTable, ({ many }) => ({
  presence_entries: many(presenceEntriesTable, { relationName: 'user_presence' }),
  created_entries: many(presenceEntriesTable, { relationName: 'created_by_user' })
}));

export const presenceEntriesRelations = relations(presenceEntriesTable, ({ one }) => ({
  user: one(usersTable, {
    fields: [presenceEntriesTable.user_id],
    references: [usersTable.id],
    relationName: 'user_presence'
  }),
  created_by_user: one(usersTable, {
    fields: [presenceEntriesTable.created_by],
    references: [usersTable.id],
    relationName: 'created_by_user'
  })
}));

// TypeScript types for the table schemas
export type User = typeof usersTable.$inferSelect;
export type NewUser = typeof usersTable.$inferInsert;
export type PresenceEntry = typeof presenceEntriesTable.$inferSelect;
export type NewPresenceEntry = typeof presenceEntriesTable.$inferInsert;

// Export all tables for proper query building
export const tables = {
  users: usersTable,
  presence_entries: presenceEntriesTable
};
