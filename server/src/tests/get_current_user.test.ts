
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { getCurrentUser } from '../handlers/get_current_user';

describe('getCurrentUser', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return user data for valid user ID', async () => {
    // Create test user
    const testUser = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        name: 'Test User',
        password_hash: 'hashedpassword',
        role: 'Team Member'
      })
      .returning()
      .execute();

    const userId = testUser[0].id;

    const result = await getCurrentUser(userId);

    expect(result.id).toEqual(userId);
    expect(result.email).toEqual('test@example.com');
    expect(result.name).toEqual('Test User');
    expect(result.role).toEqual('Team Member');
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should return manager user data correctly', async () => {
    // Create manager user
    const managerUser = await db.insert(usersTable)
      .values({
        email: 'manager@example.com',
        name: 'Manager User',
        password_hash: 'hashedpassword',
        role: 'Manager'
      })
      .returning()
      .execute();

    const userId = managerUser[0].id;

    const result = await getCurrentUser(userId);

    expect(result.id).toEqual(userId);
    expect(result.email).toEqual('manager@example.com');
    expect(result.name).toEqual('Manager User');
    expect(result.role).toEqual('Manager');
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should throw error for non-existent user ID', async () => {
    const nonExistentUserId = 999;

    await expect(getCurrentUser(nonExistentUserId))
      .rejects
      .toThrow(/User with ID 999 not found/i);
  });

  it('should throw error for invalid user ID', async () => {
    const invalidUserId = -1;

    await expect(getCurrentUser(invalidUserId))
      .rejects
      .toThrow(/User with ID -1 not found/i);
  });
});
