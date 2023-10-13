import { describe, expectTypeOf, it } from "vitest";

import { createDebounceManager } from "../src/debounce-manager";

describe("debounce manager", () => {
  it("can be created", () => {
    const debounceManager = createDebounceManager<"result">();

    expectTypeOf(debounceManager).toEqualTypeOf<{
      get: (key: string) => Date | undefined;
      handle: (
        key: string,
        callback: () => "result" | Promise<"result">,
        fallback: () => "result",
      ) => Promise<"result">;
    }>();
  });
});
