"use strict";
exports.__esModule = true;
var InputElement = /** @class */ (function () {
    // Need to duplicate the input when the user changes rapidly the input
    // otherwise we will treat only the last input value instead of every input value change
    function InputElement(input) {
        if (input.props === undefined) {
            input = input;
            this.name = input.name;
            this.type = input.type;
            this.value = input.value;
            // Solution 1: no clone, then .mock.calls never ends with ValidityState inside FormWithConstraints.test.tsx in v0.8
            //this.validity = input.validity;
            // Solution 2: JSON does not work to clone ValidityState (results in an empty object)
            //this.validity = JSON.parse(JSON.stringify(input.validity));
            // Solution 3: manually clone ValidityState
            this.validity = new IValidityState(input.validity);
            this.validationMessage = input.validationMessage;
        }
        else {
            input = input;
            this.name = input.props.name;
            this.type = undefined;
            this.value = input.props.value; // Tested: TextInput props.value is always a string and never undefined (empty string instead)
            this.validity = undefined;
            this.validationMessage = undefined;
        }
    }
    return InputElement;
}());
exports.InputElement = InputElement;
// Cannot clone ValidityState using JSON.parse(JSON.stringify(input.validity)),
// results in an empty object ({}) under Chrome 66, Firefox 60 and Safari 10.1.2
// so let's manually clone it.
var IValidityState = /** @class */ (function () {
    function IValidityState(validity) {
        this.badInput = validity.badInput;
        this.customError = validity.customError;
        this.patternMismatch = validity.patternMismatch;
        this.rangeOverflow = validity.rangeOverflow;
        this.rangeUnderflow = validity.rangeUnderflow;
        this.stepMismatch = validity.stepMismatch;
        this.tooLong = validity.tooLong;
        this.tooShort = validity.tooShort;
        this.typeMismatch = validity.typeMismatch;
        this.valid = validity.valid;
        this.valueMissing = validity.valueMissing;
    }
    return IValidityState;
}());
exports.IValidityState = IValidityState;
