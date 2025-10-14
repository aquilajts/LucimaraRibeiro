console.log("Script loaded");

// Variáveis globais para consulta de agendamentos
let agendamentosAtuais = [];
let agendamentoIdAtual = null;

// Função para formatar data
function formatarData(dataStr) {
    if (!dataStr) return 'N/A';
    const [ano, mes, dia] = dataStr.split('-');
    return `${dia}/${mes}/${ano}`;
}

// Carregar profissionais
async function carregarProfissionais() {
    console.log('Iniciando carregarProfissionais'); // Depuração
    try {
        const response = await fetch('/api/profissionais');
        if (!response.ok) throw new Error(`HTTP ${response.status} - ${response.statusText}`);
        const data = await response.json();
        const select = document.getElementById('prof-select');
        if (!select) throw new Error('Elemento prof-select não encontrado');
        select.innerHTML = '<option value="">Todos</option>'; // Reinicia com opção "Todos"
        data.forEach(prof => {
            const option = document.createElement('option');
            option.value = prof.id_profissional;
            option.textContent = prof.nome;
            select.appendChild(option);
        });
        console.log('Profissionais carregados:', data); // Depuração
    } catch (error) {
        console.error('Erro ao carregar profissionais:', error);
    }
}

// Carregar status
async function carregarStatus() {
    try {
        const response = await fetch('/api/status');
        const data = await response.json();
        const content = document.getElementById('status-dropdown-content');
        content.innerHTML = ''; // Limpa o conteúdo
        data.forEach(status => {
            const label = document.createElement('label');
            label.innerHTML = `<input type="checkbox" value="${status}" onchange="updateStatusFilter()"> ${status}`;
            content.appendChild(label);
        });
    } catch (error) {
        console.error('Erro ao carregar status:', error);
    }
}

// Carregar agendamentos
async function carregarAgendamentos() {
    const profId = document.getElementById('prof-select').value;
    const statusValues = Array.from(document.querySelectorAll('#status-dropdown-content input[type="checkbox"]:checked')).map(cb => cb.value);
    const startDate = document.getElementById('start-date').value;
    const endDate = document.getElementById('end-date').value;
    const loading = document.getElementById('loading');
    const error = document.getElementById('error');
    const tbody = document.getElementById('corpo-tabela');
    const tabela = document.getElementById('tabela-agendamentos');
    const titulo = document.getElementById('titulo-agendamentos');

    loading.style.display = 'block';
    error.style.display = 'none';
    tabela.style.display = 'none';

    try {
        let url = profId ? `/api/agendamentos_profissional/${profId}` : '/api/agendamentos_todos';
        let params = new URLSearchParams(); // Reinicia como URLSearchParams
        if (statusValues.length > 0) {
            console.log('Status selecionados para filtro:', statusValues);
            statusValues.forEach(status => {
                params.append('status', status);
            });
        }
        if (startDate) params.append('start_date', startDate);
        if (endDate) params.append('end_date', endDate);

        const fullUrl = params.toString() ? `${url}?${params.toString()}` : url;
        console.log('URL de requisição:', fullUrl); // Depuração
        titulo.textContent = profId ? `Agendamentos de ${document.querySelector(`#prof-select option[value="${profId}"]`).textContent}` : 'Todos os Agendamentos';

        const response = await fetch(fullUrl);
        if (!response.ok) throw new Error(`HTTP ${response.status} - ${response.statusText}`);

        const data = await response.json();
        agendamentosAtuais = data;

        loading.style.display = 'none';
        tabela.style.display = 'table';

        if (!Array.isArray(data) || data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="9" style="text-align:center;padding:30px;color:#666;">Nenhum agendamento encontrado</td></tr>';
            return;
        }

        tbody.innerHTML = '';
        data.forEach(ag => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${formatarData(ag.data_agendamento)}</td>
                <td>${ag.hora_agendamento}</td>
                <td>${ag.cliente_nome || 'Anônimo'}</td>
                <td>${ag.cliente_telefone || '-'}</td>
                <td>${ag.servicos_nomes ? ag.servicos_nomes.join(', ') : 'N/A'}</td>
                <td>${ag.duracao_total} min</td>
                <td>R$ ${parseFloat(ag.preco_total || 0).toFixed(2)}</td>
                <td>${ag.status || '🟡Pendente'}</td>
                <td>
                    <button class="details-btn" onclick="mostrarDetalhes('${ag.id_agendamento}')">
                        📋
                    </button>
                </td>
            `;
            tbody.appendChild(row);
        });
    } catch (error) {
        console.error('Erro ao carregar agendamentos:', error);
        loading.style.display = 'none';
        error.textContent = 'Erro ao carregar: ' + error.message;
        error.style.display = 'block';
    }
}

// Atualizar end-date dinamicamente com +15 dias do start-date
function atualizarEndDate() {
    const startDateInput = document.getElementById('start-date');
    const endDateInput = document.getElementById('end-date');
    if (startDateInput.value) {
        const startDate = new Date(startDateInput.value);
        startDate.setDate(startDate.getDate() + 15);
        endDateInput.value = startDate.toISOString().split('T')[0];
    }
}

// Mostrar detalhes do agendamento
async function mostrarDetalhes(id) {
    try {
        agendamentoIdAtual = id;
        const response = await fetch(`/api/agendamento/${id}`);
        if (!response.ok) throw new Error('Erro carregando detalhes');

        const data = await response.json();
        const conteudoModal = document.getElementById('conteudo-modal');
        const updateForm = document.getElementById('update-form');
        const servicesCheckboxes = document.getElementById('services-checkboxes');

        conteudoModal.innerHTML = `
            <p><strong>Cliente:</strong> ${data.cliente}</p>
            <p><strong>Data/Hora:</strong> ${data.data_hora_completa}</p>
            <p><strong>Telefone:</strong> ${data.telefone}</small></p>
            <p><strong>Serviços:</strong> ${data.servicos.join(', ') || 'N/A'}</p>
            <p><strong>Total:</strong> ${data.preco} (${data.duracao})</p>
            <p><strong>Status:</strong> ${data.status}</p>
            <p><strong>Observações:</strong> ${data.observacoes}</p>
        `;

        const dataPartes = data.data_hora_completa.split(' às ');
        const dataFormatada = dataPartes[0];
        const horaFormatada = dataPartes[1];
        const [dia, mes, ano] = dataFormatada.split('/');
        document.getElementById('new-date').value = `${ano}-${mes.padStart(2, '0')}-${dia.padStart(2, '0')}`;
        document.getElementById('new-time').value = horaFormatada;
        document.getElementById('status').value = data.status;

        const servicesResponse = await fetch('/api/servicos');
        const servicesData = await servicesResponse.json();
        servicesCheckboxes.innerHTML = '';
        const servicosAtuais = data.servicos || [];
        servicesData.forEach(service => {
            const div = document.createElement('div');
            div.className = 'checkbox-group';
            div.innerHTML = `
                <input type="checkbox" id="service-${service.id_servico}" name="services" value="${service.id_servico}" ${servicosAtuais.includes(service.nome) ? 'checked' : ''}>
                <label for="service-${service.id_servico}">${service.nome}</label>
            `;
            servicesCheckboxes.appendChild(div);
        });

        updateForm.style.display = 'block';
        document.getElementById('modal-detalhes').style.display = 'block';
        document.getElementById('modal-detalhes').onclick = null;
    } catch (error) {
        console.error('Erro ao carregar detalhes:', error);
        alert('Erro carregando detalhes: ' + error.message);
    }
}

// Fechar modal
function fecharModal(event) {
    if (event) event.stopPropagation();
    const modal = document.getElementById('modal-detalhes');
    const updateForm = document.getElementById('update-form');
    modal.style.display = 'none';
    updateForm.style.display = 'none';
    agendamentoIdAtual = null;
}

// Evento para fechar modal com botão
function initModalEvents() {
    const closeBtn = document.querySelector('.close');
    if (closeBtn) closeBtn.addEventListener('click', fecharModal);

    const modal = document.getElementById('modal-detalhes');
    const modalContent = document.querySelector('.modal-content');
    if (modal && modalContent) {
        modal.addEventListener('click', function(event) {
            if (event.target === modal) fecharModal(event);
        });
        modalContent.addEventListener('click', function(event) {
            event.stopPropagation();
        });
    }
}

// Funções para o dropdown de status
function toggleStatusDropdown() {
    const content = document.getElementById('status-dropdown-content');
    content.style.display = content.style.display === 'block' ? 'none' : 'block';
}

function updateStatusFilter() {
    const checkboxes = document.querySelectorAll('#status-dropdown-content input[type="checkbox"]');
    const selectedValues = Array.from(checkboxes).filter(cb => cb.checked).map(cb => cb.value);
    console.log('Status brutos:', selectedValues); // Depuração
    const encodedValues = selectedValues.map(status => encodeURIComponent(status));
    console.log('Status codificados:', encodedValues); // Depuração
    const btn = document.getElementById('status-dropdown-btn');
    btn.textContent = selectedValues.length > 0 ? selectedValues.join(', ') : 'Todos';
    carregarAgendamentos();
}

// Inicialização
document.addEventListener('DOMContentLoaded', async () => {
    console.log('DOM carregado, iniciando funções'); // Depuração
    try {
        await carregarProfissionais();
        await carregarStatus();
        carregarAgendamentos();
        const today = new Date().toISOString().split('T')[0]; // 2025-10-12 14:19:00 -03
        const startDateInput = document.getElementById('start-date');
        if (!startDateInput) throw new Error('Elemento start-date não encontrado');
        startDateInput.value = today;
        atualizarEndDate();
        initModalEvents();
    } catch (error) {
        console.error('Erro na inicialização:', error);
    }
});

    // Configurar formulário de atualização
    const updateForm = document.getElementById('update-form');
    if (updateForm) {
        updateForm.addEventListener('submit', async function(event) {
            event.preventDefault();
            event.stopPropagation();

            if (!agendamentoIdAtual) {
                alert('Erro: ID do agendamento não encontrado');
                return;
            }

            const newDate = document.getElementById('new-date').value;
            const newTime = document.getElementById('new-time').value;
            const services = Array.from(document.querySelectorAll('#services-checkboxes input[type="checkbox"]:checked')).map(cb => parseInt(cb.value));
            const status = document.getElementById('status').value;

            if (!newDate || !newTime || services.length === 0) {
                alert('Por favor, preencha todos os campos obrigatórios');
                return;
            }

            try {
                console.log('Enviando dados:', { id: agendamentoIdAtual, data_agendamento: newDate, hora_agendamento: newTime, servicos_ids: services, status });
                const response = await fetch(`/api/agendamento/${agendamentoIdAtual}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        data_agendamento: newDate,
                        hora_agendamento: newTime,
                        servicos_ids: services,
                        status: status
                    })
                });

                const result = await response.json();
                if (response.ok && result.success) {
                    alert('Alterações salvas com sucesso!');
                    fecharModal();
                    carregarAgendamentos();
                } else {
                    throw new Error(result.error || 'Falha ao salvar alterações');
                }
            } catch (error) {
                console.error('Erro ao salvar:', error);
                alert('Erro ao salvar: ' + error.message);
            }
        });
    }

    // Modal Esqueceu Senha
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

    window.addEventListener('click', function(event) {
        const modal = document.getElementById('forgotPasswordModal');
        if (modal && event.target === modal) {
            console.log("Clicou fora do modal, fechando");
            modal.style.display = 'none';
        }
    });

    // Efeitos Visuais
    document.querySelectorAll('input, textarea, select').forEach(input => {
        input.addEventListener('focus', function() {
            console.log(`Foco no input: ${this.id}`);
            this.parentElement.style.transform = 'scale(1.02)';
        });
        input.addEventListener('blur', function() {
            console.log(`Desfoco do input: ${this.id}`);
            this.parentElement.style.transform = 'scale(1)';
        });
    });

    // Loading nos Botões
    function applyLoadingEffect(form) {
        form.addEventListener('submit', function(event) {
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

    // Validação de Formulários
    const forgotLink = document.getElementById('forgotPasswordLink');
    if (forgotLink) {
        forgotLink.addEventListener('click', function(e) {
            e.preventDefault();
            openForgotPasswordModal();
        });
    } else {
        console.warn('Elemento forgotPasswordLink não encontrado, ignorando funcionalidade de esqueci senha.');
    }

    const loginForm = document.querySelector('form[action="/login"]');
    if (loginForm) {
        applyLoadingEffect(loginForm);
        loginForm.addEventListener('submit', function(event) {
            const nome = document.getElementById('nome')?.value.trim();
            const senha = document.getElementById('senha')?.value;
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
    }

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
                if (!nomeField.value.trim()) {
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
            } else if (novaSenhaField && novaSenhaField.value.length < 6) {
                event.preventDefault();
                console.error("Nova senha muito curta");
                alert('A nova senha deve ter pelo menos 6 dígitos.');
                resetButton(this, true);
            } else if (novaSenhaField) {
                this.submit();
            }
        });
    }

    const agendamentoForm = document.getElementById('agendamento-form');
    if (agendamentoForm) {
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

        let servicosData = {};
        let calendar;
        let categoriaCount = 1;

        calendar = new FullCalendar.Calendar(calendarEl, {
            initialView: 'dayGridMonth',
            selectable: true,
            select: function(info) {
                dataInput.value = info.startStr;
                carregarHorarios(info.startStr);
                document.querySelectorAll('.fc-day-selected').forEach(el => el.classList.remove('fc-day-selected'));
                document.querySelector(`.fc-day[data-date="${info.startStr}"]`).classList.add('fc-day-selected');
            },
            businessHours: { daysOfWeek: [], startTime: '08:00', endTime: '18:00' },
            validRange: { start: '{{ min_date }}' },
            dayCellClassNames: function(arg) { return arg.isPast ? ['fc-day-past'] : []; }
        });
        calendar.render();

        function carregarCategorias(selectId) {
            const categoriaSelect = document.getElementById(selectId);
            fetch('/api/categorias')
                .then(res => res.json())
                .then(data => data.forEach(cat => {
                    const option = document.createElement('option');
                    option.value = cat;
                    option.textContent = cat;
                    categoriaSelect.appendChild(option);
                }))
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

        carregarCategorias('categoria-1');
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
                    carregarProfissionais(selectedIds[0]);
                })
                .catch(err => console.error('Erro ao calcular total:', err));
            } else {
                totalInfo.textContent = 'Total: Preço R$ 0,00';
                profissionalGroup.style.display = 'none';
            }
        });

        function carregarProfissionais(idServico) {
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

        profissionalSelect.addEventListener('change', () => {
            const idProfissional = profissionalSelect.value;
            if (idProfissional) {
                fetch(`/api/profissional/${idProfissional}`)
                    .then(res => res.json())
                    .then(data => {
                        const daysMap = { 'segunda': 1, 'terca': 2, 'quarta': 3, 'quinta': 4, 'sexta': 5, 'sabado': 6, 'domingo': 0 };
                        calendar.setOption('businessHours', {
                            daysOfWeek: data.dias_trabalho.map(d => daysMap[d.toLowerCase()]),
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

        function carregarHorarios(data) {
            const idProfissional = profissionalSelect.value;
            const selectedIds = Array.from(categoriasContainer.querySelectorAll('input:checked')).map(input => parseInt(input.value));
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
                } else if (data.length === 0) {
                    horariosMsg.style.display = 'block';
                    horariosMsg.textContent = 'Nenhum horário disponível para esta data.';
                } else {
                    horariosMsg.style.display = 'none';
                    data.forEach(hora => {
                        const option = document.createElement('option');
                        option.value = hora;
                        option.textContent = hora;
                        horaSelect.appendChild(option);
                    });
                }
            })
            .catch(err => {
                console.error("Erro ao carregar horários:", err);
                horariosMsg.style.display = 'block';
                horariosMsg.textContent = "Erro ao carregar horários. Tente novamente.";
            });
        }

        horaSelect.addEventListener('change', () => {
            submitBtn.disabled = !horaSelect.value;
        });

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
    }  // Fim correto do if (agendamentoForm) com indentação alinhada