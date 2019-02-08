import * as React from 'react';

import { FormWithConstraintsApi, FormWithConstraintsContext } from './FormWithConstraints';
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

  children?: React.ReactNode;
}

export const FieldFeedbacksContext = React.createContext<FieldFeedbacksApi | undefined>(undefined);

export function FieldFeedbacks(props: FieldFeedbacksProps) {
  const form = React.useContext(FormWithConstraintsContext)!;
  const fieldFeedbacksParent = React.useContext(FieldFeedbacksContext);

  const api = new FieldFeedbacksApi(props, form, fieldFeedbacksParent);

  React.useEffect(() => {
    api.register();

    return function cleanup() {
      api.unregister();
    };
  });

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

  private readonly parent: FieldFeedbacksApi | FormWithConstraintsApi;

  constructor(public props: FieldFeedbacksProps, private form: FormWithConstraintsApi, private fieldFeedbacksParent?: FieldFeedbacksApi) {
    super();

    this.key = fieldFeedbacksParent ? fieldFeedbacksParent.computeFieldFeedbackKey() : form.computeFieldFeedbacksKey();

    if (fieldFeedbacksParent) {
      this.fieldName = fieldFeedbacksParent.fieldName;
      if (props.for !== undefined) throw new Error("FieldFeedbacks cannot have a parent and a 'for' prop");
    } else {
      if (props.for === undefined) throw new Error("FieldFeedbacks cannot be without parent and without 'for' prop");
      else this.fieldName = props.for;
    }

    this.parent = this.fieldFeedbacksParent ? this.fieldFeedbacksParent : this.form;

    console.log('FieldFeedbacksPrivate constructor()', this.key);
  }

  private fieldFeedbackKeyCounter = 0;
  private computeFieldFeedbackKey() {
    return `${this.key}.${this.fieldFeedbackKeyCounter++}`;
  }

  public register() {
    this.form.fieldsStore.addField(this.fieldName);
    this.parent.addValidateFieldEventListener(this.validate);
  }

  public unregister() {
    this.form.fieldsStore.removeField(this.fieldName);
    this.parent.removeValidateFieldEventListener(this.validate);
  }

  public addFieldFeedback() {
    return this.computeFieldFeedbackKey();
  }

  private validate = async (input: InputElement) => {
    let validations;

    if (input.name === this.fieldName) { // Ignore the event if it's not for us
      const field = this.form.fieldsStore.getField(this.fieldName)!;

      if (this.fieldFeedbacksParent && (
          this.fieldFeedbacksParent.props.stop === 'first' && field.hasFeedbacks(this.fieldFeedbacksParent.key) ||
          this.fieldFeedbacksParent.props.stop === 'first-error' && field.hasErrors(this.fieldFeedbacksParent.key) ||
          this.fieldFeedbacksParent.props.stop === 'first-warning' && field.hasWarnings(this.fieldFeedbacksParent.key) ||
          this.fieldFeedbacksParent.props.stop === 'first-info' && field.hasInfos(this.fieldFeedbacksParent.key))) {
        // Do nothing
      }
      else {
        validations = await this._validate(input);
      }
    }

    return validations;
  }

  private async _validate(input: InputElement) {
    const arrayOfArrays = await this.emitValidateFieldEvent(input);
    const validations = flattenDeep<FieldFeedbackValidation | undefined>(arrayOfArrays);
    return validations;
  }
}
