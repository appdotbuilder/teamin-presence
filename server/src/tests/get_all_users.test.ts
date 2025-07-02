
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { getAllUsers } from '../handlers/get_all_users';

describe('getAllUsers', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return all users when called by a manager', async () => {
    // Create a manager user
    const managerResult = await db.insert(usersTable)
      .values({
        email: 'manager@test.com',
        name: 'Test Manager',
        password_hash: 'hashed_password',
        role: 'Manager'
      })
      .returning()
      .execute();

    // Create some team member users
    await db.insert(usersTable)
      .values([
        {
          email: 'member1@test.com',
          name: 'Team Member 1',
          password_hash: 'hashed_password',
          role: 'Team Member'
        },
        {
          email: 'member2@test.com',
          name: 'Team Member 2',
          password_hash: 'hashed_password',
          role: 'Team Member'
        }
      ])
      .execute();

    const managerId = managerResult[0].id;
    const result = await getAllUsers(managerId);

    // Should return all 3 users
    expect(result).toHaveLength(3);
    
    // Verify user structure and no password_hash
    result.forEach(user => {
      expect(user.id).toBeDefined();
      expect(user.email).toBeDefined();
      expect(user.name).toBeDefined();
      expect(user.role).toBeDefined();
      expect(user.created_at).toBeInstanceOf(Date);
      expect(user.updated_at).toBeInstanceOf(Date);
      expect((user as any).password_hash).toBeUndefined();
    });

    // Verify specific users exist
    const emails = result.map(u => u.email);
    expect(emails).toContain('manager@test.com');
    expect(emails).toContain('member1@test.com');
    expect(emails).toContain('member2@test.com');
  });

  it('should throw error when called by team member', async () => {
    // Create a team member user
    const memberResult = await db.insert(usersTable)
      .values({
        email: 'member@test.com',
        name: 'Team Member',
        password_hash: 'hashed_password',
        role: 'Team Member'
      })
      .returning()
      .execute();

    const memberId = memberResult[0].id;

    await expect(getAllUsers(memberId)).rejects.toThrow(/insufficient permissions/i);
  });

  it('should throw error when user does not exist', async () => {
    const nonExistentUserId = 999;

    await expect(getAllUsers(nonExistentUserId)).rejects.toThrow(/user not found/i);
  });

  it('should return empty array when no users exist except the manager', async () => {
    // Create only a manager user
    const managerResult = await db.insert(usersTable)
      .values({
        email: 'manager@test.com',
        name: 'Test Manager',
        password_hash: 'hashed_password',
        role: 'Manager'
      })
      .returning()
      .execute();

    const managerId = managerResult[0].id;
    const result = await getAllUsers(managerId);

    // Should return just the manager
    expect(result).toHaveLength(1);
    expect(result[0].email).toEqual('manager@test.com');
    expect(result[0].role).toEqual('Manager');
  });
});
