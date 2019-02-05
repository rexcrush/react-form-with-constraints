import * as React from 'react';

import { FormWithConstraints, FormWithConstraintsContext } from './FormWithConstraints';
import { FieldFeedbacksContext, FieldFeedbacksPrivate } from './FieldFeedbacks';
import { AsyncContext, AsyncPrivate } from './Async';
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
}

export interface FieldFeedbackProps extends FieldFeedbackBaseProps, FieldFeedbackClasses, React.HTMLAttributes<HTMLSpanElement> {
}

export class FieldFeedback<Props extends FieldFeedbackBaseProps = FieldFeedbackProps> extends React.Component<Props> {
  static defaultProps: FieldFeedbackProps = {
    when: () => true,
    classes: {
      error: 'error',
      warning: 'warning',
      info: 'info',
      whenValid: 'when-valid'
    }
  };

  render() {
    return (
      <FormWithConstraintsContext.Consumer>
        {form =>
          <FieldFeedbacksContext.Consumer>
            {fieldFeedbacks =>
              <AsyncContext.Consumer>
                {async => <FieldFeedbackPrivate {...this.props} form={form!} fieldFeedbacks={fieldFeedbacks!} async={async} />}
              </AsyncContext.Consumer>
            }
          </FieldFeedbacksContext.Consumer>
        }
      </FormWithConstraintsContext.Consumer>
    );
  }
}

interface FieldFeedbackPrivateContext {
  form: FormWithConstraints;
  fieldFeedbacks: FieldFeedbacksPrivate;
  async?: AsyncPrivate<any>;
}

type FieldFeedbackPrivateProps = FieldFeedbackProps & FieldFeedbackPrivateContext;

interface FieldFeedbackState {
  validation: FieldFeedbackValidation;

  // Copy of input.validationMessage
  // See https://developer.mozilla.org/en/docs/Web/API/HTMLInputElement
  // See https://www.w3.org/TR/html51/sec-forms.html#the-constraint-validation-api
  validationMessage: string;
}

export class FieldFeedbackPrivate extends React.Component<FieldFeedbackPrivateProps, FieldFeedbackState> {
  // Tested: there is no conflict with React key prop (https://reactjs.org/docs/lists-and-keys.html)
  readonly key: string; // '0.1', '1.0', '3.5'...

  constructor(props: FieldFeedbackPrivateProps) {
    super(props);

    this.key = props.fieldFeedbacks.addFieldFeedback();

    const { error, warning, info, when } = props;

    let type = FieldFeedbackType.Error; // Default is error
    if (when === 'valid') type = FieldFeedbackType.WhenValid;
    else if (warning) type = FieldFeedbackType.Warning;
    else if (info) type = FieldFeedbackType.Info;

    // Special case for when="valid"
    if (type === FieldFeedbackType.WhenValid && (error || warning || info)) {
      throw new Error('Cannot have an attribute (error, warning...) with FieldFeedback when="valid"');
    }

    this.state = {
      validation: {
        key: this.key,
        type,
        show: undefined // undefined means the FieldFeedback was not checked
      },
      validationMessage: ''
    };
  }

  componentWillMount() {
    const { form, fieldFeedbacks, async } = this.props;

    if (async) async.addValidateFieldEventListener(this.validate);
    else fieldFeedbacks.addValidateFieldEventListener(this.validate);

    form.addFieldDidResetEventListener(this.fieldDidReset);
  }

  componentWillUnmount() {
    const { form, fieldFeedbacks, async } = this.props;

    if (async) async.removeValidateFieldEventListener(this.validate);
    else fieldFeedbacks.removeValidateFieldEventListener(this.validate);

    form.removeFieldDidResetEventListener(this.fieldDidReset);
  }

  validate = (input: InputElement) => {
    const { form, fieldFeedbacks, when } = this.props;

    const field = form.fieldsStore.getField(input.name)!;

    const validation = {...this.state.validation}; // Copy state so we don't modify it directly (use of setState() instead)

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

    this.setState({
      validation,
      validationMessage: input.validationMessage
    });

    return validation;
  }

  fieldDidReset = (field: Field) => {
    if (field.name === this.props.fieldFeedbacks.fieldName) { // Ignore the event if it's not for us
      this.setState(prevState => ({
        validation: {...prevState.validation, ...{show: undefined}},
        validationMessage: ''
      }));
    }
  }

  // Don't forget to update native/FieldFeedback.render()
  render() {
    const { form, fieldFeedbacks, async, when, error, warning, info, className, classes, style, children, ...otherProps } = this.props;
    const { validation, validationMessage } = this.state;

    const fieldFeedbackClassName = classes![validation.type]!;
    const classNames = className !== undefined ? `${className} ${fieldFeedbackClassName}` : fieldFeedbackClassName;

    // Special case for when="valid": always displayed, then FieldFeedbackWhenValid decides what to do
    if (validation.type === FieldFeedbackType.WhenValid) {
      return (
        <FieldFeedbackWhenValid
          form={form} fieldFeedbacks={fieldFeedbacks}
          data-feedback={this.key} style={style} className={classNames}
          {...otherProps}
        >
          {children}
        </FieldFeedbackWhenValid>
      );
    }

    if (validation.show) {
      const feedback = children !== undefined ? children : validationMessage;

      // <span style="display: block"> instead of <div> so FieldFeedback can be wrapped inside a <p>
      return <span data-feedback={this.key} className={classNames} style={{display: 'block', ...style}} {...otherProps}>{feedback}</span>;
    }

    return null;
  }
}
