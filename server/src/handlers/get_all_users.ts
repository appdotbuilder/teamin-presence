
import { db } from '../db';
import { usersTable } from '../db/schema';
import { eq } from 'drizzle-orm';
import { type User } from '../schema';

export const getAllUsers = async (currentUserId: number): Promise<User[]> => {
  try {
    // First, verify that the current user exists and is a manager
    const currentUser = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, currentUserId))
      .execute();

    if (currentUser.length === 0) {
      throw new Error('User not found');
    }

    if (currentUser[0].role !== 'Manager') {
      throw new Error('Insufficient permissions: Manager role required');
    }

    // Fetch all users, excluding sensitive password_hash field
    const users = await db.select({
      id: usersTable.id,
      email: usersTable.email,
      name: usersTable.name,
      role: usersTable.role,
      created_at: usersTable.created_at,
      updated_at: usersTable.updated_at
    })
    .from(usersTable)
    .execute();

    return users;
  } catch (error) {
    console.error('Failed to get all users:', error);
    throw error;
  }
};
