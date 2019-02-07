import * as React from 'react';

import { FormWithConstraints, FormWithConstraintsContext } from './FormWithConstraints';
import { withValidateFieldEventEmitter } from './withValidateFieldEventEmitter';
import { InputElement } from './InputElement';
import FieldFeedbackValidation from './FieldFeedbackValidation';
import flattenDeep from './flattenDeep';

export interface FieldFeedbacksProps {
  for?: string;

  /**
   * first-* => stops on the first * encountered
   * no => shows everything
   * Default is 'first-error'
   */
  stop?: 'first' | 'first-error' | 'first-warning' | 'first-info' | 'no';
}

export const FieldFeedbacksContext = React.createContext<FieldFeedbacksPrivate | undefined>(undefined);


export const FieldFeedbacks: React.FunctionComponent<FieldFeedbacksProps> = props => {
  const form = React.useContext(FormWithConstraintsContext)!;
  const fieldFeedbacksParent = React.useContext(FieldFeedbacksContext)!;

  // See https://reactjs.org/docs/hooks-faq.html#is-there-something-like-instance-variables
  const validateFieldEventEmitter = React.useRef(new ValidateFieldEventEmitter()).current;

  const instance = React.useRef(new FieldFeedbacksInstance()).current;
  instance.key = fieldFeedbacksParent ? fieldFeedbacksParent.computeFieldFeedbackKey() : form.computeFieldFeedbacksKey();

  if (fieldFeedbacksParent) {
    instance.fieldName = fieldFeedbacksParent.fieldName;
    if (props.for !== undefined) throw new Error("FieldFeedbacks cannot have a parent and a 'for' prop");
  } else {
    if (props.for === undefined) throw new Error("FieldFeedbacks cannot be without parent and without 'for' prop");
    else instance.fieldName = props.for;
  }


};


class FieldFeedbacksInstance {
  // Tested: there is no conflict with React key prop (https://reactjs.org/docs/lists-and-keys.html)
  key: string; // '0', '1', '2'...

  fieldName: string; // Instead of reading props each time

}





export class FieldFeedbacks2 extends React.Component<FieldFeedbacksProps> {
  static defaultProps: FieldFeedbacksProps = {
    stop: 'first-error'
  };

  render() {
    return (
      <FormWithConstraintsContext.Consumer>
        {form =>
          <FieldFeedbacksContext.Consumer>
            {fieldFeedbacks => <FieldFeedbacksPrivate {...this.props} form={form!} fieldFeedbacks={fieldFeedbacks} />}
          </FieldFeedbacksContext.Consumer>
        }
      </FormWithConstraintsContext.Consumer>
    );
  }
}


interface FieldFeedbacksPrivateContext {
  form: FormWithConstraints;
  fieldFeedbacks?: FieldFeedbacksPrivate;
}

type FieldFeedbacksPrivateProps = FieldFeedbacksProps & FieldFeedbacksPrivateContext;

class FieldFeedbacksPrivateComponent extends React.Component<FieldFeedbacksPrivateProps> {}
export class FieldFeedbacksPrivate {

  private fieldFeedbackKeyCounter = 0;
  computeFieldFeedbackKey() {
    return `${this.key}.${this.fieldFeedbackKeyCounter++}`;
  }

  addFieldFeedback() {
    return this.computeFieldFeedbackKey();
  }

  componentWillMount() {
    const { form, fieldFeedbacks: fieldFeedbacksParent } = this.props;

    form.fieldsStore.addField(this.fieldName);

    const parent = fieldFeedbacksParent ? fieldFeedbacksParent : form;
    parent.addValidateFieldEventListener(this.validate);
  }

  componentWillUnmount() {
    const { form, fieldFeedbacks: fieldFeedbacksParent } = this.props;

    form.fieldsStore.removeField(this.fieldName);

    const parent = fieldFeedbacksParent ? fieldFeedbacksParent : form;
    parent.removeValidateFieldEventListener(this.validate);
  }

  validate = async (input: InputElement) => {
    const { form, fieldFeedbacks: fieldFeedbacksParent } = this.props;

    let validations;

    if (input.name === this.fieldName) { // Ignore the event if it's not for us
      const field = form.fieldsStore.getField(this.fieldName)!;

      if (fieldFeedbacksParent && (
          fieldFeedbacksParent.props.stop === 'first' && field.hasFeedbacks(fieldFeedbacksParent.key) ||
          fieldFeedbacksParent.props.stop === 'first-error' && field.hasErrors(fieldFeedbacksParent.key) ||
          fieldFeedbacksParent.props.stop === 'first-warning' && field.hasWarnings(fieldFeedbacksParent.key) ||
          fieldFeedbacksParent.props.stop === 'first-info' && field.hasInfos(fieldFeedbacksParent.key))) {
        // Do nothing
      }
      else {
        validations = await this._validate(input);
      }
    }

    return validations;
  }

  async _validate(input: InputElement) {
    const arrayOfArrays = await this.emitValidateFieldEvent(input);
    const validations = flattenDeep<FieldFeedbackValidation | undefined>(arrayOfArrays);
    return validations;
  }

  render() {
    const { children } = this.props;

    return (
      <FieldFeedbacksContext.Provider value={this}>
        {
          // See https://codepen.io/tkrotoff/pen/yzKKdB
          children !== undefined ? children : null
        }
      </FieldFeedbacksContext.Provider>
    );
  }
}
