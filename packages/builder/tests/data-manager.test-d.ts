import { describe, expectTypeOf, it } from "vitest";

import { createDataManager } from "../src/data-manager";

describe("data manager", () => {
  it("can be created", () => {
    const dataManager = createDataManager({ someValue: "test" });

    expectTypeOf(dataManager).toEqualTypeOf<{
      getData: () => {
        someValue: string;
      };
      setData: (data: { someValue: string }) => {
        someValue: string;
      };
      subscribe: (
        listener: (data: { someValue: string }) => void,
      ) => () => void;
    }>();
  });
});
