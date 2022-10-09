// utils/trpc.ts
import type { AppRouter } from '@server/server';
import { createReactQueryHooks } from '@trpc/react';

export const trpc = createReactQueryHooks<AppRouter>();
