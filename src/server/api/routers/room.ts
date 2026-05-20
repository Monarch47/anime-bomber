import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "../trpc";
import { getRoomManager } from "../../game/rooms";

export const roomRouter = createTRPCRouter({
  /** Creates an empty room and returns its join code. */
  create: publicProcedure.mutation(() => {
    const code = getRoomManager().createRoom();
    return { code };
  }),

  /** Checks whether a room code is currently active. */
  exists: publicProcedure
    .input(z.object({ code: z.string().min(1).max(8) }))
    .query(({ input }) => {
      const code = input.code.trim().toUpperCase();
      return { code, exists: getRoomManager().roomExists(code) };
    }),
});
