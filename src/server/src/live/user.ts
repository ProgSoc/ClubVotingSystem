import type { userLocation, waitingState } from '@/db/schema';

import type { GetStatesUnion } from '../state';
import { makeStates, state } from '../state';

export interface JoinWaitingRoomParams {
  studentEmail: string;
  location: typeof userLocation['enumValues'];
}

interface WithUserId {
  id: string;
}

interface WithVoterId extends WithUserId {
  voterId: string;
}

export interface WaitingRoomUser {
  id: string;
  state: typeof waitingState['enumValues'];
}

interface UserPrivateDetails {
  studentEmail: string;
  location: typeof userLocation['enumValues'][number];
}

export interface RoomUserWithDetails extends WithUserId {
  details: UserPrivateDetails;
}

export interface RoomVoterWithDetails extends RoomUserWithDetails {
  voterId: string;
}

export type RoomUserResolvedState = GetStatesUnion<typeof RoomUserResolvedState.enum>;
export const RoomUserResolvedState = makeStates('rurs', {
  admitted: state<WithVoterId>(),
  declined: state<WithUserId>(),
  kicked: state<WithUserId>(),
});

export type RoomUserState = GetStatesUnion<typeof RoomUserState.enum>;
export const RoomUserState = makeStates('rurs', {
  waiting: state<WithUserId>(),
  admitted: state<WithVoterId>(),
  declined: state<WithUserId>(),
  kicked: state<WithUserId>(),
});

export interface RoomUsersList {
  waiting: RoomUserWithDetails[];
  admitted: RoomUserWithDetails[];
}
