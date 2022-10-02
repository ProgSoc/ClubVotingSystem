// utils/trpc.ts
import { createReactQueryHooks } from '@trpc/react';

import type { AppRouter } from '../../../server/src/server';

export const trpc = createReactQueryHooks<AppRouter>();
