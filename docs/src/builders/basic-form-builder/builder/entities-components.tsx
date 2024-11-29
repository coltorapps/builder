import { DatePickerFieldEntity } from "../entities/date-picker/component";
import { ParagraphEntity } from "../entities/paragraph/component";
import { SelectFieldEntity } from "../entities/select-field/component";
import { TextFieldEntity } from "../entities/text-field/component";
import { TextareaFieldEntity } from "../entities/textarea-field/component";

export const entitiesComponents = {
  textField: TextFieldEntity,
  selectField: SelectFieldEntity,
  datePickerField: DatePickerFieldEntity,
  textareaField: TextareaFieldEntity,
  paragraph: ParagraphEntity,
};
