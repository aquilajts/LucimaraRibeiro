'use strict';

(function () {
    function initAgendamentoPage() {
        const agendamentoForm = document.getElementById('agendamento-form');
        if (!agendamentoForm) return;

        const utils = window.LR || {};
        const applyLoadingEffect = typeof utils.applyLoadingEffect === 'function' ? utils.applyLoadingEffect : () => {};
        const resetButton = typeof utils.resetButton === 'function' ? utils.resetButton : () => {};

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
                return 'Valor indisponivel';
            }
            const numero = Number(valor);
            if (Number.isFinite(numero)) {
                return 'R$ ' + numero.toFixed(2).replace('.', ',');
            }
            return 'R$ ' + valor;
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
            precoSpan.textContent = ' - ' + formatarPreco(servico.preco);
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

        const formatIsoDate = (dateObj) => {
            const tzDate = new Date(dateObj.getTime() - dateObj.getTimezoneOffset() * 60000);
            return tzDate.toISOString().split('T')[0];
        };

        const parseIsoDate = (iso) => {
            const parts = iso.split('-').map(Number);
            return new Date(parts[0], parts[1] - 1, parts[2]);
        };

        const normalizarServicos = (ids) => ids.slice().sort((a, b) => a - b);

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

            const contexto = profId + '|' + idsOrdenados.join('-');
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
                const cacheKey = contexto + '|' + iso;
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
                    return fetch('/api/horarios_disponiveis/' + profId + '/' + item.iso, {
                        method: 'POST',
                        headers,
                        body: payload
                    })
                        .then(res => (res.ok ? res.json() : Promise.reject(new Error('HTTP ' + res.status))))
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
                        horariosMsg.textContent = 'Nenhum horario compativel com os servicos selecionados para esta data.';
                    }
                    if (calendar) {
                        calendar.unselect();
                    }
                    return;
                }

                dataInput.value = dateStr;
                carregarHorarios(dateStr);

                document.querySelectorAll('.fc-day-selected').forEach(el => el.classList.remove('fc-day-selected'));
                const cell = document.querySelector('.fc-day[data-date="' + dateStr + '"]');
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
            return Array.from(checked)
                .map(input => parseInt(input.value, 10))
                .filter(Number.isFinite);
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
                    alert('Voce ja selecionou esta categoria. Escolha outra.');
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
                totalInfo.textContent = 'Total: Preco R$ 0,00';
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
            totalInfo.textContent = 'Total: Preco R$ ' + total.toFixed(2).replace('.', ',');
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
                        nome: profissionaisPorId.get(pid) || 'Profissional ' + pid
                    });
                }
            });
            resultado.sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
            return resultado;
        }

        function atualizarProfissionaisDisponiveis(selectedIds) {
            profissionalSelect.innerHTML = '<option value="">-- Escolha um Profissional --</option>';
            calendarioGroup.style.display = 'none';
            horaSelect.innerHTML = '<option value="">-- Escolha um Horario --</option>';
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
                    profissionaisMsg.textContent = 'Nenhum profissional atende todos os servicos selecionados.';
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
                    throw new Error('HTTP ' + resp.status);
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
                            profissionaisPorId.set(pid, prof.nome || 'Profissional ' + pid);
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
                newGroup.innerHTML = '' +
                    '<label for="categoria-' + categoriaCount + '">Outra Categoria:</label>' +
                    '<select id="categoria-' + categoriaCount + '" class="categoria" required>' +
                    '    <option value="">-- Escolha uma Categoria --</option>' +
                    '</select>' +
                    '<div id="servicos-checkboxes-' + categoriaCount + '" class="servicos-checkboxes"></div>';
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
                fetch('/api/profissional/' + idProfissional)
                    .then(res => res.json())
                    .then(data => {
                        const daysMap = { segunda: 1, terca: 2, quarta: 3, quinta: 4, sexta: 5, sabado: 6, domingo: 0 };
                        const dias = (data.dias_trabalho || []).map(d => daysMap[d.toLowerCase()]);
                        diasTrabalhoIndices = dias;
                        calendar.setOption('businessHours', {
                            daysOfWeek: dias,
                            startTime: data.horario_inicio,
                            endTime: data.horario_fim
                        });
                        reaplicarClassesDias();
                        horaSelect.innerHTML = '<option value="">-- Escolha um Horario --</option>';
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
                horaSelect.innerHTML = '<option value="">-- Escolha um Horario --</option>';
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
                horaSelect.innerHTML = '<option value="">-- Escolha um Horario --</option>';
                submitBtn.disabled = true;
                horariosMsg.style.display = 'block';
                horariosMsg.textContent = 'Nenhum horario compativel com os servicos selecionados para esta data.';
                return;
            }
            limparObservacoes();
            fetch('/api/horarios_disponiveis/' + idProfissional + '/' + data, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id_servicos: selectedIds })
            })
                .then(res => res.json())
                .then(data => {
                    horaSelect.innerHTML = '<option value="">-- Escolha um Horario --</option>';
                    submitBtn.disabled = true;
                    if (observacoesGroup) {
                        observacoesGroup.style.display = 'none';
                    }
                    if (data.error) {
                        horariosMsg.style.display = 'block';
                        horariosMsg.textContent = data.error;
                    } else if (Array.isArray(data) && data.length === 0) {
                        horariosMsg.style.display = 'block';
                        horariosMsg.textContent = 'Nenhum horario disponivel para os servicos selecionados nesta data.';
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
                    console.error('Erro ao carregar horarios:', err);
                    horariosMsg.style.display = 'block';
                    horariosMsg.textContent = 'Erro ao carregar horarios. Tente novamente.';
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
                    observacoesTextarea.placeholder = 'Observacoes (opcional)';
                } else {
                    observacoesTextarea.value = '';
                    observacoesTextarea.placeholder = '';
                }
            }
        });

        agendamentoForm.addEventListener('submit', function (event) {
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
                .catch(() => {
                    alert('Erro na conexao com o servidor.');
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
                totalInfo.textContent = 'Servicos indisponiveis no momento.';
                if (addCategoriaBtn) {
                    addCategoriaBtn.disabled = true;
                }
            }
        })();
    }

    document.addEventListener('DOMContentLoaded', initAgendamentoPage);
})();
