import { describe, expectTypeOf, it } from "vitest";

import { createSubscriptionManager } from "../src/subscription-manager";

describe("subscription manager", () => {
  it("can be created", () => {
    type Data = { test: string };

    const subscriptionManager = createSubscriptionManager<Data>();

    expectTypeOf(subscriptionManager).toEqualTypeOf<{
      notify: (data: Data) => void;
      subscribe: (listener: (data: Data) => void) => () => void;
    }>();
  });
});
