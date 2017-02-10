define(function (require, exports, module) {
  var dom = require('../lib/dom');
  var Editor = require('ace/editor').Editor;

  var SpellChecker = require('./spellcheck/er').SpellChecker;
  var instance = null; // SpellCheck instance.

  require('../config').defineOptions(Editor.prototype, 'editor', {
    enableSpellCheck: {
      set: function (val) {
        if (val) {
          if (!Array.from) return;
          if (!String.prototype.repeat) return;

          try { // Test for `/u` flag.
            var uTest = new RegExp('.', 'u');
            if (!uTest.unicode) return;
          } catch (x) {
            return; // Bail gracefully.
          }
          if (instance) instance.destroy();
          instance = new SpellChecker(this);

        } else {
          if (instance) instance.destroy();
        }
      },
      value: true
    }
  });

});
