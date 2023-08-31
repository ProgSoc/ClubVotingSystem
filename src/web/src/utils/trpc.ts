// utils/trpc.ts
import { createTRPCReact } from '@trpc/react-query';
import type { AppRouter } from 'server/src/server'; // This is a type so it can be imported during development

export const trpc = createTRPCReact<AppRouter>();
