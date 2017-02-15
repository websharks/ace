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

  var m0EscNoVws = function (escapableChars, ungreedy) {
    escapableChars = escRegex(escapableChars, true);
    return '(?:[^' + v + escapableChars + '\\\\]|\\\\[' + escapableChars + '])*' + (ungreedy ? '?' : '');
  }; // An escaped (possibly 0-byte length) string w/o vertical whitespace.

  var fcbStartTagr = '^[' + h + ']*(?:`{3,}|~{3,})[' + h + ']*%%tag%%(?:[' + h + ']*\\{' + m0EscNoVws('{}') + '\\})?[' + h + ']*$',
    fcbStart = '^[' + h + ']*(?:`{3,}|~{3,})(?:[' + h + ']*[^' + s + '{}]+)?(?:[' + h + ']*\\{' + m0EscNoVws('{}') + '\\})?[' + h + ']*$',
    fcbEnd = '^[' + h + ']*(?:`{3,}|~{3,})[' + h + ']*$';

  function fenced_code_block(tag, prefix) {
    return { // Fenced code block.
      token: 'support.function.fenced-code-block.md',
      regex: fcbStartTagr.replace('%%tag%%', tag),
      push: prefix + 'start'
    };
  }
  var MarkdownHighlightRules = function () {
    HtmlHighlightRules.call(this);

    this.$rules.start.unshift({
        token: 'empty-line.md',
        regex: '^$', // Completely.
        next: 'allow-block'
      },
      // {4,} for `=-` headings, so it's possible
      // to distinguish them from a horizontal rule.
      {
        token: 'markup.heading.1.md', // h1
        regex: '^={4,}[' + h + ']*$'
      }, {
        token: 'markup.heading.2.md', // h2
        regex: '^-{4,}[' + h + ']*$'
      }, {
        token: function (value) {
          return 'markup.heading.' + value.length + '.md';
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
        token: 'support.function.fenced-code-block.md',
        regex: fcbStart, // Not an embedded lang ↑.
        next: 'fenced-code-block'
          //
      }, { // Blockquote.
        token: 'markup.blockquote.md',
        regex: '^[' + h + ']*>[' + h + ']+',
        next: 'blockquote'
          //
      }, { // HR `-`, `*` or `_`.
        token: 'markup.hr.md',
        regex: '^[' + h + ']{0,2}(?:(?:[' + h + ']?-[' + h + ']?){3,}|(?:[' + h + ']?\\*[' + h + ']?){3,}|(?:[' + h + ']?_[' + h + ']?){3,})[' + h + ']*$',
        next: 'allow-block'
          //
      }, { // List block.
        token: 'markup.list.md',
        regex: '^[' + h + ']{0,3}(?:[*+\\-]|[0-9]+\\.)[' + h + ']+',
        next: 'list-block-start'
      }, {
        include: 'basic'
      });

    this.addRules({
      'basic': [{ // Escaped chars.
        token: 'constant.language.escape.md',
        regex: /\\[\\`*_{}[\]()#+.!\-]/ // Only legal escapes.
          // See: <https://daringfireball.net/projects/markdown/syntax#backslash>
          // Tip: Don't even think about converting this to a string regex.
          //
      }, { // Inline code / monospace.
        token: 'support.function.inline-code.md',
        // Note: this covers ``a literal `tick inside``.
        // See: <https://daringfireball.net/projects/markdown/syntax#code>
        regex: '(`+)[^' + v + ']*?[^`]\\1'
          //
      }, { // Abbreviation definition.
        token: ['text.md', 'constant.definition.abbr-id.md', 'text.md', 'string.other.abbr-desc.md'],
        regex: '^([' + h + ']{0,3}\\*\\[)(' + m0EscNoVws('[]') + ')(\\]:)(.*)?$'
          //
      }, { // Footnote definition.
        token: ['text.md', 'constant.definition.footnote-id.md', 'text.md', 'string.other.footnote.md'],
        regex: '^([' + h + ']{0,3}\\[\\^)([0-9]+)(\\]:)(.*)?$'
          //
      }, { // Link definition. This covers the "Title" being on a line below.
        token: ['text.md', 'constant.definition.link-id.md', 'text.md', 'text.md', 'string.other.underline.url.link-url.md', 'text.md', 'text.md', 'string.other.link-title.md', 'text.md', 'text.md'],
        regex: '^([' + h + ']{0,3}\\[)(' + m0EscNoVws('^[]') + ')(\\]:[' + h + ']*)(<)?([^' + s + '<>]*)(>)?(?:([' + s + ']+")([^' + v + '"]*)("))?([' + h + ']*)$'
          //
      }, { // Footnote reference.
        token: ['text.md', 'constant.reference.footnote-id.md', 'text.md'],
        regex: '(\\[\\^)([0-9]+)(\\])'
          //
      }, { // Link by url w/ image.
        token: ['text.md', 'string.other.image-alt.in-link-text.md', 'text.md', 'string.other.underline.url.image-url.in-link-text.md', 'markup.attributes.in-link-text.md', 'text.md', 'string.other.underline.url.link-url.md', 'string.other.link-title.md', 'text.md', 'markup.attributes.md'],
        regex: '(\\[' + // Opening bracket, which is allowed to contain an image inside it.
          '!\\[)(' + m0EscNoVws('[]') + ')(\\]\\()(' + m0EscNoVws('()') + '\\))(\\{' + m0EscNoVws('{}') + '\\})?' + // Image.
          '(\\]\\()(' + m0EscNoVws('()', true) + ')([' + h + ']*"[^' + v + '"]*"[' + h + ']*)?(\\))(\\{' + m0EscNoVws('{}') + '\\})?'
          //
      }, { // Image by url.
        token: ['text.md', 'string.other.image-alt.md', 'text.md', 'string.other.underline.url.image-url.md', 'string.other.image-title.md', 'text.md', 'markup.attributes.md'],
        regex: '(!\\[)(' + m0EscNoVws('[]') + ')(\\]\\()(' + m0EscNoVws('()', true) + ')([' + h + ']*"[^' + v + '"]*"[' + h + ']*)?(\\))(\\{' + m0EscNoVws('{}') + '\\})?'
          //
      }, { // Link by url w/o image.
        token: ['text.md', 'string.other.link-text.md', 'text.md', 'string.other.underline.url.link-url.md', 'string.other.link-title.md', 'text.md', 'markup.attributes.md'],
        regex: '(\\[)(' + m0EscNoVws('[]') + ')(\\]\\()(' + m0EscNoVws('()', true) + ')([' + h + ']*"[^' + v + '"]*"[' + h + ']*)?(\\))(\\{' + m0EscNoVws('{}') + '\\})?'
          //
      }, { // Link by reference.
        token: ['text.md', 'string.other.link-text.md', 'text.md', 'constant.reference.link-id.md', 'text.md'],
        regex: '(\\[)(' + m0EscNoVws('[]') + ')(\\][' + h + ']*\\[)(' + m0EscNoVws('[]') + ')(\\])'
          //
      }, { // strike via `~~`.
        token: ['text.md', 'markup.strike.md', 'text.md'],
        regex: '(~{2}(?![' + s + ']))([^~]*[^' + s + '~])(~{2})'
          //
      }, { // strong `**` or `__`.
        token: 'markup.strong.md',
        regex: '([*]{2}|[_]{2}(?=[^' + s + ']))[^' + v + ']*?[^' + s + '][*_]*\\1'
          //
      }, { // Emphasis `*` or `_`.
        token: 'markup.emphasis.md',
        regex: '([*_](?=[^' + s + ']))[^' + v + ']*?[^' + s + '][*_]*\\1'
          //
      }, { // A bracketed `<url>` (full URL only).
        token: ['text.md', 'string.other.underline.url.md', 'text.md'],
        regex: '(<)((?:[a-zA-Z][a-zA-Z0-9+.\\-]*:)?/{2}[^' + v + '<>]*)(>)'
      }],

      'allow-block': [
        { token: 'support.function.indented-code-block.md', regex: '^[' + h + ']{4}.+', next: 'allow-block' },
        { token: 'empty-line.md', regex: '^$', next: 'allow-block' },
        { token: 'empty.md', regex: '', next: 'start' }
      ],

      'header': [{
        regex: '$',
        next: 'start' // Escape.
      }, {
        token: ['text.md', 'markup.attributes.md'],
        regex: '([' + h + ']+)(\\{' + m0EscNoVws('{}') + '\\})(?=[' + h + ']*$)',
      }, {
        include: 'basic'
      }, {
        defaultToken: 'heading.md'
      }],

      'list-block-start': [{
        token: 'markup.checkbox.md',
        regex: '(?:\\[[' + h + 'x]\\])?',
        next: 'list-block'
      }],
      'list-block': [{
          token: 'empty-line.md',
          regex: '^$', // Completely.
          next: 'start' // Escape.
        }, { // List items.
          token: 'markup.list.md',
          regex: '^[' + h + ']*(?:[*+\\-]|[0-9]+\\.)[' + h + ']+',
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
          token: 'support.function.fenced-code-block.md',
          regex: fcbStart, // Not an embedded lang ↑.
          next: 'fenced-code-block'
        }, {
          defaultToken: 'list.md'
        }
      ],

      'blockquote': [{
        token: 'empty-line.md',
        regex: '^[' + h + ']*$',
        next: 'start' // Escape.
      }, { // Blockquote.
        token: 'markup.blockquote.md',
        regex: '^[' + h + ']*>(?:[*+\\-]|[0-9]+\\.)?[' + h + ']+',
        next: 'blockquote'
      }, {
        include: 'basic',
        noEscape: true
      }, {
        defaultToken: 'blockquote.md'
      }],

      'fenced-code-block': [{
        token: 'support.function.fenced-code-block.md',
        regex: fcbEnd, // Closes a fenced code block.
        next: 'start' // Escape.
      }, {
        token: 'support.function.fenced-code-block.md',
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
        token: 'support.function.fenced-code-block.md',
        regex: fcbEnd, // End of fenced code block.
        next: 'pop' // Pop back out of the embedded mode.
      }]);
    }
    this.normalizeRules();
  };
  oop.inherits(MarkdownHighlightRules, TextHighlightRules);
  exports.MarkdownHighlightRules = MarkdownHighlightRules;
});
