export const initialSchema = {
  entities: {
    "a68836dc-1478-435f-bdee-ca7aff098993": {
      type: "textField",
      attributes: {
        label: "First Name",
        required: true,
        defaultValue: undefined,
        placeholder: undefined,
      },
    },
    "18950fc8-81f6-4927-91c0-880c36a56deb": {
      type: "textField",
      attributes: {
        label: "Last Name",
        required: true,
        defaultValue: undefined,
        placeholder: undefined,
      },
    },
    "39ea99a0-9f37-4446-9376-d93d6d7c35c5": {
      type: "textareaField",
      attributes: {
        label: "About You",
        required: false,
        defaultValue: undefined,
        placeholder: undefined,
      },
    },
  },
  root: [
    "a68836dc-1478-435f-bdee-ca7aff098993",
    "18950fc8-81f6-4927-91c0-880c36a56deb",
    "39ea99a0-9f37-4446-9376-d93d6d7c35c5",
  ],
} as const;
