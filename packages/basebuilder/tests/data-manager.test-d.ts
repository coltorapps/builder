import { describe, expectTypeOf, it } from "vitest";

import { createDataManager } from "../src/data-manager";

describe("data manager", () => {
  it("can be created", () => {
    type Event = { name: "event name"; payload: "event payload" };

    const dataManager = createDataManager<{ someValue: string }, Event>({
      someValue: "test",
    });

    expectTypeOf(dataManager).toEqualTypeOf<{
      getData: () => {
        someValue: string;
      };
      setData: (
        data: {
          someValue: string;
        },
        events: Event[],
      ) => {
        someValue: string;
      };
      subscribe: (
        listener: (
          data: {
            someValue: string;
          },
          events: Event[],
        ) => void,
      ) => () => void;
    }>();
  });
});
