
import { db } from '../db';
import { presenceEntriesTable, usersTable } from '../db/schema';
import { type CreatePresenceEntryInput, type PresenceEntry } from '../schema';
import { eq, and } from 'drizzle-orm';

export const createPresenceEntry = async (input: CreatePresenceEntryInput, currentUserId: number): Promise<PresenceEntry> => {
  try {
    // Validate date is not more than two weeks in the future
    const twoWeeksFromNow = new Date();
    twoWeeksFromNow.setDate(twoWeeksFromNow.getDate() + 14);
    
    if (input.date > twoWeeksFromNow) {
      throw new Error('Cannot create presence entry more than two weeks in the future');
    }

    // Check if current user exists and get their role
    const currentUser = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, currentUserId))
      .execute();

    if (currentUser.length === 0) {
      throw new Error('Current user not found');
    }

    // Check permission: users can only create entries for themselves unless they are managers
    if (input.user_id !== currentUserId && currentUser[0].role !== 'Manager') {
      throw new Error('Only managers can create presence entries for other users');
    }

    // Verify target user exists
    const targetUser = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, input.user_id))
      .execute();

    if (targetUser.length === 0) {
      throw new Error('Target user not found');
    }

    // Check for existing entry for the same user and date
    const existingEntry = await db.select()
      .from(presenceEntriesTable)
      .where(and(
        eq(presenceEntriesTable.user_id, input.user_id),
        eq(presenceEntriesTable.date, input.date)
      ))
      .execute();

    if (existingEntry.length > 0) {
      throw new Error('Presence entry already exists for this user and date');
    }

    // Create the presence entry
    const result = await db.insert(presenceEntriesTable)
      .values({
        user_id: input.user_id,
        status: input.status,
        date: input.date,
        created_by: currentUserId
      })
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Presence entry creation failed:', error);
    throw error;
  }
};
