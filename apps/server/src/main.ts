import path from "node:path";
import * as trpcExpress from "@trpc/server/adapters/express";
import { applyWSSHandler } from "@trpc/server/adapters/ws";
import cors from "cors";
import express from "express";
import { WebSocketServer } from "ws";

import { env } from "./env";
import { roomRouter } from "./routers/room";
import { roomAdminRouter } from "./routers/room-admin";
import { roomVoteRouter } from "./routers/room-vote";
import { roomWaitingListRouter } from "./routers/room-waiting";
import { mergeRouters, router } from "./trpc";

const mainRouter = router({
	waitingRoom: roomWaitingListRouter,
	room: roomRouter,
	vote: roomVoteRouter,
	admin: roomAdminRouter,
});

export const appRouter = mergeRouters(mainRouter);

export type AppRouter = typeof appRouter;

const app = express();

// Allow CORS for dev
if (process.env.NODE_ENV !== "production") {
	app.use(
		cors({
			origin: "*",
			credentials: true,
		}),
	);
}

// Create the express server
app.use(
	"/trpc",
	trpcExpress.createExpressMiddleware({
		router: appRouter,
	}),
);

if (env.publicDir) {
	const publicDir = env.publicDir;
	// Serve up the single page app
	app.use(express.static(publicDir));
	app.get("*", (_req, res) => {
		res.sendFile(path.resolve(publicDir, "index.html"));
	});
}

const server = app.listen(8080, () => {
	console.log("Server started on port 8080");
});

// Create the websocket server

const websocketServer = new WebSocketServer({
	noServer: true,
	path: "/trpc/socket",
});

const handler = applyWSSHandler({ wss: websocketServer, router: appRouter });

server.on("upgrade", (request, socket, head) => {
	websocketServer.handleUpgrade(request, socket, head, (websocket) => {
		websocketServer.emit("connection", websocket, request);
	});
});

process.on("SIGTERM", () => {
	console.log("SIGTERM");
	handler.broadcastReconnectNotification();
	websocketServer.close();
	console.log("Server killed, broadcasting reconnect notification");
});

websocketServer.on("connection", (ws) => {
	console.log(`➕➕ Connection (${websocketServer.clients.size})`);
	ws.once("close", () => {
		console.log(`➖➖ Connection (${websocketServer.clients.size})`);
	});
});
