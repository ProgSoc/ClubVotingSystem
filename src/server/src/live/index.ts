import type { RoomUserState } from '../room/interaction/db/users';
import { makeNotificationService } from './notificationService';
import type { BoardState, VoterState } from './states';
import type { RoomUsersList } from './user';

export const roomWaitingListNotifications = makeNotificationService<RoomUsersList>().withKey(
  (args: { roomId: string }) => args.roomId
);

export const roomVoterNotifications = makeNotificationService<VoterState>().withKey(
  (args: { roomId: string; voterId: string }) => `${args.roomId}-${args.voterId}`
);

export const roomBoardEventsNotifications = makeNotificationService<BoardState>().withKey(
  (args: { roomId: string }) => args.roomId
);

export const userWaitingListNotifications = makeNotificationService<RoomUserState>().withKey(
  (args: { userId: string }) => args.userId
);
