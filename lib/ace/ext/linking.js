define(function (require, exports, module) {
  var dom = require('../lib/dom');
  var Editor = require('ace/editor').Editor;
  var Range = require('ace/range').Range;

  var marker,
    markerTimeout = null,
    markerTimeoutTime = 2500;

  var lastParseLinkTokenValue = '',
    lastParseLinkTokenUrl = '';

  var styles = require('../requirejs/text!./linking/styles.min.css');

  require('../config').defineOptions(Editor.prototype, 'editor', {
    enableLinking: {
      set: function (val) {
        if (val) {
          this.on('click', onClick);
          this.on('mousemove', onMouseMove);
          dom.importCssString(styles, 'ace_linking');
        } else {
          this.off('click', onClick);
          this.off('mousemove', onMouseMove);
        }
      },
      value: true
    }
  });

  function onClick(e) {
    // win: `Ctrl`, mac: `Cmd`.
    if (!e.getAccelKey()) return;

    // `0`: left mouse button.
    var mouseButton = e.getButton();
    if (mouseButton !== 0) return;

    var editor = e.editor;
    var session = editor.session;

    var mousePos = e.getDocumentPosition();
    var mouseToken = session.getTokenAt(mousePos.row, mousePos.column);
    if (!mouseToken) return; // Not clicking a token.

    var url = parseLink(mouseToken);
    if (!url) return; // Not applicable.

    var o = open(url, 'ace_linking');
    if (o) setTimeout(function () { o.focus(); }, 1000);
  }

  function onMouseMove(e) {
    var editor = e.editor;
    var session = editor.session;

    if (!e.getAccelKey()) {
      return removeMarker(session);
    }
    var mousePos = e.getDocumentPosition();
    var mouseToken = session.getTokenAt(mousePos.row, mousePos.column);

    if (!mouseToken) {
      return removeMarker(session);
    } // Not over a token.

    var url = parseLink(mouseToken);

    if (!url) {
      return removeMarker(session);
    } // Not over a URL.

    addMarkerTimeout(session, mousePos, mouseToken);
  }

  function addMarkerTimeout(session, mousePos, mouseToken) {
    removeMarker(session); // Remove existing.

    var row = mousePos.row,
      from = mouseToken.start,
      to = from + mouseToken.value.length;

    var range = new Range(row, from, row, to);
    marker = session.addMarker(range, 'ace_linking', 'link', true);

    clearTimeout(markerTimeout); // Add a new timeout now.
    markerTimeout = setTimeout(function () { removeMarker(session); }, markerTimeoutTime);
  }

  function removeMarker(session) {
    if (marker) session.removeMarker(marker), marker = null;
  }

  function parseLink(token) {
    if (!token || !token.type || !token.value)
      return ''; // Not possible.

    if (token.value === lastParseLinkTokenValue)
      return lastParseLinkTokenUrl;

    lastParseLinkTokenValue = token.value;

    if (!/(?:^|\.)(?:url|link|image-as-link-text)(?:$|\.)/i.test(token.type))
      return (lastParseLinkTokenUrl = '');

    var match, url = unescape(token.value);

    if (!(match = /(?:^|[\s<>(){}[\]"'])((?:[a-zA-Z][a-zA-Z0-9+.\-]*:)?\/{2}[^\s<>(){}[\]"']+)/i.exec(url))) {
      console.log(url);
      return (lastParseLinkTokenUrl = '');
    }
    return (url = lastParseLinkTokenUrl = match[1]);
  }

  function unescape(str) {
    var map = {
      '&amp;': '&',
      '&lt;': '<',
      '&gt;': '>',
      '&quot;': '"',
      '&#x27;': "'",
      '&#x60;': '`',
    };
    var entity, indexOf = 0;

    for (entity in map) {
      do { // Replace all occurrences.
        str = str.replace(entity, map[entity]);
      } while ((indexOf = str.indexOf(entity, indexOf + 1)) > -1);
    }
    return str;
  }
});
