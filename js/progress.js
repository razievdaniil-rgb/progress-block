/**
 * Progress — reusable circular progress block.
 *
 * Zero dependencies. Injects its own styles, so a single <script> tag
 * is enough to reuse the component in another app:
 *
 *   const progress = new Progress(document.getElementById('root'), { value: 60 });
 *   progress.setValue(80);       // Normal state: arc from 12 o'clock, clockwise
 *   progress.setAnimated(true);  // Animated state: block rotates clockwise
 *   progress.setHidden(true);    // Hidden state: block is removed from view
 *
 * Every state change dispatches a bubbling `progress:change` CustomEvent
 * on the root element with { value, animated, hidden } in `detail`.
 */
(function (global) {
  'use strict';

  var SVG_NS = 'http://www.w3.org/2000/svg';
  var STYLE_ID = 'progress-block-styles';

  var CSS = [
    '.progress-block { display: inline-block; line-height: 0; }',
    '.progress-block--hidden { visibility: hidden; }',
    '.progress-block__svg { display: block; transform-origin: 50% 50%; }',
    '.progress-block--animated .progress-block__svg {',
    '  animation: progress-block-rotate var(--progress-block-period, 2s) linear infinite;',
    '}',
    '@keyframes progress-block-rotate { to { transform: rotate(1turn); } }',
    '@media (prefers-reduced-motion: reduce) {',
    '  .progress-block--animated .progress-block__svg { animation-duration: 8s; }',
    '}'
  ].join('\n');

  function injectStylesOnce() {
    if (document.getElementById(STYLE_ID)) return;
    var style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = CSS;
    document.head.appendChild(style);
  }

  function clampValue(value) {
    var n = Number(value);
    if (isNaN(n)) return 0;
    return Math.min(100, Math.max(0, n));
  }

  function svgEl(name, attrs) {
    var el = document.createElementNS(SVG_NS, name);
    for (var key in attrs) el.setAttribute(key, attrs[key]);
    return el;
  }

  /**
   * @param {HTMLElement} root      Container the block is rendered into.
   * @param {Object}      [options]
   * @param {number}      [options.value=0]        Progress, 0..100.
   * @param {boolean}     [options.animated=false] Start in the Animated state.
   * @param {boolean}     [options.hidden=false]   Start in the Hidden state.
   * @param {number}      [options.size=120]       Rendered size, px.
   * @param {number}      [options.strokeWidth=10] Arc thickness, px (in 120px scale).
   * @param {string}      [options.color='#005DFF']      Arc color.
   * @param {string}      [options.trackColor='#EEF3F6'] Track ring color.
   */
  function Progress(root, options) {
    if (!root || root.nodeType !== 1) {
      throw new TypeError('Progress: root must be a DOM element');
    }
    options = options || {};

    injectStylesOnce();

    var viewBox = 120;
    var strokeWidth = options.strokeWidth > 0 ? Number(options.strokeWidth) : 10;
    var radius = (viewBox - strokeWidth) / 2;

    this._root = root;
    this._circumference = 2 * Math.PI * radius;
    this._value = 0;
    this._animated = false;
    this._hidden = false;

    var size = options.size > 0 ? Number(options.size) : 120;
    var center = viewBox / 2;

    this._svg = svgEl('svg', {
      viewBox: '0 0 ' + viewBox + ' ' + viewBox,
      width: size,
      height: size,
      'aria-hidden': 'true'
    });
    this._svg.setAttribute('class', 'progress-block__svg');

    var track = svgEl('circle', {
      cx: center,
      cy: center,
      r: radius,
      fill: 'none',
      stroke: options.trackColor || '#EEF3F6',
      'stroke-width': strokeWidth
    });

    this._arc = svgEl('circle', {
      cx: center,
      cy: center,
      r: radius,
      fill: 'none',
      stroke: options.color || '#005DFF',
      'stroke-width': strokeWidth,
      'stroke-dasharray': this._circumference,
      'stroke-dashoffset': this._circumference,
      // Start of the arc corresponds to 12 o'clock, the end moves clockwise.
      transform: 'rotate(-90 ' + center + ' ' + center + ')'
    });

    this._svg.appendChild(track);
    this._svg.appendChild(this._arc);

    root.classList.add('progress-block');
    root.setAttribute('role', 'progressbar');
    root.setAttribute('aria-valuemin', '0');
    root.setAttribute('aria-valuemax', '100');
    if (!root.hasAttribute('aria-label')) root.setAttribute('aria-label', 'Progress');
    root.appendChild(this._svg);

    this.setValue(options.value !== undefined ? options.value : 0);
    this.setAnimated(Boolean(options.animated));
    this.setHidden(Boolean(options.hidden));
  }

  /** Normal state: sets the arc size. Accepts 0..100, other input is clamped. */
  Progress.prototype.setValue = function (value) {
    this._value = clampValue(value);
    var offset = this._circumference * (1 - this._value / 100);
    this._arc.setAttribute('stroke-dashoffset', offset);
    this._root.setAttribute('aria-valuenow', String(this._value));
    this._emitChange();
    return this;
  };

  Progress.prototype.getValue = function () {
    return this._value;
  };

  /** Animated state: the block rotates clockwise. Independent of value. */
  Progress.prototype.setAnimated = function (animated) {
    this._animated = Boolean(animated);
    this._root.classList.toggle('progress-block--animated', this._animated);
    this._emitChange();
    return this;
  };

  Progress.prototype.isAnimated = function () {
    return this._animated;
  };

  /** Hidden state: hides the block from the page. */
  Progress.prototype.setHidden = function (hidden) {
    this._hidden = Boolean(hidden);
    this._root.classList.toggle('progress-block--hidden', this._hidden);
    this._root.setAttribute('aria-hidden', String(this._hidden));
    this._emitChange();
    return this;
  };

  Progress.prototype.isHidden = function () {
    return this._hidden;
  };

  /** Removes the block from the DOM and detaches it from the root element. */
  Progress.prototype.destroy = function () {
    if (!this._svg) return;
    this._root.classList.remove(
      'progress-block',
      'progress-block--animated',
      'progress-block--hidden'
    );
    this._root.removeAttribute('role');
    this._root.removeAttribute('aria-valuemin');
    this._root.removeAttribute('aria-valuemax');
    this._root.removeAttribute('aria-valuenow');
    this._root.removeAttribute('aria-hidden');
    this._svg.remove();
    this._svg = this._arc = this._root = null;
  };

  Progress.prototype._emitChange = function () {
    this._root.dispatchEvent(
      new CustomEvent('progress:change', {
        bubbles: true,
        detail: {
          value: this._value,
          animated: this._animated,
          hidden: this._hidden
        }
      })
    );
  };

  // Convenience accessors: progress.value = 50; progress.animated = true; ...
  Object.defineProperties(Progress.prototype, {
    value: {
      get: function () { return this.getValue(); },
      set: function (v) { this.setValue(v); }
    },
    animated: {
      get: function () { return this.isAnimated(); },
      set: function (v) { this.setAnimated(v); }
    },
    hidden: {
      get: function () { return this.isHidden(); },
      set: function (v) { this.setHidden(v); }
    }
  });

  global.Progress = Progress;
})(window);
