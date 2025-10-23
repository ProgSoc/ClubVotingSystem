import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import ReactDOM from "react-dom/client";
import { RouterProvider } from "react-router-dom";

import { browserRouter } from "./routes";
import { trpc } from "./utils/trpc";

import "./index.css";
import { createWSClient, wsLink } from "@trpc/client";

const queryClient = new QueryClient();

const secure = location.protocol === "https:";

const trpcClient = trpc.createClient({
	links: [
		wsLink({
			client: createWSClient({
				url: `${secure ? "wss" : "ws"}://${location.host}/trpc/socket`,
			}),
		}),
	],
});

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
	<React.StrictMode>
		<trpc.Provider client={trpcClient} queryClient={queryClient}>
			<QueryClientProvider client={queryClient}>
				<RouterProvider router={browserRouter} />
			</QueryClientProvider>
		</trpc.Provider>
	</React.StrictMode>,
);
