'use strict';

(function () {
    let agendamentosAtuais = [];
    let agendamentoIdAtual = null;

    const STATUS_META = {
        '🔴Desistência': { tone: 'danger', label: 'Desistencia' },
        'Desistência': { tone: 'danger', label: 'Desistencia' },
        '🔴Não veio': { tone: 'danger', label: 'Nao veio' },
        '🟡Pendente': { tone: 'warning', label: 'Pendente' },
        '🟢Atendido': { tone: 'success', label: 'Atendido' },
        '🔵Agendado': { tone: 'info', label: 'Agendado' },
        '⚫Pago': { tone: 'neutral', label: 'Pago' }
    };

    const STATUS_OPTIONS = [
        '🔴Desistência',
        '🔴Não veio',
        '🟡Pendente',
        '🟢Atendido',
        '🔵Agendado',
        '⚫Pago'
    ];

    const HTML_ESCAPE_MAP = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    };

    function escapeHtml(value) {
        if (value === null || value === undefined) return '';
        return String(value).replace(/[&<>"']/g, ch => HTML_ESCAPE_MAP[ch] || ch);
    }

    function buildStatusChip(statusRaw) {
        const raw = statusRaw || '🟡Pendente';
        const meta = STATUS_META[raw] || { tone: 'neutral', label: raw };
        const label = meta.label || raw;
        return '<span class="status-chip status-chip--' + meta.tone + '" title="' + escapeHtml(label) + '">' + escapeHtml(raw) + '</span>';
    }

    function formatarData(dataStr) {
        if (!dataStr) return 'N/A';
        const partes = dataStr.split('-');
        return partes[2] + '/' + partes[1] + '/' + partes[0];
    }

    function criarAgendamentoCard(ag) {
        const card = document.createElement('article');
        card.className = 'booking-card';

        const telefoneRaw = ag.cliente_telefone ? String(ag.cliente_telefone) : '';
        const telefoneDigits = telefoneRaw.replace(/\D/g, '');
        const telefone = telefoneDigits ? escapeHtml(telefoneRaw) : '—';
        const whatsappHref = telefoneDigits ? 'https://wa.me/55' + telefoneDigits : '';
        const servicosLista = Array.isArray(ag.servicos_nomes) && ag.servicos_nomes.length
            ? ag.servicos_nomes.map(escapeHtml).join(', ')
            : 'N/A';
        const precoNumero = Number(ag.preco_total ?? ag.preco ?? 0);
        const precoFormatado = Number.isFinite(precoNumero) ? precoNumero.toFixed(2) : '0.00';
        const currentStatus = ag.status || '🟡Pendente';
        const statusChip = buildStatusChip(currentStatus);
        const statusSelectId = 'status-' + escapeHtml(String(ag.id_agendamento));
        const statusChoices = STATUS_OPTIONS.includes(currentStatus)
            ? STATUS_OPTIONS.slice()
            : STATUS_OPTIONS.concat(currentStatus);
        const statusOptionsHtml = statusChoices
            .map(statusValue => {
                const escaped = escapeHtml(statusValue);
                const selectedAttr = statusValue === currentStatus ? ' selected' : '';
                return '<option value="' + escaped + '"' + selectedAttr + '>' + escaped + '</option>';
            })
            .join('');
        const telefoneHtml = telefoneDigits
            ? telefone + ' <a class="booking-card__phone-link" href="' + whatsappHref + '" target="_blank" rel="noopener" aria-label="Conversar pelo WhatsApp com ' + escapeHtml(ag.cliente_nome || 'cliente') + '">📱</a>'
            : telefone;

        card.innerHTML = '' +
            '<div class="booking-card__header">' +
            '    <button class="booking-card__toggle" type="button" aria-expanded="false">' +
            '        <div class="booking-card__summary">' +
            '            <div class="booking-card__summary-main">' +
            '                <span class="booking-card__date">' + escapeHtml(formatarData(ag.data_agendamento)) + '</span>' +
            '                <span class="booking-card__time">' + escapeHtml(ag.hora_agendamento || '—') + '</span>' +
            '            </div>' +
            '            <div class="booking-card__summary-side">' +
            '                <span class="booking-card__client">' + escapeHtml(ag.cliente_nome || 'Cliente nao identificado') + '</span>' +
            '                <span class="booking-card__summary-status">' + statusChip + '</span>' +
            '            </div>' +
            '        </div>' +
            '        <span class="booking-card__chevron" aria-hidden="true"></span>' +
            '    </button>' +
            '    <button type="button" class="details-btn booking-card__manage-btn" data-id="' + escapeHtml(String(ag.id_agendamento)) + '">Gerenciar</button>' +
            '</div>' +
            '<div class="booking-card__details">' +
            '    <dl class="booking-card__meta">' +
            '        <div><dt>Telefone</dt><dd>' + telefoneHtml + '</dd></div>' +
            '        <div><dt>Duracao total</dt><dd>' + escapeHtml(String(ag.duracao_total || 0)) + ' min</dd></div>' +
            '        <div><dt>Preco</dt><dd>R$ ' + precoFormatado + '</dd></div>' +
            '        <div><dt>Status</dt><dd><div class="booking-card__status-control"><select id="' + statusSelectId + '" class="booking-card__status-select">' + statusOptionsHtml + '</select></div></dd></div>' +
            '    </dl>' +
            '    <div class="booking-card__services">' +
            '        <strong>Servicos</strong>' +
            '        <p>' + servicosLista + '</p>' +
            '    </div>' +
            '</div>';

        const toggleBtn = card.querySelector('.booking-card__toggle');
        const details = card.querySelector('.booking-card__details');
        const manageBtn = card.querySelector('.booking-card__manage-btn');
        const statusSelect = card.querySelector('.booking-card__status-select');
        const summaryStatusWrapper = card.querySelector('.booking-card__summary-status');
        let currentStatusValue = currentStatus;

        if (toggleBtn && details) {
            details.hidden = true;
            toggleBtn.addEventListener('click', () => {
                const isOpen = card.classList.toggle('booking-card--open');
                toggleBtn.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
                details.hidden = !isOpen;
            });
        }

        if (manageBtn) {
            manageBtn.addEventListener('click', () => {
                agendamentoIdAtual = ag.id_agendamento;
                mostrarDetalhes(String(ag.id_agendamento));
            });
        }

        if (statusSelect) {
            statusSelect.addEventListener('change', async (event) => {
                const newStatus = event.target.value;
                if (!newStatus || newStatus === currentStatusValue) {
                    return;
                }

                statusSelect.disabled = true;
                statusSelect.classList.add('booking-card__status-select--loading');

                try {
                    const response = await fetch('/api/agendamento/' + ag.id_agendamento + '/status', {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ status: newStatus })
                    });
                    let result = {};
                    try {
                        result = await response.json();
                    } catch (parseError) {
                        console.error('Erro ao interpretar resposta da atualizacao de status:', parseError);
                    }
                    if (!response.ok || !result.success) {
                        throw new Error(result.error || 'Nao foi possivel atualizar o status.');
                    }
                    currentStatusValue = newStatus;
                    if (summaryStatusWrapper) {
                        summaryStatusWrapper.innerHTML = buildStatusChip(newStatus);
                    }
                    const alvo = agendamentosAtuais.find(item => String(item.id_agendamento) === String(ag.id_agendamento));
                    if (alvo) {
                        alvo.status = newStatus;
                    }
                } catch (error) {
                    console.error('Erro ao atualizar status:', error);
                    alert(error.message || 'Erro ao atualizar status.');
                    statusSelect.value = currentStatusValue;
                } finally {
                    statusSelect.disabled = false;
                    statusSelect.classList.remove('booking-card__status-select--loading');
                }
            });
        }

        return card;
    }

    async function carregarProfissionaisFiltro() {
        try {
            const select = document.getElementById('prof-select');
            if (!select) {
                return;
            }

            const response = await fetch('/api/profissionais');
            if (!response.ok) throw new Error('HTTP ' + response.status + ' - ' + response.statusText);
            const data = await response.json();
            select.innerHTML = '<option value="">Todos</option>';
            data.forEach(prof => {
                const option = document.createElement('option');
                option.value = prof.id_profissional;
                option.textContent = prof.nome;
                select.appendChild(option);
            });
        } catch (error) {
            console.error('Erro ao carregar profissionais (filtro):', error);
        }
    }

    async function carregarStatus() {
        try {
            const content = document.getElementById('status-dropdown-content');
            if (!content) return;
            const response = await fetch('/api/status');
            const data = await response.json();
            content.innerHTML = '';
            data.forEach(status => {
                const label = document.createElement('label');
                label.innerHTML = '<input type="checkbox" value="' + status + '" onchange="updateStatusFilter()"> ' + status;
                content.appendChild(label);
            });
        } catch (error) {
            console.error('Erro ao carregar status:', error);
        }
    }

    async function carregarAgendamentos() {
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
            let url = profId ? '/api/agendamentos_profissional/' + profId : '/api/agendamentos_todos';
            const params = new URLSearchParams();
            if (statusValues.length > 0) {
                statusValues.forEach(status => {
                    params.append('status', status);
                });
            }
            if (startDate) params.append('start_date', startDate);
            if (endDate) params.append('end_date', endDate);

            const fullUrl = params.toString() ? url + '?' + params.toString() : url;
            titulo.textContent = profId ? 'Agendamentos de ' + document.querySelector('#prof-select option[value="' + profId + '"]').textContent : 'Todos os Agendamentos';

            const response = await fetch(fullUrl);
            if (!response.ok) throw new Error('HTTP ' + response.status + ' - ' + response.statusText);

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

    function atualizarEndDate() {
        const startDateInput = document.getElementById('start-date');
        const endDateInput = document.getElementById('end-date');
        if (startDateInput && endDateInput && startDateInput.value) {
            const startDate = new Date(startDateInput.value);
            startDate.setDate(startDate.getDate() + 15);
            endDateInput.value = startDate.toISOString().split('T')[0];
        }
    }

    async function mostrarDetalhes(id) {
        try {
            agendamentoIdAtual = id;
            const response = await fetch('/api/agendamento/' + id);
            if (!response.ok) throw new Error('Erro carregando detalhes');

            const data = await response.json();
            const conteudoModal = document.getElementById('conteudo-modal');
            const updateForm = document.getElementById('update-form');
            const servicesCheckboxes = document.getElementById('services-checkboxes');

            conteudoModal.innerHTML = '' +
                '<p><strong>Cliente:</strong> ' + data.cliente + '</p>' +
                '<p><strong>Data/Hora:</strong> ' + data.data_hora_completa + '</p>' +
                '<p><strong>Telefone:</strong> ' + data.telefone + '</small></p>' +
                '<p><strong>Servicos:</strong> ' + (data.servicos.join(', ') || 'N/A') + '</p>' +
                '<p><strong>Total:</strong> ' + data.preco + ' (' + data.duracao + ')</p>' +
                '<p><strong>Status:</strong> ' + data.status + '</p>' +
                '<p><strong>Observacoes:</strong> ' + data.observacoes + '</p>';

            const dataPartes = data.data_hora_completa.split(' as ');
            const dataFormatada = dataPartes[0];
            const horaFormatada = dataPartes[1];
            const partesData = dataFormatada.split('/');
            document.getElementById('new-date').value = partesData[2] + '-' + partesData[1].padStart(2, '0') + '-' + partesData[0].padStart(2, '0');
            document.getElementById('new-time').value = horaFormatada;
            document.getElementById('status').value = data.status;

            const servicesResponse = await fetch('/api/servicos');
            const servicesData = await servicesResponse.json();
            servicesCheckboxes.innerHTML = '';
            const servicosAtuais = data.servicos || [];
            servicesData.forEach(service => {
                const div = document.createElement('div');
                div.className = 'checkbox-group';
                div.innerHTML = '' +
                    '<input type="checkbox" id="service-' + service.id_servico + '" name="services" value="' + service.id_servico + '" ' + (servicosAtuais.includes(service.nome) ? 'checked' : '') + '>' +
                    '<label for="service-' + service.id_servico + '">' + service.nome + '</label>';
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

    function fecharModal(event) {
        if (event) event.stopPropagation();
        const modal = document.getElementById('modal-detalhes');
        const updateForm = document.getElementById('update-form');
        modal.style.display = 'none';
        updateForm.style.display = 'none';
        agendamentoIdAtual = null;
    }

    function initModalEvents() {
        const closeBtn = document.querySelector('.close');
        if (closeBtn) closeBtn.addEventListener('click', fecharModal);

        const modal = document.getElementById('modal-detalhes');
        const modalContent = document.querySelector('.modal-content');
        if (modal && modalContent) {
            modal.addEventListener('click', function (event) {
                if (event.target === modal) fecharModal(event);
            });
            modalContent.addEventListener('click', function (event) {
                event.stopPropagation();
            });
        }
    }

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
        const btn = document.getElementById('status-dropdown-btn');
        if (btn) {
            btn.textContent = selectedValues.length > 0 ? selectedValues.join(', ') : 'Todos';
            btn.setAttribute('aria-expanded', 'false');
        }
        const content = document.getElementById('status-dropdown-content');
        if (content) content.style.display = 'none';
        carregarAgendamentos();
    }

    async function initConsultaPage() {
        const profSelect = document.getElementById('prof-select');
        if (!profSelect) return;

        try {
            await carregarProfissionaisFiltro();
            await carregarStatus();
            const today = new Date().toISOString().split('T')[0];
            const startDateInput = document.getElementById('start-date');
            if (startDateInput) {
                startDateInput.value = today;
                atualizarEndDate();
            }
            await carregarAgendamentos();
        } catch (error) {
            console.error('Erro na inicializacao da pagina de consultas:', error);
        }

        initModalEvents();

        const updateForm = document.getElementById('update-form');
        if (updateForm) {
            updateForm.addEventListener('submit', async function (event) {
                event.preventDefault();
                event.stopPropagation();

                if (!agendamentoIdAtual) {
                    alert('Erro: ID do agendamento nao encontrado');
                    return;
                }

                const newDate = document.getElementById('new-date').value;
                const newTime = document.getElementById('new-time').value;
                const services = Array.from(document.querySelectorAll('#services-checkboxes input[type="checkbox"]:checked')).map(cb => parseInt(cb.value, 10));
                const status = document.getElementById('status').value;

                if (!newDate || !newTime || services.length === 0) {
                    alert('Por favor, preencha todos os campos obrigatorios');
                    return;
                }

                try {
                    const response = await fetch('/api/agendamento/' + agendamentoIdAtual, {
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
                        alert('Alteracoes salvas com sucesso!');
                        fecharModal();
                        carregarAgendamentos();
                    } else {
                        throw new Error(result.error || 'Falha ao salvar alteracoes');
                    }
                } catch (error) {
                    console.error('Erro ao salvar:', error);
                    alert('Erro ao salvar: ' + error.message);
                }
            });
        }
    }

    document.addEventListener('DOMContentLoaded', () => {
        initConsultaPage();
    });

    window.carregarAgendamentos = carregarAgendamentos;
    window.toggleStatusDropdown = toggleStatusDropdown;
    window.updateStatusFilter = updateStatusFilter;
    window.fecharModal = fecharModal;
    window.atualizarEndDate = atualizarEndDate;
    window.mostrarDetalhes = mostrarDetalhes;
})();
