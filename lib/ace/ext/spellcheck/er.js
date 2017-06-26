(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define(["require", "exports"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var dom = require('../../lib/dom');
    var Range = require('ace/range').Range;
    var Unicode = require('../../unicode').packages;
    var Typo = require('../../lib/typo').Typo;
    var TypoAff = require('../../requirejs/text!../../lib/typo/en_US.aff');
    var TypoDic = require('../../requirejs/text!../../lib/typo/en_US.dic');
    var styles = require('../../requirejs/text!./styles.min.css');
    ;
    var SpellChecker = (function () {
        /*
         * Constructor.
         */
        function SpellChecker(editor /* Ace.Editor */) {
            var _this = this;
            this.dotRepeat = function (m) {
                return m ? _this.dot.repeat(m.length) : '';
            };
            this.dotRepeat2Of2 = function (m, c1, c2) {
                return c1 + (c2 ? _this.dot.repeat(c2.length) : '');
            };
            this.dotRepeat13Of3 = function (m, c1, c2, c3) {
                return (c1 ? _this.dot.repeat(c1.length) : '') + c2 + (c3 ? _this.dot.repeat(c3.length) : '');
            };
            this.dotRepeat134Of4 = function (m, c1, c2, c3, c4) {
                return (c1 ? _this.dot.repeat(c1.length) : '') + c2 + (c3 ? _this.dot.repeat(c3.length) : '') + (c4 ? _this.dot.repeat(c4.length) : '');
            };
            /*
             * Regex helpers.
             */
            this._escRegExp1 = /[.*+?^${}()|[\]\\]/g;
            this._escRegExp2 = /[.*+?^${}()|[\]\\\-]/g;
            this.markers = { typos: [] };
            this.ed = editor; // Ace.Editor
            this.isChecking = false, this.shouldStopChecking = false;
            dom.importCssString(styles, 'ace_spellcheck');
            this.dictionary = new Typo('en_US', TypoAff, TypoDic);
            this.dot = '.'; // Filler.
            this.u = Unicode; // General cats.
            // Horizontal, vertical, and any whitespace.
            this.v = '\\v\\n\\r\\f\\u0085\\u2028-\\u2029';
            this.h = ' \\t\\ufeff\\u00a0\\u1680\\u180e\\u2000-\\u200a\\u202f\\u205f\\u3000';
            this.s = '\\s'; // Both horizontal and vertical whitespace.
            this.wordChars = this.u.L + this.u.M + this.u.N + this.u.Pd + this.u.Pc + '\'';
            this.regexCache(); // Cache regex.
            var delay = 500; // Spell check quickly.
            this.checker = this.debounce(this.check, delay);
            this.ed.on('changeSession', function (e) {
                _this.ed.session.on('change', _this.checker),
                    _this.check(); // First time.
            });
        }
        /*
         * Cache regex objs.
         */
        SpellChecker.prototype.regexCache = function () {
            var dot = this.dot;
            var u = this.u, h = this.h, v = this.v, s = this.s, wordChars = this.wordChars;
            var escRegex = this.escRegex.bind(this), m0EscNoVws = this.m0EscNoVws.bind(this);
            var sw = 'a'; // Stop words.
            // These are common stop words.
            // And a few that make it smarter.
            sw += '|about|all|an|any|are|as|at';
            sw += '|be|because|but|by';
            sw += '|came|can|can\'t|com|come|could|css';
            sw += '|de|did|didn\'t|do|does|doesn\'t|don\'t';
            sw += '|each|else|en|etc|even|ever|every';
            sw += '|for|from';
            sw += '|get|gets|go|goes|got';
            sw += '|had|hadn\'t|has|hasn\'t|have|haven\'t|having|he|he\'s|he\'d|her|her\'s|hello|help|here|here\'s|hi|him|his|how';
            sw += '|i\'d|if|iff|i\'ll|i\'m|in|inc|into|io|is|isn\'t|it|it\'d|it\'ll|its|it\'s|i\'ve';
            sw += '|javascript|js|just';
            sw += '|know|known|knows';
            sw += '|la|let|let\'s|like|look|looks|ltd';
            sw += '|made|make|many|markdown|may|maybe|md|me|might|more|most|mr|mrs|much|must|my|myself';
            sw += '|name|need|net|new|next|no|not|now';
            sw += '|of|off|oh|ok|okay|on|once|one|only|onto|or|other|other\'s|org|our|ours|out|over|own';
            sw += '|php|plus';
            sw += '|re|really|right';
            sw += '|said|same|sass|saw|say|says|scss|see|seem|seen|self|sent|she|she\'d|she\'ll|she\'s|should|shouldn\'t|since|so|some|still|stop|sub|such|sure';
            sw += '|take|tell|than|thank|that|that\'s|the|their|theirs|them|then|there|they|they\'re|thing|think|this|those|time|to|too|try';
            sw += '|und|until|up|upon|us|usa|use|used|uses|using|url|urls';
            sw += '|very|via';
            sw += '|want|wants|was|wasn\'t|way|we|websharks|we\'d|well|we\'ll|were|we\'re|weren\'t|we\'ve|what|what\'s|when|where|which|while|who|who\'d|why|will|with|won\'t|word|would|wouldn\'t|wordpress|wp|wp-sharks|wpsharks|ws|www';
            sw += '|yes|yet|you|you\'d|you\'ll|your|you\'re|yours|you\'ve';
            this.regexTrim = new RegExp('^[' + s + '\\uFEFF\\xA0]+|[' + s + '\\uFEFF\\xA0]+$', 'ug');
            // See: <https://github.com/jquery/jquery/blob/master/src/core.js>
            this.regexNonWordCharsSplitCapture = new RegExp('([^' + wordChars + ']+)', 'ui');
            this.regexIsLineWithNoWordChars = new RegExp('^[^' + wordChars + ']+$', 'ui');
            this.regexIsLineWithAllWsDashesConnectors = new RegExp('^[' + s + u.Pd + u.Pc + ']+$', 'ui');
            this.regexIsAStopWord = new RegExp('^(?:' + sw + ')$', 'ui');
            this.regexIsAllNumericWord = new RegExp('^[' + u.N + ']+$', 'ui');
            this.regexIsAllUppercaseWord = new RegExp('^[' + u.Lu + ']+$', 'u');
            this.regexHasDashOrConnector = new RegExp('[' + u.Pd + u.Pc + ']', 'ui');
            this.regexHasEnUsMixedMultiCase = new RegExp('(?:[a-z]+[A-Z]+[a-z]+[A-Z]+|[A-Z]+[a-z]+[A-Z]+[a-z]+|[a-zA-Z]+[0-9]+[A-Za-z]+)', 'u');
            // Detect the beginning and fenced code block.
            this.regexDetectStartOfFencedCodeBlock = new RegExp('^(?:`{3,}|~{3,})', 'u');
            this.regexDetectEndOfBacktickFencedCodeBlock = new RegExp('^`{3,}[' + h + ']*$', 'u');
            this.regexDetectEndOfTildeFencedCodeBlock = new RegExp('^~{3,}[' + h + ']*$', 'u');
            // Note: All of these have capture groups that *must* remain in a particular order.
            // See the `dotRepeat()` functions in this clas that handle regex callback replacements.
            // Remove HTML `<tags>` and MD `<links>`.
            // Note: This also removes `<!-- comments -->`.
            this.regexToStripFillHtmlTags = new RegExp('<[^<>]*>', 'ugi');
            // Remove inline code spans.
            // Note: this covers ``a literal `tick inside``.
            // See: <https://daringfireball.net/projects/markdown/syntax#code>
            this.regexToStripFillBackticks = new RegExp('(`+)[^' + v + ']*?[^`]\\1', 'ugi');
            // Remove URLs from MD link definitions.
            // This must come before we remove `[]` brackets.
            this.regexToStripFillLinkDefinitions = new RegExp('^([' + h + ']{0,3}\\[' + m0EscNoVws('[]') + '\\]:[' + h + ']*)((?:<)?(?:[^' + s + '<>]*)(?:>)?)', 'ugi');
            // This removes everything but `[alt text]` from images, which we do spell check.
            // Note: Must do images separately anyway (and first) because JS doesn't support recursion in the next step.
            this.regexToStripFillImages = new RegExp('(!\\[)(' + m0EscNoVws('[]') + ')(\\]\\(' + m0EscNoVws('()') + '\\)(?:\\{' + m0EscNoVws('{}') + '\\})?)', 'ugi');
            // This removes everything but the `[text]` in links and the `[text]` in references, which we do spell check.
            // Note: The `(/path)` and `{attributes}` are optional in this pattern, which allows for `[link][id]` references to be handled also.
            // It's important for this pattern to require one or the other though; i.e., so shortcodes can be handled next. So, either `[]()` or `[][]`, and that's it.
            this.regexToStripFillLinks = new RegExp('(\\[)(' + m0EscNoVws('[]') + ')(\\])((?:\\(' + m0EscNoVws('()') + '\\)|\\[' + m0EscNoVws('[]') + '\\])(?:\\{' + m0EscNoVws('{}') + '\\})?)', 'ugi');
            // This removes anything else in `[brackets]` that's not MD `[text]` that was preserved for spell checking.
            // For example, all WP shortcodes are removed here. Not the shortcode content, but all of the open/closing tags.
            // Note the `.` in this pattern covers the previous fill i.e., to avoid dropping the remaining `[text].` we need to check.
            this.regexToStripFillSquareBrackets = new RegExp('\\[' + m0EscNoVws('[]') + '\\](?!' + escRegex(dot, true) + ')', 'ugi');
            // Remove any remaining `{}` brackets; e.g., MD attributes.
            // For example, there may still be some of these in ATX-style headings.
            this.regexToStripFillCurlyBrackets = new RegExp('\\{' + m0EscNoVws('{}') + '\\}', 'ugi');
            // Remove anything that looks like a URL.
            this.regexToStripFillUrls = new RegExp('(?:^|[^' + wordChars + '])(?:[a-z][a-z0-9+.\\-]*:)?/{2}[^' + s + ']*', 'ugi');
            // Remove word chars that also contain an `@` or `.` within them.
            // This allows us to avoid spell checking emails addresses and domain names.
            this.regexToStripFillAtDotWords = new RegExp('(?:[' + wordChars + ']+[@.]+)+[' + wordChars + ']+', 'ugi');
            // Remove `@mentions`, which contain usernames; i.e., something we should not spell check.
            this.regexToStripAtMentions = new RegExp('[' + s + ']@[' + wordChars + ']+', 'ugi');
        };
        /*
         * Spell check routines.
         */
        SpellChecker.prototype.check = function (forceNew) {
            // Detects if already checking.
            // See: {@link isChecking}
            // See: {@link shouldStopChecking}
            var _this = this;
            if (this.isChecking) {
                if (forceNew) {
                    this.shouldStopChecking = true,
                        setTimeout(function () { return _this.check(true); }, 50);
                } // Stop the existing process and try again.
                return; // Wait for completion.
            }
            this.isChecking = true; // Flag.
            this.markers.typos.forEach(function (marker) {
                _this.ed.session.removeMarker(marker);
            }); // Clear any existing/previous typo markers.
            this.markers.typos = []; // Empty array.
            // Note: This is a tricky routine because
            // we *must* preserve the length of the line
            // so it's possible to detect word position later.
            // i.e., Why there's a separate `cleanLine` below.
            var document = this.ed.session.getDocument(), inFencedCodeBlock = ''; // Initialize.
            document.getAllLines().forEach(function (line, row) {
                if (_this.shouldStopChecking) {
                    return _this.shouldStopChecking = false;
                } // Breaks the loop and resets the flags.
                var cleanLine = _this.trim(line);
                if (!cleanLine.length)
                    return;
                if (inFencedCodeBlock === '`') {
                    if (_this.regexDetectEndOfBacktickFencedCodeBlock.test(cleanLine))
                        inFencedCodeBlock = '';
                    return; // Bypass.
                }
                else if (inFencedCodeBlock === '~') {
                    if (_this.regexDetectEndOfTildeFencedCodeBlock.test(cleanLine))
                        inFencedCodeBlock = '';
                    return; // Bypass.
                }
                else if (_this.regexDetectStartOfFencedCodeBlock.test(cleanLine)) {
                    inFencedCodeBlock = cleanLine[0];
                    return; // Bypass code blocks.
                }
                else if (_this.regexIsLineWithAllWsDashesConnectors.test(cleanLine)) {
                    return; // Ignore lines w/ only dashes/connectors.
                }
                else if (_this.regexIsLineWithNoWordChars.test(cleanLine)) {
                    return; // Ignore lines w/o word chars.
                }
                _this.checkLineForTypos(line).forEach(function (typo) {
                    var range = new Range(row, typo.fromColumn, row, typo.toColumn);
                    _this.markers.typos.push(_this.ed.session.addMarker(range, 'ace_typo', 'typo', true));
                });
            }); // Flag as done.
            this.isChecking = false;
        };
        SpellChecker.prototype.checkLineForTypos = function (line) {
            var _this = this;
            line = this.sanitizeStripFillLine(line);
            // Supports UTF-8 chars in languages other than `en_US`.
            // For this reason, the split includes all separators too.
            // This way it is possible to count the length of the separators.
            // Note: Ace uses bytes (not chars) to calculate column positions.
            var words = line.split(this.regexNonWordCharsSplitCapture);
            var isSep = false; // Initialize sep tracking.
            var columns = 0, typos = [];
            // Iterate & spellcheck.
            words.forEach(function (wrdSep) {
                if (isSep) {
                    isSep = !isSep;
                    columns += wrdSep.length;
                    return; // Continue.
                }
                else
                    isSep = !isSep;
                var word = wrdSep;
                var column = columns;
                columns += word.length;
                var a = Array;
                var bytes = word.length;
                var chars = a.from(word).length;
                if (chars < 2) {
                    return; // Skip < 2.
                }
                else if (_this.isNumeric(word)) {
                    return; // Skip numerics.
                }
                else if (_this.regexHasDashOrConnector.test(word)) {
                    return; // Skip vars/hyphens.
                }
                else if (_this.regexHasEnUsMixedMultiCase.test(word)) {
                    return; // Skip dashed/hyphenated/connected words.
                }
                else if (_this.regexIsAStopWord.test(word)) {
                    return; // Skip known/common stopwords.
                }
                else if (_this.regexIsAllNumericWord.test(word)) {
                    return; // Skip words w/ only number chars.
                }
                else if (_this.regexIsAllUppercaseWord.test(word)) {
                    return; // Skip acronyms or anything in all caps.
                }
                // Since we allow single quotes as a word character, we need to
                // run a last-minute check and strip away leading/trailing quotes.
                // e.g., an `'important phrase'` checks `important` and `phrase`.
                var lrO = [0, 0]; // Left, right offsets.
                if (word[0] === "'") {
                    lrO[0] = 1; // Don't count leading quote.
                    word = word.substr(1); // Check word w/o leading quote.
                }
                if (word[word.length - 1] === "'") {
                    lrO[1] = -1; // Don't count trailing quote.
                    word = word.slice(0, -1); // Check word w/o trailing quote.
                }
                if (word && !_this.dictionary.check(word)) {
                    typos.push({ word: word, fromColumn: column + lrO[0], toColumn: column + bytes + lrO[1] });
                } // At a specific row, from a specific column, to a specific column.
            });
            return typos;
        };
        SpellChecker.prototype.sanitizeStripFillLine = function (line) {
            // This is a tricky routine because
            // we *must* preserve the length of the line.
            // i.e., So it's possible to detect word position.
            // Also important to keep these in a specific order.
            line = line.replace(this.regexToStripFillHtmlTags, this.dotRepeat);
            line = line.replace(this.regexToStripFillBackticks, this.dotRepeat);
            line = line.replace(this.regexToStripFillLinkDefinitions, this.dotRepeat2Of2);
            line = line.replace(this.regexToStripFillImages, this.dotRepeat13Of3);
            line = line.replace(this.regexToStripFillLinks, this.dotRepeat134Of4);
            line = line.replace(this.regexToStripFillSquareBrackets, this.dotRepeat);
            line = line.replace(this.regexToStripFillCurlyBrackets, this.dotRepeat);
            line = line.replace(this.regexToStripFillUrls, this.dotRepeat);
            line = line.replace(this.regexToStripFillAtDotWords, this.dotRepeat);
            line = line.replace(this.regexToStripAtMentions, this.dotRepeat);
            return line; // Stripped and filled-in now.
        };
        SpellChecker.prototype.escRegex = function (str, inCharClass) {
            return str.replace(inCharClass ? this._escRegExp2 : this._escRegExp1, '\\$&');
        }; // Escapes regex meta-characters.
        SpellChecker.prototype.m0EscNoVws = function (escapableChars, ungreedy) {
            escapableChars = this.escRegex(escapableChars, true);
            return '(?:[^' + this.v + escapableChars + '\\\\]|\\\\[' + escapableChars + '])*' + (ungreedy ? '?' : '');
        }; // An escaped (possibly 0-byte length) string w/o vertical whitespace.
        /*
         * Misc. utilities.
         */
        SpellChecker.prototype.trim = function (str) {
            return str.replace(this.regexTrim, '');
        };
        SpellChecker.prototype.isNumeric = function (str) {
            return !isNaN(str - parseFloat(str));
        };
        SpellChecker.prototype.debounce = function (f, delay) {
            var _this = this;
            var timeout, later = function () { return f.call(_this); };
            return function () {
                clearTimeout(timeout),
                    timeout = setTimeout(later, delay);
            }; // Optimized for spell checking.
        };
        /*
         * Destroyer (public).
         */
        SpellChecker.prototype.destroy = function () {
            var _this = this;
            this.ed.session.off('change', this.checker);
            this.markers.typos.forEach(function (marker) {
                _this.ed.session.removeMarker(marker);
            }); // Clear any existing/previous typo markers.
            this.markers.typos = []; // Empty array.
            this.shouldStopChecking = true;
        };
        return SpellChecker;
    }());
    exports.SpellChecker = SpellChecker;
});
