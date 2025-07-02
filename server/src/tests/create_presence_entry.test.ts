
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, presenceEntriesTable } from '../db/schema';
import { type CreatePresenceEntryInput } from '../schema';
import { createPresenceEntry } from '../handlers/create_presence_entry';
import { eq, and } from 'drizzle-orm';

describe('createPresenceEntry', () => {
  let managerId: number;
  let teamMemberId: number;
  let testDate: Date;

  beforeEach(async () => {
    await createDB();

    // Create test users
    const managerResult = await db.insert(usersTable)
      .values({
        email: 'manager@test.com',
        name: 'Test Manager',
        password_hash: 'hash123',
        role: 'Manager'
      })
      .returning()
      .execute();
    managerId = managerResult[0].id;

    const teamMemberResult = await db.insert(usersTable)
      .values({
        email: 'member@test.com',
        name: 'Test Member',
        password_hash: 'hash123',
        role: 'Team Member'
      })
      .returning()
      .execute();
    teamMemberId = teamMemberResult[0].id;

    // Set test date to tomorrow
    testDate = new Date();
    testDate.setDate(testDate.getDate() + 1);
  });

  afterEach(resetDB);

  it('should create a presence entry for own user', async () => {
    const input: CreatePresenceEntryInput = {
      user_id: teamMemberId,
      status: 'In office',
      date: testDate
    };

    const result = await createPresenceEntry(input, teamMemberId);

    expect(result.user_id).toEqual(teamMemberId);
    expect(result.status).toEqual('In office');
    expect(result.date).toEqual(testDate);
    expect(result.created_by).toEqual(teamMemberId);
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should allow manager to create entry for other user', async () => {
    const input: CreatePresenceEntryInput = {
      user_id: teamMemberId,
      status: 'Working from home',
      date: testDate
    };

    const result = await createPresenceEntry(input, managerId);

    expect(result.user_id).toEqual(teamMemberId);
    expect(result.status).toEqual('Working from home');
    expect(result.created_by).toEqual(managerId);
  });

  it('should save presence entry to database', async () => {
    const input: CreatePresenceEntryInput = {
      user_id: teamMemberId,
      status: 'On vacation',
      date: testDate
    };

    const result = await createPresenceEntry(input, teamMemberId);

    const entries = await db.select()
      .from(presenceEntriesTable)
      .where(eq(presenceEntriesTable.id, result.id))
      .execute();

    expect(entries).toHaveLength(1);
    expect(entries[0].user_id).toEqual(teamMemberId);
    expect(entries[0].status).toEqual('On vacation');
    expect(entries[0].date).toEqual(testDate);
    expect(entries[0].created_by).toEqual(teamMemberId);
  });

  it('should prevent team member from creating entry for other user', async () => {
    const input: CreatePresenceEntryInput = {
      user_id: managerId,
      status: 'In office',
      date: testDate
    };

    await expect(createPresenceEntry(input, teamMemberId))
      .rejects.toThrow(/only managers can create presence entries for other users/i);
  });

  it('should prevent creating entry more than two weeks in future', async () => {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 15); // 15 days = more than 2 weeks

    const input: CreatePresenceEntryInput = {
      user_id: teamMemberId,
      status: 'In office',
      date: futureDate
    };

    await expect(createPresenceEntry(input, teamMemberId))
      .rejects.toThrow(/cannot create presence entry more than two weeks in the future/i);
  });

  it('should prevent duplicate entries for same user and date', async () => {
    const input: CreatePresenceEntryInput = {
      user_id: teamMemberId,
      status: 'In office',
      date: testDate
    };

    // Create first entry
    await createPresenceEntry(input, teamMemberId);

    // Attempt to create duplicate
    await expect(createPresenceEntry(input, teamMemberId))
      .rejects.toThrow(/presence entry already exists for this user and date/i);
  });

  it('should reject creation for non-existent target user', async () => {
    const input: CreatePresenceEntryInput = {
      user_id: 99999, // Non-existent user
      status: 'In office',
      date: testDate
    };

    await expect(createPresenceEntry(input, managerId))
      .rejects.toThrow(/target user not found/i);
  });

  it('should reject creation with non-existent current user', async () => {
    const input: CreatePresenceEntryInput = {
      user_id: teamMemberId,
      status: 'In office',
      date: testDate
    };

    await expect(createPresenceEntry(input, 99999)) // Non-existent current user
      .rejects.toThrow(/current user not found/i);
  });

  it('should allow creating entry exactly two weeks in future', async () => {
    const twoWeeksFromNow = new Date();
    twoWeeksFromNow.setDate(twoWeeksFromNow.getDate() + 14);

    const input: CreatePresenceEntryInput = {
      user_id: teamMemberId,
      status: 'In office',
      date: twoWeeksFromNow
    };

    const result = await createPresenceEntry(input, teamMemberId);

    expect(result.date).toEqual(twoWeeksFromNow);
    expect(result.user_id).toEqual(teamMemberId);
  });
});
