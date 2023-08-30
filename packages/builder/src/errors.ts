export const schemaValidationErrorCodes = {
  InvalidRootFormat: "InvalidRootFormat",
  DuplicateRootId: "DuplicateRootId",
  RootEntityWithParent: "RootEntityWithParent",
  EmptyRoot: "EmptyRoot",
  MissingEntityId: "MissingEntityId",
  InvalidEntitiesFormat: "InvalidEntitiesFormat",
  MissingEntityType: "MissingEntityType",
  UnknownEntityType: "UnknownEntityType",
  InvalidChildrenFormat: "InvalidChildrenFormat",
  MissingEntityParent: "MissingEntityParent",
  MissingEntityInputs: "MissingEntityInputs",
  InvalidEntityInputsFormat: "InvalidEntityInputsFormat",
  UnknownEntityInputType: "UnknownEntityInputType",
  SelfEntityReference: "SelfEntityReference",
  ChildrenNotAllowed: "ChildrenNotAllowed",
  ChildNotAllowed: "ChildNotAllowed",
  CircularEntityReference: "CircularEntityReference",
  EntityChildrenMismatch: "EntityChildrenMismatch",
  ParentRequired: "ParentRequired",
  EntityParentMismatch: "EntityParentMismatch",
} as const;

export type SchemaValidationErrorCode =
  (typeof schemaValidationErrorCodes)[keyof typeof schemaValidationErrorCodes];

const schemaValidationErrorMessages: Record<SchemaValidationErrorCode, string> =
  {
    [schemaValidationErrorCodes.InvalidRootFormat]:
      "The root must be an array of strings.",
    [schemaValidationErrorCodes.DuplicateRootId]:
      "Duplicate IDs detected in the root.",
    [schemaValidationErrorCodes.RootEntityWithParent]:
      "Root entities can't have a parent.",
    [schemaValidationErrorCodes.EmptyRoot]:
      "The root must contain at least one entity.",
    [schemaValidationErrorCodes.MissingEntityId]:
      "A provided entity ID does not exist.",
    [schemaValidationErrorCodes.InvalidEntitiesFormat]:
      "Entities should be an object containing valid entities.",
    [schemaValidationErrorCodes.MissingEntityType]: "Entity type is missing.",
    [schemaValidationErrorCodes.UnknownEntityType]:
      "The provided entity type is unknown.",
    [schemaValidationErrorCodes.InvalidChildrenFormat]:
      "The provided children are invalid.",
    [schemaValidationErrorCodes.MissingEntityParent]:
      "The parent ID references a non-existent entity.",
    [schemaValidationErrorCodes.MissingEntityInputs]:
      "Entity inputs are missing.",
    [schemaValidationErrorCodes.InvalidEntityInputsFormat]:
      "The provided entity inputs are invalid.",
    [schemaValidationErrorCodes.UnknownEntityInputType]:
      "The provided entity input type is unknown.",
    [schemaValidationErrorCodes.SelfEntityReference]: "Self entity reference.",
    [schemaValidationErrorCodes.CircularEntityReference]:
      "Circular entity reference.",
    [schemaValidationErrorCodes.ChildrenNotAllowed]:
      "Children are not allowed.",
    [schemaValidationErrorCodes.ChildNotAllowed]: "Child is not allowed.",
    [schemaValidationErrorCodes.EntityChildrenMismatch]:
      "Children relationship mismatch.",
    [schemaValidationErrorCodes.EntityParentMismatch]:
      "Parent relationship mismatch.",
    [schemaValidationErrorCodes.ParentRequired]: "A parent is required.",
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
      code: typeof schemaValidationErrorCodes.MissingEntityParent;
      entityId: string;
      entityParentId: string;
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
      code: typeof schemaValidationErrorCodes.SelfEntityReference;
      entityId: string;
    }
  | {
      code: typeof schemaValidationErrorCodes.InvalidChildrenFormat;
      entityId: string;
    }
  | {
      code: typeof schemaValidationErrorCodes.CircularEntityReference;
      entityId: string;
    }
  | {
      code: typeof schemaValidationErrorCodes.ChildrenNotAllowed;
      entityId: string;
    }
  | {
      code: typeof schemaValidationErrorCodes.ChildNotAllowed;
      entityId: string;
      childId: string;
    }
  | {
      code: typeof schemaValidationErrorCodes.RootEntityWithParent;
      entityId: string;
    }
  | {
      code: typeof schemaValidationErrorCodes.EntityChildrenMismatch;
      entityId: string;
      childId: string;
    }
  | {
      code: typeof schemaValidationErrorCodes.EntityParentMismatch;
      entityId: string;
      parentId: string;
    }
  | {
      code: typeof schemaValidationErrorCodes.ParentRequired;
      entityId: string;
    };

export class SchemaValidationError extends Error {
  constructor(public cause: SchemaValidationErrorCause) {
    super(schemaValidationErrorMessages[cause.code] ?? "Unkown error");
  }
}
