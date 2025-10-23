import type { RoomUserState } from '../room/interaction/db/users';
import type { BoardState, VoterState } from './states';
import type { RoomUsersList } from './user';
import { createPubSub } from '@graphql-yoga/subscription'

export const pubSub = createPubSub<{
  "roomWaitingList": [roomId: string, payload: { data: RoomUsersList}],
  "roomVoter": [roomAndVotingKey: `${string}-${string}`, payload: { data: VoterState }],
  "roomBoardEvents": [roomId: string, payload: { data: BoardState }],
  "userWaitingList": [userId: string, payload: { data: RoomUserState }]
}>()