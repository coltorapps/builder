import { describe, expectTypeOf, it } from "vitest";

import { createDataManager } from "../src/data-manager";

describe("data manager", () => {
  it("can be created", () => {
    type Data = { someValue: string };

    const dataManager = createDataManager<Data>({
      someValue: "test",
    });

    expectTypeOf(dataManager).toEqualTypeOf<{
      getData: () => {
        someValue: string;
      };
      setData: (data: Data) => {
        someValue: string;
      };
      subscribe: (listener: (data: Data, prevData: Data) => void) => () => void;
    }>();
  });
});
