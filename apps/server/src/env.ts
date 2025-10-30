import { createEnv } from "@t3-oss/env-core";
import z from "zod";

export const env = createEnv({
	server: {
		PORT: z.coerce.number().default(8080),
		PUBLIC_DIR: z.string().optional(),
		TRUSTED_PROXIES: z
			.string()
			.transform((value) => value.split(","))
			.pipe(z.string().array())
			.optional(),
		DATABASE_URL: z.string().min(1),
	},
	runtimeEnv: process.env,
});
