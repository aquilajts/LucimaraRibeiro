console.log("Script loaded");

/* =========================
   MODAL ESQUECI SENHA
========================= */
// Abrir
function openForgotPasswordModal() {
    const modal = document.getElementById('forgotPasswordModal');
    if (modal) {
        modal.style.display = 'flex';
        const nomeField = document.getElementById('modal_nome');
        const aniversarioField = document.getElementById('modal_aniversario');
        const novaSenhaField = document.getElementById('nova_senha');
        const novaSenhaGroup = document.getElementById('novaSenhaGroup');
        const submitBtn = document.getElementById('submitBtn');
        if (nomeField && aniversarioField) {
            nomeField.value = '';
            aniversarioField.value = '';
        }
        if (novaSenhaField) novaSenhaField.removeAttribute('required');
        if (novaSenhaGroup) novaSenhaGroup.style.display = 'none';
        if (submitBtn) submitBtn.textContent = 'Verificar';
    }
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
            btn.innerHTML = '⏳ Carregando...';
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

    // ESQUECI SENHA (modal)
    const forgotPasswordForm = document.getElementById('forgotPasswordForm');
    if (forgotPasswordForm) {
        applyLoadingEffect(forgotPasswordForm);
        forgotPasswordForm.addEventListener('submit', function(event) {
            event.preventDefault(); // Prevenir submit padrão
            const nomeField = document.getElementById('modal_nome');
            const aniversarioField = document.getElementById('modal_aniversario');
            const novaSenhaField = document.getElementById('nova_senha');
            const novaSenhaGroup = document.getElementById('novaSenhaGroup');
            const submitBtn = document.getElementById('submitBtn');

            if (nomeField && aniversarioField && !novaSenhaField.value) {
                // Etapa 1: Verificação de nome e aniversário
                if (nomeField.value.trim() === '') {
                    alert('Por favor, preencha o campo Nome.');
                    resetButton(this);
                    return;
                }
                if (!aniversarioField.value) {
                    alert('Por favor, preencha a data de aniversário.');
                    resetButton(this);
                    return;
                }
                // Enviar requisição AJAX para validação
                fetch('/esqueci_senha', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                    body: new URLSearchParams({
                        'nome': nomeField.value.trim().toLowerCase(),
                        'aniversario': aniversarioField.value
                    })
                })
                .then(response => response.json())
                .then(data => {
                    if (data.success) {
                        // Sucesso: mostrar campo de nova senha
                        nomeField.readOnly = true;
                        novaSenhaGroup.style.display = 'block';
                        novaSenhaField.setAttribute('required', 'required');
                        submitBtn.textContent = 'Redefinir Senha';
                        resetButton(forgotPasswordForm);
                    } else {
                        alert(data.error || 'Erro ao validar os dados.');
                        resetButton(forgotPasswordForm);
                    }
                })
                .catch(error => {
                    alert('Erro na conexão com o servidor.');
                    resetButton(forgotPasswordForm);
                });
            } else if (novaSenhaField) {
                // Etapa 2: Redefinição de senha
                if (novaSenhaField.value.length < 6) {
                    event.preventDefault();
                    alert('A nova senha deve ter pelo menos 6 dígitos.');
                    resetButton(this, true);
                    return;
                }
                // Enviar formulário completo
                this.submit();
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
