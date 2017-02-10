define(function (require, exports, module) {
  'use strict';

  var oop = require('../lib/oop');
  var lang = require('../lib/lang');
  var TextHighlightRules = require('./text_highlight_rules').TextHighlightRules;
  var PhpHighlightRules = require('./php_highlight_rules').PhpLangHighlightRules;
  var RubyHighlightRules = require('./ruby_highlight_rules').RubyHighlightRules;
  var PythonHighlightRules = require('./python_highlight_rules').PythonHighlightRules;
  var TypeScriptHighlightRules = require('./typescript_highlight_rules').TypeScriptHighlightRules;
  var JavaScriptHighlightRules = require('./javascript_highlight_rules').JavaScriptHighlightRules;
  var JsonHighlightRules = require('./json_highlight_rules').JsonHighlightRules;
  var XmlHighlightRules = require('./xml_highlight_rules').XmlHighlightRules;
  var HtmlHighlightRules = require('./html_highlight_rules').HtmlHighlightRules;
  var ScssHighlightRules = require('./scss_highlight_rules').ScssHighlightRules;
  var SassHighlightRules = require('./sass_highlight_rules').SassHighlightRules;
  var LessHighlightRules = require('./less_highlight_rules').LessHighlightRules;
  var CssHighlightRules = require('./css_highlight_rules').CssHighlightRules;
  var ShHighlightRules = require('./sh_highlight_rules').ShHighlightRules;
  var DockerfileHighlightRules = require('./dockerfile_highlight_rules').DockerfileHighlightRules;
  var ApacheConfHighlightRules = require('./apache_conf_highlight_rules').ApacheConfHighlightRules;
  var MysqlHighlightRules = require('./mysql_highlight_rules').MysqlHighlightRules;

  // Horizontal, vertical, and any whitespace.
  var v = '\\v\\n\\r\\f\\u0085\\u2028-\\u2029';
  var h = ' \\t\\ufeff\\u00a0\\u1680\\u180e\\u2000-\\u200a\\u202f\\u205f\\u3000';
  var s = '\\s'; // Both horizontal and vertical whitespace.

  var _escRegExp1 = /[.*+?^${}()|[\]\\]/g,
    _escRegExp2 = /[.*+?^${}()|[\]\\\-]/g,
    escRegex = function (str, inCharClass) {
      return str.replace(inCharClass ? _escRegExp2 : _escRegExp1, '\\$&');
    }; // Escapes regex meta-characters.

  var esc0NoVws = function (escapableChars, ungreedy) {
    return '(?:[^' + escRegex(escapableChars, true) + '\\\\]|\\\\[^' + v + '])*' + (ungreedy ? '?' : '');
  }; // An escaped (possibly 0-byte length) string w/o vertical whitespace.

  var fcbStartTagr = '^[' + h + ']*(?:`{3,}|~{3,})[' + h + ']*%%tag%%(?:[' + h + ']*\\{' + esc0NoVws('{}') + '\\})?[' + h + ']*$',
    fcbStart = '^[' + h + ']*(?:`{3,}|~{3,})(?:[' + h + ']*[^' + s + '{}]+)?(?:[' + h + ']*\\{' + esc0NoVws('{}') + '\\})?[' + h + ']*$',
    fcbEnd = '^[' + h + ']*(?:`{3,}|~{3,})[' + h + ']*$';

  function fenced_code_block(tag, prefix) {
    return { // Fenced code block.
      token: 'support.function.fenced-code-block',
      regex: fcbStartTagr.replace('%%tag%%', tag),
      push: prefix + 'start'
    };
  }
  var MarkdownHighlightRules = function () {
    HtmlHighlightRules.call(this);

    this.$rules.start.unshift({
        token: 'empty-line',
        regex: '^$', // Completely.
        next: 'allow-block'
      },
      // {4,} for `=-` headings, so it's possible
      // to distinguish them from a horizontal rule.
      {
        token: 'markup.heading.1', // h1
        regex: '^={4,}[' + h + ']*$'
      }, {
        token: 'markup.heading.2', // h2
        regex: '^-{4,}[' + h + ']*$'
      }, {
        token: function (value) {
          return 'markup.heading.' + value.length;
        }, // This covers ATX-style headings.
        regex: '^#{1,6}[' + h + ']+',
        next: 'header'
      },
      fenced_code_block('php', 'php-code-'),
      fenced_code_block('ruby', 'ruby-code-'),
      fenced_code_block('python', 'python-code-'),
      fenced_code_block('(?:typescript|ts)', 'ts-code-'),
      fenced_code_block('(?:javascript|js)', 'js-code-'),
      fenced_code_block('json', 'json-code-'),
      fenced_code_block('xml', 'xml-code-'),
      fenced_code_block('x?html', 'html-code-'),
      fenced_code_block('scss', 'scss-code-'),
      fenced_code_block('sass', 'sass-code-'),
      fenced_code_block('less', 'less-code-'),
      fenced_code_block('css', 'css-code-'),
      fenced_code_block('(?:ba|z)?sh(?:ell)?', 'sh-code-'),
      fenced_code_block('docker(?:file)?', 'dockerfile-code-'),
      fenced_code_block('apache', 'apache-code-'),
      fenced_code_block('mysql', 'mysql-code-'),
      // ↑ Embedded languages to highlight.
      {
        token: 'support.function.fenced-code-block',
        regex: fcbStart, // Not an embedded lang ↑.
        next: 'fenced-code-block'
          //
      }, { // Blockquote.
        token: 'markup.blockquote',
        regex: '^[' + h + ']*>[' + h + ']+',
        next: 'blockquote'
          //
      }, { // HR `-`, `*` or `_`.
        token: 'markup.hr',
        regex: '^[' + h + ']{0,2}(?:(?:[' + h + ']?-[' + h + ']?){3,}|(?:[' + h + ']?\\*[' + h + ']?){3,}|(?:[' + h + ']?_[' + h + ']?){3,})[' + h + ']*$',
        next: 'allow-block'
          //
      }, { // List block.
        token: 'markup.list',
        regex: '^[' + h + ']{0,3}(?:[*+\\-]|[0-9]+\\.)[' + h + ']+',
        next: 'list-block-start'
      }, {
        include: 'basic'
      });

    this.addRules({
      'basic': [{ // Escaped chars.
        token: 'constant.language.escape',
        regex: /\\[\\`*_{}[\]()#+.!\-]/ // Only legal escapes.
          // See: <https://daringfireball.net/projects/markdown/syntax#backslash>
          // Tip: Don't even think about converting this to a string regex.
          //
      }, { // Inline code / monospace.
        token: 'support.function.inline-code',
        // Note: this covers ``a literal `tick inside``.
        // See: <https://daringfireball.net/projects/markdown/syntax#code>
        regex: '(`+)[^' + v + ']*?[^`]\\1'
          //
      }, { // Abbreviation definition.
        token: ['text', 'constant.definition.abbr-id', 'text', 'string.other.abbr-desc'],
        regex: '^([' + h + ']{0,3}\\*\\[)(' + esc0NoVws('[]') + ')(\\]:)(.*)?$'
          //
      }, { // Footnote definition.
        token: ['text', 'constant.definition.footnote-id', 'text', 'string.other.footnote'],
        regex: '^([' + h + ']{0,3}\\[\\^)([0-9]+)(\\]:)(.*)?$'
          //
      }, { // Link definition. This covers the "Title" being on a line below.
        token: ['text', 'constant.definition.link-id', 'text', 'text', 'string.other.url.underline.link-url', 'text', 'text', 'string.other.link-title', 'text', 'text'],
        regex: '^([' + h + ']{0,3}\\[)(' + esc0NoVws('^[]') + ')(\\]:[' + h + ']*)(<)?([^' + s + '<>]*)(>)?(?:([' + s + ']+")([^' + v + '"]*)("))?([' + h + ']*)$'
          //
      }, { // Footnote reference.
        token: ['text', 'constant.reference.footnote-id', 'text'],
        regex: '(\\[\\^)([0-9]+)(\\])'
          //
      }, { // Link by reference (separately, so we can style it).
        token: ['text', 'string.other.link-text', 'text', 'constant.reference.link-id', 'text'],
        regex: '(\\[)(' + esc0NoVws('[]') + ')(\\][' + h + ']*\\[)(' + esc0NoVws('[]') + ')(\\])'
          //
      }, { // Link by url w/ image (separately, so we can style it).
        token: ['text', 'string.other.image-as-link-text', 'markup.attributes', 'text', 'string.other.url.underline.link-url', 'string.other.link-title', 'text', 'markup.attributes'],
        regex: '(\\[)' + // Opening bracket, which is allowed to contain an image inside it.
          '(!\\[' + esc0NoVws('[]') + '\\]\\(' + esc0NoVws('()') + '\\))(\\{' + esc0NoVws('{}') + '\\})?' + // Image.
          '(\\]\\()(' + esc0NoVws('()', true) + ')([' + h + ']*"[^' + v + '"]*"[' + h + ']*)?(\\))(\\{' + esc0NoVws('{}') + '\\})?'
          //
      }, { // Image by url (separately, so we can style it).
        token: ['text', 'string.other.image-alt', 'text', 'string.other.url.underline.image-url', 'string.other.image-title', 'text', 'markup.attributes'],
        regex: '(!\\[)(' + esc0NoVws('[]') + ')(\\]\\()(' + esc0NoVws('()', true) + ')([' + h + ']*"[^' + v + '"]*"[' + h + ']*)?(\\))(\\{' + esc0NoVws('{}') + '\\})?'
          //
      }, { // Link by url w/o image (separately, so we can style it).
        token: ['text', 'string.other.link-text', 'text', 'string.other.url.underline.link-url', 'string.other.link-title', 'text', 'markup.attributes'],
        regex: '(\\[)(' + esc0NoVws('[]') + ')(\\]\\()(' + esc0NoVws('()', true) + ')([' + h + ']*"[^' + v + '"]*"[' + h + ']*)?(\\))(\\{' + esc0NoVws('{}') + '\\})?'
          //
      }, { // strong `**` or `__`.
        token: 'markup.strong',
        regex: '([*]{2}|[_]{2}(?=[^' + s + ']))[^' + v + ']*?[^' + s + '][*_]*\\1'
          //
      }, { // Emphasis `*` or `_`.
        token: 'markup.emphasis',
        regex: '([*_](?=[^' + s + ']))[^' + v + ']*?[^' + s + '][*_]*\\1'
          //
      }, { // A bracketed `<url>` (full URL only).
        token: ['text', 'string.other.url.underline', 'text'],
        regex: '(<)((?:[a-zA-Z][a-zA-Z0-9+.\\-]*:)?/{2}[^' + v + '<>]*)(>)'
      }],

      'allow-block': [
        { token: 'support.function.indented-code-block', regex: '^[' + h + ']{4}.+', next: 'allow-block' },
        { token: 'empty-line', regex: '^$', next: 'allow-block' },
        { token: 'empty', regex: '', next: 'start' }
      ],

      'header': [{
        // @TODO Highlight {attrs} here.
        regex: '$',
        next: 'start' // Escape.
      }, {
        include: 'basic'
      }, {
        defaultToken: 'heading'
      }],

      'list-block-start': [{
        token: 'markup.checkbox',
        regex: '(?:\\[[' + h + 'x]\\])?',
        next: 'list-block'
      }],
      'list-block': [{
          token: 'empty-line',
          regex: '^$', // Completely.
          next: 'start' // Escape.
        }, { // List items.
          token: 'markup.list',
          regex: '^[' + h + ']{0,3}(?:[*+\\-]|[0-9]+\\.)[' + h + ']+',
          next: 'list-block-start'
        }, {
          include: 'basic',
          noEscape: true
        },
        // Fenced code block inside list.
        fenced_code_block('php', 'php-code-'),
        fenced_code_block('ruby', 'ruby-code-'),
        fenced_code_block('python', 'python-code-'),
        fenced_code_block('(?:typescript|ts)', 'ts-code-'),
        fenced_code_block('(?:javascript|js)', 'js-code-'),
        fenced_code_block('json', 'json-code-'),
        fenced_code_block('xml', 'xml-code-'),
        fenced_code_block('x?html', 'html-code-'),
        fenced_code_block('scss', 'scss-code-'),
        fenced_code_block('sass', 'sass-code-'),
        fenced_code_block('less', 'less-code-'),
        fenced_code_block('css', 'css-code-'),
        fenced_code_block('sh', 'sh-code-'),
        fenced_code_block('docker(?:file)?', 'dockerfile-code-'),
        fenced_code_block('apache', 'apache-code-'),
        fenced_code_block('mysql', 'mysql-code-'),
        // ↑ Embedded languages to highlight.
        //
        { // Fenced code block inside list.
          token: 'support.function.fenced-code-block',
          regex: fcbStart, // Not an embedded lang ↑.
          next: 'fenced-code-block'
        }, {
          defaultToken: 'list'
        }
      ],

      'blockquote': [{
        token: 'empty-line',
        regex: '^[' + h + ']*$',
        next: 'start' // Escape.
      }, { // Blockquote.
        token: 'markup.blockquote',
        regex: '^[' + h + ']*>(?:[*+\\-]|[0-9]+\\.)?[' + h + ']+',
        next: 'blockquote'
      }, {
        include: 'basic',
        noEscape: true
      }, {
        defaultToken: 'blockquote'
      }],

      'fenced-code-block': [{
        token: 'support.function.fenced-code-block',
        regex: fcbEnd, // Closes a fenced code block.
        next: 'start' // Escape.
      }, {
        token: 'support.function.fenced-code-block',
        regex: '.+'
      }]
    });

    var codeEmbedRules = {
      'php': PhpHighlightRules,
      'ruby': RubyHighlightRules,
      'python': PythonHighlightRules,
      'ts': TypeScriptHighlightRules,
      'js': JavaScriptHighlightRules,
      'json': JsonHighlightRules,
      'xml': XmlHighlightRules,
      'html': HtmlHighlightRules,
      'scss': ScssHighlightRules,
      'sass': SassHighlightRules,
      'less': LessHighlightRules,
      'css': CssHighlightRules,
      'sh': ShHighlightRules,
      'dockerfile': DockerfileHighlightRules,
      'apache': ApacheConfHighlightRules,
      'mysql': MysqlHighlightRules,
    };
    for (var _key in codeEmbedRules) {
      this.embedRules(codeEmbedRules[_key], _key + '-code-', [{
        token: 'support.function.fenced-code-block',
        regex: fcbEnd, // End of fenced code block.
        next: 'pop' // Pop back out of the embedded mode.
      }]);
    }
    this.normalizeRules();
  };
  oop.inherits(MarkdownHighlightRules, TextHighlightRules);
  exports.MarkdownHighlightRules = MarkdownHighlightRules;
});
