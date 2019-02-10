import * as React from 'react';

import { withValidateFieldEventEmitter } from './withValidateFieldEventEmitter';
import { withFieldWillValidateEventEmitter } from './withFieldWillValidateEventEmitter';
import { withFieldDidValidateEventEmitter } from './withFieldDidValidateEventEmitter';
import { withFieldDidResetEventEmitter } from './withFieldDidResetEventEmitter';
import Field from './Field';
import { InputElement } from './InputElement';
import { FieldsStore } from './FieldsStore';
import FieldFeedbackValidation from './FieldFeedbackValidation';
import flattenDeep from './flattenDeep';
import notUndefined from './notUndefined';

export interface FormWithConstraintsProps extends React.FormHTMLAttributes<HTMLFormElement> {
  children: React.ReactNode;
}

export const FormWithConstraintsContext = React.createContext<FormWithConstraintsApi | undefined>(undefined);

export function useFormWithConstraints() {
  const form = React.useRef<HTMLFormElement | null>(null);
  const api = new FormWithConstraintsApi(form);

  function FormWithConstraints(props: FormWithConstraintsProps) {
    return (
      <FormWithConstraintsContext.Provider value={api}>
        <form ref={form} {...props} />
      </FormWithConstraintsContext.Provider>
    );
  }

  return {
    // Rename to form because form.isValid() looks better to the user than api.isValid()
    form: api,

    FormWithConstraints
  };
}

export class FormWithConstraintsApi
  extends
    withFieldDidResetEventEmitter(
    withFieldWillValidateEventEmitter(
    withFieldDidValidateEventEmitter(
    withValidateFieldEventEmitter<
      // FieldFeedback returns FieldFeedbackValidation
      // Async returns FieldFeedbackValidation[] | undefined
      // FieldFeedbacks returns (FieldFeedbackValidation | undefined)[] | undefined
      FieldFeedbackValidation | (FieldFeedbackValidation | undefined)[] | undefined,
      typeof Object
    >(Object)))) {

  // FIXME Use a forwardRef
  // Could be named innerRef instead, see https://github.com/ant-design/ant-design/issues/5489#issuecomment-332208652
  //private form: React.MutableRefObject<HTMLFormElement | null>;

  constructor(private form: React.MutableRefObject<HTMLFormElement | null>) {
    super();
  }

  public fieldsStore = new FieldsStore();

  private fieldFeedbacksIdCounter = 0;
  public computeFieldFeedbacksId() {
    return `${this.fieldFeedbacksIdCounter++}`;
  }

  /**
   * Validates the given fields, either HTMLInputElements or field names.
   * If called without arguments, validates all fields ($('[name]')).
   */
  public validateFields(...inputsOrNames: Array<InputElement | string>) {
    return this._validateFields(/* forceValidateFields */ true, ...inputsOrNames);
  }

  // TODO To be removed in the future?
  public validateForm() {
    return this.validateFieldsWithoutFeedback();
  }

  /**
   * Validates fields without feedback only.
   */
  public validateFieldsWithoutFeedback(...inputsOrNames: Array<InputElement | string>) {
    return this._validateFields(/* forceValidateFields */ false, ...inputsOrNames);
  }

  private async _validateFields(forceValidateFields: boolean, ...inputsOrNames: Array<InputElement | string>) {
    const fields = new Array<Readonly<Field>>();

    const inputs = this.normalizeInputs(...inputsOrNames);

    for (const input of inputs) {
      const field = await this.validateField(forceValidateFields, new InputElement(input));
      if (field !== undefined) fields.push(field);
    }

    return fields;
  }

  private async validateField(forceValidateFields: boolean, input: InputElement) {
    const fieldName = input.name;
    const field = this.fieldsStore.getField(fieldName);

    if (field === undefined) {
      // Means the field (<input name="username">) does not have a FieldFeedbacks
      // so let's ignore this field
    }

    else if (forceValidateFields || !field.hasFeedbacks()) {
      field.clearValidations();

      this.emitFieldWillValidateEvent(fieldName);

      const arrayOfArrays = await this.emitValidateFieldEvent(input);

      // Internal check that everything is OK
      // Can be temporary out of sync if the user rapidly change the input, in this case:
      // emitFieldWillValidateEvent() returns the result of the first change while the store already contains the final validations
      console.assert(
        JSON.stringify(flattenDeep<FieldFeedbackValidation | undefined>(arrayOfArrays).filter(notUndefined)) /* validationsFromEmitValidateFieldEvent */
        ===
        JSON.stringify(field.validations) /* validationsFromStore */
        ,
        `FieldsStore does not match emitValidateFieldEvent() result, did the user changed the input rapidly?`
      );

      this.emitFieldDidValidateEvent(field);
    }

    return field;
  }

  // If called without arguments, returns all fields ($('[name]'))
  // Returns the inputs in the same order they were given
  protected normalizeInputs(...inputsOrNames: Array<InputElement /* HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement... */ | string>) {
    let inputs;

    if (inputsOrNames.length === 0) {
      // [name] matches <input name="...">, <select name="...">, <button name="...">, ...
      // See Convert JavaScript NodeList to Array? https://stackoverflow.com/a/33822526/990356
      inputs = [...this.form.current!.querySelectorAll<HTMLInputElement>('[name]')];

      // Remove elements without ValidityState, example:
      // <iframe src="https://www.google.com/recaptcha..." name="a-49ekipqfmwsv">
      // Without this check, possible crash inside InputElement is "TypeError: Cannot read property 'badInput' of undefined"
      //
      // ValidityState is available for (lib.dom.d.ts):
      // HTMLButtonElement, HTMLFieldSetElement, HTMLInputElement, HTMLObjectElement,
      // HTMLOutputElement, HTMLSelectElement, HTMLTextAreaElement
      //
      // ValidityState is supported by IE >= 10
      inputs = inputs.filter(input => input.validity !== undefined);

      // Check we have unique names
      inputs
        .filter(input => input.type !== 'checkbox' && input.type !== 'radio')
        .map(input => input.name)
        .forEach((name, index, self) => {
          if (self.indexOf(name) !== index) {
            throw new Error(`Multiple elements matching '[name="${name}"]' inside the form`);
          }
        });
    } else {
      inputs = inputsOrNames.map(input => {
        if (typeof input === 'string') {
          const query = `[name="${input}"]`;
          const elements = [...this.form.current!.querySelectorAll<HTMLInputElement>(query)];

          // Checks

          if (elements.filter(el => el.validity === undefined).length > 0) {
            // Should not match something like
            // <iframe src="https://www.google.com/recaptcha..." name="a-49ekipqfmwsv">
            throw new Error(`'${query}' should match an <input>, <select> or <textarea>`);
          }
          if (elements.filter(el => el.type !== 'checkbox' && el.type !== 'radio').length > 1) {
            throw new Error(`Multiple elements matching '${query}' inside the form`);
          }
          const element = elements[0];
          if (element === undefined) {
            throw new Error(`Could not find field '${query}' inside the form`);
          }

          return element;
        } else {
          return input;
        }
      });
    }

    return inputs;
  }

  // More like seemsToBeValid(): return true if fields are untouched
  public isValid() {
    return this.fieldsStore.isValid();
  }

  public hasFeedbacks() {
    return this.fieldsStore.hasFeedbacks();
  }

  // TODO To be removed in the future?
  public reset() {
    return this.resetFields();
  }

  public async resetFields(...inputsOrNames: Array<InputElement | string>) {
    const fields = new Array<Readonly<Field>>();

    const inputs = this.normalizeInputs(...inputsOrNames);

    for (const input of inputs) {
      const field = await this.resetField(new InputElement(input));
      if (field !== undefined) fields.push(field);
    }

    return fields;
  }

  private async resetField(input: InputElement) {
    const fieldName = input.name;
    const field = this.fieldsStore.getField(fieldName);

    if (field === undefined) {
      // Means the field (<input name="username">) does not have a FieldFeedbacks
      // so let's ignore this field
    } else {
      field.clearValidations();
      await this.emitFieldDidResetEvent(field);
    }

    return field;
  }
}
