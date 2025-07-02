
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type LoginInput } from '../schema';
import { loginUser } from '../handlers/login_user';

const testUser = {
  email: 'test@example.com',
  name: 'Test User',
  password: 'testpassword123',
  role: 'Team Member' as const
};

const testLoginInput: LoginInput = {
  email: testUser.email,
  password: testUser.password
};

describe('loginUser', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should login user with valid credentials', async () => {
    // Create test user with hashed password using Bun's built-in password hashing
    const hashedPassword = await Bun.password.hash(testUser.password);
    await db.insert(usersTable)
      .values({
        email: testUser.email,
        name: testUser.name,
        password_hash: hashedPassword,
        role: testUser.role
      })
      .execute();

    const result = await loginUser(testLoginInput);

    expect(result.email).toEqual(testUser.email);
    expect(result.name).toEqual(testUser.name);
    expect(result.role).toEqual(testUser.role);
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should throw error for non-existent user', async () => {
    const invalidInput: LoginInput = {
      email: 'nonexistent@example.com',
      password: 'anypassword'
    };

    await expect(loginUser(invalidInput)).rejects.toThrow(/invalid credentials/i);
  });

  it('should throw error for invalid password', async () => {
    // Create test user with hashed password
    const hashedPassword = await Bun.password.hash(testUser.password);
    await db.insert(usersTable)
      .values({
        email: testUser.email,
        name: testUser.name,
        password_hash: hashedPassword,
        role: testUser.role
      })
      .execute();

    const invalidInput: LoginInput = {
      email: testUser.email,
      password: 'wrongpassword'
    };

    await expect(loginUser(invalidInput)).rejects.toThrow(/invalid credentials/i);
  });

  it('should login manager user correctly', async () => {
    // Create manager user
    const managerUser = {
      ...testUser,
      email: 'manager@example.com',
      role: 'Manager' as const
    };

    const hashedPassword = await Bun.password.hash(managerUser.password);
    await db.insert(usersTable)
      .values({
        email: managerUser.email,
        name: managerUser.name,
        password_hash: hashedPassword,
        role: managerUser.role
      })
      .execute();

    const managerInput: LoginInput = {
      email: managerUser.email,
      password: managerUser.password
    };

    const result = await loginUser(managerInput);

    expect(result.email).toEqual(managerUser.email);
    expect(result.role).toEqual('Manager');
    expect(result.id).toBeDefined();
  });
});
