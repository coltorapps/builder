export const schemaValidationErrorCodes = {
  InvalidRootFormat: "InvalidRootFormat",
  DuplicateRootId: "DuplicateRootId",
  EmptyRoot: "EmptyRoot",
  MissingEntityId: "MissingEntityId",
  InvalidEntitiesFormat: "InvalidEntitiesFormat",
  MissingEntityType: "MissingEntityType",
  UnknownEntityType: "UnknownEntityType",
  MissingEntityInputs: "MissingEntityInputs",
  InvalidEntityInputsFormat: "InvalidEntityInputsFormat",
  UnknownEntityInputType: "UnknownEntityInputType",
  CircularEntityReference: "CircularEntityReference",
} as const;

export type SchemaValidationErrorCode =
  (typeof schemaValidationErrorCodes)[keyof typeof schemaValidationErrorCodes];

const schemaValidationErrorMessages: Record<SchemaValidationErrorCode, string> =
  {
    InvalidRootFormat: "The root must be an array of strings.",
    DuplicateRootId: "Duplicate IDs detected in the root.",
    EmptyRoot: "The root must contain at least one entity.",
    MissingEntityId: "A provided entity ID does not exist.",
    InvalidEntitiesFormat:
      "Entities should be an object containing valid entities.",
    MissingEntityType: "Entity type is missing.",
    UnknownEntityType: "The provided entity type is unknown.",
    MissingEntityInputs: "Entity inputs are missing.",
    InvalidEntityInputsFormat: "The provided entity inputs are invalid.",
    UnknownEntityInputType: "The provided entity input type is unknown.",
    CircularEntityReference: "Circular entity reference.",
  };

export type SchemaValidationErrorCause =
  | {
      code: typeof schemaValidationErrorCodes.InvalidRootFormat;
      root?: unknown;
    }
  | {
      code: typeof schemaValidationErrorCodes.DuplicateRootId;
      entityId: string;
    }
  | {
      code: typeof schemaValidationErrorCodes.EmptyRoot;
    }
  | {
      code: typeof schemaValidationErrorCodes.MissingEntityId;
      entityId: string;
    }
  | {
      code: typeof schemaValidationErrorCodes.InvalidEntitiesFormat;
      entities?: unknown;
    }
  | {
      code: typeof schemaValidationErrorCodes.MissingEntityType;
      entityId: string;
    }
  | {
      code: typeof schemaValidationErrorCodes.UnknownEntityType;
      entityId: string;
      entityType: string;
    }
  | {
      code: typeof schemaValidationErrorCodes.MissingEntityInputs;
      entityId: string;
    }
  | {
      code: typeof schemaValidationErrorCodes.InvalidEntityInputsFormat;
      entityId: string;
      entityInputs: unknown;
    }
  | {
      code: typeof schemaValidationErrorCodes.UnknownEntityInputType;
      entityId: string;
      inputName: string;
    }
  | {
      code: typeof schemaValidationErrorCodes.CircularEntityReference;
      entityId: string;
    };

export class SchemaValidationError extends Error {
  constructor(public cause: SchemaValidationErrorCause) {
    super(schemaValidationErrorMessages[cause.code] ?? "Unkown error");
  }
}
