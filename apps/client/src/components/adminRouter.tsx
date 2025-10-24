import { Link } from "@tanstack/react-router";
import { Route } from "routes/room.$roomId/admin.$adminKey";

export function AdminRouter() {
	const { roomId, adminKey } = Route.useParams();

	return (
		<div className={"flex gap-4 mb-8"}>
			<Link
				to="/room/$roomId/admin/$adminKey"
				params={{
					adminKey,
					roomId,
				}}
				className="btn"
				activeOptions={{
					exact: true,
				}}
				activeProps={{
					className: "btn btn-secondary",
				}}
			>
				Room Info
			</Link>
			<Link
				to="/room/$roomId/admin/$adminKey/waiting-room"
				params={{
					adminKey,
					roomId,
				}}
				className="btn"
				activeProps={{
					className: "btn btn-secondary",
				}}
			>
				Waiting Room
			</Link>
			<Link
				to="/room/$roomId/admin/$adminKey/questions"
				params={{
					adminKey,
					roomId,
				}}
				className="btn"
				activeProps={{
					className: "btn btn-secondary",
				}}
			>
				Set Questions
			</Link>
		</div>
	);
}
