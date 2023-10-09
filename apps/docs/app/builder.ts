import { createBuilder, createEntity, createInput } from "builder";
import { z } from "zod";

export function createFormBuilder(options?: {
  labelInputValidation?: (value: string) => Promise<void> | void;
}) {
  const visibleWhenInput = createInput({
    name: "visibleWhen",
    validate(value, context) {
      const result = z
        .object({
          entityId: z.string(),
        })
        .refine((val) => context.schema.entities[val.entityId], {
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

  const labelInput = createInput({
    name: "label",
    async validate(value) {
      const result = z.string().min(1).safeParse(value);

      if (!result.success) {
        throw result.error.flatten().formErrors[0];
      }

      await options?.labelInputValidation?.(result.data);

      return result.data;
    },
  });

  const textEntity = createEntity({
    name: "text",
    inputs: [visibleWhenInput, labelInput],
  });

  const formBuilder = createBuilder({
    entities: [textEntity],
  });

  return {
    formBuilder,
    textEntity,
    labelInput,
    visibleWhenInput,
  };
}
