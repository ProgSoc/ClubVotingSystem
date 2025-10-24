import type { RouteObject } from "react-router-dom";
import { useParams } from "react-router-dom";

type ParamsObj<Params extends string> = Record<Params, string>;
type BuilderFn<Params extends string> = (params: ParamsObj<Params>) => string;

interface UrlData<Params extends string> {
	parameterized: string;
	params: Params[];
	build: BuilderFn<Params>;
}

export function path<Params extends string>(
	strings: TemplateStringsArray,
	...expr: Params[]
): UrlData<Params> {
	const build = (params: ParamsObj<Params>) => {
		let str = strings[0];
		for (let i = 0; i < expr.length; i++) {
			str += params[expr[i]] + strings[i + 1];
		}
		return str;
	};

	const parameterized = build(
		Object.fromEntries(expr.map((e) => [e, `:${e}`])) as ParamsObj<Params>,
	);

	return {
		parameterized,
		params: expr,
		build,
	};
}

/** A function to automatically retrieve URL params from react router and pass them in as props */
export function withParams<T extends readonly string[]>(
	paramsList: T,
	Component: React.ComponentType<{ [K in T[number]]: string }>,
) {
	const NewComponent = () => {
		const params = useParams<{ [K in T[number]]: string }>();
		const filtered = Object.entries(params).filter(([key]) =>
			paramsList.includes(key),
		);
		const filteredParams = Object.fromEntries(filtered) as {
			[K in T[number]]: string;
		};
		return <Component {...filteredParams} />;
	};

	return <NewComponent />;
}

interface RouteData<Params extends string> {
	path: UrlData<Params>;
	component: React.ComponentType<ParamsObj<Params>>;
}

export function route<Params extends string>(data: RouteData<Params>) {
	return data;
}

function asDomRoute<Params extends string>(
	data: RouteData<Params>,
): RouteObject {
	return {
		path: data.path.parameterized,
		element: withParams(data.path.params, data.component),
	};
}

export function buildRoutes<Routes extends Record<string, RouteData<string>>>(
	routes: Routes,
) {
	return Object.values(routes).map((data) => asDomRoute(data));
}

export function buildBuilders<Routes extends Record<string, RouteData<string>>>(
	routes: Routes,
) {
	type IntoBuilderFnsObj<Routes extends Record<string, RouteData<string>>> = {
		[K in keyof Routes]: Routes[K]["path"]["build"];
	};

	return Object.fromEntries(
		Object.entries(routes).map(([key, data]) => [key, data.path.build]),
	) as IntoBuilderFnsObj<Routes>;
}
