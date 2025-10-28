import type { TRPCConnectionState } from "@trpc/client/unstable-internals";
import { useEffect, useState } from "react";
import { wsClient } from "utils/trpc";

const useConntectionStatus = () => {
	const [connectionState, setConnectionState] =
		useState<TRPCConnectionState<unknown> | null>(null);

	useEffect(() => {
		const { unsubscribe } = wsClient.connectionState.subscribe({
			next: (state) => {
				setConnectionState(state);
			},
		});

		return () => unsubscribe();
	}, []);

	return connectionState;
};

export const ConnectionStatus = () => {
	const connectionState = useConntectionStatus();

	if (!connectionState) return <div className="badge">Loading...</div>;

	if (connectionState.state === "connecting") {
		return <div className="badge badge-accent">Connecting</div>;
	}

	if (connectionState.state === "idle") {
		return <div className="badge badge-success">Idle</div>;
	}

	return <div className="badge badge-success">Connected</div>;
};
