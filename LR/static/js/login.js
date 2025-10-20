'use strict';

(function () {
    function initLoginForm() {
        const loginForm = document.querySelector('form[action="/login"]');
        if (!loginForm) return;

        const utils = window.LR || {};
        const applyLoadingEffect = typeof utils.applyLoadingEffect === 'function' ? utils.applyLoadingEffect : () => {};
        const resetButton = typeof utils.resetButton === 'function' ? utils.resetButton : () => {};

        applyLoadingEffect(loginForm);

        loginForm.addEventListener('submit', function (event) {
            const stageField = this.querySelector('input[name="stage"]');
            const stage = stageField ? stageField.value || 'phone' : 'phone';
            if (stage !== 'phone') {
                return;
            }
            const nomeInput = document.getElementById('nome');
            const nome = nomeInput ? nomeInput.value.trim() : '';
            const dddInput = document.getElementById('ddd');
            const telefoneInput = document.getElementById('telefone');
            const dddDigits = dddInput ? (dddInput.value || '').replace(/\D/g, '') : '';
            const telefoneDigits = telefoneInput ? (telefoneInput.value || '').replace(/\D/g, '') : '';

            if (!nome) {
                event.preventDefault();
                alert('Por favor, preencha o campo Nome.');
                resetButton(this);
            } else if (dddDigits.length !== 2) {
                event.preventDefault();
                alert('Informe um DDD valido com 2 digitos.');
                resetButton(this);
            } else if (telefoneDigits.length !== 9) {
                event.preventDefault();
                alert('Informe um telefone valido com 9 digitos.');
                resetButton(this);
            }
        });
    }

    document.addEventListener('DOMContentLoaded', initLoginForm);
})();
