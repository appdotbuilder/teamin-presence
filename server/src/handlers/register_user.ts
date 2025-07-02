
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type RegisterInput, type User } from '../schema';
import { eq } from 'drizzle-orm';

export const registerUser = async (input: RegisterInput): Promise<User> => {
  try {
    // Check if user with this email already exists
    const existingUsers = await db.select()
      .from(usersTable)
      .where(eq(usersTable.email, input.email))
      .execute();

    if (existingUsers.length > 0) {
      throw new Error('Email already registered');
    }

    // Hash the password (simple hash for demo - in production use bcrypt)
    const passwordHash = await Bun.password.hash(input.password);

    // Insert new user
    const result = await db.insert(usersTable)
      .values({
        email: input.email,
        name: input.name,
        password_hash: passwordHash,
        role: input.role
      })
      .returning()
      .execute();

    const user = result[0];
    
    // Return user without password_hash
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      created_at: user.created_at,
      updated_at: user.updated_at
    };
  } catch (error) {
    console.error('User registration failed:', error);
    throw error;
  }
};
