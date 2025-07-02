
import { db } from '../db';
import { presenceEntriesTable, usersTable } from '../db/schema';
import { type DeletePresenceEntryInput } from '../schema';
import { eq, and } from 'drizzle-orm';

export const deletePresenceEntry = async (input: DeletePresenceEntryInput, currentUserId: number): Promise<{ success: boolean }> => {
  try {
    // First, get the presence entry to check ownership and get user info
    const entryResult = await db.select({
      user_id: presenceEntriesTable.user_id,
      created_by: presenceEntriesTable.created_by
    })
      .from(presenceEntriesTable)
      .where(eq(presenceEntriesTable.id, input.id))
      .execute();

    if (entryResult.length === 0) {
      throw new Error('Presence entry not found');
    }

    const entry = entryResult[0];

    // Get current user's role
    const currentUserResult = await db.select({
      role: usersTable.role
    })
      .from(usersTable)
      .where(eq(usersTable.id, currentUserId))
      .execute();

    if (currentUserResult.length === 0) {
      throw new Error('Current user not found');
    }

    const currentUser = currentUserResult[0];

    // Check permissions:
    // 1. User can delete their own entries
    // 2. User can delete entries they created (for manager overrides)
    // 3. Managers can delete any entry
    const canDelete = 
      entry.user_id === currentUserId || // Own entry
      entry.created_by === currentUserId || // Entry they created
      currentUser.role === 'Manager'; // Manager role

    if (!canDelete) {
      throw new Error('Insufficient permissions to delete this presence entry');
    }

    // Delete the presence entry
    const deleteResult = await db.delete(presenceEntriesTable)
      .where(eq(presenceEntriesTable.id, input.id))
      .execute();

    return { success: true };
  } catch (error) {
    console.error('Presence entry deletion failed:', error);
    throw error;
  }
};
