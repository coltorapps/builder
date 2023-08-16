import { describe, expectTypeOf, it } from "vitest";

import { createDataManager } from "../src/data-manager";

describe("data manager", () => {
  it("can be created", () => {
    const dataManager = createDataManager({ data: "test" });

    expectTypeOf(dataManager).toEqualTypeOf<{
      getData: () => {
        data: string;
      };
      setData: (
        setter: (oldData: { data: string }) => {
          data: string;
        },
      ) => {
        data: string;
      };
      subscribe: (listener: (data: { data: string }) => void) => () => void;
    }>();
  });
});
