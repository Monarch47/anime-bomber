import { createTRPCRouter } from "./trpc";
import { roomRouter } from "./routers/room";
import { statsRouter } from "./routers/stats";

export const appRouter = createTRPCRouter({
  room: roomRouter,
  stats: statsRouter,
});

export type AppRouter = typeof appRouter;
