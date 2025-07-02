
import { db } from '../db';
import { presenceEntriesTable, usersTable } from '../db/schema';
import { type UpdatePresenceEntryInput, type PresenceEntry } from '../schema';
import { eq, and } from 'drizzle-orm';

export const updatePresenceEntry = async (input: UpdatePresenceEntryInput, currentUserId: number): Promise<PresenceEntry> => {
  try {
    // Get current user's role
    const currentUser = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, currentUserId))
      .execute();

    if (currentUser.length === 0) {
      throw new Error('Current user not found');
    }

    const isManager = currentUser[0].role === 'Manager';

    // Get the existing presence entry
    const existingEntry = await db.select()
      .from(presenceEntriesTable)
      .where(eq(presenceEntriesTable.id, input.id))
      .execute();

    if (existingEntry.length === 0) {
      throw new Error('Presence entry not found');
    }

    const entry = existingEntry[0];

    // Check permissions: user can only update their own entries unless they're a manager
    if (!isManager && entry.user_id !== currentUserId) {
      throw new Error('Permission denied: can only update own entries');
    }

    // Validate date constraint if date is being updated
    if (input.date) {
      const twoWeeksFromNow = new Date();
      twoWeeksFromNow.setDate(twoWeeksFromNow.getDate() + 14);
      
      if (input.date > twoWeeksFromNow) {
        throw new Error('Date cannot be more than two weeks in the future');
      }
    }

    // Build update object with only provided fields
    const updateData: any = {
      updated_at: new Date()
    };

    if (input.status !== undefined) {
      updateData.status = input.status;
    }

    if (input.date !== undefined) {
      updateData.date = input.date;
    }

    // Update the entry
    const result = await db.update(presenceEntriesTable)
      .set(updateData)
      .where(eq(presenceEntriesTable.id, input.id))
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Presence entry update failed:', error);
    throw error;
  }
};
