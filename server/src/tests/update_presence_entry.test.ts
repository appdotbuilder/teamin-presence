
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, presenceEntriesTable } from '../db/schema';
import { type UpdatePresenceEntryInput } from '../schema';
import { updatePresenceEntry } from '../handlers/update_presence_entry';
import { eq } from 'drizzle-orm';

describe('updatePresenceEntry', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let managerId: number;
  let teamMemberId: number;
  let presenceEntryId: number;

  beforeEach(async () => {
    // Create test users
    const managerResult = await db.insert(usersTable)
      .values({
        email: 'manager@test.com',
        name: 'Test Manager',
        password_hash: 'hashed_password',
        role: 'Manager'
      })
      .returning()
      .execute();
    managerId = managerResult[0].id;

    const teamMemberResult = await db.insert(usersTable)
      .values({
        email: 'member@test.com',
        name: 'Test Member',
        password_hash: 'hashed_password',
        role: 'Team Member'
      })
      .returning()
      .execute();
    teamMemberId = teamMemberResult[0].id;

    // Create test presence entry
    const presenceResult = await db.insert(presenceEntriesTable)
      .values({
        user_id: teamMemberId,
        status: 'In office',
        date: new Date('2024-01-15'),
        created_by: teamMemberId
      })
      .returning()
      .execute();
    presenceEntryId = presenceResult[0].id;
  });

  it('should update presence entry status', async () => {
    const input: UpdatePresenceEntryInput = {
      id: presenceEntryId,
      status: 'Working from home'
    };

    const result = await updatePresenceEntry(input, teamMemberId);

    expect(result.id).toEqual(presenceEntryId);
    expect(result.status).toEqual('Working from home');
    expect(result.date).toEqual(new Date('2024-01-15'));
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should update presence entry date', async () => {
    const newDate = new Date('2024-01-20');
    const input: UpdatePresenceEntryInput = {
      id: presenceEntryId,
      date: newDate
    };

    const result = await updatePresenceEntry(input, teamMemberId);

    expect(result.id).toEqual(presenceEntryId);
    expect(result.status).toEqual('In office'); // Should remain unchanged
    expect(result.date).toEqual(newDate);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should update both status and date', async () => {
    const newDate = new Date('2024-01-25');
    const input: UpdatePresenceEntryInput = {
      id: presenceEntryId,
      status: 'On vacation',
      date: newDate
    };

    const result = await updatePresenceEntry(input, teamMemberId);

    expect(result.id).toEqual(presenceEntryId);
    expect(result.status).toEqual('On vacation');
    expect(result.date).toEqual(newDate);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should save changes to database', async () => {
    const input: UpdatePresenceEntryInput = {
      id: presenceEntryId,
      status: 'Working from home'
    };

    await updatePresenceEntry(input, teamMemberId);

    const entries = await db.select()
      .from(presenceEntriesTable)
      .where(eq(presenceEntriesTable.id, presenceEntryId))
      .execute();

    expect(entries).toHaveLength(1);
    expect(entries[0].status).toEqual('Working from home');
    expect(entries[0].updated_at).toBeInstanceOf(Date);
  });

  it('should allow manager to update any entry', async () => {
    const input: UpdatePresenceEntryInput = {
      id: presenceEntryId,
      status: 'Working from home'
    };

    const result = await updatePresenceEntry(input, managerId);

    expect(result.id).toEqual(presenceEntryId);
    expect(result.status).toEqual('Working from home');
  });

  it('should prevent team member from updating other users entries', async () => {
    // Create another team member
    const anotherMemberResult = await db.insert(usersTable)
      .values({
        email: 'another@test.com',
        name: 'Another Member',
        password_hash: 'hashed_password',
        role: 'Team Member'
      })
      .returning()
      .execute();

    const input: UpdatePresenceEntryInput = {
      id: presenceEntryId,
      status: 'Working from home'
    };

    await expect(updatePresenceEntry(input, anotherMemberResult[0].id))
      .rejects.toThrow(/permission denied/i);
  });

  it('should reject dates more than two weeks in future', async () => {
    const farFutureDate = new Date();
    farFutureDate.setDate(farFutureDate.getDate() + 15); // 15 days in future

    const input: UpdatePresenceEntryInput = {
      id: presenceEntryId,
      date: farFutureDate
    };

    await expect(updatePresenceEntry(input, teamMemberId))
      .rejects.toThrow(/more than two weeks/i);
  });

  it('should allow dates exactly two weeks in future', async () => {
    const twoWeeksFromNow = new Date();
    twoWeeksFromNow.setDate(twoWeeksFromNow.getDate() + 14);

    const input: UpdatePresenceEntryInput = {
      id: presenceEntryId,
      date: twoWeeksFromNow
    };

    const result = await updatePresenceEntry(input, teamMemberId);

    expect(result.date).toEqual(twoWeeksFromNow);
  });

  it('should throw error for non-existent entry', async () => {
    const input: UpdatePresenceEntryInput = {
      id: 99999,
      status: 'Working from home'
    };

    await expect(updatePresenceEntry(input, teamMemberId))
      .rejects.toThrow(/not found/i);
  });

  it('should throw error for non-existent current user', async () => {
    const input: UpdatePresenceEntryInput = {
      id: presenceEntryId,
      status: 'Working from home'
    };

    await expect(updatePresenceEntry(input, 99999))
      .rejects.toThrow(/current user not found/i);
  });
});
