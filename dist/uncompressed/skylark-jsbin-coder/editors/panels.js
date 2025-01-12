define([
  "skylark-jquery",
  "skylark-jsbin-base/storage",
  "skylark-jsbin-processors",
  "skylark-jsbin-renderer",  
  "../jsbin",
   "./panel"
],function ($,store,processors,renderer,jsbin,Panel) {
    'use strict';

  var panels = {};

  panels.getVisible = function () {
    var panels = this.named,  // this.panels => this.named
        visible = [];
    for (var panel in panels) {
      if (panels[panel].visible) visible.push(panels[panel]);
    }
    return visible;
  };

  panels.save = function () {
    // don't save panel state if we're in embed mode
    if (jsbin.embed) {
      return;
    }

    var visible = this.getVisible(),
        state = {},
        panel,
        left = '',
        width = jsbin.$window.width();

    for (var i = 0; i < visible.length; i++) {
      panel = visible[i];
      left = panel.$el.css('left');
      if (left.indexOf('%') === -1) {
        // convert the pixel to relative - this is because jQuery pulls
        // % for Webkit based, but px for Firefox & Opera. Cover our bases
        left = (parseFloat(left)  / width * 100) + '%';
      }
      state[panel.name] = left;
    }

    store.sessionStorage.setItem('jsbin.panels', JSON.stringify(state));
  };

  function getQuery(qs) {
    /*globals $*/
    var sep = '&';
    var eq = '=';
    var obj = {};

    var regexp = /\+/g;
    qs = qs.split(sep);

    var maxKeys = 1000;

    var len = qs.length;
    // maxKeys <= 0 means that we should not limit keys count
    if (maxKeys > 0 && len > maxKeys) {
      len = maxKeys;
    }

    for (var i = 0; i < len; ++i) {
      var x = qs[i].replace(regexp, '%20'),
          idx = x.indexOf(eq),
          kstr, vstr, k, v;

      if (idx >= 0) {
        kstr = x.substr(0, idx);
        vstr = x.substr(idx + 1);
      } else {
        kstr = x;
        vstr = '';
      }

      try {
        k = decodeURIComponent(kstr);
        v = decodeURIComponent(vstr);
      } catch (e) {
        k = kstr;
        v = vstr;
      }

      if (!(window.hasOwnProperty ? window.hasOwnProperty(obj, k) : obj.hasOwnProperty(k))) {
        obj[k] = v;
      } else if ($.isArray(obj[k])) {
        obj[k].push(v);
      } else {
        obj[k] = [obj[k], v];
      }
    }

    return obj;
  }

  function stringAsPanelsToOpen(query) {
    var validPanels = ['live', 'javascript', 'html', 'css', 'console'];

    return query.split(',').reduce(function (toopen, key) {
      if (key === 'js') {
        key = 'javascript';
      }

      if (key === 'output') {
        key = 'live';
      }

      if (validPanels.indexOf(key) !== -1) {
        toopen.push(key);
      }

      return toopen;
    }, []);
  }

  panels.restore = function () {
    'use strict';
    /*globals jsbin, editors, $window, $document*/
    // if there are panel names on the hash (v2 of jsbin) or in the query (v3)
    // then restore those specific panels and evenly distribute them.
    var open = [],
        defaultPanels = ['html', 'live'], // sigh, live == output :(
        location = window.location,
        search = location.search.substring(1),
        hash = location.hash.substring(1),
        toopen = [],
        state = jsbin.embed ? null : JSON.parse(store.sessionStorage.getItem('jsbin.panels') || 'null'),
        hasContent = { javascript: panels.named.javascript.getCode().length,
          css: panels.named.css.getCode().length,
          html: panels.named.html.getCode().length
        },
        name = '',
        i = 0,
        panel = null,
        init = [],
        panelURLValue = '',
        openWithSameDimensions = false,
        width = jsbin.$window.width(),
        deferredCodeInsert = '',
        focused = !!store.sessionStorage.getItem('panel'),
        validPanels = 'live javascript html css console'.split(' '),
        cachedHash = '';

    if (history.replaceState && (location.pathname.indexOf('/edit') !== -1) || ((location.origin + location.pathname) === jsbin.getURL() + '/')) {
      // history.replaceState(null, '', jsbin.getURL() + (jsbin.getURL() === jsbin.root ? '' : '/edit') + (hash ? '#' + hash : ''));
    }

    if (search || hash) {
      var query = (search || hash);

      // assume the query is: html=xyz
      if (query.indexOf('&') !== -1) {
        query = getQuery(search || hash);
        toopen = Object.keys(query).reduce(function (toopen, key) {
          if (key.indexOf(',') !== -1 && query[key] === '') {
            toopen = stringAsPanelsToOpen(key);
            return toopen;
          }

          if (key === 'js') {
            query.javascript = query.js;
            key = 'javascript';
          }

          if (key === 'output') {
            query.live = query.live;
            key = 'live';
          }

          if (query[key] === undefined) {
            query[key] = '';
          }

          if (validPanels.indexOf(key) !== -1) {
            toopen.push(key + '=' + query[key]);
          }

          return toopen;
        }, []);
      } else {
        toopen = stringAsPanelsToOpen(query);
      }
    }

    if (toopen.length === 0) {
      if (state !== null) {
        toopen = Object.keys(state);
      }
      else {
        // load from personal settings
        toopen = jsbin.mobile ? [jsbin.settings.panels[0]] : jsbin.settings.panels;
      }
    }

    if (toopen.length === 0) {
      if (hasContent.javascript) {toopen.push('javascript');}
      if (hasContent.html) {toopen.push('html');}
      if (hasContent.css) {toopen.push('css');}
      toopen.push('live');
    }

    panels.saveOnExit = true;

    /* Boot code */
    // then allow them to view specific panels based on comma separated hash fragment/query
    i = 0;

    if (toopen.length === 0) {
      toopen = defaultPanels;
    }

    if (toopen.length) {
      for (name in state) {
        if (toopen.indexOf(name) !== -1) {
          i++;
        }
      }

      if (i === toopen.length) {
        openWithSameDimensions = true;
      }

      for (i = 0; i < toopen.length; i++) {
        panelURLValue = null;
        name = toopen[i];

        // if name contains an `=` it means we also need to set that particular panel to that code
        if (name.indexOf('=') !== -1) {
          panelURLValue = name.substring(name.indexOf('=') + 1);
          name = name.substring(0, name.indexOf('='));
        }

        if (panels.named[name]) { // panels.panels => panels.named
          panel = panels.named[name]; // panels.panels => panels.named
          // console.log(name, 'width', state[name], width * parseFloat(state[name]) / 100);
          if (panel.editor && panelURLValue !== null) {
            panel.setCode(decodeURIComponent(panelURLValue));
          }

          if (openWithSameDimensions && toopen.length > 1) {
            panel.show(width * parseFloat(state[name]) / 100);
          } else {
            panel.show();
          }
          init.push(panel);
        } else if (name && panelURLValue !== null) { // TODO support any varible insertion
          (function (name, panelURLValue) {
            var todo = ['html', 'javascript', 'css'];

            var deferredInsert = function (event, data) {
              var code, parts, panel = panels.named[data.panelId] || {}; // panels.panels => panels.named

              if (data.panelId && panel.editor && panel.ready === true) {
                todo.splice(todo.indexOf(data.panelId), 1);
                try {
                  code = panel.getCode();
                } catch (e) {
                  // this really shouldn't happen
                  // console.error(e);
                }
                if (code.indexOf('%' + name + '%') !== -1) {
                  parts = code.split('%' + name + '%');
                  code = parts[0] + decodeURIComponent(panelURLValue) + parts[1];
                  panel.setCode(code);
                  jsbin.$document.unbind('codeChange', deferredInsert);
                }
              }

              if (todo.length === 0) {
                jsbin.$document.unbind('codeChange', deferredInsert);
              }
            };

            jsbin.$document.bind('codeChange', deferredInsert);
          }(name, panelURLValue));
        }
      }

      // support the old jsbin v1 links directly to the preview
      if (toopen.length === 1 && toopen[0] === 'preview') {
        panels.named.live.show(); // panels.panels => panels.named
      }

      if (!openWithSameDimensions) {this.distribute();}
    }

    // now restore any data from sessionStorage
    // TODO add default templates somewhere
    // var template = {};
    // for (name in this.panels) {
    //   panel = this.panels[name];
    //   if (panel.editor) {
    //     // panel.setCode(store.sessionStorage.getItem('jsbin.content.' + name) || template[name]);
    //   }
    // }

    for (i = 0; i < init.length; i++) {
      init[i].init();
    }

    var visible = panels.getVisible();
    if (visible.length) {
      jsbin.$body.addClass('panelsVisible');
      if (!focused) {
        visible[0].show();
      }
    }

  };

  panels.savecontent = function () {
    // loop through each panel saving it's content to sessionStorage
    var name, panel;
    for (name in this.named) {  // this.panels => this.named
      panel = this.named[name]; // this.panels => this.named
      if (panel.editor) store.sessionStorage.setItem('jsbin.content.' + name, panel.getCode());
    }
  };

  panels.getHighlightLines = function () {
    'use strict';
    var hash = [];
    var lines = '';
    var panel;
    for (name in panels.named) { // panels.panels => panels.named
      panel = panels.named[name]; // panels.panels => panels.named
      if (panel.editor) {
        lines = panel.editor.highlightLines().string;
        if (lines) {
          hash.push(name.substr(0, 1).toUpperCase() + ':L' + lines);
        }
      }
    }
    return hash.join(',');
  };

  panels.focus = function (panel) {
    this.focused = panel;
    if (panel) {
      $('.panel').removeClass('focus').filter('.' + panel.id).addClass('focus');
    }
  }

  panels.getQuery = function () {
    var alt = {
      javascript: 'js',
      live: 'output'
    };

    var visible = panels.getVisible();

    return visible.map(function (p) {
      return alt[p.id] || p.id;
    }).join(',');
  }

  panels.updateQuery = jsbin.throttle(function updateQuery() {
    var query = panels.getQuery();

    if (jsbin.state.code && jsbin.state.owner) {
      $.ajax({
        url: jsbin.getURL({ withRevision: true }) + '/settings',
        type: 'PUT',
        data: { panels: visible.map(function (p) { return p.id; }) },
        success: function () {}
      });
    }

    if (history.replaceState) {
      history.replaceState(null, null, '?' + query);
    }
  }, 100);

  var userResizeable = !$('html').hasClass('layout');

  if (!userResizeable) {
    $('#source').removeClass('stretch');
  }

  // evenly distribute the width of all the visible panels
  panels.distribute = function () {
    if (!userResizeable) {
      return;
    }

    var visible = $('#source .panelwrapper:visible'),
        width = 100,
        height = 0,
        innerW = jsbin.$window.width() - (visible.length - 1), // to compensate for border-left
        innerH = $('#source').outerHeight(),
        left = 0,
        right = 0,
        top = 0,
        panel,
        nestedPanels = [];

    if (visible.length) {
      jsbin.$body.addClass('panelsVisible');

      // visible = visible.sort(function (a, b) {
      //   return a.order < b.order ? -1 : 1;
      // });

      width = 100 / visible.length;
      for (var i = 0; i < visible.length; i++) {
        panel = $.data(visible[i], 'panel');
        right = 100 - (width * (i+1));
        panel.$el.css({ top: 0, bottom: 0, left: left + '%', right: right + '%' });
        panel.splitter.trigger('init', innerW * left/100);
        panel.splitter[i == 0 ? 'hide' : 'show']();
        left += width;

        nestedPanels = $(visible[i]).find('.panel');
        if (nestedPanels.length > 1) {
          top = 0;
          nestedPanels = nestedPanels.filter(':visible');
          height = 100 / nestedPanels.length;
          nestedPanels.each(function (i) {
            bottom = 100 - (height * (i+1));
            var panel = panels.named[$.data(this, 'name')];  // jsbin.panels.panels => panels.named
            // $(this).css({ top: top + '%', bottom: bottom + '%' });
            $(this).css('top', top + '%');
            $(this).css('bottom', bottom + '%' );
            if (panel.splitter.hasClass('vertical')) {
              panel.splitter.trigger('init', innerH * top/100);
              panel.splitter[i == 0 ? 'hide' : 'show']();
            }
            top += height;
          });
        }
      }
    } else if (!jsbin.embed) {
      $('#history').show();
      setTimeout(function () {
        jsbin.$body.removeClass('panelsVisible');
      }, 100); // 100 is on purpose to add to the effect of the reveal
    }
  };

  panels.show = function (panelId) {
    this.named[panelId].show();  // this.panels => this.named
    if (this.named[panelId].editor) { // this.panels => this.named
      this.named[panelId].editor.focus(); // this.panels => this.named
    }
    this.named[panelId].focus(); // this.panels => this.named
  };

  panels.hide = function (panelId) {
    var $history = $('#history'); // TODO shouldn't have to keep hitting this
    var panels = this.named; // this.panels => this.named
    if (panels[panelId].visible) {
      panels[panelId].hide();
    }

    var visible = panels.getVisible();
    if (visible.length) {
      panels.focused = visible[0];
      if (panels.focused.editor) {
        panels.focused.editor.focus();
      } else {
        panels.focused.$el.focus();
      }
      panels.focused.focus();
    }

    /*
    } else if ($history.length && !$body.hasClass('panelsVisible')) {
      $body.toggleClass('dave', $history.is(':visible'));
      $history.toggle(100);
    } else if ($history.length === 0) {
      // TODO load up the history
    }
    */
  };

  panels.hideAll = function (fromShow) {
    var visible = panels.getVisible(),
        i = visible.length;
    while (i--) {
      visible[i].hide(fromShow);
    }
  };

  // dirty, but simple
  Panel.prototype.distribute = function () {
    panels.distribute();
  };

  var ignoreDuringLive = /^\s*(while|do|for)[\s*|$]/;


  var panelInit = {
    html: function () {
      var init = function () {
        // set cursor position on first blank line
        // 1. read all the inital lines
        var lines = this.editor.getValue().split('\n'),
            blank = -1;
        lines.forEach(function (line, i) {
          if (blank === -1 && line.trim().length === 0) {
            blank = i;
            //exit
          }
        });

        if (blank !== -1) {
          this.editor.setCursor({ line: blank, ch: 2 });
          if (lines[blank].length === 0) {
            this.editor.indentLine(blank, 'add');
          }
        }
      };

      return new Panel('html', { editor: true, label: 'HTML', init: init });
    },
    css: function () {
      return new Panel('css', { editor: true, label: 'CSS' });
    },
    javascript: function () {
      return new Panel('javascript', { editor: true, label: 'JavaScript' });
    },
    console: function () {
      // hide and show callbacks registered in console.js
      return new Panel('console', { label: 'Console' });
    },
    live: function () {
      function show() {
        // var panel = this;
        if (panels.ready) {
          renderLivePreview();
        }
      }

      function hide() {
        // detroy the iframe if we hide the panel
        // note: $live is defined in live.js
        // Commented out so that the live iframe is never destroyed
        if (panels.named.console.visible === false) { // panels.panels => panels.named
          // $live.find('iframe').remove();
        }
      }

      return new Panel('live', { label: 'Output', show: show, hide: hide });
    }
  };

  var editors = panels.named = {};  // panels.panels => panels.named

  // show all panels (change the order to control the panel order)
  panels.named.html = panelInit.html();
  panels.named.css = panelInit.css();
  panels.named.javascript = panelInit.javascript();
  panels.named.console = panelInit.console();
  ///upgradeConsolePanel(editors.console);
  panels.named.live = panelInit.live();

  panels.named.live.settings.render = function (showAlerts) {
    if (panels.ready) {
      renderLivePreview(showAlerts);
    }
  };

  panels.allEditors = function (fn) {
    var panelId, panel;
    for (panelId in panels.named) {  // panels.panels => panels.named
      panel = panels.named[panelId]; // panels.panels => panels.named
      if (panel.editor) fn(panel);
    }
  };

  setTimeout(function () {
    panels.restore();
  }, 10);
  panels.focus(panels.getVisible()[0] || null);

  var editorsReady = setInterval(function () {
    var ready = true,
        resizeTimer = null,
        panel,
        panelId,
        hash = window.location.hash.substring(1);


    for (panelId in panels.named) {  // panels.panels => panels.named
      panel = panels.named[panelId]; // panels.panels => panels.named
      if (panel.visible && !panel.ready) {
        ready = false;
        break;
      }
    }

    panels.ready = ready;

    if (ready) {
      panels.allEditors(function (panel) {
        var key = panel.id.substr(0, 1).toUpperCase() + ':L';
        if (hash.indexOf(key) !== -1) {
          var lines = hash.match(new RegExp(key + '(\\d+(?:-\\d+)?)'));
          if (lines !== null) {
            panel.editor.highlightLines(lines[1]);
          }
        }
      });

      var altLibraries = $('li.add-library');
      var altRun = $('li.run-with-js');
      panels.named.live.on('hide', function () {
        altLibraries.show();
        altRun.hide();
      });

      panels.named.live.on('show', function () {
        altLibraries.hide();
        altRun.show();
      });

      if (panels.named.live.visible) { // panels.panels => panels.named
        panels.named.live.trigger('show');
      } else {
        panels.named.live.trigger('hide');
      }

      clearInterval(editorsReady);

      // if the console is visible, it'll handle rendering of the output and console
      if (panels.named.console.visible) { // panels.panels => panels.named
        panels.named.console.render();
      } else {
        // otherwise, force a render
        renderLivePreview();
      }


      if (!jsbin.mobile) {
        $(window).resize(function () {
          clearTimeout(resizeTimer);
          resizeTimer = setTimeout(function () {
            jsbin.$document.trigger('sizeeditors');
          }, 100);
        });
      }

      jsbin.$document.trigger('sizeeditors');
      jsbin.$document.trigger('jsbinReady');
    }
  }, 100);



  setTimeout(function () {
    panels.restore();
  }, 10);
  panels.focus(panels.getVisible()[0] || null);

  // moved from processors/processor.js
  var render = function() {
    if (panels.ready) {
      panels.named.console.render();
    }
  };

  var $panelButtons = $('#panels');

  var $processorSelectors = $('div.processorSelector').each(function () {
    var panelId = this.getAttribute('data-type'),
        $el = $(this),
        $label = $el.closest('.label').find('strong a'),
        originalLabel = $label.text();

    $el.find('a').click(function (e) {
      var panel = panels.named[panelId];
      var $panelButton = $panelButtons.find('a[href$="' + panelId + '"]');

      e.preventDefault();
      var target = this.hash.substring(1),
          label = $(this).text(),
          labelData = $(this).data('label');
      if (target !== 'convert') {
        $panelButton.html(labelData || label);
        $label.html('<span>' + label + '</span>');
        if (target === panelId) {
          processors.reset(panelId);
          render();
        } else {
          processors.set(panelId, target, render);
        }
      } else {
        $label.text(originalLabel);
        $panelButton.html(originalLabel);
        panel.render().then(function (source) {
          processors.reset(panelId);
          panel.setCode(source);
        });
      }
    }).bind('select', function (event, value) {
      if (value === this.hash.substring(1)) {
        var $panelButton = $panelButtons.find('a[href$="' + panelId + '"]');
        var $this = $(this);
        $label.html('<span>' + $this.text() + '</span>');
        $panelButton.html($this.data('label') || $this.text());
      }
    });
  });

  var _set = processors.set;
  processors.set = function (panelId, processorName, callback) {
    var panel;

    // panelId can be id or instance of a panel.
    // this is kinda nasty, but it allows me to set panel processors during boot
    if (panelId instanceof Panel) {
      panel = panelId;
    } else {
      panel = panels.named[panelId];
    }

    _set(panel,processorName,callback);

  };


  processors.reset = function (panelId) {
    processors.set(panelId);
  };



  // moved from render/render.js
  var renderCodeWorking = false;
  function formatErrors(res) {
    var errors = [];
    var line = 0;
    var ch = 0;
    for (var i = 0; i < res.length; i++) {
      line = res[i].line || 0;
      ch = res[i].ch || 0;
      errors.push({
        from: {line, ch},
        to: {line, ch},
        message: res[i].msg,
        severity: 'error',
      });
    }
    return errors;
  };

  var getRenderedCode = panels.getRenderedCode =  function () {
    'use strict';

    if (renderCodeWorking) {
      // cancel existing jobs, and replace with this job
    }

    renderCodeWorking = true;

    // this allows us to make use of a promise's result instead of recompiling
    // the language each time
    var promises = ['html', 'javascript', 'css'].reduce(function (prev, curr) {
      if (!jsbin.owner() || panels.focused && curr === panels.focused.id) {
        getRenderedCode[curr] = getRenderedCode.render(curr);
      }
      prev.push(getRenderedCode[curr]);
      return prev;
    }, []);

    return Promise.all(promises).then(function (data) {
      var res = {
        html: data[0],
        javascript: data[1],
        css: data[2],
      };
      return res;
    }).catch(function (e) {
      // swallow
    });
  };

  getRenderedCode.render = function render (language) {
    return new Promise(function (resolve, reject) {
      panels.named[language].render().then(resolve, function (error) {
        console.warn(panels.named[language].processor.id + ' processor compilation failed');
        if (!error) {
          error = {};
        }

        if ($.isArray(error)) { // then this is for our hinter
          // console.log(data.errors);
          var cm = panels.named[language].editor;

          // if we have the error reporting function (called updateLinting)
          if (typeof cm.updateLinting !== 'undefined') {
            hintingDone(cm);
            var err = formatErrors(error);
            cm.updateLinting(err);
          } else {
            // otherwise dump to the console
            console.warn(error);
          }
        } else if (error.message) {
          console.warn(error.message, error.stack);
        } else {
          console.warn(error);
        }

        reject(error);
      });
    });
  };


 function sendReload() {
    if (jsbin.saveChecksum) {
      $.ajax({
        url: jsbin.getURL() + '/reload',
        data: {
          code: jsbin.state.code,
          revision: jsbin.state.revision,
          checksum: jsbin.saveChecksum
        },
        type: 'post'
      });
    }
  }


  /** ============================================================================
   * Live rendering.
   *
   * Comes in two tasty flavours. Basic mode, which is essentially an IE7
   * fallback. Take a look at https://github.com/jsbin/jsbin/issues/651 for more.
   * It uses the iframe's name and JS Bin's event-stream support to keep the
   * page up-to-date.
   *
   * The second mode uses postMessage to inform the runner of changes to code,
   * config and anything that affects rendering, and also listens for messages
   * coming back to update the JS Bin UI.
   * ========================================================================== */

  /**
   * Render live preview.
   * Create the runner iframe, and if postMe wait until the iframe is loaded to
   * start postMessaging the runner.
   */

  // The big daddy that handles postmessaging the runner.
  var renderLivePreview = panels.renderLivePreview = function (requested) {
    // No postMessage? Don't render – the event-stream will handle it.
    if (!window.postMessage) { return; }

    // Inform other pages event streaming render to reload
    if (requested) {
      sendReload();
      jsbin.state.hasBody = false;
    }
    getRenderedCode().then(function (codes) { // modified by lwf
      var includeJsInRealtime = jsbin.settings.includejs;

      // Tell the iframe to reload
      var visiblePanels = panels.getVisible();
      var outputPanelOpen = visiblePanels.indexOf(panels.named.live) > -1;
      var consolePanelOpen = visiblePanels.indexOf(panels.named.console) > -1;
      if (!outputPanelOpen && !consolePanelOpen) {
        return;
      }
      // this is a flag that helps detect crashed runners
      if (jsbin.settings.includejs) {
        store.sessionStorage.setItem('runnerPending', 1);
      }

      renderer.postMessage('render', {
        //source: source,
        codes : codes, // modified by lwf
        options: {
          injectCSS: jsbin.state.hasBody && panels.focused.id === 'css',
          requested: requested,
          debug: jsbin.settings.debug,
          includeJsInRealtime: jsbin.settings.includejs,
        },
      });

      jsbin.state.hasBody = true;

    });
  };
  return jsbin.coder.editors.panels = panels;
});