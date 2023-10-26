"use client";

import { useEffect } from "react";
import { createBuilder, createEntity } from "basebuilder";
import { useFormState, useFormStatus } from "react-dom";
import { z } from "zod";

import {
  createEntityComponent,
  Interpreter,
  useInterpreterStore,
} from "@basebuilder/react";

import { submit } from "./submit";

const builder = createBuilder({
  entities: [
    createEntity({
      name: "text",
      validate(value) {
        const res = z.string().safeParse(value);

        if (!res.success) {
          throw res.error.issues[0]?.message;
        }

        return res.data;
      },
    }),
  ],
});

const textComponent = createEntityComponent(
  builder.entities[0],
  ({ entity, setValue }) => {
    return (
      <div>
        <input
          value={entity.value ?? ""}
          onChange={(e) => setValue(e.target.value)}
          name={entity.id}
        />
        {JSON.stringify(entity.error)}
      </div>
    );
  },
);

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button type="submit" aria-disabled={pending}>
      Add
    </button>
  );
}

const initialState = {
  errors: {},
  values: {},
};

export default function Page() {
  const [state, formAction] = useFormState(submit, initialState);

  const interpreterStore = useInterpreterStore(builder, {
    entities: {
      "68b1a0dd-f3f8-4dde-a294-d61680d11223": {
        type: "text",
        attributes: {},
      },
    },
    root: ["68b1a0dd-f3f8-4dde-a294-d61680d11223"],
  });

  useEffect(() => {
    interpreterStore.setEntitiesErrors(state.errors);
  }, [interpreterStore, state]);

  return (
    <form action={formAction}>
      <Interpreter
        interpreterStore={interpreterStore}
        components={{
          text: textComponent,
        }}
      />

      <SubmitButton />
    </form>
  );
}
