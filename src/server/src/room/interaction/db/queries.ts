import { dbClient } from '../../../dbschema/client';
import e from '../../../dbschema/edgeql-js';
import type * as schema from '../../../dbschema/interfaces';
import type { RoomUser } from '../../../dbschema/interfaces';
import type { SelectModifiers, objectTypeToSelectShape } from '../../../dbschema/edgeql-js/select';
import type { $expr_Literal } from '../../../dbschema/edgeql-js/literal';
import type { $QuestionFormat } from '../../../dbschema/edgeql-js/modules/default';

type FromFn<T extends (...args: any[]) => any> = NonNullable<Awaited<ReturnType<T>>>;
type ScalarFieldsOn<T> = {
  [K in keyof T]?: true;
};

const roomFields = {
  id: true,
  name: true,
  shortId: true,
  adminKey: true,
  closedAt: true,
  createdAt: true,
} satisfies ScalarFieldsOn<schema.Room>;

export type DbRoom = FromFn<typeof dbGetRoomById>;
export async function dbGetRoomById(roomId: string) {
  const room = await e
    .select(e.Room, () => ({
      ...roomFields,
      filter_single: { id: roomId },
    }))
    .run(dbClient);

  return room;
}

interface CreateRoomArgs {
  name: string;
  adminKey: string;
  shortId: string;
}

export async function dbCreateRoom(args: CreateRoomArgs) {
  const roomInsert = e.insert(e.Room, {
    name: args.name,
    adminKey: args.adminKey,
    shortId: args.shortId,
    createdAt: e.datetime_of_statement(),
  });

  const roomResult = await e
    .select(roomInsert, () => ({
      ...roomFields,
    }))
    .run(dbClient);

  return roomResult;
}

export async function dbRoomFindByShortId(shortId: string) {
  const room = await e
    .select(e.Room, () => ({
      ...roomFields,
      filter_single: { shortId },
    }))
    .run(dbClient);

  return room;
}

const roomUserFields = {
  id: true,
  state: true,
  userDetails: true,
  votingKey: true,
} satisfies ScalarFieldsOn<schema.RoomUser>;

export type DbRoomUser = FromFn<typeof dbGetRoomUserById>;
export async function dbGetRoomUserById(roomUserId: string) {
  const roomUser = await e
    .select(e.RoomUser, () => ({
      ...roomUserFields,
      filter_single: { id: roomUserId },
    }))
    .run(dbClient);

  return roomUser;
}

export async function dbGetRoomUserByVotingKey(votingKey: string) {
  const roomUser = await e
    .select(e.RoomUser, () => ({
      ...roomUserFields,
      filter_single: { votingKey },
    }))
    .run(dbClient);

  return roomUser;
}

export async function dbGetAllRoomUsers(roomId: string) {
  const roomUser = await e
    .select(e.RoomUser, user => ({
      ...roomUserFields,
      filter: e.op(user.room.id, '=', e.uuid(roomId)),
    }))
    .run(dbClient);

  return roomUser;
}

export type RoomUserDetails = NonNullable<RoomUser['userDetails']>;

export async function dbCreateUser(roomId: string, userDetails: RoomUserDetails) {
  const userInsert = e.insert(e.RoomUser, {
    state: 'Waiting',
    userDetails,
    room: e.select(e.Room, () => ({ filter_single: { id: roomId } })),
  });

  const userResult = await e
    .select(userInsert, () => ({
      ...roomUserFields,
    }))
    .run(dbClient);

  return userResult;
}

export async function dbSetUserState(userId: string, state: schema.WaitingState, votingKey?: string | null) {
  await e
    .update(e.RoomUser, () => ({
      filter_single: { id: userId },
      set: {
        state,
        votingKey,
      },
    }))
    .run(dbClient);
}

type DbQuestionElement = (typeof e.Question)['__element__'];
type DbQuestionElementQueryShape = Readonly<
  objectTypeToSelectShape<DbQuestionElement> & SelectModifiers<DbQuestionElement>
>;

const questionQueryFields = {
  id: true,
  question: true,

  format: true,
  closed: true,
  votersPresentAtEnd: true,
  createdAt: true,

  interactedUsers: true,
  maxElected: true,
  candidates: {
    id: true,
    name: true,
    singleCandidateVotes: {
      candidate: true,
      voter: true,
    },
    preferentialCandidateVotes: {
      rank: true,
      voter: true,
    },
  },
} satisfies DbQuestionElementQueryShape;

export type DbQuestionData = FromFn<typeof dbFetchQuestionDataById>;
export async function dbFetchQuestionDataById(questionId: string) {
  const question = await e
    .select(e.Question, () => ({
      ...questionQueryFields,
      filter_single: { id: questionId },
    }))
    .run(dbClient);

  return question;
}

export async function dbFetchCurrentQuestionData(roomId: string) {
  const questions = await e
    .select(e.Question, question => ({
      ...questionQueryFields,
      // filter: e.op(question['<questions[is Room]'].id, '=', e.uuid(roomId)),
      order_by: { expression: question.createdAt, direction: e.DESC },
      limit: 1,
    }))
    .run(dbClient);

  const question = questions.at(0) ?? null;
  return question;
}

export async function dbFetchAllQuestionsData(roomId: string) {
  const questions = await e
    .select(e.Question, question => ({
      ...questionQueryFields,
      filter: e.op(question['<questions[is Room]'].id, '=', roomId),
    }))
    .run(dbClient);

  return questions;
}

function dbQuestionInteractAndResetVotesPartialQuery(questionId: string, userId: string) {
  const deletedSingleVote = e.delete(e.SingleCandidateVote, singleCandidateVote => ({
    filter: e.op(
      e.op(singleCandidateVote.candidate['<candidates[is Question]'].id, '=', e.uuid(questionId)),
      'and',
      e.op(singleCandidateVote.voter.id, '=', e.uuid(userId)),
    ),
  }));

  // Clear other vote types here, when more are added

  const insertedInteraction = e.update(e.Question, () => ({
    set: {
      interactedUsers: {
        '+=': e.select(e.RoomUser, () => ({ filter_single: { id: userId } })),
      },
    },
  }));

  return e.with([deletedSingleVote], insertedInteraction);
}

function dbAssertQuestionKindPartialQuery(questionId: string, format: $expr_Literal<$QuestionFormat>) {
  return e.assert(e.op(e.select(e.Question, () => ({ filter_single: { id: questionId } })).format, '=', format));
}

export function dbQuestionAbstain(questionId: string, userId: string) {
  const resetAndInteract = dbQuestionInteractAndResetVotesPartialQuery(questionId, userId);
  return resetAndInteract.run(dbClient);
}

export async function dbInsertQuestionSingleVote(questionId: string, userId: string, candidateId: string) {
  const isSingleVoteQuestion = dbAssertQuestionKindPartialQuery(questionId, e.QuestionFormat.SingleVote);
  const resetAndInteract = dbQuestionInteractAndResetVotesPartialQuery(questionId, userId);
  const inserted = e.insert(e.SingleCandidateVote, {
    candidate: e.select(e.QuestionCandidate, () => ({ filter_single: { id: candidateId } })),
    voter: e.select(e.RoomUser, () => ({ filter_single: { id: userId } })),
  });

  const question = e.select(e.Question, () => ({
    ...questionQueryFields,
    filter_single: { id: questionId },
  }));

  return e.with([isSingleVoteQuestion, resetAndInteract, inserted], question).run(dbClient);
}

export async function dbInsertQuestionPreferentialVote(questionId: string, userId: string, candidateIds: string[]) {
  const isPreferentialVoteQuestion = dbAssertQuestionKindPartialQuery(questionId, e.QuestionFormat.PreferentialVote);
  const resetAndInteract = dbQuestionInteractAndResetVotesPartialQuery(questionId, userId);

  const candidateIdsSet = e.set(...candidateIds);

  const inserted = e.for(e.set(...candidateIds), (candidateId) => {
    const cadidateIdAsUuid = e.cast(e.uuid, candidateId);

    return e.insert(e.PreferentialCandidateVote, {
      rank: e.assert_single(e.find(candidateIdsSet, candidateId)), // TODO: Broke
      candidate: e.select(e.QuestionCandidate, () => ({ filter_single: { id: cadidateIdAsUuid } })),
      voter: e.select(e.RoomUser, () => ({ filter_single: { id: userId } })),
    });
  });

  const question = e.select(e.Question, () => ({
    ...questionQueryFields,
    filter_single: { id: questionId },
  }));

  return e.with([isPreferentialVoteQuestion, resetAndInteract, inserted], question).run(dbClient);
}

interface DbSingleVoteQuestionDetails {
  question: string;
  candidates: string[];
}

interface DbPreferentialVoteQuestionDetails {
  question: string;
  candidates: string[];
}

export async function dbCreateSingleVoteQuestion(details: DbSingleVoteQuestionDetails) {
  const questionInsert = e.insert(e.Question, {
    format: e.QuestionFormat.SingleVote,
    closed: false,
    question: details.question,
    candidates: e.for(e.set(...details.candidates), candidate => e.insert(e.QuestionCandidate, { name: candidate })),
    createdAt: e.datetime_of_statement(),
    votersPresentAtEnd: 0,
  });

  const questionResult = await e
    .select(questionInsert, () => ({
      ...questionQueryFields,
    }))
    .run(dbClient);

  return questionResult;
}

export async function dbCreatePreferentialVoteQuestion(details: DbPreferentialVoteQuestionDetails) {
  const questionInsert = e.insert(e.Question, {
    format: e.QuestionFormat.PreferentialVote,
    closed: false,
    question: details.question,
    candidates: e.for(e.set(...details.candidates), candidate => e.insert(e.QuestionCandidate, { name: candidate })),
    createdAt: e.datetime_of_statement(),
    votersPresentAtEnd: 0,
  });

  const questionResult = await e
    .select(questionInsert, () => ({
      ...questionQueryFields,
    }))
    .run(dbClient);

  return questionResult;
}

export interface CloseQuestionDetails {
  votersPresentAtEnd: number;
}

export async function dbCloseQuestion(questionId: string, details: CloseQuestionDetails) {
  const questionClosed = e.assert_exists(
    e.update(e.Question, () => ({
      set: {
        closed: true,
        votersPresentAtEnd: details.votersPresentAtEnd,
      },
      filter_single: { id: questionId },
    })),
  );

  const question = await e
    .select(questionClosed, () => ({
      ...questionQueryFields,
    }))
    .run(dbClient);

  return question;
}
