import { ChakraProvider } from '@chakra-ui/react';
import { type ThemeConfig, extendTheme } from '@chakra-ui/react';
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

const theme: ThemeConfig = {
  useSystemColorMode: false,
  initialColorMode: 'dark',
};

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <ChakraProvider theme={extendTheme(theme)}>
      <trpc.Provider client={trpcClient} queryClient={queryClient}>
        <QueryClientProvider client={queryClient}>
          <RouterProvider router={browserRouter} />
        </QueryClientProvider>
      </trpc.Provider>
    </ChakraProvider>
  </React.StrictMode>
);
