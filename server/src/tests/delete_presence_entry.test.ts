
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, presenceEntriesTable } from '../db/schema';
import { type DeletePresenceEntryInput } from '../schema';
import { deletePresenceEntry } from '../handlers/delete_presence_entry';
import { eq } from 'drizzle-orm';

describe('deletePresenceEntry', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should allow user to delete their own presence entry', async () => {
    // Create a user
    const userResult = await db.insert(usersTable)
      .values({
        email: 'user@example.com',
        name: 'Test User',
        password_hash: 'hashed_password',
        role: 'Team Member'
      })
      .returning()
      .execute();

    const user = userResult[0];

    // Create a presence entry for the user
    const entryResult = await db.insert(presenceEntriesTable)
      .values({
        user_id: user.id,
        status: 'In office',
        date: new Date('2024-01-15'),
        created_by: user.id
      })
      .returning()
      .execute();

    const entry = entryResult[0];

    const input: DeletePresenceEntryInput = {
      id: entry.id
    };

    // User should be able to delete their own entry
    const result = await deletePresenceEntry(input, user.id);

    expect(result.success).toBe(true);

    // Verify entry is deleted
    const remainingEntries = await db.select()
      .from(presenceEntriesTable)
      .where(eq(presenceEntriesTable.id, entry.id))
      .execute();

    expect(remainingEntries).toHaveLength(0);
  });

  it('should allow user to delete entries they created (manager override)', async () => {
    // Create two users
    const managerResult = await db.insert(usersTable)
      .values({
        email: 'manager@example.com',
        name: 'Manager User',
        password_hash: 'hashed_password',
        role: 'Manager'
      })
      .returning()
      .execute();

    const teamMemberResult = await db.insert(usersTable)
      .values({
        email: 'member@example.com',
        name: 'Team Member',
        password_hash: 'hashed_password',
        role: 'Team Member'
      })
      .returning()
      .execute();

    const manager = managerResult[0];
    const teamMember = teamMemberResult[0];

    // Create a presence entry for team member, created by manager (override)
    const entryResult = await db.insert(presenceEntriesTable)
      .values({
        user_id: teamMember.id,
        status: 'Working from home',
        date: new Date('2024-01-15'),
        created_by: manager.id // Manager created this entry
      })
      .returning()
      .execute();

    const entry = entryResult[0];

    const input: DeletePresenceEntryInput = {
      id: entry.id
    };

    // Manager should be able to delete entry they created
    const result = await deletePresenceEntry(input, manager.id);

    expect(result.success).toBe(true);

    // Verify entry is deleted
    const remainingEntries = await db.select()
      .from(presenceEntriesTable)
      .where(eq(presenceEntriesTable.id, entry.id))
      .execute();

    expect(remainingEntries).toHaveLength(0);
  });

  it('should allow manager to delete any presence entry', async () => {
    // Create manager and team member
    const managerResult = await db.insert(usersTable)
      .values({
        email: 'manager@example.com',
        name: 'Manager User',
        password_hash: 'hashed_password',
        role: 'Manager'
      })
      .returning()
      .execute();

    const teamMemberResult = await db.insert(usersTable)
      .values({
        email: 'member@example.com',
        name: 'Team Member',
        password_hash: 'hashed_password',
        role: 'Team Member'
      })
      .returning()
      .execute();

    const manager = managerResult[0];
    const teamMember = teamMemberResult[0];

    // Create a presence entry for team member, created by themselves
    const entryResult = await db.insert(presenceEntriesTable)
      .values({
        user_id: teamMember.id,
        status: 'On vacation',
        date: new Date('2024-01-15'),
        created_by: teamMember.id
      })
      .returning()
      .execute();

    const entry = entryResult[0];

    const input: DeletePresenceEntryInput = {
      id: entry.id
    };

    // Manager should be able to delete any entry
    const result = await deletePresenceEntry(input, manager.id);

    expect(result.success).toBe(true);

    // Verify entry is deleted
    const remainingEntries = await db.select()
      .from(presenceEntriesTable)
      .where(eq(presenceEntriesTable.id, entry.id))
      .execute();

    expect(remainingEntries).toHaveLength(0);
  });

  it('should reject deletion when user has insufficient permissions', async () => {
    // Create two team members
    const user1Result = await db.insert(usersTable)
      .values({
        email: 'user1@example.com',
        name: 'User One',
        password_hash: 'hashed_password',
        role: 'Team Member'
      })
      .returning()
      .execute();

    const user2Result = await db.insert(usersTable)
      .values({
        email: 'user2@example.com',
        name: 'User Two',
        password_hash: 'hashed_password',
        role: 'Team Member'
      })
      .returning()
      .execute();

    const user1 = user1Result[0];
    const user2 = user2Result[0];

    // Create a presence entry for user1, created by user1
    const entryResult = await db.insert(presenceEntriesTable)
      .values({
        user_id: user1.id,
        status: 'In office',
        date: new Date('2024-01-15'),
        created_by: user1.id
      })
      .returning()
      .execute();

    const entry = entryResult[0];

    const input: DeletePresenceEntryInput = {
      id: entry.id
    };

    // User2 should not be able to delete user1's entry
    await expect(deletePresenceEntry(input, user2.id))
      .rejects.toThrow(/insufficient permissions/i);

    // Verify entry still exists
    const remainingEntries = await db.select()
      .from(presenceEntriesTable)
      .where(eq(presenceEntriesTable.id, entry.id))
      .execute();

    expect(remainingEntries).toHaveLength(1);
  });

  it('should reject deletion of non-existent presence entry', async () => {
    // Create a user
    const userResult = await db.insert(usersTable)
      .values({
        email: 'user@example.com',
        name: 'Test User',
        password_hash: 'hashed_password',
        role: 'Team Member'
      })
      .returning()
      .execute();

    const user = userResult[0];

    const input: DeletePresenceEntryInput = {
      id: 99999 // Non-existent ID
    };

    await expect(deletePresenceEntry(input, user.id))
      .rejects.toThrow(/presence entry not found/i);
  });

  it('should reject deletion when current user does not exist', async () => {
    // Create a user and presence entry
    const userResult = await db.insert(usersTable)
      .values({
        email: 'user@example.com',
        name: 'Test User',
        password_hash: 'hashed_password',
        role: 'Team Member'
      })
      .returning()
      .execute();

    const user = userResult[0];

    const entryResult = await db.insert(presenceEntriesTable)
      .values({
        user_id: user.id,
        status: 'In office',
        date: new Date('2024-01-15'),
        created_by: user.id
      })
      .returning()
      .execute();

    const entry = entryResult[0];

    const input: DeletePresenceEntryInput = {
      id: entry.id
    };

    // Use non-existent current user ID
    await expect(deletePresenceEntry(input, 99999))
      .rejects.toThrow(/current user not found/i);
  });
});
