import { afterEach, describe, expect, it, vi } from "vitest";

import { createBuilder, createEntity } from "../src";
import * as uuidExports from "../src/uuid";

describe("builder", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("can be created with minimal options", () => {
    const generateUuidMock = vi.spyOn(uuidExports, "generateUuid");

    const validateUuidMock = vi.spyOn(uuidExports, "validateUuid");

    const builder = createBuilder({
      entities: [],
    });

    expect(builder).toMatchSnapshot();

    builder.generateEntityId();

    builder.validateEntityId("6e0035c3-0d4c-445f-a42b-2d971225447c");

    expect(generateUuidMock).toHaveBeenCalled();

    expect(validateUuidMock).toHaveBeenCalled();
  });

  it("can be created with entity ID generator and validator", () => {
    const builder = createBuilder({
      entities: [],
      generateEntityId() {
        return "1";
      },
      validateEntityId(id) {
        if (id !== "1") {
          throw new Error("Not equal to 1");
        }
      },
    });

    expect(builder).toMatchSnapshot();

    expect(builder.generateEntityId()).toMatchSnapshot();

    expect(builder.validateEntityId("1")).toMatchSnapshot();

    expect(() => builder.validateEntityId("2")).toThrowErrorMatchingSnapshot();
  });

  it("can be created with entities", () => {
    const builder = createBuilder({
      entities: [createEntity({ name: "test" })],
    });

    expect(builder).toMatchSnapshot();
  });

  it("can be created with children and parent rules", () => {
    const builder = createBuilder({
      entities: [
        createEntity({
          name: "test",
          childrenAllowed: true,
          parentRequired: true,
        }),
      ],
    });

    expect(builder).toMatchSnapshot();
  });
});
