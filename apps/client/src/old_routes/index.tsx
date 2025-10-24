import { JoinWaitingRoomPage } from "pages/room/JoinWaitingRoomPage";
import { RoomResultsListPage } from "pages/room/RoomResultsListPage";
import { VotingRoomPage } from "pages/room/VotingRoomPage";
import { WaitingRoomPage } from "pages/room/WaitingRoomPage";
import { ShortRedirectPage } from "pages/ShortRedirectPage";
import { createBrowserRouter, useOutlet } from "react-router-dom";
import { withRoomFetched } from "utils/withRoomData";
import { buildBuilders, buildRoutes, path, route } from "./routeBuilder";

const routes = {
	// home: route({
	// 	path: path`/`,
	// 	component: CreateRoomPage,
	// }),
	manageWaitingRoom: route({
		path: path`/room/${"roomId"}/admin/${"adminKey"}/waiting-room`,
		component: withRoomFetched(WaitingRoomManagementPage),
	}),
	manageRoomInfo: route({
		path: path`/room/${"roomId"}/admin/${"adminKey"}`,
		component: withRoomFetched(RoomInfoPage),
	}),
	setRoomQuestions: route({
		path: path`/room/${"roomId"}/admin/${"adminKey"}/questions`,
		component: withRoomFetched(QuestionSettingPage),
	}),
	viewRoomBoard: route({
		path: path`/room/${"roomId"}/board`,
		component: withRoomFetched(BoardPage),
	}),
	viewRoomResults: route({
		path: path`/room/${"roomId"}/results`,
		component: withRoomFetched(RoomResultsListPage),
	}),
	joinRoom: route({
		path: path`/join/${"roomId"}`,
		component: JoinWaitingRoomPage,
	}),
	waitInWaitingRoom: route({
		path: path`/room/${"roomId"}/wait/${"userId"}`,
		component: withRoomFetched(WaitingRoomPage),
	}),
	votingRoom: route({
		path: path`/room/${"roomId"}/vote/${"userId"}/${"votingKey"}`,
		component: withRoomFetched(VotingRoomPage),
	}),
	shortView: route({
		path: path`/b/${"shortId"}`,
		component: ShortRedirectPage((roomId) => `/room/${roomId}/board`),
	}),
	shortJoin: route({
		path: path`/j/${"shortId"}`,
		component: ShortRedirectPage((roomId) => `/join/${roomId}`),
	}),
};

export const routeBuilders = buildBuilders(routes);

export const browserRoutes = buildRoutes(routes);
// export const browserRouter = createBrowserRouter(browserRoutes);

export const browserRouter = createBrowserRouter([
	{
		path: "/",
		element: <AnimationRouter />,
		children: browserRoutes.map((route) => ({
			index: route.path === "/",
			path: route.path === "/" ? undefined : route.path,
			element: route.element,
		})),
	},
]);

function AnimationRouter() {
	const currentOutlet = useOutlet();

	return (
		<div className="w-screen h-screen relative overflow-x-hidden">
			<div className={"absolute min-h-full"}>{currentOutlet}</div>
		</div>
	);
}
