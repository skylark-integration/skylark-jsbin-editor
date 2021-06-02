/**
 * skylark-jsbin-coder - A version of jsbin-editor  that ported to running on skylarkjs.
 * @author Hudaokeji, Inc.
 * @version v0.9.0
 * @link https://github.com/skylark-integration/skylark-jsbin-coder/
 * @license MIT
 */
define(["skylark-jquery","../jsbin","../coder","./codemirror","./panels","./tern"],function(e,t,n,o,r){"use strict";if(!t.embed&&!t.mobile){var i=t.state.processors;t.settings.addons||(t.settings.addons={closebrackets:!0,highlight:!1,vim:!1,emacs:!1,trailingspace:!1,fold:!1,sublime:!1,tern:!1,activeline:!0,matchbrackets:!1});var s="open"in document.createElement("details"),d={},l={};["js","html","coffeescript","css"].forEach(function(e){var n=e+"hint",o=!1;"js"===e&&(o=!0),d[n]=void 0!==t.settings[n]?t.settings[n]:o}),(l=e.extend({},{console:!0,line:!1,under:!1,gutter:!1},t.settings.hintShow)).tooltip=l.gutter;var c=e.extend({},t.settings.addons,d),a={closebrackets:{url:"/js/vendor/codemirror5/addon/edit/closebrackets.js",test:p("autoCloseBrackets"),done:function(e){h(e,"autoCloseBrackets",!0)}},highlight:{url:"/js/vendor/codemirror5/addon/search/match-highlighter.js",test:p("highlightSelectionMatches"),done:function(e){h(e,"highlightSelectionMatches",!0)}},vim:{url:["/js/vendor/codemirror5/keymap/vim.js"],test:p("vimMode"),done:function(e){h(e,"vimMode",!0),h(e,"showCursorWhenSelecting",!0)}},emacs:{url:["/js/vendor/codemirror5/keymap/emacs.js"],test:function(){return o.keyMap.emacs},done:function(e){h(e,"keyMap","emacs")}},matchtags:{url:["/js/vendor/codemirror5/addon/fold/xml-fold.js","/js/vendor/codemirror5/addon/edit/matchtags.js"],test:function(){return o.scanForClosingTag&&o.optionHandlers.matchTags},done:function(e){h(e,"matchTags",{bothTags:!0}),e.addKeyMap({"Ctrl-J":"toMatchingTag"})}},trailingspace:{url:"/js/vendor/codemirror5/addon/edit/trailingspace.js",test:p("showTrailingSpace"),done:function(e){h(e,"showTrailingSpace",!0)}},fold:{url:["/js/vendor/codemirror5/addon/fold/foldgutter.css","/js/vendor/codemirror5/addon/fold/foldcode.js","/js/vendor/codemirror5/addon/fold/foldgutter.js","/js/vendor/codemirror5/addon/fold/brace-fold.js","/js/vendor/codemirror5/addon/fold/xml-fold.js","/js/vendor/codemirror5/addon/fold/comment-fold.js"],test:function(){return o.helpers.fold&&o.optionHandlers.foldGutter&&o.optionHandlers.gutters},done:function(e){u.addClass("code-fold"),e.addKeyMap({"Ctrl-Q":function(e){e.foldCode(e.getCursor())}}),h(e,"foldGutter",!0);var t=e.getOption("gutters").slice();t.push("CodeMirror-foldgutter"),h(e,"gutters",t)}},sublime:{url:["/js/vendor/codemirror5/keymap/sublime.js"],test:function(){return o.keyMap.sublime},done:function(t){h(t,"keyMap","sublime");var n="mac"===e.browser.platform?"Cmd":"Ctrl";delete o.keyMap.sublime[n+"-L"],delete o.keyMap.sublime[n+"-T"],delete o.keyMap.sublime[n+"-W"],delete o.keyMap.sublime[n+"-J"],delete o.keyMap.sublime[n+"-R"],delete o.keyMap.sublime[n+"-Enter"],delete o.keyMap.sublime[n+"-Up"],delete o.keyMap.sublime[n+"-Down"],o.keyMap.sublime["Shift-Tab"]="indentAuto",t.removeKeyMap("noEmmet")}},tern:{url:["/js/vendor/codemirror5/addon/hint/show-hint.css","/js/vendor/codemirror5/addon/tern/tern.css","/js/vendor/codemirror5/addon/hint/show-hint.js","/js/prod/addon-tern-"+t.version+".min.js"],test:function(){return void 0!==window.ternBasicDefs&&o.showHint&&o.TernServer&&o.startTern},done:function(){o.startTern()}},activeline:{url:["/js/vendor/codemirror5/addon/selection/active-line.js"],test:function(){return void 0!==o.defaults.styleActiveLine},done:function(e){h(e,"styleActiveLine",!0)}},matchbrackets:{url:[],test:function(){return void 0!==o.defaults.matchBrackets},done:function(e){h(e,"matchBrackets",!0)}},csshint:{url:["/js/vendor/csslint/csslint.min.js","/js/vendor/cm_addons/lint/css-lint.js"],test:function(){return v("css")&&"undefined"!=typeof CSSLint},done:function(e){"css"===e.getOption("mode")&&(void 0!==i.css&&"css"!==i.css||hintingDone(e))}},jshint:{url:[e.browser.msie&&e.browser.version<9?"/js/vendor/jshint/jshint.old.min.js":"/js/vendor/jshint/jshint.min.js"],test:function(){return v("javascript")&&"undefined"!=typeof JSHINT},done:function(e){"javascript"===e.getOption("mode")&&(void 0!==i.javascript&&"javascript"!==i.javascript||hintingDone(e,{eqnull:!0}))}},htmlhint:{url:["/js/vendor/htmlhint/htmlhint.js","/js/vendor/cm_addons/lint/html-lint.js"],test:function(){return v("htmlmixed")&&"undefined"!=typeof HTMLHint},done:function(e){"htmlmixed"===e.getOption("mode")&&(void 0!==i.html&&"html"!==i.html||hintingDone(e))}},coffeescripthint:{url:["/js/vendor/coffeelint/coffeelint.min.js","/js/vendor/cm_addons/lint/coffeescript-lint.js"],test:function(){return v("coffeescript")&&"undefined"!=typeof coffeelint},done:function(e){"coffeescript"===e.getOption("mode")&&"coffeescript"===t.state.processors.javascript&&hintingDone(e)}}},u=e("body");window.hintingDone=function(n,o){var r=n.getOption("mode");"javascript"===r&&(r="js"),"htmlmixed"===r&&(r="html");var i=e.extend({},l);if(i.consoleParent=n.getWrapperElement().parentNode.parentNode,h(n,"lintOpt",i),i.gutter){var d=n.getOption("gutters");if(-1===d.indexOf("CodeMirror-lint-markers")){var c=d.slice();c.push("CodeMirror-lint-markers"),h(n,"gutters",c)}var a=n.getOption("lineNumbers");h(n,"lineNumbers",!a),h(n,"lineNumbers",a)}h(n,"lint",{delay:800,options:e.extend({},o,t.settings[r+"hintOptions"])}),i.console&&n.consolelint&&($document.trigger("sizeeditors"),e(n.consolelint.head).on("click",function(){s||e(this).nextAll().toggle(),setTimeout(function(){$document.trigger("sizeeditors")},10)}))};var f=Object.keys(c);f.forEach(j),window.reloadAddons=function(e){e?e.forEach(j):f.forEach(j)}}function m(n){if(0!==n.indexOf("http")&&(n=t.static+n),".js"===n.slice(-3))return e.ajax({url:n+"?"+t.version,dataType:"script",cache:!0});if(".css"===n.slice(-4)){var o=e.Deferred();return setTimeout(function(){u.append('<link rel="stylesheet" href="'+n+"?"+t.version+'">'),o.resolve()},0),o}}function h(e,t,n){e.setOption(t,n)}function p(e){return function(){return void 0!==o.optionHandlers[e]}}function v(e){return void 0!==o.defaults.lint&&o.helpers.lint&&o.helpers.lint[e]&&o.optionHandlers.lint}function j(t){var n=a[t];n&&c[t]&&("string"==typeof n.url&&(n.url=[n.url]),e.when.call(e,n.url.map(m)).done(function(){n.done&&function(t){var n=e.Deferred(),o=null;if(t())n.resolve();else{var r=(new Date).getTime(),i=new Date;o=setInterval(function(){i=new Date,t()?(clearInterval(o),n.resolve()):i.getTime()-r>1e4&&(clearInterval(o),n.reject())},100)}return n}(n.test).then(function(){r.allEditors(function(e){e.editor&&n.done(e.editor)})})}))}});
//# sourceMappingURL=../sourcemaps/editors/addons.js.map
