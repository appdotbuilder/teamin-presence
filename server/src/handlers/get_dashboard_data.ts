
import { db } from '../db';
import { usersTable, presenceEntriesTable } from '../db/schema';
import { type GetDashboardDataInput, type DashboardData } from '../schema';
import { eq, and, gte, lte, SQL } from 'drizzle-orm';

export const getDashboardData = async (input: GetDashboardDataInput, currentUserId: number): Promise<DashboardData> => {
  try {
    // Calculate week end date (6 days after start)
    const weekEnd = new Date(input.week_start);
    weekEnd.setDate(weekEnd.getDate() + 6);

    // Get current user to check role
    const currentUser = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, currentUserId))
      .execute();

    if (currentUser.length === 0) {
      throw new Error('Current user not found');
    }

    const isManager = currentUser[0].role === 'Manager';

    // Get users based on role permissions
    let users;
    if (isManager) {
      // Managers can see all users
      users = await db.select().from(usersTable).execute();
    } else {
      // Team members can only see their own data
      users = await db.select()
        .from(usersTable)
        .where(eq(usersTable.id, currentUserId))
        .execute();
    }

    // Get presence entries for the week
    const presenceConditions: SQL<unknown>[] = [
      gte(presenceEntriesTable.date, input.week_start),
      lte(presenceEntriesTable.date, weekEnd)
    ];

    // Filter presence entries based on role permissions
    if (!isManager) {
      presenceConditions.push(eq(presenceEntriesTable.user_id, currentUserId));
    }

    const presenceEntries = await db.select()
      .from(presenceEntriesTable)
      .where(and(...presenceConditions))
      .execute();

    return {
      users,
      presence_entries: presenceEntries,
      week_start: input.week_start,
      week_end: weekEnd
    };
  } catch (error) {
    console.error('Dashboard data fetch failed:', error);
    throw error;
  }
};
