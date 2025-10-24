import { createFileRoute, Outlet } from "@tanstack/react-router";
import { AdminRouter } from "components/adminRouter";
import { PageContainer } from "components/styles";

export const Route = createFileRoute("/room/$roomId/admin/$adminKey")({
	component: RouteComponent,
});

function RouteComponent() {
	return (
		<PageContainer className="gap-4">
			<AdminRouter />
			<Outlet />
		</PageContainer>
	);
}
