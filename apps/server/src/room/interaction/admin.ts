import { pubSub, roomVoterNotifications, roomWaitingListNotifications, userWaitingListNotifications } from '../../live';
import { VoterState } from '../../live/states';
import type { CreateQuestionParams } from '../types';
import type { RoomUsersList } from './db/users';
import { RoomUserState } from './db/users';
import { makeQuestionHelpers, roomLock } from './helpers';

function makeRoomAdminFunctions(roomId: string) {
  const { questionFns, voterFns, roomFns, ...helpers } = makeQuestionHelpers(roomId);

  const fns = {
    anthenticateAdminKey: roomFns.authenticateAdminKey,

    async startNewQuestion(params: CreateQuestionParams) {
      await helpers.assertRoomNotClosed();
      await helpers.assertNoQuestionOpen();
      await questionFns.createNewQuestion(params);

      await helpers.notifyEveryoneOfBoardChange();
    },

    async closeQuestion() {
      await helpers.assertRoomNotClosed();
      const question = await helpers.getCurrentlyOpenQuestion();

      const users = await voterFns.currentRoomUsersList();
      await questionFns.closeQuestion(question.id, {
        votersPresentAtEnd: users.admitted.length,
      });

      await helpers.notifyEveryoneOfBoardChange();
    },

    async admitUser(userId: string) {
      const { votingKey } = await voterFns.admitUser(userId);
      pubSub.publish("userWaitingList", userId, { data: RoomUserState.admitted({ id: userId, votingKey })});

      await helpers.notifyAdminsOfUsersChanged();
      await helpers.notifyEveryoneOfBoardChange();
    },

    async declineUser(userId: string) {
      await voterFns.declineUser(userId);
      pubSub.publish("userWaitingList", userId, { data: RoomUserState.declined({ id: userId })});

      await helpers.notifyAdminsOfUsersChanged();
      await helpers.notifyEveryoneOfBoardChange();
    },

    async kickVoter(userId: string) {
      const user = await voterFns.getUserById(userId);

      // Should always have a voter, but checking just in case
      if (user?.votingKey) {
        await voterFns.kickVoter(userId);
        pubSub.publish("roomVoter", `${roomId}-${user.votingKey}`, { data: VoterState.kicked({})})
        await helpers.notifyAdminsOfUsersChanged();
        await helpers.notifyEveryoneOfBoardChange();
      }
    },

    async currentRoomUsersList() {
      return voterFns.currentRoomUsersList();
    },
  };

  return fns;
}

export function withRoomAdminFunctions<T>(
  roomId: string,
  adminKey: string,
  withLock: (fns: ReturnType<typeof makeRoomAdminFunctions>) => Promise<T>,
): Promise<T> {
  return roomLock.lock(roomId, async () => {
    const fns = makeRoomAdminFunctions(roomId);
    await fns.anthenticateAdminKey(adminKey);
    return withLock(fns);
  });
}

export async function* subscribeToUserListNotifications(
  roomId: string,
  adminKey: string,
): AsyncGenerator<RoomUsersList, void, unknown> {
  yield withRoomAdminFunctions(roomId, adminKey, async fns => fns.currentRoomUsersList())

  const newNotifications = pubSub.subscribe("roomWaitingList", roomId)

  for await (const _notification of newNotifications) {
    yield withRoomAdminFunctions(roomId, adminKey, async fns => fns.currentRoomUsersList())
  }
}
