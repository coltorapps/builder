import { createBuilder } from "basebuilder";

import { datePickerFieldEntity } from "../entities/date-picker/definition";
import { paragraphEntity } from "../entities/paragraph/definition";
import { selectFieldEntity } from "../entities/select-field/definition";
import { textFieldEntity } from "../entities/text-field/definition";
import { textareaFieldEntity } from "../entities/textarea-field/definition";

export const basicFormBuilder = createBuilder({
  entities: [
    textFieldEntity,
    textareaFieldEntity,
    selectFieldEntity,
    datePickerFieldEntity,
    paragraphEntity,
  ],
});
