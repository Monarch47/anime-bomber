import { createTRPCRouter, publicProcedure } from "../trpc";
import { dictionaryStats } from "../../game/dictionary";

export const statsRouter = createTRPCRouter({
  /** Word counts powering the home-screen blurb. */
  dictionary: publicProcedure.query(() => dictionaryStats()),
});
