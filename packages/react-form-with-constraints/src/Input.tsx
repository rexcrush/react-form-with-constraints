import * as React from 'react';

import { FormWithConstraintsContext } from './FormWithConstraints';
import Field from './Field';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  innerRef?: React.Ref<HTMLInputElement>;
  classes: {
    [index: string]: string | undefined;
    isPending?: string;
    hasErrors?: string;
    hasWarnings?: string;
    hasInfos?: string;
    isValid?: string;
  };
}

interface InputState {
  field: undefined | 'pending' | Field;
}

export class Input extends React.Component<InputProps, InputState> {
  static defaultProps: InputProps = {
    classes: {
      isPending: 'is-pending',
      hasErrors: 'has-errors',
      hasWarnings: 'has-warnings',
      hasInfos: 'has-infos',
      isValid: 'is-valid'
    }
  };

  static contextType = FormWithConstraintsContext;
  context!: React.ContextType<typeof FormWithConstraintsContext>;

  state: InputState = {
    field: undefined
  };

  componentWillMount() {
    this.context!.addFieldWillValidateEventListener(this.fieldWillValidate);
    this.context!.addFieldDidValidateEventListener(this.fieldDidValidate);
    this.context!.addFieldDidResetEventListener(this.fieldDidReset);
  }

  componentWillUnmount() {
    this.context!.removeFieldWillValidateEventListener(this.fieldWillValidate);
    this.context!.removeFieldDidValidateEventListener(this.fieldDidValidate);
    this.context!.removeFieldDidResetEventListener(this.fieldDidReset);
  }

  fieldWillValidate = (fieldName: string) => {
    if (fieldName === this.props.name) { // Ignore the event if it's not for us
      this.setState({field: 'pending'});
    }
  }

  fieldDidValidate = (field: Field) => {
    if (field.name === this.props.name) { // Ignore the event if it's not for us
      this.setState({field});
    }
  }

  fieldDidReset = (field: Field) => {
    if (field.name === this.props.name) { // Ignore the event if it's not for us
      this.setState({field: undefined});
    }
  }

  fieldValidationStates() {
    const { field } = this.state;

    const states = [];

    if (field !== undefined) {
      if (field === 'pending') {
        states.push('isPending');
      } else {
        if (field.hasErrors()) states.push('hasErrors');
        if (field.hasWarnings()) states.push('hasWarnings');
        if (field.hasInfos()) states.push('hasInfos');
        if (field.isValid()) states.push('isValid');
      }
    }

    return states;
  }

  render() {
    const { innerRef, className, classes, ...inputProps } = this.props;
    const validationStates = this.fieldValidationStates();

    let classNames = className;
    validationStates.forEach(validationState => {
      const tmp = classes![validationState];
      if (tmp !== undefined) {
        classNames !== undefined ? classNames += ` ${tmp}` : classNames = tmp;
      }
    });

    return (
      <input ref={innerRef} {...inputProps} className={classNames} />
    );
  }
}
