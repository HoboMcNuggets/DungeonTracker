(function () {
  const dialog = document.getElementById('confirm-dialog');
  const messageEl = document.getElementById('confirm-dialog-message');
  const okBtn = document.getElementById('confirm-dialog-ok');
  const cancelBtn = document.getElementById('confirm-dialog-cancel');

  let pendingResolve = null;

  function closeDialog(confirmed) {
    if (!pendingResolve) return;
    const resolve = pendingResolve;
    pendingResolve = null;
    dialog.close();
    resolve(confirmed);
  }

  okBtn.addEventListener('click', () => closeDialog(true));
  cancelBtn.addEventListener('click', () => closeDialog(false));

  dialog.addEventListener('cancel', (event) => {
    event.preventDefault();
    closeDialog(false);
  });

  dialog.addEventListener('close', () => {
    if (pendingResolve) closeDialog(false);
  });

  dialog.addEventListener('click', (event) => {
    if (event.target === dialog) closeDialog(false);
  });

  /**
   * @param {string} message
   * @returns {Promise<boolean>}
   */
  function showConfirm(message) {
    return new Promise((resolve) => {
      pendingResolve = resolve;
      messageEl.textContent = message;
      dialog.showModal();
      cancelBtn.focus();
    });
  }

  window.showConfirm = showConfirm;
})();
