import { QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import ReactDOM from "react-dom/client";
import { RouterProvider } from "react-router-dom";

import { browserRouter } from "./routes";
import { queryClient } from "./utils/trpc";

import "./index.css";


ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
	<React.StrictMode>
		<QueryClientProvider client={queryClient}>
			<RouterProvider router={browserRouter} />
		</QueryClientProvider>
	</React.StrictMode>,
);
