// utils/trpc.ts

import { createTRPCReact } from "@trpc/react-query";
import type { AppRouter } from "server/src/main";

export const trpc = createTRPCReact<AppRouter>();
