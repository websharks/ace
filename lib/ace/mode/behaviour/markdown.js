define(function (require, exports, module) {
  'use strict';

  var oop = require('../../lib/oop');
  var HtmlBehaviour = require('./html').HtmlBehaviour;
  var TokenIterator = require('../../token_iterator').TokenIterator;
  var Range = require('../../range').Range;

  // Horizontal, vertical, and any whitespace.
  var v = '\\v\\n\\r\\f\\u0085\\u2028-\\u2029';
  var h = ' \\t\\ufeff\\u00a0\\u1680\\u180e\\u2000-\\u200a\\u202f\\u205f\\u3000';
  var s = '\\s'; // Both horizontal and vertical whitespace.

  var is = function (token, type) {
    return token.type === type; // Checks token type.
  };
  var regex = {
    isFencedCodeBlockStart: new RegExp('^[' + h + ']*``[' + h + ']*$'),
    isListBlockStartCapture: new RegExp('^([' + h + ']*)(?:([*+\\-])|([0-9]+)\\.)([' + h + ']+)(.*)$'),
  };

  var MarkdownBehaviour = function () {
    this.inherit(HtmlBehaviour);

    this.add('start-fenced-code-block', 'insertion', function (state, action, editor, session, text) {
      if (text !== '`') return;
      if (state !== 'start') return;

      var cursor = editor.getCursorPosition();
      var line = session.doc.getLine(cursor.row);

      if (regex.isFencedCodeBlockStart.test(line)) {
        var iterator = new TokenIterator(session, cursor.row, cursor.column);

        var textToken = iterator.getCurrentToken();
        var textTokenPos = iterator.getCurrentTokenPosition();

        if (!is(textToken, 'text.xml'))
          return; // Sanity check.

        var indent = this.$getIndent(line);
        var nextLine = indent + '```';

        var newText = text + '\n' + nextLine;
        var newSelection = [1, 1];

        return { text: newText, selection: newSelection };
      }
    });

    this.add('start-list-block-item', 'insertion', function (state, action, editor, session, text) {
      if (text !== '\n' && text !== '\r\n') return;
      if (state !== 'list-block') return;

      var cursor = editor.getCursorPosition();
      var line = session.doc.getLine(cursor.row);

      var m = regex.isListBlockStartCapture.exec(line);
      if (!m) return; // Not a list item.
      if (!m[5]) return; // Empty list item.

      var iterator = new TokenIterator(session, cursor.row, cursor.column);

      var listToken = iterator.getCurrentToken();
      var listTokenPos = iterator.getCurrentTokenPosition();

      if (!is(listToken, 'list'))
        return; // Sanity check.

      var nextMarkup = m[2] || parseInt(m[3], 10) + 1 + '.';
      // If not `-*+`, it's a numerically ordered list item.

      var indent = this.$getIndent(line);
      var nextLine = indent + nextMarkup + m[4];

      var newText = text + nextLine; // Text is line break.
      var newSelection = [1, nextLine.length, 1, nextLine.length];

      return { text: newText, selection: newSelection };
    });

    this.add('end-list-block', 'insertion', function (state, action, editor, session, text) {
      if (text !== '\n' && text !== '\r\n') return;
      if (state !== 'list-block-start') return;

      var cursor = editor.getCursorPosition();
      var line = session.doc.getLine(cursor.row);

      var m = regex.isListBlockStartCapture.exec(line);
      if (!m) return; // Not a list item.
      if (m[5]) return; // Not an empty item.

      var iterator = new TokenIterator(session, cursor.row, cursor.column);

      var markupToken = iterator.getCurrentToken();
      var markupTokenPos = iterator.getCurrentTokenPosition();

      if (!is(markupToken, 'markup.list'))
        return; // Sanity check.

      var outdentPos = m[1].length - session.getTabSize();
      var range = new Range.fromPoints(markupTokenPos, markupTokenPos);
      range.start.column = outdentPos, range.end.column = markupToken.value.length;

      session.remove(range);
      return { text: '', selection: [0, 0] };
    });
  };
  oop.inherits(MarkdownBehaviour, HtmlBehaviour);
  exports.MarkdownBehaviour = MarkdownBehaviour;
});
