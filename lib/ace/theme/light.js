define(function (require, exports, module) {
  exports.isDark = false;
  exports.cssClass = 'ace-light-theme';
  exports.cssText = require('../requirejs/text!./light.min.css');

  var dom = require('../lib/dom');
  dom.importCssString(exports.cssText, exports.cssClass);
});
