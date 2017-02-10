define(function (require, exports, module) {
  'use strict';

  var oop = require('../../lib/oop');
  var HtmlBehaviour = require('./html').HtmlBehaviour;
  var TokenIterator = require('../../token_iterator').TokenIterator;

  var MarkdownBehaviour = function () {
    this.inherit(HtmlBehaviour);
  };
  oop.inherits(MarkdownBehaviour, HtmlBehaviour);
  exports.MarkdownBehaviour = MarkdownBehaviour;
});
