import { QueryClient } from "@tanstack/react-query";
import { createTRPCClient, createWSClient, wsLink } from "@trpc/client";
import { createTRPCOptionsProxy } from "@trpc/tanstack-react-query";
import type { AppRouter } from "server/src/main";

const secure = location.protocol === "https:";

export const queryClient = new QueryClient();

const trpcClient = createTRPCClient<AppRouter>({
  links: [wsLink({
    client: createWSClient({
      url: `${secure ? "wss" : "ws"}://${location.host}/trpc`,
    }),
  }),],
});

export const trpc = createTRPCOptionsProxy<AppRouter>({
  client: trpcClient,
  queryClient,
});