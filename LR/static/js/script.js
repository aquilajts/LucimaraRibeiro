console.log("Script loaded");

/* =========================
   MODAL ESQUECI SENHA
========================= */
// Abrir
function openForgotPasswordModal() {
    document.getElementById('forgotPasswordModal').style.display = 'flex';
}
// Fechar
function closeForgotPasswordModal() {
    document.getElementById('forgotPasswordModal').style.display = 'none';
}
// Fechar clicando fora
window.onclick = function (event) {
    const modal = document.getElementById('forgotPasswordModal');
    if (event.target === modal) {
        modal.style.display = 'none';
    }
};

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
    const recuperarSenhaForms = document.querySelectorAll('form[action="/esqueci_senha"]');
    recuperarSenhaForms.forEach(form => {
        form.addEventListener('submit', function (event) {
            const nome = document.getElementById('modal_nome')?.value.trim();
            const aniversario = document.getElementById('modal_aniversario')?.value;
            const novaSenha = document.getElementById('nova_senha')?.value;

            if (nome !== undefined && nome === '') {
                event.preventDefault();
                alert('Por favor, preencha o campo Nome.');
                resetButton(this, novaSenha);
            } else if (aniversario !== undefined && aniversario === '') {
                event.preventDefault();
                alert('Por favor, preencha a data de aniversário.');
                resetButton(this, novaSenha);
            } else if (novaSenha !== undefined && novaSenha.length < 6) {
                event.preventDefault();
                alert('A nova senha deve ter pelo menos 6 dígitos.');
                resetButton(this, novaSenha);
            }
        });
    });
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
