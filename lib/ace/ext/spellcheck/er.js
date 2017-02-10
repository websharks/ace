(function (dependencies, factory) {
    if (typeof module === 'object' && typeof module.exports === 'object') {
        var v = factory(require, exports); if (v !== undefined) module.exports = v;
    }
    else if (typeof define === 'function' && define.amd) {
        define(dependencies, factory);
    }
})(["require", "exports"], function (require, exports) {
    "use strict";
    var dom = require('../../lib/dom');
    var Range = require('ace/range').Range;
    var Unicode = require('../../unicode').packages;
    var Typo = require('../../lib/typo').Typo;
    var TypoAff = require('../../requirejs/text!../../lib/typo/en_US.aff');
    var TypoDic = require('../../requirejs/text!../../lib/typo/en_US.dic');
    var styles = require('../../requirejs/text!./styles.min.css');
    ;
    var SpellChecker = (function () {
        function SpellChecker(editor) {
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
            this._escRegExp1 = /[.*+?^${}()|[\]\\]/g;
            this._escRegExp2 = /[.*+?^${}()|[\]\\\-]/g;
            this.markers = { typos: [] };
            this.ed = editor;
            this.isChecking = false, this.shouldStopChecking = false;
            dom.importCssString(styles, 'ace_spellcheck');
            this.dictionary = new Typo('en_US', TypoAff, TypoDic);
            this.dot = '.';
            this.u = Unicode;
            this.v = '\\v\\n\\r\\f\\u0085\\u2028-\\u2029';
            this.h = ' \\t\\ufeff\\u00a0\\u1680\\u180e\\u2000-\\u200a\\u202f\\u205f\\u3000';
            this.s = '\\s';
            this.wordChars = this.u.L + this.u.M + this.u.N + this.u.Pd + this.u.Pc + '\'';
            this.regexCache();
            var delay = 500;
            this.checker = this.debounce(this.check, delay);
            this.ed.on('changeSession', function (e) {
                _this.ed.session.on('change', _this.checker),
                    _this.check();
            });
        }
        SpellChecker.prototype.regexCache = function () {
            var dot = this.dot;
            var u = this.u, h = this.h, v = this.v, s = this.s, wordChars = this.wordChars;
            var escRegex = this.escRegex.bind(this), esc0NoVws = this.esc0NoVws.bind(this);
            var sw = 'a';
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
            this.regexNonWordCharsSplitCapture = new RegExp('([^' + wordChars + ']+)', 'ui');
            this.regexIsLineWithNoWordChars = new RegExp('^[^' + wordChars + ']+$', 'ui');
            this.regexIsLineWithAllWsDashesConnectors = new RegExp('^[' + s + u.Pd + u.Pc + ']+$', 'ui');
            this.regexIsAStopWord = new RegExp('^(?:' + sw + ')$', 'ui');
            this.regexIsAllNumericWord = new RegExp('^[' + u.N + ']+$', 'ui');
            this.regexIsAllUppercaseWord = new RegExp('^[' + u.Lu + ']+$', 'u');
            this.regexHasDashOrConnector = new RegExp('[' + u.Pd + u.Pc + ']', 'ui');
            this.regexHasEnUsMixedMultiCase = new RegExp('(?:[a-z]+[A-Z]+[a-z]+[A-Z]+|[A-Z]+[a-z]+[A-Z]+[a-z]+|[a-zA-Z]+[0-9]+[A-Za-z]+)', 'u');
            this.regexDetectStartOfFencedCodeBlock = new RegExp('^(?:`{3,}|~{3,})', 'u');
            this.regexDetectEndOfBacktickFencedCodeBlock = new RegExp('^`{3,}[' + h + ']*$', 'u');
            this.regexDetectEndOfTildeFencedCodeBlock = new RegExp('^~{3,}[' + h + ']*$', 'u');
            this.regexToStripFillHtmlTags = new RegExp('<[^<>]*>', 'ugi');
            this.regexToStripFillBackticks = new RegExp('(`+)[^' + v + ']*?[^`]\\1', 'ugi');
            this.regexToStripFillLinkDefinitions = new RegExp('^([' + h + ']{0,3}\\[' + esc0NoVws('[]') + '\\]:[' + h + ']*)((?:<)?(?:[^' + s + '<>]*)(?:>)?)', 'ugi');
            this.regexToStripFillImages = new RegExp('(!\\[)(' + esc0NoVws('[]') + ')(\\]\\(' + esc0NoVws('()') + '\\)(?:\\{' + esc0NoVws('{}') + '\\})?)', 'ugi');
            this.regexToStripFillLinks = new RegExp('(\\[)(' + esc0NoVws('[]') + ')(\\])((?:\\(' + esc0NoVws('()') + '\\)|\\[' + esc0NoVws('[]') + '\\])(?:\\{' + esc0NoVws('{}') + '\\})?)', 'ugi');
            this.regexToStripFillSquareBrackets = new RegExp('\\[' + esc0NoVws('[]') + '\\](?!' + escRegex(dot, true) + ')', 'ugi');
            this.regexToStripFillCurlyBrackets = new RegExp('\\{' + esc0NoVws('{}') + '\\}', 'ugi');
            this.regexToStripFillUrls = new RegExp('(?:^|[^' + wordChars + '])(?:[a-z][a-z0-9+.\\-]*:)?/{2}[^' + s + ']*', 'ugi');
            this.regexToStripFillAtDotWords = new RegExp('(?:[' + wordChars + ']+[@.]+)+[' + wordChars + ']+', 'ugi');
            this.regexToStripAtMentions = new RegExp('[' + s + ']@[' + wordChars + ']+', 'ugi');
        };
        SpellChecker.prototype.check = function (forceNew) {
            var _this = this;
            if (this.isChecking) {
                if (forceNew) {
                    this.shouldStopChecking = true,
                        setTimeout(function () { return _this.check(true); }, 50);
                }
                return;
            }
            this.isChecking = true;
            this.markers.typos.forEach(function (marker) {
                _this.ed.session.removeMarker(marker);
            });
            this.markers.typos = [];
            var document = this.ed.session.getDocument(), inFencedCodeBlock = '';
            document.getAllLines().forEach(function (line, row) {
                if (_this.shouldStopChecking) {
                    return _this.shouldStopChecking = false;
                }
                var cleanLine = _this.trim(line);
                if (!cleanLine.length)
                    return;
                if (inFencedCodeBlock === '`') {
                    if (_this.regexDetectEndOfBacktickFencedCodeBlock.test(cleanLine))
                        inFencedCodeBlock = '';
                    return;
                }
                else if (inFencedCodeBlock === '~') {
                    if (_this.regexDetectEndOfTildeFencedCodeBlock.test(cleanLine))
                        inFencedCodeBlock = '';
                    return;
                }
                else if (_this.regexDetectStartOfFencedCodeBlock.test(cleanLine)) {
                    inFencedCodeBlock = cleanLine[0];
                    return;
                }
                else if (_this.regexIsLineWithAllWsDashesConnectors.test(cleanLine)) {
                    return;
                }
                else if (_this.regexIsLineWithNoWordChars.test(cleanLine)) {
                    return;
                }
                _this.checkLineForTypos(line).forEach(function (typo) {
                    var range = new Range(row, typo.fromColumn, row, typo.toColumn);
                    _this.markers.typos.push(_this.ed.session.addMarker(range, 'ace_typo', 'typo', true));
                });
            });
            this.isChecking = false;
        };
        SpellChecker.prototype.checkLineForTypos = function (line) {
            var _this = this;
            line = this.sanitizeStripFillLine(line);
            var words = line.split(this.regexNonWordCharsSplitCapture);
            var isSep = false;
            var columns = 0, typos = [];
            words.forEach(function (wrdSep) {
                if (isSep) {
                    isSep = !isSep;
                    columns += wrdSep.length;
                    return;
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
                    return;
                }
                else if (_this.isNumeric(word)) {
                    return;
                }
                else if (_this.regexHasDashOrConnector.test(word)) {
                    return;
                }
                else if (_this.regexHasEnUsMixedMultiCase.test(word)) {
                    return;
                }
                else if (_this.regexIsAStopWord.test(word)) {
                    return;
                }
                else if (_this.regexIsAllNumericWord.test(word)) {
                    return;
                }
                else if (_this.regexIsAllUppercaseWord.test(word)) {
                    return;
                }
                var lrO = [0, 0];
                if (word[0] === "'") {
                    lrO[0] = 1;
                    word = word.substr(1);
                }
                if (word[word.length - 1] === "'") {
                    lrO[1] = -1;
                    word = word.slice(0, -1);
                }
                if (word && !_this.dictionary.check(word)) {
                    typos.push({ word: word, fromColumn: column + lrO[0], toColumn: column + bytes + lrO[1] });
                }
            });
            return typos;
        };
        SpellChecker.prototype.sanitizeStripFillLine = function (line) {
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
            return line;
        };
        SpellChecker.prototype.escRegex = function (str, inCharClass) {
            return str.replace(inCharClass ? this._escRegExp2 : this._escRegExp1, '\\$&');
        };
        SpellChecker.prototype.esc0NoVws = function (escapableChars, ungreedy) {
            return '(?:[^' + this.escRegex(escapableChars, true) + '\\\\]|\\\\[^' + this.v + '])*' + (ungreedy ? '?' : '');
        };
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
            };
        };
        SpellChecker.prototype.destroy = function () {
            var _this = this;
            this.ed.session.off('change', this.checker);
            this.markers.typos.forEach(function (marker) {
                _this.ed.session.removeMarker(marker);
            });
            this.markers.typos = [];
            this.shouldStopChecking = true;
        };
        return SpellChecker;
    }());
    exports.SpellChecker = SpellChecker;
});
