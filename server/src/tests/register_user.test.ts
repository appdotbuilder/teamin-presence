
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type RegisterInput } from '../schema';
import { registerUser } from '../handlers/register_user';
import { eq } from 'drizzle-orm';

// Test input
const testInput: RegisterInput = {
  email: 'test@example.com',
  name: 'Test User',
  password: 'password123',
  role: 'Team Member'
};

describe('registerUser', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a new user', async () => {
    const result = await registerUser(testInput);

    // Basic field validation
    expect(result.email).toEqual('test@example.com');
    expect(result.name).toEqual('Test User');
    expect(result.role).toEqual('Team Member');
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
    
    // Should not return password hash
    expect((result as any).password_hash).toBeUndefined();
  });

  it('should save user to database with hashed password', async () => {
    const result = await registerUser(testInput);

    // Query database to verify user was saved
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, result.id))
      .execute();

    expect(users).toHaveLength(1);
    const user = users[0];
    
    expect(user.email).toEqual('test@example.com');
    expect(user.name).toEqual('Test User');
    expect(user.role).toEqual('Team Member');
    expect(user.password_hash).toBeDefined();
    expect(user.password_hash).not.toEqual('password123'); // Should be hashed
    expect(user.created_at).toBeInstanceOf(Date);
    expect(user.updated_at).toBeInstanceOf(Date);
  });

  it('should hash the password correctly', async () => {
    const result = await registerUser(testInput);

    // Get the stored user with password hash
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, result.id))
      .execute();

    const user = users[0];
    
    // Verify password can be verified with Bun's password utilities
    const isValid = await Bun.password.verify('password123', user.password_hash);
    expect(isValid).toBe(true);
    
    // Verify wrong password fails
    const isInvalid = await Bun.password.verify('wrongpassword', user.password_hash);
    expect(isInvalid).toBe(false);
  });

  it('should reject duplicate email addresses', async () => {
    // Create first user
    await registerUser(testInput);

    // Try to create second user with same email
    const duplicateInput: RegisterInput = {
      ...testInput,
      name: 'Different User'
    };

    await expect(registerUser(duplicateInput)).rejects.toThrow(/email already registered/i);
  });

  it('should create manager users correctly', async () => {
    const managerInput: RegisterInput = {
      email: 'manager@example.com',
      name: 'Test Manager',
      password: 'managerpass123',
      role: 'Manager'
    };

    const result = await registerUser(managerInput);

    expect(result.role).toEqual('Manager');
    expect(result.email).toEqual('manager@example.com');
    expect(result.name).toEqual('Test Manager');
  });

  it('should maintain email uniqueness across roles', async () => {
    // Create team member
    await registerUser(testInput);

    // Try to create manager with same email
    const managerInput: RegisterInput = {
      email: 'test@example.com', // Same email
      name: 'Manager User',
      password: 'different123',
      role: 'Manager'
    };

    await expect(registerUser(managerInput)).rejects.toThrow(/email already registered/i);
  });
});
