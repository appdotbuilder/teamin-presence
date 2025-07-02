
import { db } from '../db';
import { presenceEntriesTable, usersTable } from '../db/schema';
import { type GetPresenceEntriesInput, type PresenceEntry } from '../schema';
import { eq, and, gte, lte, SQL } from 'drizzle-orm';

export const getPresenceEntries = async (input: GetPresenceEntriesInput, currentUserId: number): Promise<PresenceEntry[]> => {
  try {
    // Get current user to check role
    const currentUser = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, currentUserId))
      .execute();

    if (currentUser.length === 0) {
      throw new Error('User not found');
    }

    const isManager = currentUser[0].role === 'Manager';

    // Build conditions array
    const conditions: SQL<unknown>[] = [];

    // Date range filter (always required)
    conditions.push(gte(presenceEntriesTable.date, input.start_date));
    conditions.push(lte(presenceEntriesTable.date, input.end_date));

    // User filter logic
    if (input.user_id !== undefined) {
      // Specific user requested
      if (!isManager && input.user_id !== currentUserId) {
        // Team members can only see their own entries
        throw new Error('Access denied: Team members can only view their own presence entries');
      }
      conditions.push(eq(presenceEntriesTable.user_id, input.user_id));
    } else {
      // No specific user requested
      if (!isManager) {
        // Team members can only see their own entries
        conditions.push(eq(presenceEntriesTable.user_id, currentUserId));
      }
      // Managers see all entries when no user_id specified
    }

    // Execute query with all conditions
    const results = await db.select()
      .from(presenceEntriesTable)
      .where(and(...conditions))
      .execute();

    return results;
  } catch (error) {
    console.error('Get presence entries failed:', error);
    throw error;
  }
};
