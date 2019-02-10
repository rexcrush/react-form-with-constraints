import FieldFeedbackType from './FieldFeedbackType';

export default interface FieldFeedbackValidation {
  readonly id: string;
  readonly type: FieldFeedbackType;

  // undefined => means the FieldFeedback was not checked
  // undefined => special case for when="valid": always displayed, then FieldFeedbackWhenValid decides what to do
  show: boolean | undefined;
}
