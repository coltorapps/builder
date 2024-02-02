import { describe, expectTypeOf, it } from "vitest";

import { createSubscriptionManager } from "../src/subscription-manager";

describe("subscription manager", () => {
  it("can be created", () => {
    type Data = { test: string };

    type Event = { name: "event name"; payload: "event payload" };

    const subscriptionManager = createSubscriptionManager<Data, Event>();

    expectTypeOf(subscriptionManager).toEqualTypeOf<{
      notify: (
        data: {
          test: string;
        },
        events: Event[],
      ) => void;
      subscribe: (
        listener: (
          data: {
            test: string;
          },
          events: Event[],
        ) => void,
      ) => () => void;
    }>();
  });
});
