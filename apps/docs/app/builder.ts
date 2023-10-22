import { createAttribute, createBuilder, createEntity } from "builder";
import { z } from "zod";

export function createFormBuilder(options?: {
  labelInputValidation?: (value: string) => Promise<void> | void;
}) {
  const visibleWhenAttribute = createAttribute({
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

  const labelAttribute = createAttribute({
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
    attributes: [labelAttribute, visibleWhenAttribute],
    validate(value) {
      const result = z.string().min(1).safeParse(value);

      if (!result.success) {
        throw result.error.flatten().formErrors[0];
      }

      return result.data;
    },
    shouldBeProcessed(context) {
      return (
        (context.entity.id === "98220f11-9ebc-46b8-b1d7-abd16f90841c" &&
          context.entitiesValues["414e1304-d22e-4337-94b9-6821a1dd01e0"] ===
            "pizda") ||
        context.entity.id !== "98220f11-9ebc-46b8-b1d7-abd16f90841c"
      );
    },
  });

  const formBuilder = createBuilder({
    entities: [textEntity],
  });

  return {
    formBuilder,
    textEntity,
    labelAttribute,
    visibleWhenAttribute,
  };
}
