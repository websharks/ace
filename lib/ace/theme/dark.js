define(function (require, exports, module) {
  exports.isDark = true;
  exports.cssClass = 'ace-dark-theme';
  exports.cssText = require('../requirejs/text!./dark.min.css');

  var dom = require('../lib/dom');
  dom.importCssString(exports.cssText, exports.cssClass);
});
