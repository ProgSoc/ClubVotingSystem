import { PrismaClient } from '@prisma/client';

// Because we use TRPc, we import a lot of backend code, and sometimes prisma may complain
// that we create the prisma client in the browser.
const onClient = typeof window !== 'undefined';

export const prisma = !onClient ? new PrismaClient({}) : (null as never);
