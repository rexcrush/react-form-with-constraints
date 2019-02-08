import * as React from 'react';

import { FormWithConstraints, FormWithConstraintsContext } from './FormWithConstraints';
import { FieldFeedbacksPrivate, FieldFeedbacksContext } from './FieldFeedbacks';
import { withValidateFieldEventEmitter } from './withValidateFieldEventEmitter';
import FieldFeedbackValidation from './FieldFeedbackValidation';
import { InputElement } from './InputElement';

export enum Status {
  None,
  Pending,
  Rejected,
  Resolved
}

export interface AsyncProps<T> {
  promise: (value: string) => Promise<T>;
  pending?: React.ReactNode;
  then?: (value: T) => React.ReactNode;
  catch?: (reason: any) => React.ReactNode;
}

export const AsyncContext = React.createContext<AsyncPrivate<any> | undefined>(undefined);

export const Async: React.FunctionComponent<AsyncProps<any>> = props => {
  const form = React.useContext(FormWithConstraintsContext)!;
  const fieldFeedbacks = React.useContext(FieldFeedbacksContext)!;
  return <AsyncPrivate {...props} form={form!} fieldFeedbacks={fieldFeedbacks} />;
};


interface AsyncPrivateContext {
  form: FormWithConstraintsApi;
  fieldFeedbacks: FieldFeedbacksApi;
}

type AsyncPrivateProps<T> = AsyncProps<T> & AsyncPrivateContext;

interface AsyncState<T> {
  status: Status;
  value?: T;
}

// See Asynchronous form errors and messages in AngularJS https://jaysoo.ca/2014/10/14/async-form-errors-and-messages-in-angularjs/
// See Support for asynchronous values (like Promises and Observables) https://github.com/facebook/react/issues/6481
// See https://github.com/capaj/react-promise
// See How to render promises in React https://gist.github.com/hex13/6d46f8b54631871ea8bf87576b635c49
// Cannot be inside a separated npm package since FieldFeedback needs to attach itself to Async
class AsyncPrivateComponent<T = any> extends React.Component<AsyncPrivateProps<T>, AsyncState<T>> {}
export class AsyncPrivate<T> extends
                        withValidateFieldEventEmitter<
                          // FieldFeedback returns FieldFeedbackValidation
                          FieldFeedbackValidation,
                          typeof AsyncPrivateComponent
                        >(
                          AsyncPrivateComponent
                        ) {

  state: AsyncState<T> = {
    status: Status.None
  };

  componentWillMount() {
    this.props.fieldFeedbacks.addValidateFieldEventListener(this.validate);
  }

  componentWillUnmount() {
    this.props.fieldFeedbacks.removeValidateFieldEventListener(this.validate);
  }

  validate = (input: InputElement) => {
    const { form, fieldFeedbacks } = this.props;

    let validations;

    const field = form.fieldsStore.getField(input.name)!;

    if (fieldFeedbacks.props.stop === 'first' && field.hasFeedbacks(fieldFeedbacks.key) ||
        fieldFeedbacks.props.stop === 'first-error' && field.hasErrors(fieldFeedbacks.key) ||
        fieldFeedbacks.props.stop === 'first-warning' && field.hasWarnings(fieldFeedbacks.key) ||
        fieldFeedbacks.props.stop === 'first-info' && field.hasInfos(fieldFeedbacks.key)) {
      // Reset UI
      this.setState({status: Status.None});
    }
    else {
      validations = this._validate(input);
    }

    return validations;
  }

  async _validate(input: InputElement) {
    this.setState({status: Status.Pending});
    try {
      const value = await this.props.promise(input.value);
      this.setState({status: Status.Resolved, value});
    } catch (e) {
      this.setState({status: Status.Rejected, value: e});
    }

    return this.emitValidateFieldEvent(input);
  }

  render() {
    const { props, state } = this;
    let element = null;

    switch (state.status) {
      case Status.None:
        break;
      case Status.Pending:
        if (props.pending) element = props.pending;
        break;
      case Status.Resolved:
        if (props.then) element = props.then(state.value);
        break;
      case Status.Rejected:
        if (props.catch) element = props.catch(state.value);
        break;
    }

    return (
      <AsyncContext.Provider value={this}>
        {element}
      </AsyncContext.Provider>
    );
  }
}
