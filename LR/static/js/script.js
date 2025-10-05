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

/ AGENDAMENTO
    const agendamentoForm = document.getElementById('agendamento-form');
    if (agendamentoForm) {
        console.log("Configurando form de agendamento");
        applyLoadingEffect(agendamentoForm);
        const categoriasContainer = document.getElementById('categorias-container');
        const addCategoriaBtn = document.getElementById('add-categoria');
        const totalInfo = document.getElementById('total-info');
        const profissionalGroup = document.getElementById('profissional-group');
        const profissionalSelect = document.getElementById('profissional');
        const calendarioGroup = document.getElementById('calendario-group');
        const calendarEl = document.getElementById('calendar');
        const horariosMsg = document.getElementById('horarios-msg');
        const horaSelect = document.getElementById('hora');
        const dataInput = document.getElementById('data_agendamento');
        const submitBtn = agendamentoForm.querySelector('.btn');

        let servicosData = {}; // Para armazenar dados de serviços por categoria
        let calendar;
        let categoriaCount = 1;

        // Inicializar FullCalendar com businessHours para dias de trabalho
        calendar = new FullCalendar.Calendar(calendarEl, {
            initialView: 'dayGridMonth',
            selectable: true,
            select: function(info) {
                const dataSelecionada = info.startStr; // YYYY-MM-DD
                dataInput.value = dataSelecionada;
                carregarHorarios(dataSelecionada);
                // Destacar dia selecionado
                document.querySelectorAll('.fc-day-selected').forEach(el => el.classList.remove('fc-day-selected'));
                document.querySelector(`.fc-day[data-date="${dataSelecionada}"]`).classList.add('fc-day-selected');
            },
            businessHours: {
                daysOfWeek: [], // Carregado dinamicamente baseado no profissional
                startTime: '08:00',
                endTime: '18:00'
            },
            validRange: {
                start: '{{ min_date }}'
            },
            dayCellClassNames: function(arg) {
                if (arg.isPast) {
                    return ['fc-day-past'];
                }
                return [];
            }
        });
        calendar.render();

        // Carregar categorias no primeiro select
        carregarCategorias('categoria-1');

        // Botão para adicionar outra categoria
        addCategoriaBtn.addEventListener('click', () => {
            categoriaCount++;
            const newGroup = document.createElement('div');
            newGroup.classList.add('form-group', 'categoria-group');
            newGroup.innerHTML = `
                <label for="categoria-${categoriaCount}">Outra Categoria:</label>
                <select id="categoria-${categoriaCount}" class="categoria" required>
                    <option value="">-- Escolha uma Categoria --</option>
                </select>
                <div id="servicos-checkboxes-${categoriaCount}" class="servicos-checkboxes"></div>
            `;
            categoriasContainer.appendChild(newGroup);
            carregarCategorias(`categoria-${categoriaCount}`);
        });

        function carregarCategorias(selectId) {
            const categoriaSelect = document.getElementById(selectId);
            console.log(`Carregando categorias para select: ${selectId}`);
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

            categoriaSelect.addEventListener('change', () => {
                const categoria = categoriaSelect.value;
                const checkboxesId = `servicos-checkboxes-${selectId.split('-')[1]}`;
                const servicosCheckboxes = document.getElementById(checkboxesId);
                servicosCheckboxes.innerHTML = '';
                if (categoria) {
                    fetch(`/api/servicos?categoria=${encodeURIComponent(categoria)}`)
                        .then(res => res.json())
                        .then(data => {
                            servicosData[categoria] = data;
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
                        })
                        .catch(err => console.error('Erro ao carregar serviços:', err));
                }
            });
        }

        // Atualizar totais ao selecionar checkboxes
        categoriasContainer.addEventListener('change', () => {
            const selectedIds = Array.from(categoriasContainer.querySelectorAll('input:checked')).map(input => parseInt(input.value));
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
        }

        // Atualizar calendário com dias de trabalho do profissional
        profissionalSelect.addEventListener('change', () => {
            const idProfissional = profissionalSelect.value;
            if (idProfissional) {
                fetch(`/api/profissional/${idProfissional}`)
                    .then(res => res.json())
                    .then(data => {
                        const daysMap = {
                            'segunda': 1, 'terca': 2, 'quarta': 3, 'quinta': 4, 'sexta': 5, 'sabado': 6, 'domingo': 0
                        };
                        const daysOfWeek = data.dias_trabalho.map(d => daysMap[d.toLowerCase()]);
                        calendar.setOption('businessHours', {
                            daysOfWeek: daysOfWeek,
                            startTime: data.horario_inicio,
                            endTime: data.horario_fim
                        });
                        calendar.render();
                        calendarioGroup.style.display = 'block';
                    })
                    .catch(err => console.error('Erro ao carregar dias de trabalho:', err));
            } else {
                calendarioGroup.style.display = 'none';
                submitBtn.disabled = true;
            }
        });

        // Carregar horários para o dia selecionado
        function carregarHorarios(data) {
            const idProfissional = profissionalSelect.value;
            const selectedIds = Array.from(categoriasContainer.querySelectorAll('input:checked')).map(input => parseInt(input.value));
            console.log(`Carregando horários para data: ${data}, Profissional: ${idProfissional}, Serviços: ${selectedIds}`);
            fetch(`/api/horarios_disponiveis/${idProfissional}/${data}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id_servicos: selectedIds })
            })
            .then(res => res.json())
            .then(data => {
                horaSelect.innerHTML = '<option value="">-- Escolha um Horário --</option>';
                if (data.error) {
                    horariosMsg.style.display = 'block';
                    horariosMsg.textContent = data.error;
                    return;
                }
                if (data.length === 0) {
                    horariosMsg.style.display = 'block';
                    horariosMsg.textContent = 'Nenhum horário disponível para esta data.';
                    return;
                }
                horariosMsg.style.display = 'none';
                data.forEach(hora => {
                    const option = document.createElement('option');
                    option.value = hora;
                    option.textContent = hora;
                    horaSelect.appendChild(option);
                });
            })
            .catch(err => {
                console.error("Erro ao carregar horários:", err);
                horariosMsg.style.display = 'block';
                horariosMsg.textContent = "Erro ao carregar horários. Tente novamente.";
            });
        }

        // Habilitar botão ao selecionar horário
        horaSelect.addEventListener('change', () => {
            console.log(`Horário selecionado: ${horaSelect.value}`);
            submitBtn.disabled = !horaSelect.value;
        });

        // Validação e submissão do formulário
        agendamentoForm.addEventListener('submit', function(event) {
            event.preventDefault();
            const selectedIds = Array.from(categoriasContainer.querySelectorAll('input:checked')).map(input => parseInt(input.value));
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
