import { describe, expect, it } from "vitest";

import { generateUuid, validateUuid } from "../src/uuid";

describe("uuid", () => {
  it("can generate uuids", () => {
    expect(generateUuid()).toBeTypeOf("string");
  });

  it("can validate uuids", () => {
    expect(() => validateUuid("invalid")).toThrowErrorMatchingInlineSnapshot(
      "\"The entity id 'invalid' is invalid.\"",
    );

    expect(() =>
      validateUuid("6e0035c3-0d4c-445f-a42b-2d971225447"),
    ).toThrowErrorMatchingInlineSnapshot(
      "\"The entity id '6e0035c3-0d4c-445f-a42b-2d971225447' is invalid.\"",
    );

    expect(() =>
      validateUuid("6e0035c30d4c445fa42b2d971225447c"),
    ).toThrowErrorMatchingInlineSnapshot(
      "\"The entity id '6e0035c30d4c445fa42b2d971225447c' is invalid.\"",
    );

    expect(() =>
      validateUuid("6e0035c3-0d4c-445f-a42b-2d971225447c"),
    ).not.toThrow();
  });
});
