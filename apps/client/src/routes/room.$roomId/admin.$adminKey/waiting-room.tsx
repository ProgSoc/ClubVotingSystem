import { useMutation } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useSubscription } from "@trpc/tanstack-react-query";
import { Button, Heading } from "components/styles";
import { useState } from "react";
import type { RoomUserWithDetails } from "server/src/live/user";
import { twMerge } from "tailwind-merge";
import { locationEnumLabel } from "utils/enumLabels";
import { trpc } from "utils/trpc";

export const Route = createFileRoute(
	"/room/$roomId/admin/$adminKey/waiting-room",
)({
	component: RouteComponent,
});

// Waiting = waiting for an admin to do something
enum WaitingUserState {
	Waiting = "Waiting",
	Admitting = "Admitting",
	Declining = "Declining",
}

// Waiting = waiting for an admin to do something
enum VoterState {
	Voting = "Voting",
	Kicking = "Kicking",
}

interface UserWithState extends RoomUserWithDetails {
	uiLoadingState: WaitingUserState;
}

interface VoterWithState extends RoomUserWithDetails {
	uiLoadingState: VoterState;
}

function useUserWaitingRoom(props: { roomId: string; adminKey: string }) {
	const [users, setUsers] = useState<UserWithState[]>([]);
	const [voters, setVoters] = useState<VoterWithState[]>([]);

	const admitUserMutation = useMutation(
		trpc.admin.users.admitUser.mutationOptions(),
	);
	const declineUserMutation = useMutation(
		trpc.admin.users.declineUser.mutationOptions(),
	);
	const kickVoterMutation = useMutation(
		trpc.admin.users.kickVoter.mutationOptions(),
	);

	const setUserState = (userId: string, uiLoadingState: WaitingUserState) => {
		setUsers((users) => {
			const user = users.find((u) => u.id === userId);
			if (!user) {
				return users;
			}
			return users.map((u) => (u.id === userId ? { ...u, uiLoadingState } : u));
		});
	};

	const setVoterState = (userId: string, uiLoadingState: VoterState) => {
		setVoters((voters) => {
			const user = voters.find((u) => u.id === userId);
			if (!user) {
				return voters;
			}
			return voters.map((u) =>
				u.id === userId ? { ...u, uiLoadingState } : u,
			);
		});
	};

	const declineUser = (userId: string) => {
		declineUserMutation.mutate({
			adminKey: props.adminKey,
			roomId: props.roomId,
			userId,
		});
		setUserState(userId, WaitingUserState.Declining);
	};

	const admitUser = (userId: string) => {
		admitUserMutation.mutate({
			adminKey: props.adminKey,
			roomId: props.roomId,
			userId,
		});
		setUserState(userId, WaitingUserState.Admitting);
	};

	const kickVoter = (userId: string) => {
		kickVoterMutation.mutate({
			adminKey: props.adminKey,
			roomId: props.roomId,
			userId,
		});
		setVoterState(userId, VoterState.Kicking);
	};

	useSubscription(
		trpc.admin.users.listenWaitingRoom.subscriptionOptions(
			{ roomId: props.roomId, adminKey: props.adminKey },
			{
				onData: (data) => {
					const { waiting, admitted } = data;

					setUsers((users) => {
						const getUserById = (userId: string) =>
							users.find((u) => u.id === userId);

						return waiting.map((user: RoomUserWithDetails) => ({
							...user,

							// If the user already exist then keep the loading state, otherwise set it to waiting
							uiLoadingState:
								getUserById(user.id)?.uiLoadingState ??
								WaitingUserState.Waiting,
						}));
					});

					setVoters((voters) => {
						const getUserById = (userId: string) =>
							voters.find((u) => u.id === userId);

						return admitted.map((voters: RoomUserWithDetails) => ({
							...voters,

							// If the user already exist then keep the loading state, otherwise set it to voting
							uiLoadingState:
								getUserById(voters.id)?.uiLoadingState ?? VoterState.Voting,
						}));
					});
				},
				onError: (err) => {
					console.error(err);
				},
			},
		),
	);

	return { users, voters, admitUser, declineUser, kickVoter };
}

function Email(props: { email: string; className?: string }) {
	// split email into name and url
	const [name, url] = props.email.split("@");

	const className = twMerge(
		"text-info overflow-hidden overflow-ellipsis whitespace-nowrap",
		props.className,
	);

	if (!url) {
		return <span className={className}>{props.email}</span>;
	} else {
		return (
			<span className={className}>
				{name}
				<span className="opacity-20 overflow-hidden overflow-ellipsis whitespace-nowrap">
					@{url}
				</span>
			</span>
		);
	}
}

export function RouteComponent() {
	const { roomId, adminKey } = Route.useParams();

	const { users, voters, admitUser, declineUser, kickVoter } =
		useUserWaitingRoom({
			adminKey,
			roomId,
		});

	return (
		<div className="flex flex-col items-center w-full m-8 gap-24">
			<div className="flex flex-col gap-8">
				<Heading>Waiting Room</Heading>
				<div className="gap-2 flex flex-col">
					{users.map((user) => (
						<div
							key={user.id}
							className="navbar bg-base-300 rounded-lg text-lg gap-4 w-[600px]"
						>
							<Email
								email={user.details.studentEmail}
								className="ml-2 mr-auto flex-shrink"
							/>
							<div className="shrink-0">
								{locationEnumLabel[user.details.location]}
							</div>
							<div className="gap-4">
								<Button
									className="btn-primary"
									onClick={async () => {
										if (user.uiLoadingState === WaitingUserState.Waiting) {
											admitUser(user.id);
										}
									}}
									isLoading={user.uiLoadingState === WaitingUserState.Admitting}
								>
									Admit
								</Button>
								<Button
									className="btn-error"
									onClick={async () => {
										if (user.uiLoadingState === WaitingUserState.Waiting) {
											declineUser(user.id);
										}
									}}
									isLoading={user.uiLoadingState === WaitingUserState.Declining}
								>
									Decline
								</Button>
							</div>
						</div>
					))}
				</div>
			</div>
			<div className="flex flex-col gap-8">
				<Heading>Voters</Heading>
				{voters.map((user) => (
					<div
						key={user.id}
						className="navbar bg-base-300 rounded-lg text-lg gap-4 w-[600px]"
					>
						<Email
							email={user.details.studentEmail}
							className="ml-2 mr-auto flex-shrink"
						/>
						<div className="shrink-0">
							{locationEnumLabel[user.details.location]}
						</div>
						<div className="gap-4">
							<Button
								className="btn-error"
								onClick={async () => {
									kickVoter(user.id);
								}}
							>
								Kick
							</Button>
						</div>
					</div>
				))}
			</div>
		</div>
	);
}
