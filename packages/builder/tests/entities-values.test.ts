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
      ],
    };

    expect(
      await validateEntitiesValues(
        { "51324b32-adc3-4d17-a90e-66b5453935bd": "value" },
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
