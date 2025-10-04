console.log("Script loaded");

/* =========================
   MODAL ESQUECI SENHA
========================= */
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

function closeForgotPasswordModal() {
    const modal = document.getElementById('forgotPasswordModal');
    if (modal) modal.style.display = 'none';
}

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
            event.preventDefault();
            const nomeField = document.getElementById('modal_nome');
            const aniversarioField = document.getElementById('modal_aniversario');
            const novaSenhaField = document.getElementById('nova_senha');
            const novaSenhaGroup = document.getElementById('novaSenhaGroup');
            const submitBtn = document.getElementById('submitBtn');

            if (nomeField && aniversarioField && !novaSenhaField.value) {
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
                        nomeField.readOnly = true;
                        aniversarioField.readOnly = true;
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
                if (novaSenhaField.value.length < 6) {
                    event.preventDefault();
                    alert('A nova senha deve ter pelo menos 6 dígitos.');
                    resetButton(this, true);
                    return;
                }
                this.submit();
            }
        });
    }

    // AGENDAMENTO
    const agendamentoForm = document.getElementById('agendamento-form');
    if (agendamentoForm) {
        applyLoadingEffect(agendamentoForm);
        const categoriaSelect = document.getElementById('categoria');
        const servicoGroup = document.getElementById('servico-group');
        const servicoSelect = document.getElementById('servico');
        const profissionalGroup = document.getElementById('profissional-group');
        const profissionalSelect = document.getElementById('profissional');
        const dataGroup = document.getElementById('data-group');
        const dataInput = document.getElementById('data');
        const horaGroup = document.getElementById('hora-group');
        const horaSelect = document.getElementById('hora');
        const submitBtn = agendamentoForm.querySelector('.btn');

        // Carregar categorias
        fetch('/api/categorias')
            .then(res => res.json())
            .then(data => {
                data.forEach(cat => {
                    const option = document.createElement('option');
                    option.value = cat;
                    option.textContent = cat;
                    categoriaSelect.appendChild(option);
                });
            })
            .catch(err => console.error('Erro ao carregar categorias:', err));

        // Carregar serviços por categoria
        categoriaSelect.addEventListener('change', () => {
            const categoria = categoriaSelect.value;
            servicoSelect.innerHTML = '<option value="">-- Escolha um Serviço --</option>';
            profissionalGroup.style.display = 'none';
            dataGroup.style.display = 'none';
            horaGroup.style.display = 'none';
            submitBtn.disabled = true;

            if (categoria) {
                fetch(`/api/servicos?categoria=${encodeURIComponent(categoria)}`)
                    .then(res => res.json())
                    .then(data => {
                        data.forEach(servico => {
                            const option = document.createElement('option');
                            option.value = servico.id_servico;
                            option.textContent = `${servico.nome} (${servico.duracao_minutos} min)`;
                            servicoSelect.appendChild(option);
                        });
                        servicoGroup.style.display = 'block';
                    })
                    .catch(err => console.error('Erro ao carregar serviços:', err));
            } else {
                servicoGroup.style.display = 'none';
            }
        });

        // Carregar profissionais por serviço
        servicoSelect.addEventListener('change', () => {
            const idServico = servicoSelect.value;
            profissionalSelect.innerHTML = '<option value="">-- Escolha um Profissional --</option>';
            dataGroup.style.display = 'none';
            horaGroup.style.display = 'none';
            submitBtn.disabled = true;

            if (idServico) {
                fetch(`/api/profissionais/${idServico}`)
                    .then(res => res.json())
                    .then(data => {
                        data.forEach(prof => {
                            const option = document.createElement('option');
                            option.value = prof.id_profissional;
                            option.textContent = prof.nome;
                            profissionalSelect.appendChild(option);
                        });
                        profissionalGroup.style.display = 'block';
                    })
                    .catch(err => console.error('Erro ao carregar profissionais:', err));
            } else {
                profissionalGroup.style.display = 'none';
            }
        });

        // Mostrar campo de data
        profissionalSelect.addEventListener('change', () => {
            if (profissionalSelect.value) {
                dataGroup.style.display = 'block';
            } else {
                dataGroup.style.display = 'none';
                horaGroup.style.display = 'none';
                submitBtn.disabled = true;
            }
        });

        // Carregar horários disponíveis
        dataInput.addEventListener('change', () => {
            const idProfissional = profissionalSelect.value;
            const data = dataInput.value;
            const idServico = servicoSelect.value;
            horaSelect.innerHTML = '<option value="">-- Escolha um Horário --</option>';
            submitBtn.disabled = true;

            if (idProfissional && data && idServico) {
                fetch(`/api/horarios_disponiveis/${idProfissional}/${data}/${idServico}`)
                    .then(res => res.json())
                    .then(data => {
                        data.forEach(hora => {
                            const option = document.createElement('option');
                            option.value = hora;
                            option.textContent = hora;
                            horaSelect.appendChild(option);
                        });
                        horaGroup.style.display = 'block';
                    })
                    .catch(err => console.error('Erro ao carregar horários:', err));
            } else {
                horaGroup.style.display = 'none';
            }
        });

        // Habilitar botão ao selecionar hora
        horaSelect.addEventListener('change', () => {
            submitBtn.disabled = !horaSelect.value;
        });

        // Validação e submissão do formulário
        agendamentoForm.addEventListener('submit', function(event) {
            event.preventDefault();
            const categoria = categoriaSelect.value;
            const idServico = servicoSelect.value;
            const idProfissional = profissionalSelect.value;
            const data = dataInput.value;
            const hora = horaSelect.value;

            if (!categoria || !idServico || !idProfissional || !data || !hora) {
                alert('Por favor, preencha todos os campos obrigatórios.');
                resetButton(this);
                return;
            }

            const formData = new FormData(this);
            fetch('/api/agendar', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(Object.fromEntries(formData))
            })
                .then(res => res.json())
                .then(data => {
                    if (data.success) {
                        window.location.href = '/agendamento?msg=Agendamento realizado com sucesso!';
                    } else {
                        alert(data.error || 'Erro ao agendar.');
                        resetButton(this);
                    }
                })
                .catch(err => {
                    alert('Erro na conexão com o servidor.');
                    resetButton(this);
                });
        });
    });
});
