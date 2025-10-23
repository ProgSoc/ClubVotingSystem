import type { RoomUserState } from '../room/interaction/db/users';
import { makeNotificationService } from './notificationService';
import type { BoardState, VoterState } from './states';
import type { RoomUsersList } from './user';
import { createPubSub } from '@graphql-yoga/subscription'

export const roomWaitingListNotifications = makeNotificationService<RoomUsersList>().withKey(
  (args: { roomId: string }) => args.roomId,
);

export const roomVoterNotifications = makeNotificationService<VoterState>().withKey(
  (args: { roomId: string; votingKey: string }) => `${args.roomId}-${args.votingKey}`,
);

export const roomBoardEventsNotifications = makeNotificationService<BoardState>().withKey(
  (args: { roomId: string }) => args.roomId,
);

export const userWaitingListNotifications = makeNotificationService<RoomUserState>().withKey(
  (args: { userId: string }) => args.userId,
);

export const pubSub = createPubSub<{
  "roomWaitingList": [roomId: string, payload: { data: RoomUsersList}],
  "roomVoter": [roomAndVotingKey: `${string}-${string}`, payload: { data: VoterState }],
  "roomBoardEvents": [roomId: string, payload: { data: BoardState }],
  "userWaitingList": [userId: string, payload: { data: RoomUserState }]
}>()