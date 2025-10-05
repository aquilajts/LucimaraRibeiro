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
        const servicosCheckboxes = document.getElementById('servicos-checkboxes');
        const totalInfo = document.getElementById('total-info');
        const profissionalGroup = document.getElementById('profissional-group');
        const profissionalSelect = document.getElementById('profissional');
        const calendarioGroup = document.getElementById('calendario-group');
        const calendarEl = document.getElementById('calendar');
        const horariosMsg = document.getElementById('horarios-msg');
        const dataInput = document.getElementById('data_agendamento');
        const horaInput = document.getElementById('hora_agendamento');
        const submitBtn = agendamentoForm.querySelector('.btn');

        let servicosData = []; // Para armazenar dados de serviços
        let calendar;

        // Inicializar FullCalendar com estilos personalizados
        calendar = new FullCalendar.Calendar(calendarEl, {
            initialView: 'dayGridMonth',
            selectable: true,
            select: function(info) {
                const dataSelecionada = info.startStr; // YYYY-MM-DD
                dataInput.value = dataSelecionada;
                carregarHorarios(dataSelecionada);
            },
            eventClick: function(info) {
                horaInput.value = info.event.startStr.split('T')[1].slice(0,5); // HH:MM
                submitBtn.disabled = false;
            },
            events: [], // Carregado dinamicamente
            validRange: {
                start: '{{ min_date }}' // Data mínima amanhã
            },
            dayCellClassNames: function(arg) {
                if (arg.isPast) {
                    return ['fc-day-past'];
                }
                // Dias disponíveis serão destacados pelo backend, mas aqui podemos adicionar classes base
                return [];
            }
        });
        calendar.render();

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

        // Carregar serviços como checkboxes
        categoriaSelect.addEventListener('change', () => {
            const categoria = categoriaSelect.value;
            console.log(`Categoria selecionada: ${categoria}`);
            servicosCheckboxes.innerHTML = '';
            profissionalGroup.style.display = 'none';
            calendarioGroup.style.display = 'none';
            totalInfo.textContent = 'Total: Preço R$ 0,00';
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
                        servicosData = data;
                        if (data.length === 0) {
                            console.warn("Nenhum serviço retornado para categoria:", categoria);
                            alert("Nenhum serviço disponível para esta categoria.");
                            return;
                        }
                        data.forEach(servico => {
                            const label = document.createElement('label');
                            const checkbox = document.createElement('input');
                            checkbox.type = 'checkbox';
                            checkbox.value = servico.id_servico;
                            checkbox.name = 'id_servicos[]';
                            label.appendChild(checkbox);
                            label.appendChild(document.createTextNode(` ${servico.nome} (${servico.duracao_minutos} min, R$ ${servico.preco})`));
                            servicosCheckboxes.appendChild(label);
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

        // Atualizar totais ao selecionar checkboxes
        servicosCheckboxes.addEventListener('change', () => {
            const selectedIds = Array.from(servicosCheckboxes.querySelectorAll('input:checked')).map(input => parseInt(input.value));
            if (selectedIds.length > 0) {
                fetch('/api/calcular_total', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ id_servicos: selectedIds })
                })
                .then(res => res.json())
                .then(data => {
                    totalInfo.textContent = `Total: Preço R$ ${data.preco_total}`;
                    // Carregar profissionais para o primeiro serviço
                    carregarProfissionais(selectedIds[0]);
                })
                .catch(err => console.error('Erro ao calcular total:', err));
            } else {
                totalInfo.textContent = 'Total: Preço R$ 0,00';
                profissionalGroup.style.display = 'none';
            }
        });

        function carregarProfissionais(idServico) {
            console.log(`Carregando profissionais para serviço: ${idServico}`);
            profissionalSelect.innerHTML = '<option value="">-- Escolha um Profissional --</option>';
            calendarioGroup.style.display = 'none';
            submitBtn.disabled = true;

            if (idServico) {
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
        }

        // Mostrar calendário
        profissionalSelect.addEventListener('change', () => {
            console.log(`Profissional selecionado: ${profissionalSelect.value}`);
            if (profissionalSelect.value) {
                calendarioGroup.style.display = 'block';
            } else {
                calendarioGroup.style.display = 'none';
                submitBtn.disabled = true;
            }
        });

         // Carregar horarios
        function carregarHorarios(data) {
            const idProfissional = profissionalSelect.value;
            const selectedIds = Array.from(servicosCheckboxes.querySelectorAll('input:checked')).map(input => parseInt(input.value));
            console.log(`Carregando horários para data: ${data}, Profissional: ${idProfissional}, Serviços: ${selectedIds}`);
            fetch(`/api/horarios_disponiveis/${idProfissional}/${data}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id_servicos: selectedIds })
            })
            .then(res => {
                console.log(`Resposta de /api/horarios_disponiveis: ${res.status}`);
                return res.json();
            })
            .then(data => {
                console.log("Horários recebidos:", data);
                if (data.error) {
                    console.warn("Erro retornado pela API:", data.error);
                    alert(data.error || "Erro ao carregar horários. Tente novamente.");
                    return;
                }
                calendar.removeAllEvents();
                if (data.length === 0) {
                    horariosMsg.style.display = 'block';
                    horariosMsg.textContent = 'Nenhum horário disponível para esta data.';
                    console.warn("Nenhum horário disponível para:", { idProfissional, data, selectedIds });
                    return;
                }
                horariosMsg.style.display = 'none';
                data.forEach(hora => {
                    calendar.addEvent({
                        title: hora,
                        start: `${data}T${hora}:00`
                    });
                });
            })
            .catch(err => {
                console.error("Erro ao carregar horários:", err);
                alert("Erro ao carregar horários. Tente novamente.");
            });
        }

        // Validação e submissão do formulário
        agendamentoForm.addEventListener('submit', function(event) {
            event.preventDefault();
            const selectedIds = Array.from(servicosCheckboxes.querySelectorAll('input:checked')).map(input => parseInt(input.value));
            const formData = new FormData(this);
            formData.set('id_servicos', JSON.stringify(selectedIds));
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
    } else {
        console.warn("Form de agendamento não encontrado");
    }
});
