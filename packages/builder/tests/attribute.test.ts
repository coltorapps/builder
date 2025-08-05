import { describe, expect, it } from "vitest";
import { z } from "zod";

import { createAttribute } from "../src/attribute";

const dummyAttributeContext = {
  schema: {
    entities: {},
    root: [],
  },
  entity: {
    id: "",
    attributes: {},
    type: "",
    metadata: undefined,
  },
};

describe("attribute", () => {
  it("can be created with minimal options", () => {
    const attribute = createAttribute({
      validate(value) {
        return value;
      },
    });

    expect(attribute).toMatchSnapshot();

    expect(attribute.parse("test", dummyAttributeContext)).toMatchSnapshot();
  });

  it("can validate values", () => {
    const attribute = createAttribute({
      validate(value) {
        return z.string().parse(value);
      },
    });

    expect(
      attribute.parse("valid", dummyAttributeContext),
    ).toMatchSnapshot();

    expect(() =>
      attribute.parse(1, dummyAttributeContext),
    ).toThrowErrorMatchingSnapshot();
  });
});
