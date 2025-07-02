
import { z } from 'zod';

// User role enum
export const userRoleSchema = z.enum(['Manager', 'Team Member']);
export type UserRole = z.infer<typeof userRoleSchema>;

// Presence status enum
export const presenceStatusSchema = z.enum(['In office', 'Working from home', 'On vacation']);
export type PresenceStatus = z.infer<typeof presenceStatusSchema>;

// User schema
export const userSchema = z.object({
  id: z.number(),
  email: z.string().email(),
  name: z.string(),
  role: userRoleSchema,
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});
export type User = z.infer<typeof userSchema>;

// Presence entry schema
export const presenceEntrySchema = z.object({
  id: z.number(),
  user_id: z.number(),
  status: presenceStatusSchema,
  date: z.coerce.date(),
  created_by: z.number(), // ID of user who created this entry (for manager overrides)
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});
export type PresenceEntry = z.infer<typeof presenceEntrySchema>;

// Auth schemas
export const loginInputSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1)
});
export type LoginInput = z.infer<typeof loginInputSchema>;

export const registerInputSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1),
  password: z.string().min(6),
  role: userRoleSchema
});
export type RegisterInput = z.infer<typeof registerInputSchema>;

// Presence management schemas
export const createPresenceEntryInputSchema = z.object({
  user_id: z.number(),
  status: presenceStatusSchema,
  date: z.coerce.date()
});
export type CreatePresenceEntryInput = z.infer<typeof createPresenceEntryInputSchema>;

export const updatePresenceEntryInputSchema = z.object({
  id: z.number(),
  status: presenceStatusSchema.optional(),
  date: z.coerce.date().optional()
});
export type UpdatePresenceEntryInput = z.infer<typeof updatePresenceEntryInputSchema>;

export const getPresenceEntriesInputSchema = z.object({
  start_date: z.coerce.date(),
  end_date: z.coerce.date(),
  user_id: z.number().optional() // Optional filter by specific user
});
export type GetPresenceEntriesInput = z.infer<typeof getPresenceEntriesInputSchema>;

export const deletePresenceEntryInputSchema = z.object({
  id: z.number()
});
export type DeletePresenceEntryInput = z.infer<typeof deletePresenceEntryInputSchema>;

// Dashboard data schema
export const dashboardDataSchema = z.object({
  users: z.array(userSchema),
  presence_entries: z.array(presenceEntrySchema),
  week_start: z.coerce.date(),
  week_end: z.coerce.date()
});
export type DashboardData = z.infer<typeof dashboardDataSchema>;

export const getDashboardDataInputSchema = z.object({
  week_start: z.coerce.date()
});
export type GetDashboardDataInput = z.infer<typeof getDashboardDataInputSchema>;
