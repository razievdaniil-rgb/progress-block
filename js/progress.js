// Значения опций по умолчанию — одним объектом, мёржатся со входными в конструкторе.
const DEFAULTS = {
  value: 0, // 0..100
  animated: false,
  hidden: false,
  size: 120, // px
  strokeWidth: 10, // толщина дуги в системе координат 120×120
  color: '#005dff',
  trackColor: '#eef3f6',
  rotatePeriod: '2s',
};

const SVG_NS = 'http://www.w3.org/2000/svg';
const STYLE_ID = 'progress-block-styles';
const VIEWBOX = 120;

const STYLES = `
.progress-block { display: inline-block; line-height: 0; }
.progress-block--hidden { visibility: hidden; }
.progress-block__svg {
  display: block;
  transform-origin: 50% 50%;
  animation: progress-block-rotate var(--progress-block-period, 2s) linear infinite;
  animation-play-state: paused;
}
.progress-block--animated .progress-block__svg { animation-play-state: running; }
.progress-block__arc { transition: stroke-dashoffset .35s ease; }
@keyframes progress-block-rotate { to { transform: rotate(1turn); } }
@media (prefers-reduced-motion: reduce) {
  .progress-block__svg { animation-duration: 8s; }
  .progress-block__arc { transition: none; }
}`;

function injectStyles() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = STYLES;
  document.head.append(style);
}

function svgEl(name, attrs) {
  const el = document.createElementNS(SVG_NS, name);
  for (const [key, value] of Object.entries(attrs)) el.setAttribute(key, value);
  return el;
}

function clamp(value) {
  const n = Number(value);
  return Number.isNaN(n) ? 0 : Math.min(100, Math.max(0, n));
}

/**
 * Кольцевой индикатор выполнения с тремя состояниями.
 *
 * Самодостаточен: сам подключает свои стили, поэтому для переиспользования
 * достаточно импортировать этот модуль.
 *
 *   import { Progress } from './progress.js';
 *   const progress = new Progress(root, { value: 60 });
 *   progress.value = 80;        // Normal: дуга от «12 часов» по часовой стрелке
 *   progress.animated = true;   // Animated: вращение по часовой стрелке
 *   progress.hidden = true;     // Hidden: скрыть блок со страницы
 *
 * Любое изменение состояния порождает всплывающее событие `progress:change`
 * с { value, animated, hidden } в detail.
 */
export class Progress {
  #root;
  #svg;
  #arc;
  #circumference;
  #value;
  #animated;
  #hidden;

  constructor(root, options = {}) {
    if (!(root instanceof Element)) {
      throw new TypeError('Progress: root должен быть DOM-элементом');
    }
    const opts = { ...DEFAULTS, ...options };
    injectStyles();

    const center = VIEWBOX / 2;
    const radius = (VIEWBOX - opts.strokeWidth) / 2;
    this.#circumference = 2 * Math.PI * radius;
    this.#root = root;

    this.#svg = svgEl('svg', {
      class: 'progress-block__svg',
      viewBox: `0 0 ${VIEWBOX} ${VIEWBOX}`,
      width: opts.size,
      height: opts.size,
      'aria-hidden': 'true',
    });
    this.#svg.style.setProperty('--progress-block-period', opts.rotatePeriod);

    const track = svgEl('circle', {
      class: 'progress-block__track',
      cx: center, cy: center, r: radius,
      fill: 'none', stroke: opts.trackColor, 'stroke-width': opts.strokeWidth,
    });
    this.#arc = svgEl('circle', {
      class: 'progress-block__arc',
      cx: center, cy: center, r: radius,
      fill: 'none', stroke: opts.color, 'stroke-width': opts.strokeWidth,
      'stroke-dasharray': this.#circumference,
      transform: `rotate(-90 ${center} ${center})`, // старт дуги — «12 часов»
    });
    this.#svg.append(track, this.#arc);

    this.#root.classList.add('progress-block');
    this.#root.setAttribute('role', 'progressbar');
    this.#root.setAttribute('aria-valuemin', '0');
    this.#root.setAttribute('aria-valuemax', '100');
    if (!this.#root.hasAttribute('aria-label')) this.#root.setAttribute('aria-label', 'Progress');
    this.#root.append(this.#svg);

    this.value = opts.value;
    this.animated = opts.animated;
    this.hidden = opts.hidden;
  }

  /** Normal: размер дуги. Значения вне 0..100 приводятся к границам. */
  get value() {
    return this.#value;
  }

  set value(next) {
    this.#value = clamp(next);
    this.#arc.style.strokeDashoffset = this.#circumference * (1 - this.#value / 100);
    this.#root.setAttribute('aria-valuenow', String(this.#value));
    this.#emitChange();
  }

  /** Animated: вращение по часовой стрелке; пауза замораживает его на месте. */
  get animated() {
    return this.#animated;
  }

  set animated(next) {
    this.#animated = Boolean(next);
    this.#root.classList.toggle('progress-block--animated', this.#animated);
    this.#emitChange();
  }

  /** Hidden: скрывает блок со страницы. */
  get hidden() {
    return this.#hidden;
  }

  set hidden(next) {
    this.#hidden = Boolean(next);
    this.#root.classList.toggle('progress-block--hidden', this.#hidden);
    this.#root.setAttribute('aria-hidden', String(this.#hidden));
    this.#emitChange();
  }

  /** Удаляет блок из DOM и снимает атрибуты с корневого элемента. */
  destroy() {
    this.#root.classList.remove('progress-block', 'progress-block--animated', 'progress-block--hidden');
    for (const attr of ['role', 'aria-valuemin', 'aria-valuemax', 'aria-valuenow', 'aria-hidden']) {
      this.#root.removeAttribute(attr);
    }
    this.#svg.remove();
  }

  #emitChange() {
    this.#root.dispatchEvent(new CustomEvent('progress:change', {
      bubbles: true,
      detail: { value: this.#value, animated: this.#animated, hidden: this.#hidden },
    }));
  }
}
