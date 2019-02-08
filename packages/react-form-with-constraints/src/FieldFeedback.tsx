import * as React from 'react';

import { FormWithConstraintsContext } from './FormWithConstraints';
import { FieldFeedbacksContext } from './FieldFeedbacks';
import { AsyncContext } from './Async';
import { InputElement } from './InputElement';
import FieldFeedbackValidation from './FieldFeedbackValidation';
import { FieldFeedbackWhenValid } from './FieldFeedbackWhenValid';
import FieldFeedbackType from './FieldFeedbackType';
import Field from './Field';

type WhenString =
  | 'valid'
  | '*'
  | 'badInput'        // input type="number"
  | 'patternMismatch' // pattern attribute
  | 'rangeOverflow'   // max attribute
  | 'rangeUnderflow'  // min attribute
  | 'stepMismatch'    // step attribute
  | 'tooLong'         // maxlength attribute
  | 'tooShort'        // minlength attribute
  | 'typeMismatch'    // input type="email" or input type="url"
  | 'valueMissing';   // required attribute
type WhenFn = (value: string) => boolean;
type When = WhenString | WhenFn;

export interface FieldFeedbackClasses {
  classes?: { // FIXME Should not be declared "?" thanks to defaultProps?
    [index: string]: string | undefined;
    error?: string;
    warning?: string;
    info?: string;
    whenValid?: string;
  };
}

export interface FieldFeedbackBaseProps {
  when?: When; // FIXME Should not be declared "?" thanks to defaultProps?
  error?: boolean;
  warning?: boolean;
  info?: boolean;

  children?: React.ReactNode;
}

export type FieldFeedbackProps = FieldFeedbackBaseProps & FieldFeedbackClasses & React.HTMLAttributes<HTMLSpanElement>;

export function FieldFeedback(props: FieldFeedbackProps) {
  const form = React.useContext(FormWithConstraintsContext)!;
  const fieldFeedbacks = React.useContext(FieldFeedbacksContext)!;
  const async = React.useContext(AsyncContext);

  // See https://reactjs.org/docs/hooks-faq.html#is-there-something-like-instance-variables
  const key = React.useRef(fieldFeedbacks.addFieldFeedback()).current;
  console.log('FieldFeedback key=', key);
  console.log('FieldFeedback form=', form);
  console.log('FieldFeedback fieldFeedbacks=', fieldFeedbacks);
  console.log('FieldFeedback async=', async);

  const {
    when, error, warning, info,
    className, classes, style, children, ...otherProps
  } = props;

  let type = FieldFeedbackType.Error; // Default is error
  if (when === 'valid') type = FieldFeedbackType.WhenValid;
  else if (warning) type = FieldFeedbackType.Warning;
  else if (info) type = FieldFeedbackType.Info;

  // Special case for when="valid"
  if (type === FieldFeedbackType.WhenValid && (error || warning || info)) {
    throw new Error('Cannot have an attribute (error, warning...) with FieldFeedback when="valid"');
  }

  const [validation, setValidation] = React.useState<FieldFeedbackValidation>({
    key,
    type,
    show: undefined // undefined means the FieldFeedback was not checked
  });

  // Copy of input.validationMessage
  // See https://developer.mozilla.org/en/docs/Web/API/HTMLInputElement
  // See https://www.w3.org/TR/html51/sec-forms.html#the-constraint-validation-api
  const [validationMessage, setValidationMessage] = React.useState('');

  React.useEffect(() => {
    if (async) async.addValidateFieldEventListener(validate);
    else fieldFeedbacks.addValidateFieldEventListener(validate);

    form.addFieldDidResetEventListener(fieldDidReset);

    return function cleanup() {
      if (async) async.removeValidateFieldEventListener(validate);
      else fieldFeedbacks.removeValidateFieldEventListener(validate);

      form.removeFieldDidResetEventListener(fieldDidReset);
    };
  });

  function validate(input: InputElement) {
    const field = form.fieldsStore.getField(input.name)!;

    if (fieldFeedbacks.props.stop === 'first' && field.hasFeedbacks(fieldFeedbacks.key) ||
        fieldFeedbacks.props.stop === 'first-error' && field.hasErrors(fieldFeedbacks.key) ||
        fieldFeedbacks.props.stop === 'first-warning' && field.hasWarnings(fieldFeedbacks.key) ||
        fieldFeedbacks.props.stop === 'first-info' && field.hasInfos(fieldFeedbacks.key)) {
      // Do nothing
      validation.show = undefined; // undefined means the FieldFeedback was not checked
    }

    else {
      validation.show = false;

      if (typeof when === 'function') {
        validation.show = when(input.value);
      }

      else if (typeof when === 'string') {
        if (when === 'valid') {
          // undefined => special case for when="valid": always displayed, then FieldFeedbackWhenValid decides what to do
          validation.show = undefined;
        } else {
          const validity = input.validity;

          if (!validity.valid) {
            if (when === '*') {
              validation.show = true;
            }
            else if (
              validity.badInput && when === 'badInput' ||
              validity.patternMismatch && when === 'patternMismatch' ||
              validity.rangeOverflow && when === 'rangeOverflow' ||
              validity.rangeUnderflow && when === 'rangeUnderflow' ||
              validity.stepMismatch && when === 'stepMismatch' ||
              validity.tooLong && when === 'tooLong' ||
              validity.tooShort && when === 'tooShort' ||
              validity.typeMismatch && when === 'typeMismatch' ||
              validity.valueMissing && when === 'valueMissing') {

              validation.show = true;
            }
          }
        }
      }

      else {
        throw new TypeError(`Invalid FieldFeedback 'when' type: ${typeof when}`);
      }
    }

    field.addOrReplaceValidation(validation);

    console.log('validation=', validation);
    setValidation(validation);
    setValidationMessage(input.validationMessage);

    return validation;
  }

  function fieldDidReset(field: Field) {
    if (field.name === fieldFeedbacks.fieldName) { // Ignore the event if it's not for us
      setValidation({...validation, ...{show: undefined}});
      setValidationMessage('');
    }
  }

  function render() {
    // Don't forget to update native/FieldFeedback.render()
    const fieldFeedbackClassName = classes![validation.type]!;
    const classNames = className !== undefined ? `${className} ${fieldFeedbackClassName}` : fieldFeedbackClassName;

    // Special case for when="valid": always displayed, then FieldFeedbackWhenValid decides what to do
    if (validation.type === FieldFeedbackType.WhenValid) {
      return (
        <FieldFeedbackWhenValid
          data-feedback={key}
          style={style}
          className={classNames}
          {...otherProps}
        >
          {children}
        </FieldFeedbackWhenValid>
      );
    }

    if (validation.show) {
      const feedback = children !== undefined ? children : validationMessage;

      // <span style="display: block"> instead of <div> so FieldFeedback can be wrapped inside a <p>
      return (
        <span
          data-feedback={key}
          className={classNames}
          style={{display: 'block', ...style}}
          {...otherProps}
        >
          {feedback}
        </span>
      );
    }

    return null;
  }

  return render();
}

FieldFeedback.defaultProps = {
  when: () => true,
  classes: {
    error: 'error',
    warning: 'warning',
    info: 'info',
    whenValid: 'when-valid'
  }
};
