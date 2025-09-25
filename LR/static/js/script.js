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
document.querySelectorAll('form').forEach(form => {
    form.addEventListener('submit', function () {
        const btn = this.querySelector('.btn:not(.btn-secondary)');
        if (btn) {
            btn.dataset.originalText = btn.innerHTML;
            btn.innerHTML = '⏳ Carregando...';
            btn.disabled = true;
        }
    });
});

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
        recuperarSenhaForm.addEventListener('submit', function(event) {
            const nomeField = document.getElementById('modal_nome');
            const aniversarioField = document.getElementById('modal_aniversario');
            const novaSenhaField = document.getElementById('nova_senha');

            // Etapa 1: nome + aniversário
            if (nomeField) {
                if (nomeField.value.trim() === '') {
                    event.preventDefault();
                    alert('Por favor, preencha o campo Nome.');
                    return;
                }
            }
            if (aniversarioField) {
                if (!aniversarioField.value) {
                    event.preventDefault();
                    alert('Por favor, preencha a data de aniversário.');
                    return;
                }
            }

            // Etapa 2: nova senha
            if (novaSenhaField) {
                if (novaSenhaField.value.length < 6) {
                    event.preventDefault();
                    alert('A nova senha deve ter pelo menos 6 dígitos.');
                    return;
                }
            }

            // Se passar em todas as validações, botão mostra carregando
            const btn = this.querySelector('.btn');
            if (btn) {
                btn.innerHTML = novaSenhaField ? 'Redefinindo...' : '⏳ Carregando...';
                btn.disabled = true;
            }
        });
    }

});

/* =========================
   FUNÇÃO AUXILIAR
========================= */
function resetButton(form, novaSenha = null) {
    const btn = form.querySelector('.btn');
    if (btn && btn.dataset.originalText) {
        btn.innerHTML = btn.dataset.originalText;
        btn.disabled = false;
    } else if (btn) {
        // fallback caso não tenha dataset salvo
        btn.innerHTML = novaSenha ? 'Redefinir Senha' : 'Verificar';
        btn.disabled = false;
    }
}
