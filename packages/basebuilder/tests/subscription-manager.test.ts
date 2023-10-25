import { describe, expect, it, vi } from "vitest";

import { createSubscriptionManager } from "../src/subscription-manager";

describe("subscription manager", () => {
  it("can be created", () => {
    const subscriptionManager = createSubscriptionManager();

    expect(subscriptionManager).toMatchSnapshot();
  });

  it("allows subscribing to notifications", () => {
    const subscriptionManager = createSubscriptionManager();

    const listener = vi.fn();

    subscriptionManager.subscribe(listener);

    subscriptionManager.notify("test", []);

    expect(listener).toMatchSnapshot();
  });

  it("allows unsubscribing from notifications", () => {
    const subscriptionManager = createSubscriptionManager();

    const listener = vi.fn();

    const unsubscribe = subscriptionManager.subscribe(listener);

    unsubscribe();

    subscriptionManager.notify("test", []);

    expect(listener).not.toHaveBeenCalled();
  });
});
