// Демо: связывает контролы Value / Animate / Hide с API компонента Progress.
import { Progress } from './progress.js';

const root = document.getElementById('progress');
const valueInput = document.getElementById('valueInput');
const animateToggle = document.getElementById('animateToggle');
const hideToggle = document.getElementById('hideToggle');

const progress = new Progress(root, {
  value: Number(valueInput.value),
  animated: animateToggle.checked,
  hidden: hideToggle.checked,
});

// Value: только цифры, значение ограничивается диапазоном 0..100 при вводе.
valueInput.addEventListener('input', () => {
  let digits = valueInput.value.replace(/\D/g, '');
  if (digits !== '' && Number(digits) > 100) digits = '100';
  if (valueInput.value !== digits) valueInput.value = digits;
  progress.value = digits === '' ? 0 : Number(digits);
});

// Пустое поле нормализуется к текущему значению при потере фокуса.
valueInput.addEventListener('change', () => {
  valueInput.value = String(progress.value);
});

animateToggle.addEventListener('change', () => { progress.animated = animateToggle.checked; });
hideToggle.addEventListener('change', () => { progress.hidden = hideToggle.checked; });

// Держим контролы синхронными, когда блоком управляют через API (например, из консоли).
root.addEventListener('progress:change', ({ detail }) => {
  if (document.activeElement !== valueInput) valueInput.value = String(detail.value);
  animateToggle.checked = detail.animated;
  hideToggle.checked = detail.hidden;
});

// Доступ к экземпляру из консоли.
window.progress = progress;
