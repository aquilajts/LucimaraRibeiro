console.log("Script loaded");

// Função para abrir o modal de recuperação de senha
function openForgotPasswordModal() {
    document.getElementById('forgotPasswordModal').style.display = 'block';
}

// Função para fechar o modal de recuperação de senha
function closeForgotPasswordModal() {
    document.getElementById('forgotPasswordModal').style.display = 'none';
}

// Fecha modal ao clicar fora dele
window.onclick = function(event) {
    const modal = document.getElementById('forgotPasswordModal');
    if (event.target == modal) {
        modal.style.display = 'none';
    }
}

// Adiciona efeitos visuais aos inputs
document.querySelectorAll('input, textarea, select').forEach(input => {
    input.addEventListener('focus', function() {
        this.parentElement.style.transform = 'scale(1.02)';
    });
    
    input.addEventListener('blur', function() {
        this.parentElement.style.transform = 'scale(1)';
    });
});

// Animação de loading no botão
document.querySelectorAll('form').forEach(form => {
    form.addEventListener('submit', function() {
        const btn = this.querySelector('.btn:not(.btn-secondary)');
        if (btn) {
            btn.innerHTML = '⏳ Carregando...';
            btn.disabled = true;
        }
    });
});

// Validação no lado do cliente para formulários
document.addEventListener('DOMContentLoaded', function() {
    const loginForm = document.querySelector('form[action="/login"]');
    if (loginForm) {
        loginForm.addEventListener('submit', function(event) {
            const nome = document.getElementById('nome').value.trim();
            const senha = document.getElementById('senha').value;
            if (nome === '') {
                event.preventDefault();
                alert('Por favor, preencha o campo Nome.');
                const btn = this.querySelector('.btn');
                btn.innerHTML = 'Entrar / Cadastrar';
                btn.disabled = false;
            } else if (senha.length < 6) {
                event.preventDefault();
                alert('A senha deve ter pelo menos 6 dígitos.');
                const btn = this.querySelector('.btn');
                btn.innerHTML = 'Entrar / Cadastrar';
                btn.disabled = false;
            }
        });
    }

    const recuperarSenhaForm = document.querySelector('form[action="/esqueci_senha"]');
    if (recuperarSenhaForm) {
        recuperarSenhaForm.addEventListener('submit', function(event) {
            const nome = document.getElementById('modal_nome')?.value.trim();
            const aniversario = document.getElementById('modal_aniversario')?.value;
            const novaSenha = document.getElementById('nova_senha')?.value;
            if (nome && nome === '') {
                event.preventDefault();
                alert('Por favor, preencha o campo Nome.');
                const btn = this.querySelector('.btn');
                btn.innerHTML = novaSenha ? 'Redefinir Senha' : 'Verificar';
                btn.disabled = false;
            } else if (aniversario && !aniversario) {
                event.preventDefault();
                alert('Por favor, preencha a data de aniversário.');
                const btn = this.querySelector('.btn');
                btn.innerHTML = novaSenha ? 'Redefinir Senha' : 'Verificar';
                btn.disabled = false;
            } else if (novaSenha && novaSenha.length < 6) {
                event.preventDefault();
                alert('A nova senha deve ter pelo menos 6 dígitos.');
                const btn = this.querySelector('.btn');
                btn.innerHTML = 'Redefinir Senha';
                btn.disabled = false;
            }
        });
    }
});
