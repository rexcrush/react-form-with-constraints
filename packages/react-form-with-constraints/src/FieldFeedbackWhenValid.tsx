import * as React from 'react';

import { FormWithConstraints } from './FormWithConstraints';
import { FieldFeedbacksPrivate } from './FieldFeedbacks';
import { FieldFeedbackClasses } from './FieldFeedback';
import Field from './Field';

interface FieldFeedbackWhenValidPrivateContext {
  form: FormWithConstraints;
  fieldFeedbacks: FieldFeedbacksPrivate;
}

type FieldFeedbackWhenValidBaseProps = FieldFeedbackWhenValidPrivateContext;

export type FieldFeedbackWhenValidProps = FieldFeedbackWhenValidBaseProps & FieldFeedbackClasses & React.HTMLAttributes<HTMLSpanElement>;

interface FieldFeedbackWhenValidState {
  fieldIsValid: boolean | undefined;
}

export class FieldFeedbackWhenValid<Props extends FieldFeedbackWhenValidBaseProps = FieldFeedbackWhenValidProps>
       extends React.Component<Props, FieldFeedbackWhenValidState> {

  state: FieldFeedbackWhenValidState = {
    fieldIsValid: undefined
  };

  componentWillMount() {
    const { form } = this.props;

    form.addFieldWillValidateEventListener(this.fieldWillValidate);
    form.addFieldDidValidateEventListener(this.fieldDidValidate);
    form.addFieldDidResetEventListener(this.fieldDidReset);
  }

  componentWillUnmount() {
    const { form } = this.props;

    form.removeFieldWillValidateEventListener(this.fieldWillValidate);
    form.removeFieldDidValidateEventListener(this.fieldDidValidate);
    form.removeFieldDidResetEventListener(this.fieldDidReset);
  }

  fieldWillValidate = (fieldName: string) => {
    if (fieldName === this.props.fieldFeedbacks.fieldName) { // Ignore the event if it's not for us
      this.setState({fieldIsValid: undefined});
    }
  }

  fieldDidValidate = (field: Field) => {
    if (field.name === this.props.fieldFeedbacks.fieldName) { // Ignore the event if it's not for us
      this.setState({fieldIsValid: field.isValid()});
    }
  }

  fieldDidReset = (field: Field) => {
    if (field.name === this.props.fieldFeedbacks.fieldName) { // Ignore the event if it's not for us
      this.setState({fieldIsValid: undefined});
    }
  }

  // Don't forget to update native/FieldFeedbackWhenValid.render()
  render() {
    const { form, fieldFeedbacks, style, ...otherProps } = this.props as FieldFeedbackWhenValidProps;

    return this.state.fieldIsValid ?
      // <span style="display: block"> instead of <div> so FieldFeedbackWhenValid can be wrapped inside a <p>
      // otherProps before className because otherProps contains data-feedback
      <span {...otherProps} style={{display: 'block', ...style}} />
      : null;
  }
}
