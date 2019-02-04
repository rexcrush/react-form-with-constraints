import * as React from 'react';
import * as PropTypes from 'prop-types';

import { FormWithConstraints, FormWithConstraintsChildContext } from './FormWithConstraints';
import { FieldFeedbacks, FieldFeedbacksChildContext } from './FieldFeedbacks';
import { Async, AsyncChildContext } from './Async';
import { InputElement } from './InputElement';
import FieldFeedbackValidation from './FieldFeedbackValidation';
import { FieldFeedbackWhenValid } from './FieldFeedbackWhenValid';
import FieldFeedbackType from './FieldFeedbackType';
import Field from './Field';
import Nullable from './Nullable';

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
}

export interface FieldFeedbackProps extends FieldFeedbackBaseProps, FieldFeedbackClasses, React.HTMLAttributes<HTMLSpanElement> {
}

interface FieldFeedbackState {
  validation: FieldFeedbackValidation;

  // Copy of input.validationMessage
  // See https://developer.mozilla.org/en/docs/Web/API/HTMLInputElement
  // See https://www.w3.org/TR/html51/sec-forms.html#the-constraint-validation-api
  validationMessage: string;
}

// Why Nullable? See https://github.com/DefinitelyTyped/DefinitelyTyped/pull/27973
export type FieldFeedbackContext = FormWithConstraintsChildContext & FieldFeedbacksChildContext & Partial<Nullable<AsyncChildContext>>;

// FIXME
const FormWithConstraintsContext = React.createContext<FormWithConstraints>(undefined);

export const FieldFeedback: React.FunctionComponent<FieldFeedbackProps> = props => {
  const context = React.useContext(FormWithConstraintsContext);
  const { form, fieldFeedbacks, async } = context;

  // See https://reactjs.org/docs/hooks-faq.html#is-there-something-like-instance-variables
  const keyRef = React.useRef(fieldFeedbacks.addFieldFeedback());

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

  const [state, setState] = React.useState<FieldFeedbackState>({
    validation: {
      key: keyRef.current,
      type,
      show: undefined // undefined means the FieldFeedback was not checked
    },
    validationMessage: ''
  });

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

    const validation = {...state.validation}; // Copy state so we don't modify it directly (use of setState() instead)

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

    setState({
      validation,
      validationMessage: input.validationMessage
    });

    return validation;
  }

  function fieldDidReset(field: Field) {
    if (field.name === fieldFeedbacks.fieldName) { // Ignore the event if it's not for us
      setState(prevState => ({
        validation: {...prevState.validation, ...{show: undefined}},
        validationMessage: ''
      }));
    }
  }


  // Don't forget to update native/FieldFeedback.render()
  const { validation, validationMessage } = state;

  const fieldFeedbackClassName = classes![validation.type]!;
  const classNames = className !== undefined ? `${className} ${fieldFeedbackClassName}` : fieldFeedbackClassName;

  // Special case for when="valid": always displayed, then FieldFeedbackWhenValid decides what to do
  if (validation.type === FieldFeedbackType.WhenValid) {
    return <FieldFeedbackWhenValid data-feedback={keyRef.current} style={style} className={classNames} {...otherProps}>{children}</FieldFeedbackWhenValid>;
  }

  if (validation.show) {
    const feedback = children !== undefined ? children : validationMessage;

    // <span style="display: block"> instead of <div> so FieldFeedback can be wrapped inside a <p>
    return <span data-feedback={keyRef.current} className={classNames} style={{display: 'block', ...style}} {...otherProps}>{feedback}</span>;
  }

  return null;
};

FieldFeedback.defaultProps = {
  when: () => true,
  classes: {
    error: 'error',
    warning: 'warning',
    info: 'info',
    whenValid: 'when-valid'
  }
};




export class FieldFeedback2<Props extends FieldFeedbackBaseProps = FieldFeedbackProps> extends React.Component<Props, FieldFeedbackState> {
  static contextTypes: React.ValidationMap<FieldFeedbackContext> = {
    form: PropTypes.instanceOf(FormWithConstraints).isRequired,
    fieldFeedbacks: PropTypes.instanceOf(FieldFeedbacks).isRequired,
    async: PropTypes.instanceOf(Async)
  };
  context!: FieldFeedbackContext;

  // Tested: there is no conflict with React key prop (https://reactjs.org/docs/lists-and-keys.html)
  readonly key: string; // '0.1', '1.0', '3.5'...
}
