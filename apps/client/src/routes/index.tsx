import { useMutation } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Button, CenteredPageContainer, Heading } from "components/styles";
import { useState } from "react";
import { trpc } from "utils/trpc";

export const Route = createFileRoute("/")({
	component: Index,
});

function Index() {
	// Make a form for entering page name and submitting it
	const [pageName, setPageName] = useState("");
	const navigate = Route.useNavigate();

	const mutation = useMutation(trpc.room.createNewRoom.mutationOptions());

	const onSubmit = async () => {
		const result = await mutation.mutateAsync({ name: pageName.trim() });
		navigate({
			to: "/room/$roomId/admin/$adminKey",
			params: { roomId: result.id, adminKey: result.adminKey },
		});
	};

	const invalid = pageName.trim().length === 0;
	const disabled = mutation.isPending || mutation.isSuccess;

	return (
		<CenteredPageContainer className="gap-4">
			<Heading>Create a new room</Heading>
			<fieldset
				disabled={disabled}
				className="gap-2 w-full flex flex-col justify-center items-center"
			>
				<input
					className="input input-bordered w-full sm:w-96"
					type="text"
					value={pageName}
					onChange={(e) => setPageName(e.target.value)}
				/>
				<Button
					className="btn btn-primary m-3"
					disabled={invalid || disabled}
					onClick={onSubmit}
					isLoading={mutation.isPending}
				>
					Create
				</Button>
			</fieldset>
		</CenteredPageContainer>
	);
}
