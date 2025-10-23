import {
	subscribeToUserListNotifications,
	withRoomAdminFunctions,
} from "./interaction/admin";
import {
	subscribeToBoardNotifications,
	subscribeToVoterNotifications,
	waitForAdmission,
	withRoomVoterFunctions,
} from "./interaction/user";
import { createNewRoom, getRoomByShortId } from "./roomBase";

export const operations = {
	createNewRoom,
	getRoomByShortId,

	subscribeToUserListNotifications,
	subscribeToBoardNotifications,
	subscribeToVoterNotifications,

	withRoomAdminFunctions,
	withRoomVoterFunctions,

	waitForAdmission,
};
