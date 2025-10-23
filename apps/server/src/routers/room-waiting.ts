import { z } from "zod";

import { operations } from "../room";
import { publicProcedure, router } from "../trpc";

export const roomWaitingListRouter = router({
	waitResponse: publicProcedure
		.input(
			z.object({
				roomId: z.string(),
				userId: z.string(),
			}),
		)
		.query(async ({ input }) => {
			return operations.waitForAdmission(input.roomId, input.userId);
		}),
});
