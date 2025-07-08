import { describe, expect, it } from "vitest";
import { z } from "zod";

import {
  createAttribute,
  createBuilder,
  createEntity,
  validateEntitiesValues,
  type Schema,
} from "../src";

describe("entities values validation", () => {
  it("can validate entities", async () => {
    const builder = createBuilder({
      entities: {
        text: createEntity({
          validate(value) {
            return z.string().parse(value);
          },
        }),
        age: createEntity({
          validate(value) {
            return z.number().min(0).max(18).optional().parse(value);
          },
        }),
        location: createEntity({
          validate(value) {
            return z.string().min(50).parse(value);
          },
        }),
        section: createEntity({
          attributes: {
            skip: createAttribute({
              validate(value) {
                return z.boolean().parse(value);
              },
            }),
          },
          shouldBeProcessed(context) {
            return !context.entity.attributes.skip;
          },
          childrenAllowed: true,
        }),
      },
      entitiesExtensions: {
        age: {
          validate(value) {
            return z.number().min(0).max(120).optional().parse(value);
          },
        },
        location: {
          shouldBeProcessed() {
            return false;
          },
        },
      },
    });

    const schema: Schema<typeof builder> = {
      entities: {
        "51324b32-adc3-4d17-a90e-66b5453935bd": {
          type: "text",
          attributes: {},
        },
        "6e0035c3-0d4c-445f-a42b-2d971225447c": {
          type: "text",
          attributes: {},
        },
        "8a7bfa5e-9828-4b80-a615-cfb6f79728e1": {
          type: "age",
          attributes: {},
        },
        "fd1a7a25-9bd1-4d88-81fd-ce82b0a90004": {
          type: "location",
          attributes: {},
        },
        "115ca988-0175-48cd-a645-acbebd3c498a": {
          type: "section",
          attributes: {
            skip: false,
          },
        },
        "2df173ee-6b88-4744-a74d-0f21d49166b3": {
          type: "section",
          attributes: {
            skip: true,
          },
          children: ["f882562e-ad52-4048-bdf1-d4d7680e9bb0"],
        },
        "f882562e-ad52-4048-bdf1-d4d7680e9bb0": {
          type: "text",
          attributes: {},
          parentId: "2df173ee-6b88-4744-a74d-0f21d49166b3",
        },
      },
      root: [
        "51324b32-adc3-4d17-a90e-66b5453935bd",
        "6e0035c3-0d4c-445f-a42b-2d971225447c",
        "2df173ee-6b88-4744-a74d-0f21d49166b3",
        "8a7bfa5e-9828-4b80-a615-cfb6f79728e1",
        "fd1a7a25-9bd1-4d88-81fd-ce82b0a90004",
      ],
    };

    expect(
      await validateEntitiesValues(
        {
          "51324b32-adc3-4d17-a90e-66b5453935bd": "value",
          "8a7bfa5e-9828-4b80-a615-cfb6f79728e1": 18,
        },
        builder,
        schema,
      ),
    ).toMatchSnapshot();

    expect(
      await validateEntitiesValues(
        {
          "51324b32-adc3-4d17-a90e-66b5453935bd": "value",
          "6e0035c3-0d4c-445f-a42b-2d971225447c": "second value",
          "8a7bfa5e-9828-4b80-a615-cfb6f79728e1": 100,
          "fd1a7a25-9bd1-4d88-81fd-ce82b0a90004": "location",
        },
        builder,
        schema,
      ),
    ).toMatchSnapshot();

    expect(
      await validateEntitiesValues(
        {
          "51324b32-adc3-4d17-a90e-66b5453935bd": "value",
          "6e0035c3-0d4c-445f-a42b-2d971225447c": "second value",
          "2df173ee-6b88-4744-a74d-0f21d49166b3": "should be removed",
        },
        builder,
        schema,
      ),
    ).toMatchSnapshot();

    expect(
      await validateEntitiesValues(null, builder, schema),
    ).toMatchSnapshot();

    expect(await validateEntitiesValues([], builder, schema)).toMatchSnapshot();

    expect(
      await validateEntitiesValues(new Map(), builder, schema),
    ).toMatchSnapshot();
  });
});
