import * as React from 'react';

import { FormWithConstraintsApi, FormWithConstraintsContext } from './FormWithConstraints';
import { withValidateFieldEventEmitter } from './withValidateFieldEventEmitter';
import { InputElement } from './InputElement';
import FieldFeedbackValidation from './FieldFeedbackValidation';
import flattenDeep from './flattenDeep';
import { uniqueId } from 'lodash';

export interface FieldFeedbacksProps {
  for?: string;

  /**
   * first-* => stops on the first * encountered
   * no => shows everything
   * Default is 'first-error'
   */
  stop?: 'first' | 'first-error' | 'first-warning' | 'first-info' | 'no';

  children?: React.ReactNode;
}

export const FieldFeedbacksContext = React.createContext<FieldFeedbacksApi | undefined>(undefined);

export function FieldFeedbacks(props: FieldFeedbacksProps) {
  const form = React.useContext(FormWithConstraintsContext)!;
  const fieldFeedbacksParent = React.useContext(FieldFeedbacksContext); // Can be undefined

  const api = new FieldFeedbacksApi(props, form, fieldFeedbacksParent);
  console.log('  FieldFeedbacks() name=', api.fieldName, 'form.id=', form.id);

  const parent = fieldFeedbacksParent ? fieldFeedbacksParent : form;

  React.useEffect(() => {
    form.fieldsStore.addField(api.fieldName);
    parent.addValidateFieldEventListener(validate);

    return function cleanup() {
      form.fieldsStore.removeField(api.fieldName);
      parent.removeValidateFieldEventListener(validate);
    };
  });

  async function validate(input: InputElement) {
    console.log('  FieldFeedbacks.validate() key=', api.key);

    let validations;

    if (input.name === api.fieldName) { // Ignore the event if it's not for us
      const field = form.fieldsStore.getField(api.fieldName)!;

      if (fieldFeedbacksParent && (
          fieldFeedbacksParent.props.stop === 'first' && field.hasFeedbacks(fieldFeedbacksParent.key) ||
          fieldFeedbacksParent.props.stop === 'first-error' && field.hasErrors(fieldFeedbacksParent.key) ||
          fieldFeedbacksParent.props.stop === 'first-warning' && field.hasWarnings(fieldFeedbacksParent.key) ||
          fieldFeedbacksParent.props.stop === 'first-info' && field.hasInfos(fieldFeedbacksParent.key))) {
        // Do nothing
      }
      else {
        validations = await _validate(input);
      }
    }

    return validations;
  }

  async function _validate(input: InputElement) {
    const arrayOfArrays = await api.emitValidateFieldEvent(input);
    const validations = flattenDeep<FieldFeedbackValidation | undefined>(arrayOfArrays);
    return validations;
  }

  function render() {
    const { children } = props;

    return (
      <FieldFeedbacksContext.Provider value={api}>
        {
          // See https://codepen.io/tkrotoff/pen/yzKKdB
          children !== undefined ? children : null
        }
      </FieldFeedbacksContext.Provider>
    );
  }

  return render();
}

FieldFeedbacks.defaultProps = {
  stop: 'first-error'
};

export class FieldFeedbacksApi
  extends
    withValidateFieldEventEmitter<
      // FieldFeedback returns FieldFeedbackValidation
      // Async returns FieldFeedbackValidation[] | undefined
      // FieldFeedbacks returns (FieldFeedbackValidation | undefined)[]
      FieldFeedbackValidation | (FieldFeedbackValidation | undefined)[] | undefined,
      typeof Object
    >(Object) {

  // Tested: there is no conflict with React key prop (https://reactjs.org/docs/lists-and-keys.html)
  public readonly key: string; // '0', '1', '2'...

  public readonly fieldName: string; // Instead of reading props each time

  id = uniqueId();

  constructor(public props: FieldFeedbacksProps, form: FormWithConstraintsApi, fieldFeedbacksParent?: FieldFeedbacksApi) {
    super();

    this.key = fieldFeedbacksParent ? fieldFeedbacksParent.computeFieldFeedbackKey() : form.computeFieldFeedbacksKey();

    if (fieldFeedbacksParent) {
      this.fieldName = fieldFeedbacksParent.fieldName;
      if (props.for !== undefined) throw new Error("FieldFeedbacks cannot have a parent and a 'for' prop");
    } else {
      if (props.for === undefined) throw new Error("FieldFeedbacks cannot be without parent and without 'for' prop");
      else this.fieldName = props.for;
    }

    console.log('  FieldFeedbacksApi id=', this.id, 'key=', this.key);
  }

  private fieldFeedbackKeyCounter = 0;
  private computeFieldFeedbackKey() {
    return `${this.key}.${this.fieldFeedbackKeyCounter++}`;
  }

  public addFieldFeedback() {
    const tmp = this.computeFieldFeedbackKey();
    console.log('  FieldFeedbacksApi addFieldFeedback() FieldFeedbackKey=', tmp);
    return tmp;
  }
}
