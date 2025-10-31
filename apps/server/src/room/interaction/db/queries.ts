import { TRPCError } from "@trpc/server";
import { and, desc, eq, inArray } from "drizzle-orm";
import { db } from "@/db/connection.js";
import {
	preferentialCandidateVoteTable,
	questionCandidateTable,
	questionTable,
	roomTable,
	roomUserTable,
	singleCandidateVoteTable,
	userQuestionInteractionTable,
} from "@/db/schema.js";
import type { RoomUserInsert, VoterStateEnum } from "@/db/types.js";

export async function dbGetRoomById(roomId: string) {
	const room = await db.query.roomTable.findFirst({
		where: eq(roomTable.id, roomId),
	});

	return room;
}

interface CreateRoomArgs {
	name: string;
	adminKey: string;
	shortId: string;
}

export async function dbCreateRoom(args: CreateRoomArgs) {
	const [insertedRoom] = await db
		.insert(roomTable)
		.values({
			name: args.name,
			adminKey: args.adminKey,
			shortId: args.shortId,
		})
		.returning();

	return insertedRoom;
}

export async function dbRoomFindByShortId(shortId: string) {
	const room = await db.query.roomTable.findFirst({
		where: (table) => eq(table.shortId, shortId),
	});

	return room;
}

export async function dbGetRoomUserById(roomUserId: string) {
	const roomUser = await db.query.roomUserTable.findFirst({
		where: (table) => eq(table.id, roomUserId),
	});

	return roomUser;
}

export async function dbGetRoomUserByVotingKey(votingKey: string) {
	const roomUser = await db.query.roomUserTable.findFirst({
		where: (table) => eq(table.votingKey, votingKey),
	});

	return roomUser;
}

export async function dbGetAllRoomUsers(roomId: string) {
	const roomUser = await db.query.roomUserTable.findMany({
		where: (table) => eq(table.roomId, roomId),
	});

	return roomUser;
}

export async function dbCreateUser(
	roomId: string,
	userDetails: Pick<RoomUserInsert, "studentEmail" | "location">,
) {
	const [userResult] = await db
		.insert(roomUserTable)
		.values({
			location: userDetails.location,
			studentEmail: userDetails.studentEmail,
			roomId,
			state: "Waiting",
		})
		.returning();

	if (!userResult) {
		throw new TRPCError({
			code: "INTERNAL_SERVER_ERROR",
			message: "Failed to create room user",
		});
	}

	return userResult;
}

export async function dbSetUserState(
	userId: string,
	state: VoterStateEnum,
	votingKey?: string | null,
) {
	const [updatedUser] = await db
		.update(roomUserTable)
		.set({
			state,
			votingKey: votingKey ?? undefined,
		})
		.where(eq(roomUserTable.id, userId))
		.returning();

	return updatedUser;
}

export async function dbFetchQuestionDataById(questionId: string) {
	const question = await db.query.questionTable.findFirst({
		where: (table) => eq(table.id, questionId),
	});

	return question;
}

export async function dbFetchCurrentQuestionData(roomId: string) {
	const question = await db.query.questionTable.findFirst({
		where: (table) => eq(table.roomId, roomId),
		orderBy: (table) => desc(table.createdAt),
	});

	return question;
}

export async function dbFetchAllQuestionsData(roomId: string) {
	const questions = await db.query.questionTable.findMany({
		where: (table) => eq(table.roomId, roomId),
	});

	return questions;
}

export async function dbQuestionAbstain(questionId: string, userId: string) {
	return db.transaction(async (tx) => {
		const questionCandidates = tx
			.select()
			.from(questionCandidateTable)
			.where(and(eq(questionCandidateTable.questionId, questionId)))
			.as("questionCandidates");
		// Delete existing votes (single or preferential)
		await tx.delete(singleCandidateVoteTable).where(
			and(
				eq(singleCandidateVoteTable.voterId, userId),
				inArray(singleCandidateVoteTable.candidateId, questionCandidates.id), // This may cause errors
			),
		);

		await tx.delete(preferentialCandidateVoteTable).where(
			and(
				eq(preferentialCandidateVoteTable.voterId, userId),
				inArray(
					preferentialCandidateVoteTable.candidateId,
					questionCandidates.id,
				), // This may cause errors
			),
		);

		// Abstain is the absence of a vote, so nothing more to do
		await tx
			.insert(userQuestionInteractionTable)
			.values({
				questionId,
				userId,
			})
			.onConflictDoUpdate({
				target: [
					userQuestionInteractionTable.questionId,
					userQuestionInteractionTable.userId,
				],
				set: {
					lastInteractedAt: new Date(),
				},
			});
	});
}

export async function dbInsertQuestionSingleVote(
	questionId: string,
	userId: string,
	candidateId: string,
) {
	return db.transaction(async (tx) => {
		const question = await tx.query.questionTable.findFirst({
			where: (table) => eq(table.id, questionId),
			columns: {
				format: true,
			},
		});

		if (question?.format !== "SingleVote") {
			return tx.rollback();
		}

		const questionCandidates = tx
			.select()
			.from(questionCandidateTable)
			.where(and(eq(questionCandidateTable.questionId, questionId)))
			.as("questionCandidates");

		// Delete existing votes (single)
		await tx.delete(singleCandidateVoteTable).where(
			and(
				eq(singleCandidateVoteTable.voterId, userId),
				inArray(singleCandidateVoteTable.candidateId, questionCandidates.id), // This may cause errors
			),
		);

		// Insert new single vote
		await tx.insert(singleCandidateVoteTable).values({
			candidateId,
			voterId: userId,
		});

		// Mark user as having interacted with the question
		await tx
			.insert(userQuestionInteractionTable)
			.values({
				questionId,
				userId,
			})
			.onConflictDoUpdate({
				target: [
					userQuestionInteractionTable.questionId,
					userQuestionInteractionTable.userId,
				],
				set: {
					lastInteractedAt: new Date(),
				},
			});
	});
}

export async function dbInsertQuestionPreferentialVote(
	questionId: string,
	userId: string,
	votes: {
		candidateId: string;
		rank: number;
	}[],
) {
	return db.transaction(async (tx) => {
		const question = await tx.query.questionTable.findFirst({
			where: (table) => eq(table.id, questionId),
			columns: {
				format: true,
			},
		});

		if (question?.format !== "PreferentialVote") {
			return tx.rollback();
		}

		const questionCandidates = tx
			.select()
			.from(questionCandidateTable)
			.where(and(eq(questionCandidateTable.questionId, questionId)))
			.as("questionCandidates");

		// Delete existing votes (preferential)
		await tx.delete(preferentialCandidateVoteTable).where(
			and(
				eq(preferentialCandidateVoteTable.voterId, userId),
				inArray(
					preferentialCandidateVoteTable.candidateId,
					questionCandidates.id,
				), // This may cause errors
			),
		);

		// Insert new preferential votes
		await db.insert(preferentialCandidateVoteTable).values(
			votes.map(({ candidateId, rank }) => ({
				candidateId,
				voterId: userId,
				rank,
			})),
		); // Work out onConflictDoUpdate later

		// Mark user as having interacted with the question
		await tx
			.insert(userQuestionInteractionTable)
			.values({
				questionId,
				userId,
			})
			.onConflictDoUpdate({
				target: [
					userQuestionInteractionTable.questionId,
					userQuestionInteractionTable.userId,
				],
				set: {
					lastInteractedAt: new Date(),
				},
			});
	});
}

interface DbSingleVoteQuestionDetails {
	roomId: string;
	question: string;
	candidates: string[];
}

interface DbPreferentialVoteQuestionDetails {
	roomId: string;
	question: string;
	maxElected: number;
	candidates: string[];
}

export async function dbCreateSingleVoteQuestion(
	details: DbSingleVoteQuestionDetails,
) {
	return db.transaction(async (tx) => {
		const [questionInsert] = await tx
			.insert(questionTable)
			.values({
				format: "SingleVote",
				closed: false,
				question: details.question,
				roomId: details.roomId,
			})
			.returning();

		if (!questionInsert?.id) {
			tx.rollback();
			throw new Error("Failed to create question");
		}

		await tx
			.insert(questionCandidateTable)
			.values(
				details.candidates.map((candidate) => ({
					name: candidate,
					questionId: questionInsert.id,
				})),
			)
			.returning();
	});
}

export async function dbCreatePreferentialVoteQuestion(
	details: DbPreferentialVoteQuestionDetails,
) {
	return db.transaction(async (tx) => {
		const [questionInsert] = await tx
			.insert(questionTable)
			.values({
				format: "PreferentialVote",
				closed: false,
				question: details.question,
				roomId: details.roomId,
				maxElected: details.maxElected,
			})
			.returning();

		if (!questionInsert?.id) {
			tx.rollback();
			throw new Error("Failed to create question");
		}

		await tx
			.insert(questionCandidateTable)
			.values(
				details.candidates.map((candidate) => ({
					name: candidate,
					questionId: questionInsert.id,
				})),
			)
			.returning();
	});
}

export async function getQuestionResponseByVoterId(
	questionId: string,
	voterId: string,
) {
	// Get the voter's current responses for the question
	const questionCandidates = await db.query.questionCandidateTable.findMany({
		where: eq(questionCandidateTable.questionId, questionId),
		with: {
			preferentialCandidateVotes: {
				where: (table) => eq(table.voterId, voterId),
			},
			singleCandidateVotes: {
				where: (table) => eq(table.voterId, voterId),
			},
		},
	});

	return questionCandidates;
}

export interface CloseQuestionDetails {
	votersPresentAtEnd: number;
}

export async function dbCloseQuestion(
	questionId: string,
	details: CloseQuestionDetails,
) {
	const question = await db.query.questionTable.findFirst({
		where: (table) => eq(table.id, questionId),
		columns: {
			id: true,
		},
	});

	if (!question) {
		throw new Error("Question not found");
	}

	await db
		.update(questionTable)
		.set({
			closed: true,
			votersPresentAtEnd: details.votersPresentAtEnd,
		})
		.where(eq(questionTable.id, questionId));

	return question;
}
