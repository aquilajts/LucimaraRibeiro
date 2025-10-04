console.log("Script loaded");

/* =========================
   MODAL ESQUECI SENHA
========================= */
// Abrir
function openForgotPasswordModal() {
    const modal = document.getElementById('forgotPasswordModal');
    if (modal) modal.style.display = 'flex';
}

// Fechar
function closeForgotPasswordModal() {
    const modal = document.getElementById('forgotPasswordModal');
    if (modal) modal.style.display = 'none';
}

// Fechar clicando fora
window.addEventListener('click', function (event) {
    const modal = document.getElementById('forgotPasswordModal');
    if (modal && event.target === modal) {
        modal.style.display = 'none';
    }
});

/* =========================
   EFEITOS VISUAIS
========================= */
document.querySelectorAll('input, textarea, select').forEach(input => {
    input.addEventListener('focus', function () {
        this.parentElement.style.transform = 'scale(1.02)';
    });
    input.addEventListener('blur', function () {
        this.parentElement.style.transform = 'scale(1)';
    });
});

/* =========================
   LOADING NOS BOTÕES
========================= */
function applyLoadingEffect(form) {
    form.addEventListener('submit', function (event) {
        const btn = this.querySelector('.btn:not(.btn-secondary)');
        if (btn && !event.defaultPrevented) {
            btn.dataset.originalText = btn.innerHTML;
            btn.innerHTML = this.action.includes('esqueci_senha') && document.getElementById('nova_senha') ? 'Redefinindo...' : '⏳ Carregando...';
            btn.disabled = true;
        }
    });
}

/* =========================
   VALIDAÇÃO FORMULÁRIOS
========================= */
document.addEventListener('DOMContentLoaded', function () {
    // LINK "Esqueci minha senha"
    const forgotLink = document.getElementById('forgotPasswordLink');
    if (forgotLink) {
        forgotLink.addEventListener('click', function(e) {
            e.preventDefault();
            openForgotPasswordModal();
        });
    }

    // LOGIN
    const loginForm = document.querySelector('form[action="/login"]');
    if (loginForm) {
        applyLoadingEffect(loginForm);
        loginForm.addEventListener('submit', function (event) {
            const nome = document.getElementById('nome').value.trim();
            const senha = document.getElementById('senha').value;

            if (nome === '') {
                event.preventDefault();
                alert('Por favor, preencha o campo Nome.');
                resetButton(this);
            } else if (senha.length < 6) {
                event.preventDefault();
                alert('A senha deve ter pelo menos 6 dígitos.');
                resetButton(this);
            }
        });
    }

    // ESQUECI SENHA (modal ou redefinição)
    const recuperarSenhaForm = document.querySelector('form[action="/esqueci_senha"]');
    if (recuperarSenhaForm) {
        applyLoadingEffect(recuperarSenhaForm);
        recuperarSenhaForm.addEventListener('submit', function(event) {
            const nomeField = document.getElementById('modal_nome');
            const aniversarioField = document.getElementById('modal_aniversario');
            const novaSenhaField = document.getElementById('nova_senha');

            // Etapa 1: Verificação de nome e aniversário (modal)
            if (nomeField && aniversarioField) {
                if (nomeField.value.trim() === '') {
                    event.preventDefault();
                    alert('Por favor, preencha o campo Nome.');
                    resetButton(this);
                    return;
                }
                if (!aniversarioField.value) {
                    event.preventDefault();
                    alert('Por favor, preencha a data de aniversário.');
                    resetButton(this);
                    return;
                }
            }

            // Etapa 2: Redefinição de senha
            if (novaSenhaField) {
                if (novaSenhaField.value.length < 6) {
                    event.preventDefault();
                    alert('A nova senha deve ter pelo menos 6 dígitos.');
                    resetButton(this, true);
                    return;
                }
            }
        });
    }
});

/* =========================
   FUNÇÃO AUXILIAR
========================= */
function resetButton(form, novaSenha = false) {
    const btn = form.querySelector('.btn');
    if (btn && btn.dataset.originalText) {
        btn.innerHTML = btn.dataset.originalText;
        btn.disabled = false;
    } else if (btn) {
        btn.innerHTML = novaSenha ? 'Redefinir Senha' : 'Verificar';
        btn.disabled = false;
    }
}
