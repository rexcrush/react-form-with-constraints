"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return extendStatics(d, b);
    }
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
exports.__esModule = true;
var EventEmitter_1 = require("./EventEmitter");
exports.ValidateFieldEvent = 'VALIDATE_FIELD_EVENT';
// See TypeScript 2.2 Support for Mix-in classes https://www.typescriptlang.org/docs/handbook/release-notes/typescript-2-2.html
var withValidateFieldEventEmitter = function (Base) {
    return /** @class */ (function (_super) {
        __extends(ValidateFieldEventEmitter, _super);
        function ValidateFieldEventEmitter() {
            var _this = _super !== null && _super.apply(this, arguments) || this;
            _this.validateFieldEventEmitter = new EventEmitter_1["default"]();
            return _this;
        }
        ValidateFieldEventEmitter.prototype.emitValidateFieldEvent = function (input) {
            return this.validateFieldEventEmitter.emit(exports.ValidateFieldEvent, input);
        };
        ValidateFieldEventEmitter.prototype.addValidateFieldEventListener = function (listener) {
            this.validateFieldEventEmitter.addListener(exports.ValidateFieldEvent, listener);
        };
        ValidateFieldEventEmitter.prototype.removeValidateFieldEventListener = function (listener) {
            this.validateFieldEventEmitter.removeListener(exports.ValidateFieldEvent, listener);
        };
        return ValidateFieldEventEmitter;
    }(Base));
};
exports.withValidateFieldEventEmitter = withValidateFieldEventEmitter;
