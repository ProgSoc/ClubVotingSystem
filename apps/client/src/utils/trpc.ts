// utils/trpc.ts
import type { AppRouter } from '@server/server';
import { createTRPCReact } from '@trpc/react-query';

export const trpc = createTRPCReact<AppRouter>();
