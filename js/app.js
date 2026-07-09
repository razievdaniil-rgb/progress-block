/* Demo app: wires the Value input and the Animate / Hide toggles
   to the Progress block API. */
(function () {
  'use strict';

  var progressRoot = document.getElementById('progress');
  var valueInput = document.getElementById('valueInput');
  var animateToggle = document.getElementById('animateToggle');
  var hideToggle = document.getElementById('hideToggle');

  var progress = new Progress(progressRoot, {
    value: Number(valueInput.value),
    animated: animateToggle.checked,
    hidden: hideToggle.checked
  });

  // Value: digits only, clamped to 0..100 while typing.
  valueInput.addEventListener('input', function () {
    var digits = valueInput.value.replace(/\D/g, '');
    if (digits !== '' && Number(digits) > 100) digits = '100';
    if (valueInput.value !== digits) valueInput.value = digits;
    progress.setValue(digits === '' ? 0 : Number(digits));
  });

  // Normalize the field when the user leaves it (empty -> current value).
  valueInput.addEventListener('change', function () {
    valueInput.value = String(progress.getValue());
  });

  animateToggle.addEventListener('change', function () {
    progress.setAnimated(animateToggle.checked);
  });

  hideToggle.addEventListener('change', function () {
    progress.setHidden(hideToggle.checked);
  });

  // Keep the controls in sync when the block is driven through its API
  // (e.g. from the developer console).
  progressRoot.addEventListener('progress:change', function (event) {
    var state = event.detail;
    if (document.activeElement !== valueInput) {
      valueInput.value = String(state.value);
    }
    animateToggle.checked = state.animated;
    hideToggle.checked = state.hidden;
  });

  // Public handle for driving the block from the console.
  window.progress = progress;
})();
