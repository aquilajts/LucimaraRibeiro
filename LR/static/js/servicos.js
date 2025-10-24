'use strict';

(function(){
  const grid = () => document.getElementById('srv-grid');
  const fCategoria = () => document.getElementById('f-categoria');
  const fStatus = () => document.getElementById('f-status');
  const fAplicar = () => document.getElementById('f-aplicar');

  const modal = () => document.getElementById('srv-modal');
  const form = () => document.getElementById('srv-form');
  const closeBtn = () => document.querySelector('.srv-modal__close');
  const cancelarBtn = () => document.getElementById('srv-cancelar');

  const inputId = () => document.getElementById('srv-id');
  const inputNome = () => document.getElementById('srv-nome');
  const inputCategoria = () => document.getElementById('srv-categoria');
  const inputDescricao = () => document.getElementById('srv-descricao');
  const inputDuracao = () => document.getElementById('srv-duracao');
  const inputPreco = () => document.getElementById('srv-preco');
  const inputAtivo = () => document.getElementById('srv-ativo');
  const modalTitle = () => document.getElementById('srv-modal-title');
  const depSelect = () => document.getElementById('srv-dep-select');
  const depAddBtn = () => document.getElementById('srv-dep-add');
  const depList = () => document.getElementById('srv-dep-list');

  // Cache de serviços para popular o seletor de dependências
  let allServicesCache = null;
  let currentDeps = [];// array de nomes

  async function getJSON(url){
    const resp = await fetch(url, {headers: {'Accept': 'application/json'}});
    if (resp.status === 401 || resp.status === 403){
      window.location.href = '/painel/login';
      return [];
    }
    return await resp.json();
  }

  async function sendJSON(url, method, body){
    const resp = await fetch(url, {method, headers: {'Content-Type': 'application/json'}, body: JSON.stringify(body||{})});
    if (resp.status === 401 || resp.status === 403){
      window.location.href = '/painel/login';
      return {success:false};
    }
    let data = {};
    try{ data = await resp.json(); }catch{ data = {}; }
    if (!resp.ok){ throw new Error(data.error || ('HTTP '+resp.status)); }
    return data;
  }

  function currency(n){
    const v = Number(n||0);
    return v.toLocaleString('pt-BR',{minimumFractionDigits:2, maximumFractionDigits:2});
  }

  function openModal(svc){
    modal().style.display = 'flex';
    modalTitle().textContent = svc ? 'Editar serviço' : 'Novo serviço';
    (inputId()).value = svc ? svc.id_servico : '';
    (inputNome()).value = svc ? (svc.nome||'') : '';
    (inputCategoria()).value = svc ? (svc.categoria||'') : '';
    (inputDescricao()).value = svc ? (svc.descricao||'') : '';
    (inputDuracao()).value = svc ? (svc.duracao_minutos||'') : '';
    (inputPreco()).value = svc ? (svc.preco||'') : '';
    (inputAtivo()).checked = svc ? !!svc.ativo : true;

    // Dependências: parse string -> array de nomes
    const depStr = svc && typeof svc.dependencia === 'string' ? svc.dependencia : '';
    currentDeps = depStr ? depStr.split(',').map(s=>s.trim()).filter(Boolean) : [];
    renderDepsChips();
    ensureAllServicesLoaded().then(()=>{
      populateDepSelect(svc ? svc.id_servico : null);
    });
  }

  function closeModal(){ modal().style.display='none'; }

  function renderAddCard(){
    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'srv-card srv-card--add';
    card.innerHTML = '<div class="srv-card__plus">＋</div><div>Novo serviço</div>';
    card.addEventListener('click', ()=> openModal(null));
    return card;
  }

  function renderDepsChips(){
    const list = depList(); if (!list) return;
    list.innerHTML = '';
    if (!currentDeps || currentDeps.length === 0){
      const empty = document.createElement('small');
      empty.textContent = 'Nenhuma dependência adicionada.';
      empty.style.opacity = '0.7';
      list.appendChild(empty);
      return;
    }
    currentDeps.forEach(name => {
      const chip = document.createElement('span');
      chip.className = 'srv-chip';
      chip.innerHTML = `<span>${escapeHtml(name)}</span>`;
      const x = document.createElement('button');
      x.type = 'button';
      x.className = 'srv-chip__x';
      x.setAttribute('aria-label', `Remover dependência ${name}`);
      x.textContent = '×';
      x.addEventListener('click', ()=>{
        currentDeps = currentDeps.filter(n=>n!==name);
        renderDepsChips();
        populateDepSelect(inputId().value ? parseInt(inputId().value,10) : null);
      });
      chip.appendChild(x);
      list.appendChild(chip);
    });
  }

  async function ensureAllServicesLoaded(){
    if (Array.isArray(allServicesCache)) return allServicesCache;
    try{
      const data = await getJSON('/api/admin/servicos?status=todos');
      allServicesCache = Array.isArray(data) ? data : [];
    }catch{
      allServicesCache = [];
    }
    return allServicesCache;
  }

  function populateDepSelect(currentServiceId){
    const sel = depSelect(); if (!sel) return;
    const all = Array.isArray(allServicesCache) ? allServicesCache : [];
    const options = all
      .filter(s=>!currentServiceId || s.id_servico !== currentServiceId)
      .map(s=>s.nome)
      .filter(n=>n && !currentDeps.includes(n));
    sel.innerHTML = '<option value="">— Selecione um serviço —</option>' + options.map(n=>`<option>${escapeHtml(n)}</option>`).join('');
  }

  function renderCard(s){
    const el = document.createElement('article');
    el.className = 'srv-card';
    const badgeClass = s.ativo ? 'srv-card__badge srv-card__badge--on' : 'srv-card__badge srv-card__badge--off';
    el.innerHTML = ''+
      '<div class="srv-card__head">'+
      '  <div class="srv-card__title">'+escapeHtml(s.nome||'—')+'</div>'+ 
      '  <span class="'+badgeClass+'" role="button" tabindex="0" aria-pressed="'+(s.ativo?'true':'false')+'">'+(s.ativo?'Ativo':'Inativo')+'</span>'+
      '</div>'+
      '<div class="srv-card__meta">'+
      '  <span>'+escapeHtml(s.categoria||'—')+'</span>'+
      '  <span>•</span>'+
      '  <span>'+Number(s.duracao_minutos||0)+' min</span>'+
      '</div>'+
      '<div class="srv-card__price">R$ '+currency(s.preco)+'</div>';
    el.addEventListener('click', ()=> openModal(s));

    // Toggle direto do status ao clicar no badge
    const badge = el.querySelector('.srv-card__badge');
    if (badge){
      const setBadge = (active)=>{
        badge.textContent = active ? 'Ativo' : 'Inativo';
        badge.setAttribute('aria-pressed', active ? 'true' : 'false');
        badge.classList.remove('srv-card__badge--on','srv-card__badge--off');
        badge.classList.add(active ? 'srv-card__badge--on' : 'srv-card__badge--off');
      };
      badge.addEventListener('click', async (ev)=>{
        ev.stopPropagation();
        const novo = !s.ativo;
        try{
          await sendJSON('/api/admin/servicos/'+s.id_servico, 'PUT', {ativo: novo});
          s.ativo = novo;
          setBadge(novo);
        }catch(err){
          alert(err.message||'Falha ao atualizar status');
        }
      });
      badge.addEventListener('keydown', (ev)=>{
        if (ev.key === 'Enter' || ev.key === ' '){
          ev.preventDefault();
          badge.click();
        }
      });
    }
    return el;
  }

  function escapeHtml(v){
    return String(v==null?'':v).replace(/[&<>"']/g,(ch)=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[ch]||ch));
  }

  async function loadCategorias(){
    const sel = fCategoria();
    if (!sel) return;
    const cats = await getJSON('/api/admin/categorias');
    sel.innerHTML = '<option value="">Todas</option>' + (cats||[]).map(c=>'<option>'+escapeHtml(c)+'</option>').join('');
  }

  async function loadGrid(){
    const g = grid(); if (!g) return;
    const params = new URLSearchParams();
    const cat = fCategoria().value || '';
    const st = fStatus().value || 'todos';
    if (cat) params.set('categoria', cat);
    if (st) params.set('status', st);
    const url = '/api/admin/servicos' + (params.toString()?('?'+params.toString()):'');
    const data = await getJSON(url);
    g.innerHTML = '';
    g.appendChild(renderAddCard());
    (data||[]).forEach(s=> g.appendChild(renderCard(s)));
    // atualizar cache global se vazio
    if (!Array.isArray(allServicesCache) || allServicesCache.length === 0){
      allServicesCache = data || [];
    }
  }

  async function onSubmit(e){
    e.preventDefault();
    const id = inputId().value.trim();
    const body = {
      nome: inputNome().value.trim(),
      categoria: inputCategoria().value.trim(),
      descricao: inputDescricao().value.trim(),
      duracao_minutos: parseInt(inputDuracao().value||'0',10),
      preco: parseFloat(inputPreco().value||'0'),
      ativo: !!inputAtivo().checked,
      dependencia: (currentDeps||[]).join(', ')
    };
    try{
      if (id){
        await sendJSON('/api/admin/servicos/'+id, 'PUT', body);
      } else {
        await sendJSON('/api/admin/servicos', 'POST', body);
      }
      closeModal();
      await loadGrid();
    }catch(err){
      alert(err.message||'Falha ao salvar');
    }
  }

  function wire(){
    if (closeBtn()) closeBtn().addEventListener('click', closeModal);
    if (cancelarBtn()) cancelarBtn().addEventListener('click', closeModal);
    if (form()) form().addEventListener('submit', onSubmit);
    if (fAplicar()) fAplicar().addEventListener('click', loadGrid);
    if (depAddBtn()) depAddBtn().addEventListener('click', ()=>{
      const sel = depSelect();
      const val = sel && sel.value ? sel.value.trim() : '';
      if (!val) return;
      if (!currentDeps.includes(val)) currentDeps.push(val);
      renderDepsChips();
      populateDepSelect(inputId().value ? parseInt(inputId().value,10) : null);
    });
  }

  document.addEventListener('DOMContentLoaded', async ()=>{
    wire();
    await loadCategorias();
    await loadGrid();
  });
})();
