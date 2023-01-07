import type { Room } from '@prisma/client';

export class RoomNotFoundError extends Error {
  constructor(readonly roomId: string) {
    super('Room not found');
  }
}

export class RoomIsClosedError extends Error {
  constructor(readonly room: Room) {
    super('This room is closed');
  }
}

export class NoQuestionOpenError extends Error {
  constructor() {
    super('No question open');
  }
}

export class QuestionAlreadyOpenError extends Error {
  constructor() {
    super('A question is already open');
  }
}

export class UserNotFoundError extends Error {
  constructor(userId: string) {
    super(`User not found: ${userId}`);
  }
}

export class VoterNotFoundError extends Error {
  constructor(userId: string) {
    super(`Voter not found: ${userId}`);
  }
}

export class UserNotInWaitingRoom extends Error {
  constructor(userId: string) {
    super(`User not in waiting room: ${userId}`);
  }
}

export class UserNotAVoter extends Error {
  constructor(userId: string) {
    super(`User not a voter: ${userId}`);
  }
}

export class InvalidAdminKeyError extends Error {
  constructor() {
    super('Invalid admin key');
  }
}

export class QuestionAlreadyClosedError extends Error {
  constructor() {
    super('Question already closed');
  }
}
