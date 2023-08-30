import { roomVoterNotifications, roomWaitingListNotifications, userWaitingListNotifications } from '../../live';
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
      await questionFns.closeQuestion(question.id, users.admitted.length);

      await helpers.notifyEveryoneOfBoardChange();
    },

    async admitUser(userId: string) {
      const { voterId } = await voterFns.admitUser(userId);
      userWaitingListNotifications.notify({ userId }, RoomUserState.admitted({ id: userId, voterId }));

      await helpers.notifyAdminsOfUsersChanged();
      await helpers.notifyEveryoneOfBoardChange();
    },

    async declineUser(userId: string) {
      await voterFns.declineUser(userId);
      userWaitingListNotifications.notify({ userId }, RoomUserState.declined({ id: userId }));

      await helpers.notifyAdminsOfUsersChanged();
      await helpers.notifyEveryoneOfBoardChange();
    },

    async kickVoter(userId: string) {
      const voter = await voterFns.getVoterByUserId(userId);

      // Should always have a voter, but checking just in case
      if (voter) {
        await voterFns.kickVoter(userId);
        await roomVoterNotifications.notify({ roomId, voterId: voter.id }, VoterState.kicked({}));
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
  withLock: (fns: ReturnType<typeof makeRoomAdminFunctions>) => Promise<T>
): Promise<T> {
  return roomLock.lock(roomId, async () => {
    const fns = makeRoomAdminFunctions(roomId);
    await fns.anthenticateAdminKey(adminKey);
    return withLock(fns);
  });
}

export function subscribeToUserListNotifications(
  roomId: string,
  adminKey: string,
  callback: (users: RoomUsersList) => void
) {
  return roomWaitingListNotifications.subscribe(
    { roomId },
    () => withRoomAdminFunctions(roomId, adminKey, async (fns) => fns.currentRoomUsersList()),
    callback
  );
}
