
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, presenceEntriesTable } from '../db/schema';
import { type GetPresenceEntriesInput } from '../schema';
import { getPresenceEntries } from '../handlers/get_presence_entries';

describe('getPresenceEntries', () => {
  let managerId: number;
  let teamMemberId: number;
  let otherTeamMemberId: number;

  beforeEach(async () => {
    await createDB();

    // Create test users
    const users = await db.insert(usersTable)
      .values([
        {
          email: 'manager@test.com',
          name: 'Manager User',
          password_hash: 'hashed_password',
          role: 'Manager'
        },
        {
          email: 'member@test.com',
          name: 'Team Member',
          password_hash: 'hashed_password',
          role: 'Team Member'
        },
        {
          email: 'other@test.com',
          name: 'Other Member',
          password_hash: 'hashed_password',
          role: 'Team Member'
        }
      ])
      .returning()
      .execute();

    managerId = users[0].id;
    teamMemberId = users[1].id;
    otherTeamMemberId = users[2].id;

    // Create test presence entries
    const baseDate = new Date('2024-01-15');
    const entries = [];

    // Create entries for different dates and users
    for (let i = 0; i < 5; i++) {
      const entryDate = new Date(baseDate);
      entryDate.setDate(baseDate.getDate() + i);

      entries.push({
        user_id: teamMemberId,
        status: 'In office' as const,
        date: entryDate,
        created_by: teamMemberId
      });

      entries.push({
        user_id: otherTeamMemberId,
        status: 'Working from home' as const,
        date: entryDate,
        created_by: otherTeamMemberId
      });
    }

    await db.insert(presenceEntriesTable)
      .values(entries)
      .execute();
  });

  afterEach(resetDB);

  describe('Manager permissions', () => {
    it('should return all presence entries within date range when no user_id specified', async () => {
      const input: GetPresenceEntriesInput = {
        start_date: new Date('2024-01-15'),
        end_date: new Date('2024-01-17')
      };

      const result = await getPresenceEntries(input, managerId);

      expect(result).toHaveLength(6); // 3 days × 2 users
      expect(result.some(entry => entry.user_id === teamMemberId)).toBe(true);
      expect(result.some(entry => entry.user_id === otherTeamMemberId)).toBe(true);
    });

    it('should return specific user entries when user_id specified', async () => {
      const input: GetPresenceEntriesInput = {
        start_date: new Date('2024-01-15'),
        end_date: new Date('2024-01-17'),
        user_id: teamMemberId
      };

      const result = await getPresenceEntries(input, managerId);

      expect(result).toHaveLength(3); // 3 days for specific user
      expect(result.every(entry => entry.user_id === teamMemberId)).toBe(true);
    });

    it('should filter by date range correctly', async () => {
      const input: GetPresenceEntriesInput = {
        start_date: new Date('2024-01-16'),
        end_date: new Date('2024-01-16')
      };

      const result = await getPresenceEntries(input, managerId);

      expect(result).toHaveLength(2); // 1 day × 2 users
      expect(result.every(entry => {
        const entryDate = new Date(entry.date);
        return entryDate.toDateString() === new Date('2024-01-16').toDateString();
      })).toBe(true);
    });
  });

  describe('Team Member permissions', () => {
    it('should return only own entries when no user_id specified', async () => {
      const input: GetPresenceEntriesInput = {
        start_date: new Date('2024-01-15'),
        end_date: new Date('2024-01-17')
      };

      const result = await getPresenceEntries(input, teamMemberId);

      expect(result).toHaveLength(3); // 3 days for own entries only
      expect(result.every(entry => entry.user_id === teamMemberId)).toBe(true);
    });

    it('should return own entries when requesting own user_id', async () => {
      const input: GetPresenceEntriesInput = {
        start_date: new Date('2024-01-15'),
        end_date: new Date('2024-01-17'),
        user_id: teamMemberId
      };

      const result = await getPresenceEntries(input, teamMemberId);

      expect(result).toHaveLength(3);
      expect(result.every(entry => entry.user_id === teamMemberId)).toBe(true);
    });

    it('should reject request for other user entries', async () => {
      const input: GetPresenceEntriesInput = {
        start_date: new Date('2024-01-15'),
        end_date: new Date('2024-01-17'),
        user_id: otherTeamMemberId
      };

      await expect(getPresenceEntries(input, teamMemberId))
        .rejects.toThrow(/access denied.*team members can only view their own/i);
    });
  });

  describe('Error handling', () => {
    it('should reject requests from non-existent users', async () => {
      const input: GetPresenceEntriesInput = {
        start_date: new Date('2024-01-15'),
        end_date: new Date('2024-01-17')
      };

      await expect(getPresenceEntries(input, 999))
        .rejects.toThrow(/user not found/i);
    });

    it('should handle empty results correctly', async () => {
      const input: GetPresenceEntriesInput = {
        start_date: new Date('2024-02-01'),
        end_date: new Date('2024-02-02')
      };

      const result = await getPresenceEntries(input, managerId);

      expect(result).toHaveLength(0);
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('Date range validation', () => {
    it('should include entries on start and end dates', async () => {
      const startDate = new Date('2024-01-15');
      const endDate = new Date('2024-01-15');

      const input: GetPresenceEntriesInput = {
        start_date: startDate,
        end_date: endDate
      };

      const result = await getPresenceEntries(input, managerId);

      expect(result).toHaveLength(2); // Both users have entries on this date
      expect(result.every(entry => {
        const entryDate = new Date(entry.date);
        return entryDate >= startDate && entryDate <= endDate;
      })).toBe(true);
    });
  });
});
