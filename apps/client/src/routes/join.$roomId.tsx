import { useMutation } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Button, CenteredPageContainer, Heading } from "components/styles";
import { Field, Form, Formik } from "formik";
import { useId } from "react";
import type { UserLocation } from "server/src/dbschema/interfaces";
import { locationEnumLabel } from "utils/enumLabels";
import { trpc } from "utils/trpc";
import type { TypeOf } from "zod";
import { z } from "zod";
import { toFormikValidationSchema } from "zod-formik-adapter";

export const Route = createFileRoute("/join/$roomId")({
	component: RouteComponent,
});

const schema = z.object({
	email: z.string().email(),
	location: z.enum<UserLocation, readonly [UserLocation, ...UserLocation[]]>([
		"InPerson",
		"Online",
		"Proxy",
	]),
});

type FormValues = TypeOf<typeof schema>;

export function RouteComponent() {
	const roomId = Route.useParams({
		select: (p) => p.roomId,
	});
	const navigate = Route.useNavigate();

	const formId = useId();

	const mutation = useMutation(trpc.room.joinWaitingList.mutationOptions());

	const disabled = mutation.isPending || mutation.isSuccess;

	const onSubmit = async (data: FormValues) => {
		if (disabled) {
			return;
		}
		const result = await mutation.mutateAsync({
			roomId,
			location: data.location,
			email: data.email,
		});

		navigate({
			to: "/room/$roomId/wait/$userId",
			params: { roomId: roomId, userId: result.userId },
		});
	};

	return (
		<CenteredPageContainer className="gap-4">
			<Heading>Join voting room</Heading>
			<fieldset className="w-full" disabled={disabled}>
				<Formik<FormValues>
					initialValues={{
						email: "",
						location: undefined as unknown as UserLocation,
					}}
					onSubmit={onSubmit}
					validationSchema={toFormikValidationSchema(schema)}
					validateOnMount={true}
				>
					{(form) => (
						<Form>
							<div className="gap-4 w-full flex flex-col justify-center items-center">
								<div className="flex flex-col gap-4">
									<Field
										className="input input-bordered w-full sm:w-96 text-sm md:text-base"
										placeholder="Student Email (firstname.lastname)"
										type="email"
										name="email"
										value={form.values.email}
										onChange={form.handleChange}
									/>
									<div className="flex items-start justify-center gap-4">
										<label
											className="flex items-center gap-2"
											htmlFor={`${formId}-InPerson`}
										>
											<Field
												type="radio"
												name="location"
												value={"InPerson" satisfies UserLocation}
												className="radio radio-primary"
												id={`${formId}-InPerson`}
											/>
											<span className="label-text text-xs md:text-sm">
												{locationEnumLabel.InPerson}
											</span>
										</label>
										<label
											className="flex items-center gap-2"
											htmlFor={`${formId}-Online`}
										>
											<Field
												type="radio"
												name="location"
												value={"Online" satisfies UserLocation}
												className="radio radio-primary"
												id={`${formId}-Online`}
											/>
											<span className="label-text text-xs md:text-sm">
												{locationEnumLabel.Online}
											</span>
										</label>
										<label
											className="flex items-center gap-2"
											htmlFor={`${formId}-Proxy`}
										>
											<Field
												type="radio"
												name="location"
												value={"Proxy" satisfies UserLocation}
												className="radio radio-primary"
												id={`${formId}-Proxy`}
											/>
											<span className="label-text text-xs md:text-sm">
												{locationEnumLabel.Proxy}
											</span>
										</label>
									</div>
									<Button
										className="btn-primary w-28 self-center m-3"
										type="submit"
										disabled={disabled || Object.values(form.errors).length > 0}
										isLoading={mutation.isPending}
									>
										Join
									</Button>
								</div>
							</div>
						</Form>
					)}
				</Formik>
			</fieldset>
		</CenteredPageContainer>
	);
}
