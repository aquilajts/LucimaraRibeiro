'use strict';

(function () {
    const globalScope = window;
    const namespace = globalScope.LR || (globalScope.LR = {});

    function initBirthdayCapture() {
        const body = document.body;
        if (!body || body.dataset.needsBirthday !== 'true') return;

        const modal = document.getElementById('birthday-modal');
        const form = document.getElementById('birthday-form');
        const input = document.getElementById('birthday-input');
        const errorEl = document.getElementById('birthday-error');
        const submitBtn = document.getElementById('birthday-submit');
        if (!modal || !form || !input || !submitBtn) return;

        const enforceMax = body.dataset.birthdayMax;
        if (enforceMax) input.max = enforceMax;

        const showModal = () => {
            modal.style.display = 'flex';
            modal.setAttribute('aria-hidden', 'false');
            body.classList.add('modal-open');
            setTimeout(() => input.focus(), 100);
        };

        showModal();

        const blockEscape = (event) => {
            if (event.key === 'Escape') {
                event.preventDefault();
                event.stopPropagation();
            }
        };

        document.addEventListener('keydown', blockEscape, true);

        modal.addEventListener('click', (event) => {
            if (event.target === modal) {
                event.preventDefault();
                event.stopPropagation();
            }
        });

        form.addEventListener('submit', async (event) => {
            event.preventDefault();
            if (!input.value) {
                if (errorEl) errorEl.textContent = 'Informe uma data válida.';
                input.focus();
                return;
            }

            if (errorEl) errorEl.textContent = '';
            const originalText = submitBtn.textContent;
            submitBtn.disabled = true;
            submitBtn.textContent = 'Salvando...';

            try {
                const response = await fetch('/api/cliente/aniversario', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ aniversario: input.value })
                });
                let result = {};
                try {
                    result = await response.json();
                } catch (parseError) {
                    console.error('Erro ao interpretar resposta do aniversário:', parseError);
                }
                if (!response.ok || !result.success) {
                    throw new Error(result.error || 'Não foi possível salvar.');
                }
                body.dataset.needsBirthday = 'false';
                modal.style.display = 'none';
                modal.setAttribute('aria-hidden', 'true');
                body.classList.remove('modal-open');
                document.removeEventListener('keydown', blockEscape, true);
            } catch (error) {
                console.error('Erro ao salvar aniversário:', error);
                if (errorEl) {
                    errorEl.textContent = error.message || 'Não foi possível salvar. Tente novamente.';
                }
            } finally {
                submitBtn.disabled = false;
                submitBtn.textContent = originalText;
            }
        });
    }

    function applyLoadingEffect(form) {
        form.addEventListener('submit', function (event) {
            const btn = this.querySelector('.btn:not(.btn-secondary)');
            if (btn && !event.defaultPrevented) {
                btn.dataset.originalText = btn.innerHTML;
                btn.innerHTML = '⏳ Carregando...';
                btn.disabled = true;
            }
        });
    }

    function resetButton(form) {
        const btn = form.querySelector('.btn');
        if (btn && btn.dataset.originalText) {
            btn.innerHTML = btn.dataset.originalText;
            btn.disabled = false;
        } else if (btn) {
            btn.innerHTML = 'Entrar / Cadastrar';
            btn.disabled = false;
        }
    }

    function initInputFocusEffects() {
        document.querySelectorAll('input, textarea, select').forEach(input => {
            input.addEventListener('focus', function () {
                if (this.parentElement) this.parentElement.style.transform = 'scale(1.02)';
            });
            input.addEventListener('blur', function () {
                if (this.parentElement) this.parentElement.style.transform = 'scale(1)';
            });
        });
    }

    namespace.initBirthdayCapture = initBirthdayCapture;
    namespace.applyLoadingEffect = applyLoadingEffect;
    namespace.resetButton = resetButton;
    namespace.initInputFocusEffects = initInputFocusEffects;

    document.addEventListener('DOMContentLoaded', () => {
        initBirthdayCapture();
        initInputFocusEffects();
    });
})();
