import { createWSClient, wsLink } from '@trpc/client/links/wsLink';
import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider } from 'react-query';
import { RouterProvider } from 'react-router-dom';

import { browserRouter } from './routes';
import { trpc } from './utils/trpc';

import './index.css';

const queryClient = new QueryClient();

const trpcClient = trpc.createClient({
  url: 'http://localhost:8080/trpc',
  links: [
    wsLink({
      client: createWSClient({
        url: `ws://localhost:8081`,
      }),
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
