define(function (require, exports, module) {
  'use strict';

  var oop = require('../lib/oop');
  var lang = require('../lib/lang');
  var TextMode = require('./text').Mode;

  var PhpMode = require('./php').Mode;
  var RubyMode = require('./ruby').Mode;
  var PythonMode = require('./python').Mode;
  var TypeScriptMode = require('./typescript').Mode;
  var JavaScriptMode = require('./javascript').Mode;
  var JsonMode = require('./json').Mode;
  var XmlMode = require('./xml').Mode;
  var HtmlMode = require('./html').Mode;
  var ScssMode = require('./scss').Mode;
  var SassMode = require('./sass').Mode;
  var LessMode = require('./less').Mode;
  var CssMode = require('./css').Mode;
  var ShMode = require('./sh').Mode;
  var DockerfileMode = require('./dockerfile').Mode;
  var ApacheConfMode = require('./apache_conf').Mode;
  var MysqlMode = require('./mysql').Mode;

  var MarkdownFoldMode = require('./folding/markdown').FoldMode;
  var MarkdownHighlightRules = require('./markdown_highlight_rules').MarkdownHighlightRules;
  var MarkdownBehaviour = require('./behaviour/markdown').MarkdownBehaviour;
  var HtmlCompletions = require('./html_completions').HtmlCompletions;

  var voidElements = ['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'keygen', 'link', 'meta', 'menuitem', 'param', 'source', 'track', 'wbr'];

  var Mode = function () {
    this.foldingRules = new MarkdownFoldMode();
    this.HighlightRules = MarkdownHighlightRules;
    this.$behaviour = new MarkdownBehaviour();
    this.$completer = new HtmlCompletions();

    this.createModeDelegates({
      'php-': [PhpMode, { inline: true }],
      'ruby-': RubyMode,
      'python-': PythonMode,
      'ts-': TypeScriptMode,
      'js-': JavaScriptMode,
      'json-': JsonMode,
      'xml-': XmlMode,
      'html-': HtmlMode,
      'scss-': ScssMode,
      'sass-': SassMode,
      'less-': LessMode,
      'css-': CssMode,
      'sh-': ShMode,
      'dockerfile-': DockerfileMode,
      'apache-conf-': ApacheConfMode,
      'mysql-': MysqlMode,
    });
  };
  oop.inherits(Mode, TextMode);

  (function () {
    this.type = 'text';
    this.$id = 'ace/mode/markdown';
    this.blockComment = { start: '<!--', end: '-->' };
    this.voidElements = lang.arrayToMap(voidElements);

    this.getNextLineIndent = function (state, line, tab) {
      return this.$getIndent(line);
    };
    this.checkOutdent = function (state, line, input) {
      return false; // False at this time.
    };
    this.getCompletions = function (state, session, pos, prefix) {
      return this.$completer.getCompletions(state, session, pos, prefix);
    };
    this.createModeDelegates = function (modeMap) {
      this.$embeds = [],
        this.$modes = {};

      var delegations = [
        'toggleBlockComment',
        'toggleCommentLines',
        'getNextLineIndent',
        'checkOutdent',
        'autoOutdent',
        'transformAction',
        'getCompletions',
      ];
      for (var _key in modeMap) {
        if (!modeMap[_key])
          continue;

        this.$embeds.push(_key);

        if (modeMap[_key] instanceof Array) {
          this.$modes[_key] = new modeMap[_key][0](modeMap[_key][1]);
        } else this.$modes[_key] = new modeMap[_key]();
      }
      delegations.forEach(function (delegation) {
        var defaultHandler = this[delegation];
        this[delegation] = function () {
          return this.$delegator(delegation, arguments, defaultHandler);
        };
      }, this);
    };

  }).call(Mode.prototype);

  exports.Mode = Mode;
});
