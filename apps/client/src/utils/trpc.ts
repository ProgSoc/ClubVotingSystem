// utils/trpc.ts
import type { AppRouter } from '@server/main';
import { createTRPCReact } from '@trpc/react-query';

export const trpc = createTRPCReact<AppRouter>();
