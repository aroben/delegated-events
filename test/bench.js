(function() {
  var DEPTH = 25;
  var DISPATCHES = 1500;

  function build(depth) {
    var selectors = [];
    var parent = document.body;
    for (var i = 0; i < depth; i++) {
      var name = 'js-div-' + i;
      selectors.push('.' + name);
      var child = document.createElement('div');
      child.classList.add(name, 'a', 'b', 'c');
      parent.appendChild(child);
      parent = child;
    }
    return selectors;
  }

  function handler(event) {
    if (event.type !== 'test:bench') {
      console.log('test');
    }
  }

  function matchHandler(event) {
    if (event.target.matches(this)) {
      if (event.type !== 'test:bench') {
        console.log('test');
      }
    }
  }

  function native() {
    var handlers = new Map();
    return {
      name: 'native',
      on: function(selector) {
        var clone = matchHandler.bind(selector);
        handlers.set(selector, clone);
        document.addEventListener('test:bench', clone);
      },
      off: function(selector) {
        var handler = handlers.get(selector);
        handlers.delete(selector);
        document.removeEventListener('test:bench', handler);
      },
    };
  }

  function delegated() {
    return {
      name: 'delegated',
      on: function(selector) {
        $.on('test:bench', selector, handler);
      },
      off: function(selector) {
        $.off('test:bench', selector, handler);
      }
    };
  }

  function jquery() {
    return {
      name: 'jQuery',
      on: function(selector) {
        $(document).on('test:bench', selector, handler);
      },
      off: function(selector) {
        $(document).off('test:bench', selector, handler);
      }
    };
  }

  function jqueryss() {
    return {
      name: 'jQuery + SelectorSet',
      setup: function() {
        return new Promise(function(resolve) {
          var script = document.createElement('script');
          script.addEventListener('load', resolve);
          script.src = '../vendor/jquery-selector-set/jquery.selector-set.js';
          document.head.appendChild(script);
        });
      },
      on: function(selector) {
        $(document).on('test:bench', selector, handler);
      },
      off: function(selector) {
        $(document).off('test:bench', selector, handler);
      }
    };
  }

  function zepto() {
    return {
      name: 'zepto',
      on: function(selector) {
        Zepto(document).on('test:bench', selector, handler);
      },
      off: function(selector) {
        Zepto(document).off('test:bench', selector, handler);
      }
    };
  }

  function dispatch(node) {
    for (var i = 0; i < DISPATCHES; i++) {
      node.dispatchEvent(
        new CustomEvent('test:bench', {
          bubbles: true,
          cancelable: true,
          detail: {index: i}
        })
      );
    }
  }

  function report(results) {
    var colors = '#54c7fc #ffcd00 #ff9600 #ff2851 #0076ff #44db5e #ff3824 #8e8e93'.split(' ');

    var max = results.reduce(function(a, b) {
      return a.value > b.value ? a : b;
    });

    results = results.map(function(result, ix) {
      var percent = 100 * result.value / max.value;
      return {
        name: result.name,
        value: result.value,
        percent: Math.ceil(percent * 10) / 10,
        color: colors[ix]
      };
    }).sort(function(a, b) {
      return a.value < b.value ? -1 : 1;
    });

    var svg = document.querySelector('.js-results');
    var ns = 'http://www.w3.org/2000/svg';
    results.forEach(function(result, ix) {
      var row = document.createElementNS(ns, 'rect');
      row.setAttribute('fill', result.color);
      row.setAttribute('width', result.percent + '%');
      row.setAttribute('height', 60);

      var text = document.createElementNS(ns, 'text');
      text.textContent = result.name + ': ' + result.value + 'ms ' + result.percent + '%';
      text.setAttribute('x', 10);
      text.setAttribute('y', 35);

      var group = document.createElementNS(ns, 'g');
      group.setAttribute('transform', 'translate(0, ' + 60 * ix + ')');

      group.appendChild(row);
      group.appendChild(text);
      svg.appendChild(group);
    });
  }

  function benchmark() {
    var fn = arguments[0];
    var args = Array.prototype.slice.call(arguments, 1);
    var start = performance.now();
    fn.apply(null, args);
    return Math.round(performance.now() - start);
  }

  function run() {
    var selectors = build(DEPTH);
    var deepest = document.querySelector(selectors[selectors.length - 1]);
    var results = [native, delegated, jquery, zepto, jqueryss].map(function(test) {
      var harness = test();
      var ready = harness.setup ? harness.setup() : Promise.resolve();
      return ready.then(function() {
        selectors.forEach(harness.on);
        var duration = benchmark(dispatch, deepest);
        selectors.forEach(harness.off);
        return {name: harness.name, value: duration};
      });
    });
    Promise.all(results).then(report);
  }

  run();
})();
