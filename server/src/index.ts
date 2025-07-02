
import { initTRPC, TRPCError } from '@trpc/server';
import { createHTTPServer } from '@trpc/server/adapters/standalone';
import 'dotenv/config';
import cors from 'cors';
import superjson from 'superjson';

// Import schemas
import {
  registerInputSchema,
  loginInputSchema,
  createPresenceEntryInputSchema,
  updatePresenceEntryInputSchema,
  deletePresenceEntryInputSchema,
  getPresenceEntriesInputSchema,
  getDashboardDataInputSchema
} from './schema';

// Import handlers
import { registerUser } from './handlers/register_user';
import { loginUser } from './handlers/login_user';
import { getCurrentUser } from './handlers/get_current_user';
import { createPresenceEntry } from './handlers/create_presence_entry';
import { updatePresenceEntry } from './handlers/update_presence_entry';
import { deletePresenceEntry } from './handlers/delete_presence_entry';
import { getPresenceEntries } from './handlers/get_presence_entries';
import { getDashboardData } from './handlers/get_dashboard_data';
import { getAllUsers } from './handlers/get_all_users';

// Create context type
interface Context {
  userId?: number;
}

const t = initTRPC.context<Context>().create({
  transformer: superjson,
});

const publicProcedure = t.procedure;
const protectedProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.userId) {
    throw new TRPCError({ code: 'UNAUTHORIZED' });
  }
  return next({
    ctx: {
      ...ctx,
      userId: ctx.userId,
    },
  });
});

const router = t.router;

const appRouter = router({
  // Health check
  healthcheck: publicProcedure.query(() => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }),

  // Authentication routes
  register: publicProcedure
    .input(registerInputSchema)
    .mutation(({ input }) => registerUser(input)),

  login: publicProcedure
    .input(loginInputSchema)
    .mutation(({ input }) => loginUser(input)),

  getCurrentUser: protectedProcedure
    .query(({ ctx }) => getCurrentUser(ctx.userId)),

  // User management routes
  getAllUsers: protectedProcedure
    .query(({ ctx }) => getAllUsers(ctx.userId)),

  // Presence management routes
  createPresenceEntry: protectedProcedure
    .input(createPresenceEntryInputSchema)
    .mutation(({ input, ctx }) => createPresenceEntry(input, ctx.userId)),

  updatePresenceEntry: protectedProcedure
    .input(updatePresenceEntryInputSchema)
    .mutation(({ input, ctx }) => updatePresenceEntry(input, ctx.userId)),

  deletePresenceEntry: protectedProcedure
    .input(deletePresenceEntryInputSchema)
    .mutation(({ input, ctx }) => deletePresenceEntry(input, ctx.userId)),

  getPresenceEntries: protectedProcedure
    .input(getPresenceEntriesInputSchema)
    .query(({ input, ctx }) => getPresenceEntries(input, ctx.userId)),

  // Dashboard routes
  getDashboardData: protectedProcedure
    .input(getDashboardDataInputSchema)
    .query(({ input, ctx }) => getDashboardData(input, ctx.userId)),
});

export type AppRouter = typeof appRouter;

async function start() {
  const port = process.env['SERVER_PORT'] || 2022;
  const server = createHTTPServer({
    middleware: (req, res, next) => {
      cors()(req, res, next);
    },
    router: appRouter,
    createContext({ req }): Context {
      // TODO: Implement JWT token extraction and validation
      // For now, return empty context - authentication will be implemented later
      const authHeader = req.headers.authorization;
      const userId = authHeader ? parseInt(authHeader.replace('Bearer ', '')) : undefined;
      
      return {
        userId,
      };
    },
  });
  
  server.listen(port);
  console.log(`TeamIn TRPC server listening at port: ${port}`);
}

start();
