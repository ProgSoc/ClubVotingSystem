import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createWSClient, httpBatchLink, wsLink } from '@trpc/client';
import React from 'react';
import ReactDOM from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';

import { browserRouter } from './routes';
import { trpc } from './utils/trpc';

import './index.css';

const queryClient = new QueryClient();

const trpcHost = import.meta.env.DEV ? 'localhost:8080' : location.host;
const secure = location.protocol === 'https:';

const wsClient = createWSClient({
  url: `${secure ? 'wss' : 'ws'}://${trpcHost}/trpc/socket`,
});

const trpcClient = trpc.createClient({
  links: [
    wsLink({
      client: wsClient,
    }),
    httpBatchLink({
      url: `${secure ? 'https' : 'http'}://${trpcHost}/trpc`,
    }),
  ],
});

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={browserRouter} />
      </QueryClientProvider>
    </trpc.Provider>
  </React.StrictMode>
);
