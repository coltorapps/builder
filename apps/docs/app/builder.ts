import {
  createBuilder,
  createEntity,
  createInput,
} from "../../../packages/builder/dist";

export const builder = createBuilder({
  entities: [
    createEntity({
      name: "test",
      inputs: [
        createInput({
          name: "label",
          validate(value) {
            if (typeof value !== "string") {
              throw "Must be stirng";
            }
            if (value.length < 5) {
              throw "Too short!!";
            }
            return value;
          },
        }),
        createInput({
          name: "kebag2",
          validate(value) {
            if (typeof value !== "string") {
              throw new Error();
            }
            return value;
          },
        }),
      ],
      validate(value) {
        if (typeof value !== "string") {
          throw new Error();
        }
        return value;
      },
    }),
    createEntity({
      name: "select",
      inputs: [
        createInput({
          name: "kebag",
          validate(value) {
            if (typeof value !== "number") {
              throw new Error();
            }
            return value;
          },
        }),
      ],
    }),
  ],
  childrenAllowed: {
    test: true,
  },
});
