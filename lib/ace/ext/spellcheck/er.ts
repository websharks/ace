declare const require: any; // RequireJS.

const dom: any = require('../../lib/dom');
const Range: any = require('ace/range').Range;
const Unicode: any = require('../../unicode').packages;

const Typo: any = require('../../lib/typo').Typo;
const TypoAff: string = require('../../requirejs/text!../../lib/typo/en_US.aff');
const TypoDic: string = require('../../requirejs/text!../../lib/typo/en_US.dic');

const styles: string = require('../../requirejs/text!./styles.min.css');

interface ATypo {
  word: string;
  fromColumn: number;
  toColumn: number;
};
export class SpellChecker {
  protected markers: {
    typos: number[];
  } // Marker indexes.

  protected ed: any; // Ace.Editor
  protected dictionary: any; // Typo.js

  protected isChecking: boolean;
  protected shouldStopChecking: boolean;

  protected dot: any; // Filler.
  // `any` to avoid TSWs about `.repeat()`.
  // The spell checker requires some ES6 features.

  public u: any; // Ace unicode library.
  public v: string; // Vertical whitespace.
  public h: string; // Horizontal whitespace.
  public s: string; // All whitespace chars.
  public wordChars: string; // Word chars.

  protected checker: Function; // Debouncer.

  protected regexTrim: RegExp; // Both sides.
  protected regexNonWordCharsSplitCapture: RegExp;
  protected regexIsLineWithNoWordChars: RegExp;
  protected regexIsLineWithAllWsDashesConnectors: RegExp;

  protected regexIsAStopWord: RegExp;
  protected regexIsAllNumericWord: RegExp;
  protected regexIsAllUppercaseWord: RegExp;
  protected regexHasDashOrConnector: RegExp;
  protected regexHasEnUsMixedMultiCase: RegExp;

  protected regexDetectStartOfFencedCodeBlock: RegExp;
  protected regexDetectEndOfBacktickFencedCodeBlock: RegExp;
  protected regexDetectEndOfTildeFencedCodeBlock: RegExp;

  protected regexToStripFillUrls: RegExp;
  protected regexToStripFillLinks: RegExp;
  protected regexToStripFillImages: RegExp;
  protected regexToStripAtMentions: RegExp;
  protected regexToStripFillHtmlTags: RegExp;
  protected regexToStripFillBackticks: RegExp;
  protected regexToStripFillAtDotWords: RegExp;
  protected regexToStripFillCurlyBrackets: RegExp;
  protected regexToStripFillSquareBrackets: RegExp;
  protected regexToStripFillLinkDefinitions: RegExp;

  /*
   * Constructor.
   */

  constructor(editor: any /* Ace.Editor */) {
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

    let delay = 500; // Spell check quickly.
    this.checker = this.debounce(this.check, delay);

    this.ed.on('changeSession', (e: any) => {
      this.ed.session.on('change', this.checker),
        this.check(); // First time.
    });
  }

  /*
   * Cache regex objs.
   */

  protected regexCache() {
    let dot = this.dot;

    let u = this.u,
      h = this.h,
      v = this.v,
      s = this.s,
      wordChars = this.wordChars;

    let escRegex = this.escRegex.bind(this),
      esc0NoVws = this.esc0NoVws.bind(this);

    let sw = 'a'; // Stop words.
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
    this.regexToStripFillLinkDefinitions = new RegExp('^([' + h + ']{0,3}\\[' + esc0NoVws('[]') + '\\]:[' + h + ']*)((?:<)?(?:[^' + s + '<>]*)(?:>)?)', 'ugi');

    // This removes everything but `[alt text]` from images, which we do spell check.
    // Note: Must do images separately anyway (and first) because JS doesn't support recursion in the next step.
    this.regexToStripFillImages = new RegExp('(!\\[)(' + esc0NoVws('[]') + ')(\\]\\(' + esc0NoVws('()') + '\\)(?:\\{' + esc0NoVws('{}') + '\\})?)', 'ugi');

    // This removes everything but the `[text]` in links and the `[text]` in references, which we do spell check.
    // Note: The `(/path)` and `{attributes}` are optional in this pattern, which allows for `[link][id]` references to be handled also.
    // It's important for this pattern to require one or the other though; i.e., so shortcodes can be handled next. So, either `[]()` or `[][]`, and that's it.
    this.regexToStripFillLinks = new RegExp('(\\[)(' + esc0NoVws('[]') + ')(\\])((?:\\(' + esc0NoVws('()') + '\\)|\\[' + esc0NoVws('[]') + '\\])(?:\\{' + esc0NoVws('{}') + '\\})?)', 'ugi');

    // This removes anything else in `[brackets]` that's not MD `[text]` that was preserved for spell checking.
    // For example, all WP shortcodes are removed here. Not the shortcode content, but all of the open/closing tags.
    // Note the `.` in this pattern covers the previous fill i.e., to avoid dropping the remaining `[text].` we need to check.
    this.regexToStripFillSquareBrackets = new RegExp('\\[' + esc0NoVws('[]') + '\\](?!' + escRegex(dot, true) + ')', 'ugi');

    // Remove any remaining `{}` brackets; e.g., MD attributes.
    // For example, there may still be some of these in ATX-style headings.
    this.regexToStripFillCurlyBrackets = new RegExp('\\{' + esc0NoVws('{}') + '\\}', 'ugi');

    // Remove anything that looks like a URL.
    this.regexToStripFillUrls = new RegExp('(?:^|[^' + wordChars + '])(?:[a-z][a-z0-9+.\\-]*:)?/{2}[^' + s + ']*', 'ugi');

    // Remove word chars that also contain an `@` or `.` within them.
    // This allows us to avoid spell checking emails addresses and domain names.
    this.regexToStripFillAtDotWords = new RegExp('(?:[' + wordChars + ']+[@.]+)+[' + wordChars + ']+', 'ugi');

    // Remove `@mentions`, which contain usernames; i.e., something we should not spell check.
    this.regexToStripAtMentions = new RegExp('[' + s + ']@[' + wordChars + ']+', 'ugi');
  }

  /*
   * Spell check routines.
   */

  protected check(forceNew?: boolean) {
    // Detects if already checking.
    // See: {@link isChecking}
    // See: {@link shouldStopChecking}

    if (this.isChecking) {
      if (forceNew) { // Halt existing?
        this.shouldStopChecking = true,
          setTimeout(() => this.check(true), 50);
      } // Stop the existing process and try again.
      return; // Wait for completion.
    }
    this.isChecking = true; // Flag.

    this.markers.typos.forEach((marker: number) => {
      this.ed.session.removeMarker(marker);
    }); // Clear any existing/previous typo markers.
    this.markers.typos = []; // Empty array.

    // Note: This is a tricky routine because
    // we *must* preserve the length of the line
    // so it's possible to detect word position later.
    // i.e., Why there's a separate `cleanLine` below.

    let document: any = this.ed.session.getDocument(),
      inFencedCodeBlock = ''; // Initialize.

    document.getAllLines().forEach((line: string, row: number) => {
      if (this.shouldStopChecking) {
        return this.shouldStopChecking = false;
      } // Breaks the loop and resets the flags.

      let cleanLine = this.trim(line);
      if (!cleanLine.length) return;

      if (inFencedCodeBlock === '`') {
        if (this.regexDetectEndOfBacktickFencedCodeBlock.test(cleanLine))
          inFencedCodeBlock = '';
        return; // Bypass.

      } else if (inFencedCodeBlock === '~') {
        if (this.regexDetectEndOfTildeFencedCodeBlock.test(cleanLine))
          inFencedCodeBlock = '';
        return; // Bypass.

      } else if (this.regexDetectStartOfFencedCodeBlock.test(cleanLine)) {
        inFencedCodeBlock = cleanLine[ 0 ];
        return; // Bypass code blocks.

      } else if (this.regexIsLineWithAllWsDashesConnectors.test(cleanLine)) {
        return; // Ignore lines w/ only dashes/connectors.
      } else if (this.regexIsLineWithNoWordChars.test(cleanLine)) {
        return; // Ignore lines w/o word chars.
      }
      this.checkLineForTypos(line).forEach((typo) => {
        let range = new Range(row, typo.fromColumn, row, typo.toColumn);
        this.markers.typos.push(this.ed.session.addMarker(range, 'ace_typo', 'typo', true));
      });
    }); // Flag as done.
    this.isChecking = false;
  }

  protected checkLineForTypos(line: string): ATypo[] {

    line = this.sanitizeStripFillLine(line);

    // Supports UTF-8 chars in languages other than `en_US`.
    // For this reason, the split includes all separators too.
    // This way it is possible to count the length of the separators.
    // Note: Ace uses bytes (not chars) to calculate column positions.

    let words = line.split(this.regexNonWordCharsSplitCapture);
    let isSep = false; // Initialize sep tracking.
    let columns = 0, typos: ATypo[] = [];

    // Iterate & spellcheck.
    words.forEach((wrdSep) => {
      if (isSep) {
        isSep = !isSep;
        columns += wrdSep.length;
        return; // Continue.
      } else isSep = !isSep;

      let word = wrdSep;
      let column = columns;
      columns += word.length;

      let a: any = Array;
      let bytes = word.length;
      let chars = a.from(word).length;

      if (chars < 2) {
        return; // Skip < 2.
      } else if (this.isNumeric(word)) {
        return; // Skip numerics.
      } else if (this.regexHasDashOrConnector.test(word)) {
        return; // Skip vars/hyphens.
      } else if (this.regexHasEnUsMixedMultiCase.test(word)) {
        return; // Skip dashed/hyphenated/connected words.
      } else if (this.regexIsAStopWord.test(word)) {
        return; // Skip known/common stopwords.
      } else if (this.regexIsAllNumericWord.test(word)) {
        return; // Skip words w/ only number chars.
      } else if (this.regexIsAllUppercaseWord.test(word)) {
        return; // Skip acronyms or anything in all caps.
      }
      // Since we allow single quotes as a word character, we need to
      // run a last-minute check and strip away leading/trailing quotes.
      // e.g., an `'important phrase'` checks `important` and `phrase`.

      let lrO = [ 0, 0 ]; // Left, right offsets.

      if (word[ 0 ] === "'") {
        lrO[ 0 ] = 1; // Don't count leading quote.
        word = word.substr(1); // Check word w/o leading quote.
      }
      if (word[ word.length - 1 ] === "'") {
        lrO[ 1 ] = -1; // Don't count trailing quote.
        word = word.slice(0, -1); // Check word w/o trailing quote.
      }
      if (word && !this.dictionary.check(word)) {
        typos.push({ word: word, fromColumn: column + lrO[ 0 ], toColumn: column + bytes + lrO[ 1 ] });
      } // At a specific row, from a specific column, to a specific column.
    });
    return typos;
  }

  protected sanitizeStripFillLine(line: string) {
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
  }

  protected dotRepeat = (m: string): string => {
    return m ? this.dot.repeat(m.length) : '';
  }
  protected dotRepeat2Of2 = (m: string, c1: string, c2: string): string => {
    return c1 + (c2 ? this.dot.repeat(c2.length) : '');
  }
  protected dotRepeat13Of3 = (m: string, c1: string, c2: string, c3: string): string => {
    return (c1 ? this.dot.repeat(c1.length) : '') + c2 + (c3 ? this.dot.repeat(c3.length) : '');
  }
  protected dotRepeat134Of4 = (m: string, c1: string, c2: string, c3: string, c4: string): string => {
    return (c1 ? this.dot.repeat(c1.length) : '') + c2 + (c3 ? this.dot.repeat(c3.length) : '') + (c4 ? this.dot.repeat(c4.length) : '');
  }

  /*
   * Regex helpers.
   */

  protected _escRegExp1 = /[.*+?^${}()|[\]\\]/g;
  protected _escRegExp2 = /[.*+?^${}()|[\]\\\-]/g;

  protected escRegex(str: string, inCharClass?: boolean | undefined): string {
    return str.replace(inCharClass ? this._escRegExp2 : this._escRegExp1, '\\$&');
  } // Escapes regex meta-characters.

  protected esc0NoVws(escapableChars: string, ungreedy?: boolean | undefined): string {
    return '(?:[^' + this.escRegex(escapableChars, true) + '\\\\]|\\\\[^' + this.v + '])*' + (ungreedy ? '?' : '');
  } // An escaped (possibly 0-byte length) string w/o vertical whitespace.

  /*
   * Misc. utilities.
   */

  protected trim(str: string): string {
    return str.replace(this.regexTrim, '');
  }

  protected isNumeric(str: string): boolean {
    return !isNaN(<any>str - parseFloat(str));
  }

  protected debounce(f: Function, delay: number): Function {
    let timeout: any,
      later = () => f.call(this);

    return function () {
      clearTimeout(timeout),
        timeout = setTimeout(later, delay);
    }; // Optimized for spell checking.
  }

  /*
   * Destroyer (public).
   */

  public destroy() {
    this.ed.session.off('change', this.checker);

    this.markers.typos.forEach((marker: number) => {
      this.ed.session.removeMarker(marker);
    }); // Clear any existing/previous typo markers.
    this.markers.typos = []; // Empty array.

    this.shouldStopChecking = true;
  }
}
