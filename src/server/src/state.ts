const variantField = '$variant' as const;

/** Attach a type (variant) field onto an object */
export type Variant<S extends string, Data extends object = {}> = {
  [variantField]: S;
} & Data;

/** Name of the variant used internally inside the enums */
type VariantName<Prefix extends string, Name extends string> = `$${Prefix}_${Name}_state`;
function makeVariantName<P extends string, K extends string>(prefix: P, key: K): VariantName<P, K> {
  return `$${prefix}_${key}_state`;
}

/** Function to create a variant from the original data object (basically assign the discriminator field to it) */
type CreateVariantFn<Prefix extends string, Name extends string, Obj extends object> = (
  obj: Obj
) => Variant<VariantName<Prefix, Name>, Obj>;

/** An empty type to store an inner type. The value is never T, but that's necessary for typescript to not simplify it */
type Empty<T> = { _dummy?: T };

/** Get the type inside an empty */
type UnwrapEmpty<T extends Empty<any>> = T extends Empty<infer U> ? U : never;

/** The state enum type, takes the record of empty's and the prefix, and creates an enum record object with variant names */
type StateEnum<P extends string, O extends Record<string, Empty<any>>> = {
  [K in keyof O]: K extends string ? VariantName<P, K> : never;
};

/** The functions a state object has to create the variants, rather than constructing them manually */
type StateObjectCreateFns<P extends string, O extends Record<string, Empty<any>>> = {
  [K in keyof O]: K extends string ? CreateVariantFn<P, K, UnwrapEmpty<O[K]>> : never;
};

/** The helper fields a state object has: a reference to the enum object and a reference to the match function for the object */
type StateObjectHelperFields<P extends string, O extends Record<string, Empty<any>>> = {
  enum: StateEnum<P, O>;
  match: <Ret>(
    value: GetStatesUnion<StateEnum<P, O>>,
    matcher: MakeMatcherForEnum<StateEnum<P, O>, Ret> | MakePartialMatcherForEnum<StateEnum<P, O>, Ret>
  ) => Ret;
  is: MakeIsFnsForStates<P, O>;
};

/** State object create fields and helper fields together */
type StateObject<P extends string, O extends Record<string, Empty<any>>> = StateObjectCreateFns<P, O> &
  StateObjectHelperFields<P, O>;

/** Extract the inner record from StateEnum */
type StateEnumInnerObj<SE extends StateEnum<string, Record<string, Empty<any>>>> = SE extends StateEnum<string, infer O>
  ? O
  : never;

/** Extract the prefix from StateEnum */
type StateEnumInnerPrefix<SE extends StateEnum<string, Record<string, Empty<any>>>> = SE extends StateEnum<infer P, any>
  ? P
  : never;

/** Convert the enum type (and the data of the empty's inside) into a discriminated union */
type RecordToStatesUnion<P extends string, R extends Record<string, Empty<any>>> = ValuesOf<{
  [K in keyof R]: K extends string ? Variant<VariantName<P, K>, UnwrapEmpty<R[K]>> : never;
}>;

type MakeIsFn<
  Prefix extends string,
  Name extends string,
  Reords extends Record<string, Empty<any>>,
  Obj extends RecordToStatesUnion<Prefix, Reords>
> = (obj: RecordToStatesUnion<Prefix, Reords>) => obj is Variant<VariantName<Prefix, Name>, Obj>;

type MakeIsFnsForStates<P extends string, O extends Record<string, Empty<any>>> = {
  [K in keyof O]: K extends string ? MakeIsFn<P, K, O, RecordToStatesUnion<P, O>> : never;
};

/** Creates a union of an object's keys */
type ValuesOf<O extends Record<string, any>> = O[keyof O];

/** Creates a union the StateEnums's states */
export type GetStatesUnion<SE extends StateEnum<string, Record<string, Empty<any>>>> = RecordToStatesUnion<
  StateEnumInnerPrefix<SE>,
  StateEnumInnerObj<SE>
>;

/** Empty function to track the state for typescript via the generic */
export function state<T = {}>(): Empty<T> {
  return {};
}

export function makeStates<P extends string, O extends Record<string, Empty<any>>>(prefix: P, items: O) {
  const result: StateEnum<P, O> = {} as any;
  const enumReverse: Record<string, string> = {};
  const objectCreate: StateObjectCreateFns<P, O> = {} as any;
  const isFns: MakeIsFnsForStates<P, O> = {} as any;

  for (const key in items) {
    result[key] = makeVariantName(prefix, key) as any;
    enumReverse[result[key]] = key;
    objectCreate[key] = ((obj: any) => ({ [variantField]: result[key], ...obj })) as any;
    isFns[key] = ((obj: any) => obj[variantField] === result[key]) as any;
  }

  const objectHelpers: StateObjectHelperFields<P, O> = {
    enum: result,
    is: isFns,
    match: (value, matcher) => {
      const handler = matcher[enumReverse[value[variantField]]] as any;
      if (handler) {
        return handler(value);
      } else {
        return (matcher._ as any)();
      }
    },
  };

  return {
    ...objectCreate,
    ...objectHelpers,
  } as StateObject<P, O>;
}

type MakeMatcherForEnum<Enum extends StateEnum<any, any>, Ret> = {
  [K in keyof Enum]: (value: UnwrapEmpty<StateEnumInnerObj<Enum>[K]>) => Ret;
};

type MakePartialMatcherForEnum<Enum extends StateEnum<any, any>, Ret> = Partial<MakeMatcherForEnum<Enum, Ret>> & {
  _: () => Ret;
};
