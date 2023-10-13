import { describe, expect, it } from "vitest";

import { createDebounceManager } from "../src/debounce-manager";

describe("debounce manager", () => {
  it("can be created", () => {
    const dataManager = createDebounceManager();

    expect(dataManager).toMatchSnapshot();
  });

  it("falls back when debounced on the same key", async () => {
    const dataManager = createDebounceManager<number>();

    const [first, second] = await Promise.all([
      dataManager.handle(
        "key",
        async () => {
          await new Promise((resolve) => setTimeout(resolve, 200));

          return 2;
        },
        () => 1,
      ),
      new Promise<number>((resolve) => {
        // eslint-disable-next-line @typescript-eslint/no-misused-promises
        setTimeout(async () => {
          resolve(
            await dataManager.handle(
              "key",
              async () => {
                await new Promise((resolve) => setTimeout(resolve, 50));

                return 2;
              },
              () => 2,
            ),
          );
        }, 100);
      }),
    ]);

    expect(first).toEqual(1);

    expect(second).toEqual(2);

    expect(dataManager.get("key")).toBeUndefined();
  });
});
