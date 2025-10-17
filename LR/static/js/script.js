console.log("Script loaded");

// Variáveis globais para consulta de agendamentos
let agendamentosAtuais = [];
let agendamentoIdAtual = null;

const STATUS_META = {
    "🔴Não veio": { tone: "danger", label: "Não veio" },
    "🟡Pendente": { tone: "warning", label: "Pendente" },
    "🟢Atendido": { tone: "success", label: "Atendido" },
    "🔵Agendado": { tone: "info", label: "Agendado" },
    "⚫Pago": { tone: "neutral", label: "Pago" }
};

const HTML_ESCAPE_MAP = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
};

function escapeHtml(value) {
    if (value === null || value === undefined) return "";
    return String(value).replace(/[&<>"']/g, ch => HTML_ESCAPE_MAP[ch] || ch);
}

function buildStatusChip(statusRaw) {
    const raw = statusRaw || "🟡Pendente";
    const meta = STATUS_META[raw] || { tone: "neutral", label: raw };
    const label = meta.label || raw;
    return `<span class="status-chip status-chip--${meta.tone}" title="${escapeHtml(label)}">${escapeHtml(raw)}</span>`;
}

// Função para formatar data
function formatarData(dataStr) {
    if (!dataStr) return 'N/A';
    const [ano, mes, dia] = dataStr.split('-');
    return `${dia}/${mes}/${ano}`;
}

function criarAgendamentoCard(ag) {
    const card = document.createElement('article');
    card.className = 'booking-card';

    const telefone = ag.cliente_telefone ? escapeHtml(ag.cliente_telefone) : '—';
    const servicosLista = Array.isArray(ag.servicos_nomes) && ag.servicos_nomes.length
        ? ag.servicos_nomes.map(escapeHtml).join(', ')
        : 'N/A';
    const precoNumero = Number(ag.preco_total ?? ag.preco ?? 0);
    const precoFormatado = Number.isFinite(precoNumero) ? precoNumero.toFixed(2) : '0.00';
    const statusChip = buildStatusChip(ag.status);

    card.innerHTML = `
        <button class="booking-card__toggle" type="button" aria-expanded="false">
            <div class="booking-card__summary">
                <div class="booking-card__summary-main">
                    <span class="booking-card__date">${escapeHtml(formatarData(ag.data_agendamento))}</span>
                    <span class="booking-card__time">${escapeHtml(ag.hora_agendamento || '—')}</span>
                </div>
                <div class="booking-card__summary-side">
                    <span class="booking-card__client">${escapeHtml(ag.cliente_nome || 'Cliente não identificado')}</span>
                    ${statusChip}
                </div>
            </div>
            <span class="booking-card__chevron" aria-hidden="true"></span>
        </button>
        <div class="booking-card__details" hidden>
            <dl class="booking-card__meta">
                <div><dt>Telefone</dt><dd>${telefone}</dd></div>
                <div><dt>Duração total</dt><dd>${escapeHtml(String(ag.duracao_total || 0))} min</dd></div>
                <div><dt>Preço</dt><dd>R$ ${precoFormatado}</dd></div>
                <div><dt>Status</dt><dd>${statusChip}</dd></div>
            </dl>
            <div class="booking-card__services">
                <strong>Serviços</strong>
                <p>${servicosLista}</p>
            </div>
            <div class="booking-card__footer">
                <div class="booking-card__totals">
                    <span>${escapeHtml(formatarData(ag.data_agendamento))} · ${escapeHtml(ag.hora_agendamento || '—')}</span>
                    <span>R$ ${precoFormatado}</span>
                </div>
                <div class="booking-card__actions">
                    <button type="button" class="details-btn" data-id="${escapeHtml(String(ag.id_agendamento))}">Gerenciar</button>
                </div>
            </div>
        </div>
    `;

    const toggleBtn = card.querySelector('.booking-card__toggle');
    const details = card.querySelector('.booking-card__details');
    const manageBtn = card.querySelector('.details-btn');

    if (toggleBtn && details) {
        toggleBtn.addEventListener('click', () => {
            const isOpen = toggleBtn.getAttribute('aria-expanded') === 'true';
            toggleBtn.setAttribute('aria-expanded', String(!isOpen));
            details.hidden = isOpen;
            card.classList.toggle('booking-card--open', !isOpen);
        });
    }

    if (manageBtn) {
        manageBtn.addEventListener('click', () => {
            agendamentoIdAtual = ag.id_agendamento;
            mostrarDetalhes(String(ag.id_agendamento));
        });
    }

    return card;
}

// Carregar profissionais (tela de consulta de agendamentos)
async function carregarProfissionaisFiltro() {
    console.log('Iniciando carregarProfissionaisFiltro');
    try {
        const select = document.getElementById('prof-select');
        if (!select) {
            // Página sem filtro de profissionais; não há nada para fazer
            return;
        }

        const response = await fetch('/api/profissionais');
        if (!response.ok) throw new Error(`HTTP ${response.status} - ${response.statusText}`);
        const data = await response.json();
        select.innerHTML = '<option value="">Todos</option>';
        data.forEach(prof => {
            const option = document.createElement('option');
            option.value = prof.id_profissional;
            option.textContent = prof.nome;
            select.appendChild(option);
        });
        console.log('Profissionais (filtro) carregados:', data);
    } catch (error) {
        console.error('Erro ao carregar profissionais (filtro):', error);
    }
}

// Carregar status
async function carregarStatus() {
    try {
        const content = document.getElementById('status-dropdown-content');
        if (!content) return; // Página sem dropdown de status
        const response = await fetch('/api/status');
        const data = await response.json();
        content.innerHTML = '';
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
    // Só executa nesta página específica
    const profSelect = document.getElementById('prof-select');
    const listaWrapper = document.getElementById('tabela-agendamentos');
    const lista = document.getElementById('corpo-tabela');
    const titulo = document.getElementById('titulo-agendamentos');
    const loading = document.getElementById('loading');
    const errorBox = document.getElementById('error');
    if (!profSelect || !listaWrapper || !lista || !titulo) return;

    const profId = profSelect.value;
    const statusValues = Array.from(document.querySelectorAll('#status-dropdown-content input[type="checkbox"]:checked')).map(cb => cb.value);
    const startDateEl = document.getElementById('start-date');
    const endDateEl = document.getElementById('end-date');
    const startDate = startDateEl ? startDateEl.value : '';
    const endDate = endDateEl ? endDateEl.value : '';

    if (loading) loading.style.display = 'block';
    if (errorBox) {
        errorBox.style.display = 'none';
        errorBox.textContent = '';
    }
    listaWrapper.style.display = 'none';

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

    if (loading) loading.style.display = 'none';
    listaWrapper.style.display = 'block';

        if (!Array.isArray(data) || data.length === 0) {
            lista.innerHTML = '<div class="booking-card booking-card--empty" role="listitem">Nenhum agendamento encontrado para o filtro aplicado.</div>';
            return;
        }

        lista.innerHTML = '';
        data.forEach(ag => {
            const card = criarAgendamentoCard(ag);
            card.setAttribute('role', 'listitem');
            lista.appendChild(card);
        });
    } catch (error) {
        console.error('Erro ao carregar agendamentos:', error);
        if (loading) loading.style.display = 'none';
        if (errorBox) {
            errorBox.textContent = 'Erro ao carregar os agendamentos. Tente novamente em instantes.';
            errorBox.style.display = 'flex';
        }
    }
}

// Atualizar end-date dinamicamente com +15 dias do start-date
function atualizarEndDate() {
    const startDateInput = document.getElementById('start-date');
    const endDateInput = document.getElementById('end-date');
    if (startDateInput && endDateInput && startDateInput.value) {
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
    const button = document.getElementById('status-dropdown-btn');
    if (!content || !button) return;
    const isOpen = content.style.display === 'block';
    content.style.display = isOpen ? 'none' : 'block';
    button.setAttribute('aria-expanded', String(!isOpen));
}

function updateStatusFilter() {
    const checkboxes = document.querySelectorAll('#status-dropdown-content input[type="checkbox"]');
    const selectedValues = Array.from(checkboxes).filter(cb => cb.checked).map(cb => cb.value);
    console.log('Status brutos:', selectedValues); // Depuração
    const encodedValues = selectedValues.map(status => encodeURIComponent(status));
    console.log('Status codificados:', encodedValues); // Depuração
    const btn = document.getElementById('status-dropdown-btn');
    btn.textContent = selectedValues.length > 0 ? selectedValues.join(', ') : 'Todos';
    btn.setAttribute('aria-expanded', 'false');
    const content = document.getElementById('status-dropdown-content');
    if (content) content.style.display = 'none';
    carregarAgendamentos();
}

// Inicialização
document.addEventListener('DOMContentLoaded', async () => {
    console.log('DOM carregado, iniciando funções');
    try {
        const isConsultaPage = !!document.getElementById('prof-select');
        if (isConsultaPage) {
            await carregarProfissionaisFiltro();
            await carregarStatus();
            const today = new Date().toISOString().split('T')[0];
            const startDateInput = document.getElementById('start-date');
            if (startDateInput) {
                startDateInput.value = today;
                atualizarEndDate();
            }
            await carregarAgendamentos();
        }
        // Inicializa eventos do modal se existir
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
        const observacoesGroup = document.getElementById('observacoes-group');
        const observacoesTextarea = document.getElementById('obs');
        const legacyCategoriaSelect = document.getElementById('categoria-select');
        const legacyServicosContainer = document.getElementById('servicos-por-categoria-container');
        const categoriaInicialSelect = document.getElementById('categoria-1');

        let profissionaisMsg = document.getElementById('profissionais-msg');
        if (!profissionaisMsg && profissionalGroup && profissionalGroup.parentNode) {
            profissionaisMsg = document.createElement('p');
            profissionaisMsg.id = 'profissionais-msg';
            profissionaisMsg.classList.add('profissionais-aviso');
            profissionaisMsg.style.display = 'none';
            profissionalGroup.parentNode.insertBefore(profissionaisMsg, profissionalGroup.nextSibling);
        }

        if (categoriaInicialSelect) {
            categoriaInicialSelect.innerHTML = '<option value="">Carregando categorias...</option>';
        }
        if (legacyCategoriaSelect) {
            legacyCategoriaSelect.innerHTML = '<option value="">Carregando categorias...</option>';
        }
        if (addCategoriaBtn) {
            addCategoriaBtn.disabled = true;
        }

        let calendar;
        let calendarRendered = false;
        let categoriaCount = 1;
        let diasTrabalhoIndices = [];
        const diaCellRefs = new Map();
        const disponibilidadePorData = new Map();
        const disponibilidadeCache = new Map();
        let disponibilidadeContextKey = '';

        const servicoPorId = new Map();
        const servicosPorCategoria = new Map();
        const profissionaisPorId = new Map();
        const profissionaisPorServico = new Map();
        let categoriasDisponiveis = [];
        let dadosCarregados = false;

        const formatarPreco = (valor) => {
            if (valor === null || valor === undefined || valor === '') {
                return 'Valor indisponível';
            }
            const numero = Number(valor);
            if (Number.isFinite(numero)) {
                return `R$ ${numero.toFixed(2).replace('.', ',')}`;
            }
            return `R$ ${valor}`;
        };

        function criarLabelServico(servico) {
            const label = document.createElement('label');
            label.classList.add('servico-item');

            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.value = servico.id_servico;
            checkbox.name = 'id_servicos[]';
            checkbox.classList.add('servico-checkbox');
            label.appendChild(checkbox);

            const descricaoSpan = document.createElement('span');
            descricaoSpan.textContent = servico.nome;
            descricaoSpan.classList.add('servico-nome');
            label.appendChild(descricaoSpan);

            const precoSpan = document.createElement('span');
            precoSpan.classList.add('servico-preco');
            precoSpan.textContent = `- ${formatarPreco(servico.preco)}`;
            label.appendChild(precoSpan);

            return label;
        }

        function limparObservacoes() {
            if (observacoesGroup) {
                observacoesGroup.style.display = 'none';
            }
            if (observacoesTextarea) {
                observacoesTextarea.value = '';
                observacoesTextarea.placeholder = '';
            }
        }

        if (observacoesGroup) {
            observacoesGroup.style.display = 'none';
        }
        if (observacoesTextarea) {
            observacoesTextarea.value = '';
        }

        const minDate = (() => {
            const d = new Date();
            d.setDate(d.getDate() + 1);
            return d.toISOString().split('T')[0];
        })();

        const formatIsoDate = dateObj => {
            const tzDate = new Date(dateObj.getTime() - (dateObj.getTimezoneOffset() * 60000));
            return tzDate.toISOString().split('T')[0];
        };
        const parseIsoDate = iso => {
            const [year, month, day] = iso.split('-').map(Number);
            return new Date(year, month - 1, day);
        };

        const normalizarServicos = ids => ids.slice().sort((a, b) => a - b);

        function podeSelecionarData(dateStr, dateObj) {
            if (!dateStr || !dateObj) return false;
            if (!profissionalSelect.value) return false;
            if (dateStr < minDate) return false;
            if (diasTrabalhoIndices.length === 0) return false;
            if (!diasTrabalhoIndices.includes(dateObj.getDay())) return false;
            const status = disponibilidadePorData.get(dateStr);
            return status === true;
        }

        function aplicarClassesDia(dateStr, dateObj, cell) {
            if (!cell) return;
            cell.classList.remove('fc-day-available', 'fc-day-unavailable', 'fc-day-loading', 'fc-day-blocked');
            if (dateStr < minDate) {
                disponibilidadePorData.set(dateStr, false);
                cell.classList.add('fc-day-blocked');
                return;
            }
            const dow = dateObj.getDay();
            if (diasTrabalhoIndices.length > 0 && !diasTrabalhoIndices.includes(dow)) {
                cell.classList.add('fc-day-unavailable');
                return;
            }
            const status = disponibilidadePorData.get(dateStr);
            if (status === true) {
                cell.classList.add('fc-day-available');
            } else if (status === false) {
                cell.classList.add('fc-day-unavailable');
            } else if (status === null) {
                cell.classList.add('fc-day-loading');
            }
        }

        function reaplicarClassesDias() {
            diaCellRefs.forEach((meta, dateStr) => {
                aplicarClassesDia(dateStr, meta.date, meta.el);
            });
        }

        function limparDisponibilidade() {
            disponibilidadePorData.clear();
            disponibilidadeContextKey = '';
            reaplicarClassesDias();
        }

        function atualizarDisponibilidadeCalendario() {
            if (!calendarRendered) {
                return;
            }
            const profId = profissionalSelect.value;
            const serviceIds = getSelectedServiceIds();
            const idsOrdenados = normalizarServicos(serviceIds);
            if (!profId || idsOrdenados.length === 0) {
                limparDisponibilidade();
                return;
            }

            const contexto = `${profId}|${idsOrdenados.join('-')}`;
            disponibilidadeContextKey = contexto;
            disponibilidadePorData.clear();

            const view = calendar.view;
            if (!view) {
                reaplicarClassesDias();
                return;
            }

            const start = new Date(view.currentStart);
            const end = new Date(view.currentEnd);
            const datasParaBuscar = [];

            for (let dt = new Date(start); dt < end; dt.setDate(dt.getDate() + 1)) {
                const iso = formatIsoDate(dt);
                if (iso < minDate) {
                    disponibilidadePorData.set(iso, false);
                    continue;
                }
                const dow = dt.getDay();
                if (diasTrabalhoIndices.length > 0 && !diasTrabalhoIndices.includes(dow)) {
                    disponibilidadePorData.set(iso, false);
                    continue;
                }
                const cacheKey = `${contexto}|${iso}`;
                if (disponibilidadeCache.has(cacheKey)) {
                    disponibilidadePorData.set(iso, disponibilidadeCache.get(cacheKey));
                } else {
                    disponibilidadePorData.set(iso, null);
                    datasParaBuscar.push({ iso, cacheKey });
                }
            }

            reaplicarClassesDias();
            if (datasParaBuscar.length === 0) {
                return;
            }

            const payload = JSON.stringify({ id_servicos: idsOrdenados });
            const headers = { 'Content-Type': 'application/json' };

            datasParaBuscar.reduce((promise, item) => {
                return promise.then(() => {
                    if (disponibilidadeContextKey !== contexto) {
                        return;
                    }
                    return fetch(`/api/horarios_disponiveis/${profId}/${item.iso}`, {
                        method: 'POST',
                        headers,
                        body: payload
                    })
                    .then(res => res.ok ? res.json() : Promise.reject(new Error(`HTTP ${res.status}`)))
                    .then(data => {
                        const disponivel = Array.isArray(data) && data.length > 0 && !data.error;
                        disponibilidadeCache.set(item.cacheKey, disponivel);
                        if (disponibilidadeContextKey === contexto) {
                            disponibilidadePorData.set(item.iso, disponivel);
                            reaplicarClassesDias();
                        }
                    })
                    .catch(() => {
                        disponibilidadeCache.set(item.cacheKey, false);
                        if (disponibilidadeContextKey === contexto) {
                            disponibilidadePorData.set(item.iso, false);
                            reaplicarClassesDias();
                        }
                    });
                });
            }, Promise.resolve());
        }

        function criarCalendarioSeNecessario() {
            if (calendar) return;

            const processarSelecaoDeData = (dateStr, dateObj) => {
                if (!podeSelecionarData(dateStr, dateObj)) {
                    if (horariosMsg) {
                        horariosMsg.style.display = 'block';
                        horariosMsg.textContent = 'Nenhum horário compatível com os serviços selecionados para esta data.';
                    }
                    if (calendar) {
                        calendar.unselect();
                    }
                    return;
                }

                dataInput.value = dateStr;
                carregarHorarios(dateStr);

                document.querySelectorAll('.fc-day-selected').forEach(el => el.classList.remove('fc-day-selected'));
                const cell = document.querySelector(`.fc-day[data-date="${dateStr}"]`);
                if (cell) {
                    cell.classList.add('fc-day-selected');
                }
            };

            calendar = new FullCalendar.Calendar(calendarEl, {
                initialView: 'dayGridMonth',
                initialDate: minDate,
                height: 'auto',
                selectable: true,
                headerToolbar: {
                    left: 'prev,next today',
                    center: 'title',
                    right: ''
                },
                selectAllow(selectionInfo) {
                    return podeSelecionarData(selectionInfo.startStr, selectionInfo.start);
                },
                select(info) {
                    processarSelecaoDeData(info.startStr, info.start);
                },
                dateClick(info) {
                    processarSelecaoDeData(info.dateStr, info.date);
                },
                datesSet() {
                    atualizarDisponibilidadeCalendario();
                },
                dayCellDidMount(arg) {
                    const dateStr = formatIsoDate(arg.date);
                    diaCellRefs.set(dateStr, { el: arg.el, date: new Date(arg.date.valueOf()) });
                    aplicarClassesDia(dateStr, arg.date, arg.el);
                },
                dayCellWillUnmount(arg) {
                    const dateStr = formatIsoDate(arg.date);
                    diaCellRefs.delete(dateStr);
                }
            });
        }

        criarCalendarioSeNecessario();

        function getSelectedServiceIds() {
            const checked = categoriasContainer
                ? categoriasContainer.querySelectorAll('input[type="checkbox"]:checked')
                : (legacyServicosContainer ? legacyServicosContainer.querySelectorAll('input[type="checkbox"]:checked') : []);
            return Array.from(checked).map(input => parseInt(input.value, 10)).filter(Number.isFinite);
        }

        function existeCategoriaDuplicada() {
            if (!categoriasContainer) return false;
            const values = Array.from(categoriasContainer.querySelectorAll('select.categoria'))
                .map(sel => sel.value)
                .filter(Boolean);
            return new Set(values).size !== values.length;
        }

        function renderServicosParaCategoria(categoria, container) {
            if (!container) return;
            container.innerHTML = '';
            if (!categoria) return;
            const lista = servicosPorCategoria.get(categoria) || [];
            lista.forEach(servico => {
                container.appendChild(criarLabelServico(servico));
            });
        }

        function preencherOpcoesCategoria(select) {
            if (!select) return;
            select.innerHTML = '<option value="">-- Escolha uma Categoria --</option>';
            categoriasDisponiveis.forEach(cat => {
                const option = document.createElement('option');
                option.value = cat;
                option.textContent = cat;
                select.appendChild(option);
            });
            select.disabled = categoriasDisponiveis.length === 0;
        }

        function setupCategoriaSelect(select, container) {
            if (!select || !container) return;
            preencherOpcoesCategoria(select);
            if (select.dataset.agendamentoBound === 'true') return;
            select.dataset.agendamentoBound = 'true';
            select.addEventListener('change', () => {
                const categoria = select.value;
                if (!categoria) {
                    container.innerHTML = '';
                    onServicesChange();
                    return;
                }
                if (existeCategoriaDuplicada()) {
                    alert('Você já selecionou esta categoria. Escolha outra.');
                    select.value = '';
                    container.innerHTML = '';
                    onServicesChange();
                    return;
                }
                renderServicosParaCategoria(categoria, container);
                onServicesChange();
            });
        }

        function atualizarTotal(selectedIds) {
            if (!selectedIds || selectedIds.length === 0) {
                totalInfo.textContent = 'Total: Preço R$ 0,00';
                return;
            }
            let total = 0;
            selectedIds.forEach(id => {
                const servico = servicoPorId.get(id);
                if (!servico) return;
                const preco = Number(servico.preco);
                if (!Number.isNaN(preco)) {
                    total += preco;
                }
            });
            totalInfo.textContent = `Total: Preço R$ ${total.toFixed(2).replace('.', ',')}`;
        }

        function calcularProfissionaisComuns(ids) {
            if (!ids || ids.length === 0) return [];
            const contagem = new Map();
            for (const id of ids) {
                const conjunto = profissionaisPorServico.get(id);
                if (!conjunto || conjunto.size === 0) {
                    return [];
                }
                conjunto.forEach(pid => {
                    contagem.set(pid, (contagem.get(pid) || 0) + 1);
                });
            }
            const resultado = [];
            contagem.forEach((count, pid) => {
                if (count === ids.length) {
                    resultado.push({
                        id_profissional: pid,
                        nome: profissionaisPorId.get(pid) || `Profissional ${pid}`
                    });
                }
            });
            resultado.sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
            return resultado;
        }

        function atualizarProfissionaisDisponiveis(selectedIds) {
            profissionalSelect.innerHTML = '<option value="">-- Escolha um Profissional --</option>';
            calendarioGroup.style.display = 'none';
            horaSelect.innerHTML = '<option value="">-- Escolha um Horário --</option>';
            horariosMsg.style.display = 'none';
            submitBtn.disabled = true;
            limparObservacoes();
            if (profissionaisMsg) {
                profissionaisMsg.textContent = '';
                profissionaisMsg.style.display = 'none';
            }
            diasTrabalhoIndices = [];
            limparDisponibilidade();
            if (calendar) {
                calendar.unselect();
            }

            if (!selectedIds || selectedIds.length === 0) {
                profissionalGroup.style.display = 'none';
                return;
            }

            const disponiveis = calcularProfissionaisComuns(selectedIds);
            if (disponiveis.length === 0) {
                profissionalGroup.style.display = 'none';
                if (profissionaisMsg) {
                    profissionaisMsg.textContent = 'Nenhum profissional atende todos os serviços selecionados.';
                    profissionaisMsg.style.display = 'block';
                }
                return;
            }

            disponiveis.forEach(prof => {
                const option = document.createElement('option');
                option.value = prof.id_profissional;
                option.textContent = prof.nome;
                profissionalSelect.appendChild(option);
            });
            profissionalGroup.style.display = 'block';
        }

        const onServicesChange = () => {
            const selectedIds = getSelectedServiceIds();
            atualizarTotal(selectedIds);
            atualizarProfissionaisDisponiveis(selectedIds);
        };

        if (categoriasContainer) categoriasContainer.addEventListener('change', onServicesChange);
        if (legacyServicosContainer) legacyServicosContainer.addEventListener('change', onServicesChange);

        async function carregarDadosConfiguracao() {
            servicoPorId.clear();
            servicosPorCategoria.clear();
            profissionaisPorId.clear();
            profissionaisPorServico.clear();
            categoriasDisponiveis = [];
            dadosCarregados = false;

            try {
                const resp = await fetch('/api/agendamento/opcoes');
                if (!resp.ok) {
                    throw new Error(`HTTP ${resp.status}`);
                }
                const payload = await resp.json();
                const servicos = payload.servicos || [];

                servicos.forEach(servico => {
                    const id = Number(servico.id_servico);
                    if (!Number.isFinite(id)) return;
                    const categoria = servico.categoria || 'Outros';

                    servicoPorId.set(id, {
                        id_servico: id,
                        nome: servico.nome,
                        categoria: categoria,
                        preco: servico.preco,
                        duracao_minutos: servico.duracao_minutos
                    });

                    if (!servicosPorCategoria.has(categoria)) {
                        servicosPorCategoria.set(categoria, []);
                    }
                    servicosPorCategoria.get(categoria).push(servicoPorId.get(id));

                    const profissionais = servico.profissionais || [];
                    const conjunto = new Set();
                    profissionais.forEach(prof => {
                        if (!prof) return;
                        const pid = Number(prof.id_profissional);
                        if (!Number.isFinite(pid)) return;
                        conjunto.add(pid);
                        if (!profissionaisPorId.has(pid)) {
                            profissionaisPorId.set(pid, prof.nome || `Profissional ${pid}`);
                        }
                    });
                    profissionaisPorServico.set(id, conjunto);
                });

                servicosPorCategoria.forEach(lista => {
                    lista.sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
                });
                categoriasDisponiveis = Array.from(servicosPorCategoria.keys()).sort((a, b) => a.localeCompare(b, 'pt-BR'));

                dadosCarregados = categoriasDisponiveis.length > 0;
            } catch (error) {
                console.error('Erro ao carregar dados de agendamento:', error);
                dadosCarregados = false;
            }
        }

        if (addCategoriaBtn && !addCategoriaBtn.dataset.agendamentoBound) {
            addCategoriaBtn.dataset.agendamentoBound = 'true';
            addCategoriaBtn.addEventListener('click', () => {
                if (!dadosCarregados) {
                    return;
                }
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
                const novoSelect = newGroup.querySelector('select.categoria');
                const novoContainer = newGroup.querySelector('.servicos-checkboxes');
                setupCategoriaSelect(novoSelect, novoContainer);
            });
        }

        profissionalSelect.addEventListener('change', () => {
            const idProfissional = profissionalSelect.value;
            limparObservacoes();
            if (profissionaisMsg) {
                profissionaisMsg.style.display = 'none';
            }
            if (calendar) {
                calendar.unselect();
            }
            limparDisponibilidade();
            if (idProfissional) {
                criarCalendarioSeNecessario();
                fetch(`/api/profissional/${idProfissional}`)
                    .then(res => res.json())
                    .then(data => {
                        const daysMap = { 'segunda': 1, 'terca': 2, 'quarta': 3, 'quinta': 4, 'sexta': 5, 'sabado': 6, 'domingo': 0 };
                        const dias = (data.dias_trabalho || []).map(d => daysMap[d.toLowerCase()]);
                        diasTrabalhoIndices = dias;
                        calendar.setOption('businessHours', {
                            daysOfWeek: dias,
                            startTime: data.horario_inicio,
                            endTime: data.horario_fim
                        });
                        reaplicarClassesDias();
                        horaSelect.innerHTML = '<option value="">-- Escolha um Horário --</option>';
                        horariosMsg.style.display = 'none';
                        calendarioGroup.style.display = 'block';
                        if (!calendarRendered) {
                            calendarRendered = true;
                            calendar.render();
                            calendar.gotoDate(minDate);
                        } else {
                            calendar.updateSize();
                            calendar.gotoDate(minDate);
                        }
                        atualizarDisponibilidadeCalendario();
                    })
                    .catch(err => {
                        console.error('Erro ao carregar dias de trabalho:', err);
                        diasTrabalhoIndices = [];
                        limparDisponibilidade();
                        calendarioGroup.style.display = 'none';
                        horariosMsg.style.display = 'block';
                        horariosMsg.textContent = 'Erro ao carregar disponibilidade do profissional. Tente novamente.';
                    });
            } else {
                calendarioGroup.style.display = 'none';
                submitBtn.disabled = true;
                horaSelect.innerHTML = '<option value="">-- Escolha um Horário --</option>';
                horariosMsg.style.display = 'none';
                diasTrabalhoIndices = [];
                limparDisponibilidade();
            }
        });

        function carregarHorarios(data) {
            const idProfissional = profissionalSelect.value;
            const selectedIds = getSelectedServiceIds();
            if (!idProfissional || selectedIds.length === 0) {
                return;
            }
            const dataObj = parseIsoDate(data);
            if (!podeSelecionarData(data, dataObj)) {
                horaSelect.innerHTML = '<option value="">-- Escolha um Horário --</option>';
                submitBtn.disabled = true;
                horariosMsg.style.display = 'block';
                horariosMsg.textContent = 'Nenhum horário compatível com os serviços selecionados para esta data.';
                return;
            }
            limparObservacoes();
            fetch(`/api/horarios_disponiveis/${idProfissional}/${data}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id_servicos: selectedIds })
            })
            .then(res => res.json())
            .then(data => {
                horaSelect.innerHTML = '<option value="">-- Escolha um Horário --</option>';
                submitBtn.disabled = true;
                if (observacoesGroup) {
                    observacoesGroup.style.display = 'none';
                }
                if (data.error) {
                    horariosMsg.style.display = 'block';
                    horariosMsg.textContent = data.error;
                } else if (Array.isArray(data) && data.length === 0) {
                    horariosMsg.style.display = 'block';
                    horariosMsg.textContent = 'Nenhum horário disponível para os serviços selecionados nesta data.';
                } else if (Array.isArray(data)) {
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
                console.error('Erro ao carregar horários:', err);
                horariosMsg.style.display = 'block';
                horariosMsg.textContent = 'Erro ao carregar horários. Tente novamente.';
            });
        }

        horaSelect.addEventListener('change', () => {
            const selecionouHorario = Boolean(horaSelect.value);
            submitBtn.disabled = !selecionouHorario;
            if (observacoesGroup) {
                observacoesGroup.style.display = selecionouHorario ? 'block' : 'none';
            }
            if (observacoesTextarea) {
                if (selecionouHorario) {
                    observacoesTextarea.placeholder = 'Observações (opcional)';
                } else {
                    observacoesTextarea.value = '';
                    observacoesTextarea.placeholder = '';
                }
            }
        });

        agendamentoForm.addEventListener('submit', function(event) {
            event.preventDefault();
            const selectedIds = getSelectedServiceIds();
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

        (async function initAgendamento() {
            await carregarDadosConfiguracao();
            if (dadosCarregados) {
                if (categoriaInicialSelect) {
                    setupCategoriaSelect(categoriaInicialSelect, document.getElementById('servicos-checkboxes-1'));
                }
                if (legacyCategoriaSelect && legacyServicosContainer) {
                    setupCategoriaSelect(legacyCategoriaSelect, legacyServicosContainer);
                }
                if (addCategoriaBtn) {
                    addCategoriaBtn.disabled = false;
                }
            } else {
                totalInfo.textContent = 'Serviços indisponíveis no momento.';
                if (addCategoriaBtn) {
                    addCategoriaBtn.disabled = true;
                }
            }
        })();
    }  // Fim correto do if (agendamentoForm) com indentação alinhadaa
