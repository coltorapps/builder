import { describe, expect, it } from "vitest";

import { generateUuid, validateUuid } from "../src/uuid";

describe("uuid", () => {
  it("can generate uuids", () => {
    expect(generateUuid()).toBeTypeOf("string");
  });

  it("can validate uuids", () => {
    expect(() => validateUuid("invalid")).toThrowErrorMatchingSnapshot();

    expect(() =>
      validateUuid("6e0035c3-0d4c-445f-a42b-2d971225447"),
    ).toThrowErrorMatchingSnapshot();

    expect(() =>
      validateUuid("6e0035c30d4c445fa42b2d971225447c"),
    ).toThrowErrorMatchingSnapshot();

    expect(() =>
      validateUuid("6e0035c3-0d4c-445f-a42b-2d971225447c"),
    ).not.toThrow();
  });
});
