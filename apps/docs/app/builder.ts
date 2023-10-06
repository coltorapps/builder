import { createBuilder, createEntity, createInput } from "builder";
import { z } from "zod";

export const visibleWhenInput = createInput({
  name: "visibleWhen",
  validate(value, context) {
    const result = z
      .object({
        entityId: z.string(),
      })
      .refine((val) => context.schema.entities.has(val.entityId), {
        message: "Entity doesn't exist.",
      })
      .refine((val) => val.entityId !== context.entity.id, {
        message: "Can't self refernce.",
      })
      .optional()
      .safeParse(value);

    if (!result.success) {
      throw result.error.flatten().formErrors[0];
    }

    return result.data;
  },
});

export const labelInput = createInput({
  name: "label",
  validate(value) {
    const result = z.string().min(1).safeParse(value);

    if (!result.success) {
      throw result.error.flatten().formErrors[0];
    }

    return result.data;
  },
});

export const textEntity = createEntity({
  name: "text",
  inputs: [visibleWhenInput, labelInput],
});

export const builder = createBuilder({
  entities: [textEntity],
});
