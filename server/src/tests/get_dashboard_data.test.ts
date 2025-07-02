
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, presenceEntriesTable } from '../db/schema';
import { type GetDashboardDataInput } from '../schema';
import { getDashboardData } from '../handlers/get_dashboard_data';

describe('getDashboardData', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let managerId: number;
  let teamMemberId: number;
  let weekStart: Date;

  beforeEach(async () => {
    // Create test users
    const users = await db.insert(usersTable)
      .values([
        {
          email: 'manager@test.com',
          name: 'Test Manager',
          password_hash: 'hashed_password',
          role: 'Manager'
        },
        {
          email: 'member@test.com',
          name: 'Test Member',
          password_hash: 'hashed_password',
          role: 'Team Member'
        }
      ])
      .returning()
      .execute();

    managerId = users[0].id;
    teamMemberId = users[1].id;

    // Set up test week (Monday to Sunday)
    weekStart = new Date('2024-01-01'); // Monday

    // Create test presence entries
    await db.insert(presenceEntriesTable)
      .values([
        {
          user_id: managerId,
          status: 'In office',
          date: new Date('2024-01-01'),
          created_by: managerId
        },
        {
          user_id: teamMemberId,
          status: 'Working from home',
          date: new Date('2024-01-02'),
          created_by: teamMemberId
        },
        {
          user_id: managerId,
          status: 'On vacation',
          date: new Date('2024-01-03'),
          created_by: managerId
        }
      ])
      .execute();
  });

  it('should return complete dashboard data for manager', async () => {
    const input: GetDashboardDataInput = {
      week_start: weekStart
    };

    const result = await getDashboardData(input, managerId);

    // Manager should see all users
    expect(result.users).toHaveLength(2);
    expect(result.users.find(u => u.role === 'Manager')).toBeDefined();
    expect(result.users.find(u => u.role === 'Team Member')).toBeDefined();

    // Manager should see all presence entries for the week
    expect(result.presence_entries).toHaveLength(3);
    
    // Check week dates
    expect(result.week_start).toEqual(weekStart);
    const expectedWeekEnd = new Date('2024-01-07'); // Sunday
    expect(result.week_end).toEqual(expectedWeekEnd);
  });

  it('should return limited dashboard data for team member', async () => {
    const input: GetDashboardDataInput = {
      week_start: weekStart
    };

    const result = await getDashboardData(input, teamMemberId);

    // Team member should only see themselves
    expect(result.users).toHaveLength(1);
    expect(result.users[0].id).toEqual(teamMemberId);
    expect(result.users[0].role).toEqual('Team Member');

    // Team member should only see their own presence entries
    expect(result.presence_entries).toHaveLength(1);
    expect(result.presence_entries[0].user_id).toEqual(teamMemberId);
    expect(result.presence_entries[0].status).toEqual('Working from home');

    // Check week dates
    expect(result.week_start).toEqual(weekStart);
    const expectedWeekEnd = new Date('2024-01-07');
    expect(result.week_end).toEqual(expectedWeekEnd);
  });

  it('should filter presence entries by week correctly', async () => {
    // Create entries outside the test week
    await db.insert(presenceEntriesTable)
      .values([
        {
          user_id: managerId,
          status: 'In office',
          date: new Date('2023-12-31'), // Before week
          created_by: managerId
        },
        {
          user_id: managerId,
          status: 'Working from home',
          date: new Date('2024-01-08'), // After week
          created_by: managerId
        }
      ])
      .execute();

    const input: GetDashboardDataInput = {
      week_start: weekStart
    };

    const result = await getDashboardData(input, managerId);

    // Should only include entries within the week (Jan 1-7)
    expect(result.presence_entries).toHaveLength(3);
    result.presence_entries.forEach(entry => {
      expect(entry.date >= weekStart).toBe(true);
      expect(entry.date <= result.week_end).toBe(true);
    });
  });

  it('should throw error for non-existent user', async () => {
    const input: GetDashboardDataInput = {
      week_start: weekStart
    };

    await expect(getDashboardData(input, 9999)).rejects.toThrow(/user not found/i);
  });

  it('should calculate week end date correctly', async () => {
    const input: GetDashboardDataInput = {
      week_start: new Date('2024-02-15') // Thursday
    };

    const result = await getDashboardData(input, managerId);

    expect(result.week_start).toEqual(new Date('2024-02-15'));
    expect(result.week_end).toEqual(new Date('2024-02-21')); // 6 days later
  });
});
