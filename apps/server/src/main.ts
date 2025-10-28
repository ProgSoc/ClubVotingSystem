import cors from "@fastify/cors";
import ws from "@fastify/websocket";
import {
	type FastifyTRPCPluginOptions,
	fastifyTRPCPlugin,
} from "@trpc/server/adapters/fastify";
import type { TRPCReconnectNotification } from "@trpc/server/rpc";
import fastify from "fastify";
import ipaddr from "ipaddr.js";
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

const server = fastify({
	routerOptions: {
		maxParamLength: 5000,
	},
	trustProxy: env.TRUSTED_PROXIES
		? (address) => {
			const ip = ipaddr.parse(address);
			const trustedCidrs =
				env.TRUSTED_PROXIES?.filter((c) => ipaddr.isValidCIDR(c)).map((c) =>
					ipaddr.parseCIDR(c),
				) || [];
			const trustedIps =
				env.TRUSTED_PROXIES?.filter((c) => ipaddr.isValid(c)).map((c) =>
					ipaddr.parse(c),
				) || [];

			// Check if the IP matches any trusted CIDR
			for (const [range, prefix] of trustedCidrs) {
				if (ip.match(range, prefix)) {
					return true;
				}
			}

			// Check if the IP matches any trusted IP directly
			for (const trustedIp of trustedIps) {
				if (
					ip.kind() === trustedIp.kind() &&
					ip.toNormalizedString() === trustedIp.toNormalizedString()
				) {
					return true;
				}
			}

			return false;
		}
		: false,
});

await server.register(ws, {
	preClose(done) {
		console.log("Broadcasting reconnect to clients before shutdown");
		const response: TRPCReconnectNotification = {
			id: null,
			method: "reconnect",
		};

		const data = JSON.stringify(response);

		for (const client of server.websocketServer.clients) {
			if (client.readyState === 1) {
				client.send(data);
			}
		}

		server.websocketServer.close(done);
	},
});

server.websocketServer.on("connection", (ws, req) => {
	console.log(
		`➕➕ Connection (${server.websocketServer.clients.size}) - ${req.socket.remoteAddress}`,
	);
	ws.once("close", () => {
		console.log(
			`➖➖ Connection (${server.websocketServer.clients.size}) - ${req.socket.remoteAddress}`,
		);
	});
});

// Allow CORS for dev
if (process.env.NODE_ENV !== "production") {
	await server.register(cors, {
		origin: "*",
		credentials: true,
	});
}

// Create the express server
await server.register(fastifyTRPCPlugin, {
	prefix: "/trpc",
	useWSS: true,
	// Enable heartbeat messages to keep connection open (disabled by default)
	keepAlive: {
		enabled: true,
		// server ping message interval in milliseconds
		pingMs: 30000,
		// connection is terminated if pong message is not received in this many milliseconds
		pongWaitMs: 5000,
	},
	trpcOptions: {
		router: appRouter,
		onError({ path, error }) {
			// report to error monitoring
			console.error(`Error in tRPC handler on path '${path}':`, error);
		},
	} satisfies FastifyTRPCPluginOptions<AppRouter>["trpcOptions"],
});

if (env.PUBLIC_DIR) {
	const publicDir = env.PUBLIC_DIR;
	await server.register(import("@fastify/static"), {
		root: publicDir,
		prefix: "/",
	});

	server.setNotFoundHandler((_request, reply) => {
		reply.sendFile("index.html");
	});
}

server.listen({ port: env.PORT, host: "0.0.0.0" }).then(() => {
	console.log(`Server listening on port ${env.PORT}`);
});

process.on("SIGTERM", () => {
	server.close().then(() => {
		console.log("Server closed");
		process.exit(0);
	});
});

