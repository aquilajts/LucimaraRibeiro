console.log("Script loaded");

/* =========================
   MODAL ESQUECI SENHA
========================= */
function openForgotPasswordModal() {
    console.log("Abrindo modal de esqueci senha");
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
    } else {
        console.error("Modal 'forgotPasswordModal' não encontrado");
    }
}

function closeForgotPasswordModal() {
    console.log("Fechando modal de esqueci senha");
    const modal = document.getElementById('forgotPasswordModal');
    if (modal) modal.style.display = 'none';
    else console.error("Modal 'forgotPasswordModal' não encontrado");
}

window.addEventListener('click', function (event) {
    const modal = document.getElementById('forgotPasswordModal');
    if (modal && event.target === modal) {
        console.log("Clicou fora do modal, fechando");
        modal.style.display = 'none';
    }
});

/* =========================
   EFEITOS VISUAIS
========================= */
document.querySelectorAll('input, textarea, select').forEach(input => {
    input.addEventListener('focus', function () {
        console.log(`Foco no input: ${this.id}`);
        this.parentElement.style.transform = 'scale(1.02)';
    });
    input.addEventListener('blur', function () {
        console.log(`Desfoco do input: ${this.id}`);
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
            console.log(`Botão de submit clicado no form: ${form.id || form.action}`);
            btn.dataset.originalText = btn.innerHTML;
            btn.innerHTML = '⏳ Carregando...';
            btn.disabled = true;
        }
    });
}

function resetButton(form, novaSenha = false) {
    const btn = form.querySelector('.btn');
    if (btn && btn.dataset.originalText) {
        console.log(`Restaurando botão do form: ${form.id || form.action}`);
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
    console.log("DOM carregado, iniciando configurações");

    // LINK "Esqueci minha senha"
    const forgotLink = document.getElementById('forgotPasswordLink');
    if (forgotLink) {
        forgotLink.addEventListener('click', function(e) {
            e.preventDefault();
            console.log("Clicou em 'Esqueci minha senha'");
            openForgotPasswordModal();
        });
    } else {
        console.warn("Link 'forgotPasswordLink' não encontrado");
    }

    // LOGIN
    const loginForm = document.querySelector('form[action="/login"]');
    if (loginForm) {
        console.log("Configurando form de login");
        applyLoadingEffect(loginForm);
        loginForm.addEventListener('submit', function (event) {
            const nome = document.getElementById('nome')?.value.trim();
            const senha = document.getElementById('senha')?.value;

            console.log(`Tentativa de login - Nome: ${nome}`);
            if (!nome) {
                event.preventDefault();
                console.error("Campo nome vazio");
                alert('Por favor, preencha o campo Nome.');
                resetButton(this);
            } else if (senha.length < 6) {
                event.preventDefault();
                console.error("Senha menor que 6 dígitos");
                alert('A senha deve ter pelo menos 6 dígitos.');
                resetButton(this);
            }
        });
    } else {
        console.warn("Form de login não encontrado");
    }

    // ESQUECI SENHA (modal)
    const forgotPasswordForm = document.getElementById('forgotPasswordForm');
    if (forgotPasswordForm) {
        console.log("Configurando form de esqueci senha");
        applyLoadingEffect(forgotPasswordForm);
        forgotPasswordForm.addEventListener('submit', function(event) {
            event.preventDefault();
            const nomeField = document.getElementById('modal_nome');
            const aniversarioField = document.getElementById('modal_aniversario');
            const novaSenhaField = document.getElementById('nova_senha');
            const novaSenhaGroup = document.getElementById('novaSenhaGroup');
            const submitBtn = document.getElementById('submitBtn');

            console.log("Submetendo form de esqueci senha");
            if (nomeField && aniversarioField && !novaSenhaField.value) {
                if (nomeField.value.trim() === '') {
                    console.error("Campo nome vazio no modal");
                    alert('Por favor, preencha o campo Nome.');
                    resetButton(this);
                    return;
                }
                if (!aniversarioField.value) {
                    console.error("Campo aniversário vazio no modal");
                    alert('Por favor, preencha a data de aniversário.');
                    resetButton(this);
                    return;
                }
                console.log(`Enviando validação - Nome: ${nomeField.value}, Aniversário: ${aniversarioField.value}`);
                fetch('/esqueci_senha', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                    body: new URLSearchParams({
                        'nome': nomeField.value.trim().toLowerCase(),
                        'aniversario': aniversarioField.value
                    })
                })
                .then(response => {
                    console.log(`Resposta de /esqueci_senha: ${response.status}`);
                    return response.json();
                })
                .then(data => {
                    console.log("Dados recebidos de /esqueci_senha:", data);
                    if (data.success) {
                        console.log("Validação bem-sucedida, mostrando campo de nova senha");
                        nomeField.readOnly = true;
                        aniversarioField.readOnly = true;
                        novaSenhaGroup.style.display = 'block';
                        novaSenhaField.setAttribute('required', 'required');
                        submitBtn.textContent = 'Redefinir Senha';
                        resetButton(forgotPasswordForm);
                    } else {
                        console.error("Erro na validação:", data.error);
                        alert(data.error || 'Erro ao validar os dados.');
                        resetButton(forgotPasswordForm);
                    }
                })
                .catch(error => {
                    console.error("Erro na requisição /esqueci_senha:", error);
                    alert('Erro na conexão com o servidor.');
                    resetButton(forgotPasswordForm);
                });
            } else if (novaSenhaField) {
                if (novaSenhaField.value.length < 6) {
                    console.error("Nova senha muito curta");
                    event.preventDefault();
                    alert('A nova senha deve ter pelo menos 6 dígitos.');
                    resetButton(this, true);
                    return;
                }
                console.log("Submetendo nova senha");
                this.submit();
            }
        });
    } else {
        console.warn("Form de esqueci senha não encontrado");
    }

    // AGENDAMENTO
    const agendamentoForm = document.getElementById('agendamento-form');
    if (agendamentoForm) {
        console.log("Configurando form de agendamento");
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
        console.log("Carregando categorias via /api/categorias");
        fetch('/api/categorias')
            .then(res => {
                console.log(`Resposta de /api/categorias: ${res.status}`);
                return res.json();
            })
            .then(data => {
                console.log("Categorias recebidas:", data);
                if (data.length === 0) {
                    console.warn("Nenhuma categoria retornada");
                    alert("Nenhuma categoria disponível. Contate o suporte.");
                    return;
                }
                data.forEach(cat => {
                    const option = document.createElement('option');
                    option.value = cat;
                    option.textContent = cat;
                    categoriaSelect.appendChild(option);
                });
                categoriaSelect.disabled = false;
            })
            .catch(err => {
                console.error("Erro ao carregar categorias:", err);
                alert("Erro ao carregar categorias. Tente novamente.");
            });

        // Carregar serviços por categoria
        categoriaSelect.addEventListener('change', () => {
            const categoria = categoriaSelect.value;
            console.log(`Categoria selecionada: ${categoria}`);
            servicoSelect.innerHTML = '<option value="">-- Escolha um Serviço --</option>';
            profissionalGroup.style.display = 'none';
            dataGroup.style.display = 'none';
            horaGroup.style.display = 'none';
            submitBtn.disabled = true;

            if (categoria) {
                console.log(`Carregando serviços para categoria: ${categoria}`);
                fetch(`/api/servicos?categoria=${encodeURIComponent(categoria)}`)
                    .then(res => {
                        console.log(`Resposta de /api/servicos: ${res.status}`);
                        return res.json();
                    })
                    .then(data => {
                        console.log("Serviços recebidos:", data);
                        if (data.length === 0) {
                            console.warn("Nenhum serviço retornado para categoria:", categoria);
                            alert("Nenhum serviço disponível para esta categoria.");
                            return;
                        }
                        data.forEach(servico => {
                            const option = document.createElement('option');
                            option.value = servico.id_servico;
                            option.textContent = `${servico.nome} (${servico.duracao_minutos} min)`;
                            servicoSelect.appendChild(option);
                        });
                        servicoGroup.style.display = 'block';
                    })
                    .catch(err => {
                        console.error("Erro ao carregar serviços:", err);
                        alert("Erro ao carregar serviços. Tente novamente.");
                    });
            } else {
                servicoGroup.style.display = 'none';
            }
        });

        // Carregar profissionais por serviço
        servicoSelect.addEventListener('change', () => {
            const idServico = servicoSelect.value;
            console.log(`Serviço selecionado: ${idServico}`);
            profissionalSelect.innerHTML = '<option value="">-- Escolha um Profissional --</option>';
            dataGroup.style.display = 'none';
            horaGroup.style.display = 'none';
            submitBtn.disabled = true;

            if (idServico) {
                console.log(`Carregando profissionais para serviço: ${idServico}`);
                fetch(`/api/profissionais/${idServico}`)
                    .then(res => {
                        console.log(`Resposta de /api/profissionais: ${res.status}`);
                        return res.json();
                    })
                    .then(data => {
                        console.log("Profissionais recebidos:", data);
                        if (data.length === 0) {
                            console.warn("Nenhum profissional retornado para serviço:", idServico);
                            alert("Nenhum profissional disponível para este serviço.");
                            return;
                        }
                        data.forEach(prof => {
                            const option = document.createElement('option');
                            option.value = prof.id_profissional;
                            option.textContent = prof.nome;
                            profissionalSelect.appendChild(option);
                        });
                        profissionalGroup.style.display = 'block';
                    })
                    .catch(err => {
                        console.error("Erro ao carregar profissionais:", err);
                        alert("Erro ao carregar profissionais. Tente novamente.");
                    });
            } else {
                profissionalGroup.style.display = 'none';
            }
        });

        // Mostrar campo de data
        profissionalSelect.addEventListener('change', () => {
            console.log(`Profissional selecionado: ${profissionalSelect.value}`);
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
            console.log(`Data selecionada: ${data}, Profissional: ${idProfissional}, Serviço: ${idServico}`);
            horaSelect.innerHTML = '<option value="">-- Escolha um Horário --</option>';
            submitBtn.disabled = true;

            if (idProfissional && data && idServico) {
                console.log(`Carregando horários disponíveis para ${idProfissional}/${data}/${idServico}`);
                fetch(`/api/horarios_disponiveis/${idProfissional}/${data}/${idServico}`)
                    .then(res => {
                        console.log(`Resposta de /api/horarios_disponiveis: ${res.status}`);
                        return res.json();
                    })
                    .then(data => {
                        console.log("Horários recebidos:", data);
                        if (data.length === 0) {
                            console.warn("Nenhum horário disponível para:", { idProfissional, data, idServico });
                            alert("Nenhum horário disponível para esta data.");
                            return;
                        }
                        data.forEach(hora => {
                            const option = document.createElement('option');
                            option.value = hora;
                            option.textContent = hora;
                            horaSelect.appendChild(option);
                        });
                        horaGroup.style.display = 'block';
                    })
                    .catch(err => {
                        console.error("Erro ao carregar horários:", err);
                        alert("Erro ao carregar horários. Tente novamente.");
                    });
            } else {
                horaGroup.style.display = 'none';
            }
        });

        // Habilitar botão ao selecionar hora
        horaSelect.addEventListener('change', () => {
            console.log(`Horário selecionado: ${horaSelect.value}`);
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

            console.log("Submetendo agendamento:", { categoria, idServico, idProfissional, data, hora });
            if (!categoria || !idServico || !idProfissional || !data || !hora) {
                console.error("Campos obrigatórios faltando");
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
                .then(res => {
                    console.log(`Resposta de /api/agendar: ${res.status}`);
                    return res.json();
                })
                .then(data => {
                    console.log("Resposta de agendamento:", data);
                    if (data.success) {
                        console.log("Agendamento bem-sucedido, redirecionando");
                        window.location.href = '/agendamento?msg=Agendamento realizado com sucesso!';
                    } else {
                        console.error("Erro no agendamento:", data.error);
                        alert(data.error || 'Erro ao agendar.');
                        resetButton(this);
                    }
                })
                .catch(err => {
                    console.error("Erro na requisição /api/agendar:", err);
                    alert('Erro na conexão com o servidor.');
                    resetButton(this);
                });
        });
    } else {
        console.warn("Form de agendamento não encontrado");
    }
});
