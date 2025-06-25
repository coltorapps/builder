import {
  type BuilderEntitiesComponents,
  type InterpreterEntitiesComponents,
} from "@coltorapps/builder-react";

import {
  BuilderDatePickerFieldEntity,
  InterpreterDatePickerFieldEntity,
} from "../entities/date-picker/component";
import {
  BuilderParagraphEntity,
  InterpreterParagraphEntity,
} from "../entities/paragraph/component";
import {
  BuilderSelectFieldEntity,
  InterpreterSelectFieldEntity,
} from "../entities/select-field/component";
import {
  BuilderTextFieldEntity,
  InterpreterTextFieldEntity,
} from "../entities/text-field/component";
import {
  BuilderTextareaFieldEntity,
  InterpreterTextareaFieldEntity,
} from "../entities/textarea-field/component";
import { type BasicFormBuilder } from "./definition";

export const builderEntitiesComponents: BuilderEntitiesComponents<BasicFormBuilder> =
  {
    textField: BuilderTextFieldEntity,
    selectField: BuilderSelectFieldEntity,
    datePickerField: BuilderDatePickerFieldEntity,
    textareaField: BuilderTextareaFieldEntity,
    paragraph: BuilderParagraphEntity,
  };

export const interpreterEntitiesComponents: InterpreterEntitiesComponents<BasicFormBuilder> =
  {
    textField: InterpreterTextFieldEntity,
    selectField: InterpreterSelectFieldEntity,
    datePickerField: InterpreterDatePickerFieldEntity,
    textareaField: InterpreterTextareaFieldEntity,
    paragraph: InterpreterParagraphEntity,
  };
