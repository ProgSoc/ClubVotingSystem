import type { UserLocation } from "server/src/dbschema/interfaces";

export const locationEnumLabel: Record<UserLocation, string> = {
	InPerson: "In Person",
	Online: "Online",
	Proxy: "Proxy",
};
