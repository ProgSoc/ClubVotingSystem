import type { UserLocation, WaitingState } from '../dbschema/interfaces';
import type { GetStatesUnion } from '../state';
import { makeStates, state } from '../state';

export interface JoinWaitingRoomParams {
  studentEmail: string;
  location: UserLocation;
}

interface WithUserId {
  id: string;
}

interface WithvotingKey extends WithUserId {
  votingKey: string;
}

export interface WaitingRoomUser {
  id: string;
  state: Extract<WaitingState, 'Waiting'>;
}

interface UserPrivateDetails {
  studentEmail: string;
  location: UserLocation;
}

export interface RoomUserWithDetails extends WithUserId {
  details: UserPrivateDetails;
}

export interface RoomVoterWithDetails extends RoomUserWithDetails {
  votingKey: string;
}

export type RoomUserResolvedState = GetStatesUnion<typeof RoomUserResolvedState.enum>;
export const RoomUserResolvedState = makeStates('rurs', {
  admitted: state<WithvotingKey>(),
  declined: state<WithUserId>(),
  kicked: state<WithUserId>(),
});

export type RoomUserState = GetStatesUnion<typeof RoomUserState.enum>;
export const RoomUserState = makeStates('rurs', {
  waiting: state<WithUserId>(),
  admitted: state<WithvotingKey>(),
  declined: state<WithUserId>(),
  kicked: state<WithUserId>(),
});

export interface RoomUsersList {
  waiting: RoomUserWithDetails[];
  admitted: RoomUserWithDetails[];
}
