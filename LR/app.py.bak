from flask import Flask, render_template, request, redirect, session, url_for, jsonify
import logging
from supabase import create_client, Client
from datetime import datetime, timedelta, time
import os
import zoneinfo
import math
from dotenv import load_dotenv
from pathlib import Path

dotenv_path = Path(__file__).parent / "supa.env"
print("Carregando .env de:", dotenv_path)
load_dotenv(dotenv_path=dotenv_path)

# Configuração de logging
logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s [%(levelname)s] %(message)s',
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler('app.log')
    ]
)

# Configuração de logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(
    __name__,
    template_folder="public",
    static_folder="static"
)
app.secret_key = os.getenv('SECRET_KEY', 'nail_designer_lucimara_2025')

# Config Supabase
url = os.getenv("SUPABASE_URL")
key = os.getenv("SUPABASE_KEY")
if not url or not key:
    logger.error("SUPABASE_URL ou SUPABASE_KEY não configurados")
    supabase = None
else:
    try:
        supabase: Client = create_client(url, key)
        logger.info("Conexão com Supabase estabelecida")
    except Exception as e:
        logger.error(f"Falha ao conectar ao Supabase: {str(e)}")
        supabase = None

# Timezone
TZ = zoneinfo.ZoneInfo("America/Sao_Paulo")

# Funções Auxiliares
def usuario_logado():
    logger.debug("Verificando se usuário está logado: %s", "user" in session)
    return "user" in session

def get_user():
    user = session.get("user")
    logger.debug("Obtendo usuário da sessão: %s", user)
    return user

# APAGAR DEPOIS ----
print(f"URL: {os.getenv('SUPABASE_URL')}, Key: {os.getenv('SUPABASE_KEY')}")
# APAGAR DEPOIS ----

# Rotas existentes
@app.route("/")
def index():
    logger.info("Acessando rota /index")
    return render_template("index.html", user=get_user())

@app.route("/login", methods=["GET", "POST"])
def login():
    logger.info("Acessando rota /login, método: %s", request.method)
    erro = None
    solicitar_aniversario = False
    reset_senha = False
    nome = None
    aniversario = None

    if request.method == "POST":
        nome = request.form.get("nome")
        senha = request.form.get("senha")
        logger.info("Tentativa de login - Nome: %s", nome)

        if not nome or not senha:
            erro = "Preencha todos os campos."
            logger.error("Erro no login: Campos vazios")
        else:
            if supabase:
                email = f"{nome.lower().replace(' ', '_')}@naildesigner.com"
                logger.debug("Consultando cliente no Supabase - Nome_lower: %s, Email: %s", nome.lower(), email)
                cliente = supabase.table("clientes").select("*").eq("nome_lower", nome.lower()).execute()
                logger.debug("Resposta da query clientes: %s", cliente.data)

                if cliente.data:
                    cliente = cliente.data[0]
                    if cliente.get("senha") == senha:
                        if not cliente.get("aniversario") or cliente.get("aniversario") == '0001-01-01':
                            session["temp_user"] = cliente
                            solicitar_aniversario = True
                            logger.info("Usuário %s sem aniversário, solicitando", nome)
                        else:
                            session["user"] = cliente
                            logger.info("Usuário %s logado com sucesso", nome)
                            return redirect(url_for("agendamento"))
                    else:
                        erro = "Senha incorreta."
                        logger.error("Erro no login: Senha incorreta para %s", nome)
                else:
                    data = {
                        "nome": nome,
                        "email": email,
                        "senha": senha,
                        "telefone": None
                    }
                    try:
                        logger.debug("Cadastrando novo usuário: %s", data)
                        novo = supabase.table("clientes").insert(data).execute()
                        session["temp_user"] = novo.data[0]
                        solicitar_aniversario = True
                        logger.info("Novo usuário %s cadastrado", nome)
                    except Exception as e:
                        erro = "Erro ao cadastrar usuário."
                        logger.error("Erro ao cadastrar: %s", str(e))
            else:
                if nome == "demo" and senha == "123456":
                    session["user"] = {"nome": "Demo"}
                    logger.info("Login demo bem-sucedido")
                    return redirect(url_for("agendamento"))
                else:
                    erro = "Usuário demo inválido."
                    logger.error("Erro no login demo")

    logger.debug("Renderizando login.html com erro: %s, solicitar_aniversario: %s", erro, solicitar_aniversario)
    return render_template("login.html", erro=erro, solicitar_aniversario=solicitar_aniversario,
                          reset_senha=reset_senha, nome=nome, aniversario=aniversario, supabase=supabase)

@app.route("/atualizar_aniversario", methods=["POST"])
def atualizar_aniversario():
    logger.info("Acessando rota /atualizar_aniversario")
    if "temp_user" not in session:
        logger.error("Sessão temp_user ausente")
        return redirect(url_for("login"))

    aniversario = request.form.get("aniversario")
    telefone = request.form.get("telefone")
    logger.info("Atualizando aniversário: %s, telefone: %s", aniversario, telefone)

    user = session["temp_user"]
    if supabase:
        try:
            logger.debug("Atualizando cliente no Supabase - id_cliente: %s", user["id_cliente"])
            supabase.table("clientes").update({
                "aniversario": aniversario,
                "telefone": telefone
            }).eq("id_cliente", user["id_cliente"]).execute()
            user["aniversario"] = aniversario
            user["telefone"] = telefone
            session["user"] = user
            session.pop("temp_user", None)
            logger.info("Usuário atualizado e temp_user removido")
            return redirect(url_for("agendamento"))
        except Exception as e:
            logger.error("Erro ao atualizar aniversário: %s", str(e))
            return jsonify(erro="Erro ao salvar dados."), 500
    return redirect(url_for("agendamento"))

@app.route("/esqueci_senha", methods=["POST"])
def esqueci_senha():
    logger.info("Acessando rota /esqueci_senha")
    nova_senha = request.form.get("nova_senha")
    logger.debug("Nova senha presente: %s", bool(nova_senha))

    nome = request.form.get("nome", "").strip().lower()
    aniversario = request.form.get("aniversario")

    if not nova_senha:
        logger.info("Validação de nome e aniversário - Nome: %s, Aniversário: %s", nome, aniversario)
        if not nome or not aniversario:
            logger.error("Campos nome/aniv vazios")
            return jsonify({"success": False, "error": "Preencha todos os campos."})

        if not supabase:
            logger.error("Supabase não inicializado")
            return jsonify({"success": False, "error": "Erro no servidor."})

        try:
            logger.debug("Consultando cliente no Supabase - Nome_lower: %s", nome)
            cliente = supabase.table("clientes").select("*").eq("nome_lower", nome).execute()
            logger.debug("Resposta da query clientes: %s", cliente.data)
            if cliente.data:
                cliente = cliente.data[0]
                logger.debug("Cliente encontrado: %s", cliente)
                if str(cliente.get("aniversario")) == aniversario:
                    logger.info("Validação bem-sucedida para %s", nome)
                    return jsonify({"success": True})
                else:
                    logger.error("Dados de aniversário não conferem para %s", nome)
                    return jsonify({"success": False, "error": "Dados não conferem."})
            else:
                logger.error("Usuário não encontrado: %s", nome)
                return jsonify({"success": False, "error": "Usuário não encontrado."})
        except Exception as e:
            logger.error("Erro Supabase em /esqueci_senha: %s", str(e))
            return jsonify({"success": False, "error": f"Erro no servidor: {str(e)}"})

    else:
        logger.info("Redefinindo senha para Nome: %s, Aniversário: %s", nome, aniversario)
        if not nome or not aniversario:
            logger.error("Campos nome/aniv ausentes")
            return jsonify({"success": False, "error": "Erro na recuperação de senha."})

        if not supabase:
            logger.error("Supabase não inicializado")
            return jsonify({"success": False, "error": "Erro no servidor."})

        try:
            logger.debug("Consultando cliente para redefinição de senha - Nome_lower: %s", nome)
            cliente = supabase.table("clientes").select("*").eq("nome_lower", nome).execute()
            logger.debug("Resposta da query clientes: %s", cliente.data)
            if cliente.data:
                cliente = cliente.data[0]
                if str(cliente.get("aniversario")) == aniversario:
                    if len(nova_senha) < 6:
                        logger.error("Nova senha muito curta para %s", nome)
                        return jsonify({"success": False, "error": "A nova senha deve ter pelo menos 6 dígitos."})
                    logger.debug("Atualizando senha no Supabase - id_cliente: %s", cliente["id_cliente"])
                    supabase.table("clientes").update({"senha": nova_senha}).eq("id_cliente", cliente["id_cliente"]).execute()
                    logger.info("Senha redefinida com sucesso para %s", nome)
                    return redirect(url_for("login", msg="Senha redefinida com sucesso."))
                else:
                    logger.error("Dados de aniversário não conferem para %s", nome)
                    return jsonify({"success": False, "error": "Dados não conferem."})
            else:
                logger.error("Usuário não encontrado: %s", nome)
                return jsonify({"success": False, "error": "Usuário não encontrado."})
        except Exception as e:
            logger.error("Erro Supabase em /esqueci_senha: %s", str(e))
            return jsonify({"success": False, "error": f"Erro no servidor: {str(e)}"})

@app.route("/logout")
def logout():
    logger.info("Acessando rota /logout")
    session.clear()
    logger.info("Usuário deslogado")
    return redirect(url_for("index"))

@app.route("/agendamento")
def agendamento():
    logger.info("Acessando rota /agendamento")
    if not usuario_logado():
        logger.error("Acesso não autorizado a /agendamento")
        return redirect(url_for("login", msg="Faça login para agendar."))
    min_date = (datetime.now(TZ) + timedelta(days=1)).strftime('%Y-%m-%d')
    logger.debug("Renderizando agendamento.html com min_date: %s", min_date)
    return render_template("agendamento.html", user=get_user(), min_date=min_date)

# API: Calcular total de serviços (apenas preço no frontend, duração armazenada no backend)
@app.route("/api/calcular_total", methods=["POST"])
def api_calcular_total():
    logger.info("Acessando API /api/calcular_total")
    data = request.json
    id_servicos = data.get('id_servicos', [])

    # Parsing para garantir lista de inteiros
    if isinstance(id_servicos, str):
        try:
            id_servicos = [int(x.strip()) for x in id_servicos.strip("[]").split(",") if x.strip()]
        except ValueError:
            logger.error("IDs de serviços inválidos: %s", id_servicos)
            return jsonify({"success": False, "error": "IDs de serviços inválidos"}), 400
    elif isinstance(id_servicos, list):
        try:
            id_servicos = [int(x) for x in id_servicos]
        except ValueError:
            logger.error("IDs de serviços inválidos: %s", id_servicos)
            return jsonify({"success": False, "error": "IDs de serviços inválidos"}), 400
    else:
        logger.error("Formato inválido para id_servicos: %s", id_servicos)
        return jsonify({"success": False, "error": "Formato inválido para id_servicos"}), 400

    if not supabase or not id_servicos:
        logger.error("Supabase não inicializado ou lista de id_servicos vazia após parsing")
        return jsonify({"preco_total": 0.0}), 400

    try:
        servicos = supabase.table("servicos").select("preco").in_("id_servico", id_servicos).execute().data
        preco_total = sum(float(s['preco']) for s in servicos)
        logger.debug("Preço total calculado: R$ %s", preco_total)
        return jsonify({"preco_total": round(preco_total, 2)})
    except Exception as e:
        logger.error("Erro ao calcular total: %s", str(e))
        return jsonify({"success": False, "error": "Erro ao calcular totais"}), 500
    

# API: Listar categorias distintas
@app.route("/api/categorias")
def api_categorias():
    logger.info("Acessando API /api/categorias")
    if supabase:
        try:
            logger.debug("Consultando categorias no Supabase")
            categorias = supabase.table("servicos").select("categoria").eq("ativo", True).execute().data
            unique_categorias = sorted(set(cat['categoria'] for cat in categorias if cat['categoria']))
            logger.debug("Categorias encontradas: %s", unique_categorias)
            return jsonify(unique_categorias)
        except Exception as e:
            logger.error("Erro ao consultar categorias: %s", str(e))
            return jsonify([]), 500
    logger.warning("Supabase não inicializado, retornando lista vazia")
    return jsonify([])

# API: Listar serviços por categoria
@app.route("/api/servicos")
def api_servicos():
    if not supabase:
        return jsonify([])
    try:
        response = supabase.table("servicos").select("id_servico, nome").execute()
        return jsonify(response.data or [])
    except Exception as e:
        logger.error("Erro serviços: %s", str(e))
        return jsonify([])

@app.route("/api/profissionais")
def api_listar_profissionais():
    """Lista todos os profissionais ativos"""
    if not supabase:
        return jsonify([])
    
    try:
        response = supabase.table("profissionais")\
            .select("id_profissional, nome")\
            .eq("ativo", True)\
            .order("nome")\
            .execute()
        
        return jsonify(response.data or [])
    except Exception as e:
        logger.error("Erro API profissionais: %s", str(e))
        return jsonify([])

# API: Profissionais por serviço
@app.route("/api/profissionais/<int:id_servico>")
def api_profissionais(id_servico):
    logger.info("Acessando API /api/profissionais/%s", id_servico)
    if supabase:
        try:
            logger.debug("Consultando profissionais para serviço %s", id_servico)
            profs = supabase.from_("profissionais_servicos").select("profissionais!inner(id_profissional, nome)").eq("id_servico", id_servico).eq("profissionais.ativo", True).execute().data
            result = [p['profissionais'] for p in profs]
            logger.debug("Profissionais encontrados: %s", result)
            return jsonify(result)
        except Exception as e:
            logger.error("Erro ao consultar profissionais: %s", str(e))
            return jsonify([]), 500
    logger.warning("Supabase não inicializado")
    return jsonify([])

# API: Horários disponíveis
@app.route("/api/horarios_disponiveis/<int:id_profissional>/<data>", methods=["POST"])
def api_horarios_disponiveis(id_profissional, data):
    logger.info("Acessando API /api/horarios_disponiveis/%s/%s", id_profissional, data)
    data_post = request.json
    id_servicos = data_post.get('id_servicos', [])
    if not supabase:
        logger.error("Supabase não inicializado")
        return jsonify({"error": "Servidor de banco de dados não disponível"}), 500

    try:
        # Calcular duração total com buffer (armazenada, mas não retornada)
        if not id_servicos:
            logger.error("Lista de id_servicos vazia")
            return jsonify({"error": "Nenhum serviço selecionado"}), 400
        servicos = supabase.table("servicos").select("duracao_minutos").in_("id_servico", id_servicos).execute().data
        duracao_total = sum(s['duracao_minutos'] for s in servicos)
        buffer_extra = math.floor(duracao_total / 20) * 5
        duracao_total += buffer_extra
        logger.debug("Duração total ajustada: %s min", duracao_total)

        # Consultar profissional
        logger.debug("Consultando profissional %s", id_profissional)
        prof_response = supabase.table("profissionais").select("horario_inicio, horario_fim, dias_trabalho").eq("id_profissional", id_profissional).execute()
        if not prof_response.data:
            logger.error("Profissional %s não encontrado", id_profissional)
            return jsonify({"error": "Profissional não encontrado"}), 404
        prof = prof_response.data[0]
        logger.debug("Profissional encontrado: %s", prof)

        # Tentar parsear horários com diferentes formatos
        for fmt in ['%H:%M:%S', '%H:%M']:
            try:
                inicio = datetime.strptime(prof['horario_inicio'], fmt).time()
                fim = datetime.strptime(prof['horario_fim'], fmt).time()
                logger.debug("Horários parseados - Inicio: %s, Fim: %s, Formato: %s", inicio, fim, fmt)
                break
            except ValueError:
                continue
        else:
            logger.error("Formato de horário inválido para profissional %s: inicio=%s, fim=%s", id_profissional, prof['horario_inicio'], prof['horario_fim'])
            return jsonify({"error": "Formato de horário inválido no banco de dados"}), 500

        # Validar dias_trabalho
        if not isinstance(prof.get('dias_trabalho'), list):
            logger.error("dias_trabalho inválido para profissional %s: %s", id_profissional, prof.get('dias_trabalho'))
            return jsonify({"error": "Configuração de dias de trabalho inválida"}), 500

        data_dt = datetime.strptime(data, '%Y-%m-%d').date()
        dia_semana = data_dt.strftime('%A').lower()
        dia_pt = {
            'monday': 'segunda', 'tuesday': 'terca', 'wednesday': 'quarta',
            'thursday': 'quinta', 'friday': 'sexta', 'saturday': 'sabado', 'sunday': 'domingo'
        }[dia_semana]
        logger.debug("Dia da semana: %s, Dias de trabalho do profissional: %s", dia_pt, prof['dias_trabalho'])

        if dia_pt not in [d.lower() for d in prof['dias_trabalho']]:
            logger.info("Profissional %s não trabalha no dia: %s", id_profissional, dia_pt)
            return jsonify([])

        # Gerar slots possíveis (intervalos de 15min)
        slots = []
        current = datetime.combine(data_dt, inicio)
        end = datetime.combine(data_dt, fim)
        while current + timedelta(minutes=duracao_total) <= end:
            slots.append(current.strftime('%H:%M'))
            current += timedelta(minutes=15)
        logger.debug("Slots possíveis gerados: %s", slots)

        # Consultar agendamentos existentes
        logger.debug("Consultando agendamentos para profissional %s na data %s", id_profissional, data)
        agends = supabase.table("agendamentos").select("hora_agendamento, duracao_total").eq("id_profissional", id_profissional).eq("data_agendamento", data).eq("status", "pendente").execute().data
        logger.debug("Agendamentos encontrados: %s", agends)

        occupied = []
        for ag in agends:
            try:
                hora_start = datetime.strptime(ag['hora_agendamento'], '%H:%M')
                duracao = ag.get('duracao_total', 0) or 60  # Fallback se duracao_total não estiver definido
                hora_end = hora_start + timedelta(minutes=duracao)
                occupied.append((hora_start, hora_end))
            except ValueError as e:
                logger.error("Erro ao parsear hora_agendamento %s: %s", ag['hora_agendamento'], str(e))
                continue
        logger.debug("Horários ocupados: %s", occupied)

        # Filtrar slots livres
        disponiveis = []
        for slot in slots:
            slot_start = datetime.strptime(slot, '%H:%M')
            slot_end = slot_start + timedelta(minutes=duracao_total)
            livre = True
            for occ_start, occ_end in occupied:
                if not (slot_end <= occ_start or slot_start >= occ_end):
                    livre = False
                    break
            if livre:
                disponiveis.append(slot)
        logger.debug("Horários disponíveis: %s", disponiveis)

        return jsonify(disponiveis)
    except Exception as e:
        logger.error("Erro ao calcular horários disponíveis - Profissional: %s, Data: %s, Serviços: %s, Erro: %s", id_profissional, data, id_servicos, str(e))
        return jsonify({"error": f"Erro ao calcular horários: {str(e)}"}), 500

# API: Salvar agendamento
@app.route("/api/agendar", methods=["POST"])
def api_agendar():
    logger.info("Acessando API /api/agendar")
    if not usuario_logado():
        logger.error("Usuário não autenticado")
        return jsonify({"success": False, "error": "Não autenticado"}), 401

    user = get_user()
    if not user or 'id_cliente' not in user:
        logger.error("ID do cliente não encontrado na sessão: %s", user)
        return jsonify({"success": False, "error": "Usuário inválido ou ID do cliente ausente"}), 401

    data = request.json
    required = ['id_servicos', 'id_profissional', 'data_agendamento', 'hora_agendamento']
    if not all(k in data for k in required):
        logger.error("Campos obrigatórios faltando: %s", required)
        return jsonify({"success": False, "error": "Campos obrigatórios faltando"}), 400

    id_servicos = data['id_servicos']
    if isinstance(id_servicos, str):
        try:
            id_servicos = [int(x.strip()) for x in id_servicos.strip("[]").split(",") if x.strip()]
        except ValueError:
            logger.error("IDs de serviços inválidos: %s", id_servicos)
            return jsonify({"success": False, "error": "IDs de serviços inválidos"}), 400
    elif isinstance(id_servicos, list):
        try:
            id_servicos = [int(x) for x in id_servicos]
        except ValueError:
            logger.error("IDs de serviços inválidos: %s", id_servicos)
            return jsonify({"success": False, "error": "IDs de serviços inválidos"}), 400
    else:
        logger.error("Formato inválido para id_servicos: %s", id_servicos)
        return jsonify({"success": False, "error": "Formato inválido para id_servicos"}), 400

    if not id_servicos:
        logger.error("Lista de id_servicos vazia após parsing")
        return jsonify({"success": False, "error": "Nenhum serviço selecionado"}), 400

    try:
        servicos = supabase.table("servicos").select("duracao_minutos, preco").in_("id_servico", id_servicos).execute().data
        if not servicos:
            logger.error("Nenhum serviço encontrado para IDs: %s", id_servicos)
            return jsonify({"success": False, "error": "Serviços não encontrados"}), 404
        duracao_total = sum(s['duracao_minutos'] for s in servicos)
        buffer_extra = math.floor(duracao_total / 20) * 5
        duracao_total += buffer_extra
        preco_total = sum(float(s['preco']) for s in servicos)
        if duracao_total == 0 or preco_total == 0:
            logger.error("Duração ou preço total calculado como zero para serviços: %s", id_servicos)
            return jsonify({"success": False, "error": "Erro nos cálculos de duração ou preço"}), 400
    except Exception as e:
        logger.error("Erro ao calcular totais para agendamento: %s", str(e))
        return jsonify({"success": False, "error": "Erro ao calcular totais"}), 500

    # Usar o status enviado pelo frontend diretamente, com fallback para 🟡Pendente
    status = data.get("status", "🟡Pendente")

    new_agend = {
        'id_cliente': user['id_cliente'],
        'servicos_ids': id_servicos,
        'id_profissional': int(data['id_profissional']),
        'data_agendamento': data['data_agendamento'],
        'hora_agendamento': data['hora_agendamento'],
        'duracao_total': duracao_total,
        'preco_total': round(preco_total, 2),
        'status': status,
        'observacoes': data.get('observacoes', ''),
        'created_at': datetime.now(TZ).isoformat()
    }
    logger.debug("Novo agendamento a ser inserido: %s", new_agend)

    try:
        supabase.table('agendamentos').insert(new_agend).execute()
        logger.info("Agendamento salvo com sucesso")
        return jsonify({"success": True})
    except Exception as e:
        logger.error("Erro ao agendar: %s", str(e))
        return jsonify({"success": False, "error": "Erro ao salvar agendamento"}), 500


# API: Detalhes do profissional (para dias de trabalho)
@app.route("/api/profissional/<int:id_profissional>")
def api_profissional(id_profissional):
    logger.info("Acessando API /api/profissional/%s", id_profissional)
    if supabase:
        try:
            prof = supabase.table("profissionais").select("horario_inicio, horario_fim, dias_trabalho").eq("id_profissional", id_profissional).single().execute().data
            return jsonify(prof)
        except Exception as e:
            logger.error("Erro ao consultar profissional: %s", str(e))
            return jsonify({"error": "Profissional não encontrado"}), 404
    return jsonify({"error": "Supabase não inicializado"}), 500

# ROTA DA PÁGINA HTML
@app.route("/profissional_agendamentos")
def profissional_agendamentos():
    logger.info("Acessando /profissional_agendamentos")
    return render_template("profissional_agendamentos.html")

# ROTA DA API (COM parâmetro obrigatório)
@app.route("/api/agendamentos_profissional/<int:id_profissional>")
def api_agendamentos_profissional(id_profissional):
    logger.info("API AGENDAMENTOS - ID: %s", id_profissional)
    
    if not supabase:
        return jsonify([]), 500
    
    try:
        response = supabase.table("agendamentos")\
            .select("id_agendamento, data_agendamento, hora_agendamento, duracao_total, preco_total, observacoes, id_cliente, servicos_ids, status")\
            .eq("id_profissional", id_profissional)
        
        # Aplicar filtros de status e data
        status = request.args.getlist('status')  # Usa getlist para pegar múltiplos valores
        if not status: status = []  # Limpa se vazio
        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')
        
        logger.debug("Filtros aplicados - Status: %s, Start: %s, End: %s", status, start_date, end_date)
        
        if status:
            logger.debug("Aplicando filtro de status: %s", status)
            response = response.in_("status", status)
        if start_date:
            response = response.gte("data_agendamento", start_date)
        if end_date:
            response = response.lte("data_agendamento", end_date)
        
        response = response\
            .order("data_agendamento")\
            .order("hora_agendamento")\
            .execute()
        
        data = response.data or []
        
        for ag in data:
            if ag.get('id_cliente'):
                cli_resp = supabase.table("clientes")\
                    .select("nome, telefone")\
                    .eq("id_cliente", ag['id_cliente'])\
                    .single().execute()
                if cli_resp.data:
                    ag['cliente_nome'] = cli_resp.data.get('nome', 'Anônimo')
                    ag['cliente_telefone'] = cli_resp.data.get('telefone', '-')
                else:
                    ag['cliente_nome'] = 'Anônimo'
                    ag['cliente_telefone'] = '-'
            
            ag['servicos_nomes'] = []
            if ag.get('servicos_ids') and len(ag['servicos_ids']) > 0:
                serv_resp = supabase.table("servicos")\
                    .select("nome")\
                    .in_("id_servico", ag['servicos_ids'])\
                    .execute()
                if serv_resp.data:
                    ag['servicos_nomes'] = [s['nome'] for s in serv_resp.data]
        
        logger.info("Retornando %s agendamentos", len(data))
        return jsonify(data)
    except Exception as e:
        logger.error("Erro ao processar agendamentos para id_profissional %s: %s", id_profissional, str(e))
        return jsonify({"error": str(e)}), 500

@app.route("/api/agendamentos_todos")
def api_agendamentos_todos():
    """Todos os agendamentos"""
    if not supabase:
        return jsonify([])
    
    try:
        response = supabase.table("agendamentos")\
            .select("id_agendamento, data_agendamento, hora_agendamento, duracao_total, preco_total, observacoes, id_cliente, servicos_ids, status, id_profissional")
        
        # Aplicar filtros de status e data
        status = request.args.getlist('status')  # Usa getlist para pegar múltiplos valores
        if not status: status = []  # Limpa se vazio
        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')
        
        logger.debug("Filtros aplicados - Status: %s, Start: %s, End: %s", status, start_date, end_date)
        
        if status:
            logger.debug("Aplicando filtro de status: %s", status)
            response = response.in_("status", status)
        if start_date:
            response = response.gte("data_agendamento", start_date)
        if end_date:
            response = response.lte("data_agendamento", end_date)
        
        response = response\
            .order("data_agendamento")\
            .order("hora_agendamento")\
            .execute()
        
        data = response.data or []
        
        for ag in data:
            if ag.get('id_cliente'):
                cli_resp = supabase.table("clientes")\
                    .select("nome, telefone")\
                    .eq("id_cliente", ag['id_cliente'])\
                    .single().execute()
                if cli_resp.data:
                    ag['cliente_nome'] = cli_resp.data.get('nome', 'Anônimo')
                    ag['cliente_telefone'] = cli_resp.data.get('telefone', '-')
                else:
                    ag['cliente_nome'] = 'Anônimo'
                    ag['cliente_telefone'] = '-'
            
            ag['servicos_nomes'] = []
            if ag.get('servicos_ids') and len(ag['servicos_ids']) > 0:
                serv_resp = supabase.table("servicos")\
                    .select("nome")\
                    .in_("id_servico", ag['servicos_ids'])\
                    .execute()
                if serv_resp.data:
                    ag['servicos_nomes'] = [s['nome'] for s in serv_resp.data]
        
        return jsonify(data)
    except Exception as e:
        logger.error("Erro todos: %s", str(e))
        return jsonify([])

@app.route("/api/agendamento/<id_agendamento>")
def get_agendamento_detalhes(id_agendamento):
    try:
        # 1. Buscar agendamento
        ag_resp = supabase.table("agendamentos")\
            .select("*")\
            .eq("id_agendamento", id_agendamento)\
            .single().execute()
        
        if not ag_resp.data:
            return jsonify({"error": "Agendamento não encontrado"}), 404
        
        ag = ag_resp.data
        
        # 2. Buscar cliente
        cliente_nome = "Cliente não identificado"
        cliente_telefone = "Não informado"
        if ag.get('id_cliente'):
            cli_resp = supabase.table("clientes")\
                .select("nome, telefone")\
                .eq("id_cliente", ag['id_cliente'])\
                .single().execute()
            if cli_resp.data:
                cliente_nome = cli_resp.data.get('nome', cliente_nome)
                cliente_telefone = cli_resp.data.get('telefone', cliente_telefone)
        
        # 3. Buscar serviços
        servicos_nomes = []
        if ag.get('servicos_ids') and len(ag['servicos_ids']) > 0:
            serv_resp = supabase.table("servicos")\
                .select("nome")\
                .in_("id_servico", ag['servicos_ids'])\
                .execute()
            if serv_resp.data:
                servicos_nomes = [s['nome'] for s in serv_resp.data]
        
        # 4. Formatar data brasileira
        data_br = ag.get('data_agendamento', 'N/A')
        try:
            data_obj = datetime.strptime(ag['data_agendamento'], '%Y-%m-%d')
            data_br = data_obj.strftime('%d/%m/%Y')
        except:
            pass
        
        # 5. Resposta formatada
        return jsonify({
            "id": str(ag['id_agendamento']),
            "data": data_br,
            "hora": str(ag['hora_agendamento']),
            "data_hora_completa": f"{data_br} às {ag['hora_agendamento']}",
            "cliente": cliente_nome,
            "telefone": cliente_telefone,
            "servicos": servicos_nomes,
            "quantidade_servicos": len(servicos_nomes),
            "duracao": f"{ag.get('duracao_total', 0)} minutos",
            "preco": f"R$ {float(ag.get('preco_total', 0)):.2f}",
            "observacoes": ag.get('observacoes', 'Nenhuma'),
            "status": ag.get('status', 'pendente'),
            "id_cliente": ag.get('id_cliente'),
            "id_profissional": ag.get('id_profissional')
        })
        
    except Exception as e:
        logger.error(f"Erro detalhes {id_agendamento}: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route("/api/profissionais")
def api_profissionais_list():
    """Lista profissionais para filtro"""
    if not supabase:
        return jsonify([])
    
    try:
        # Buscar profissionais ativos
        pros = supabase.table("profissionais")\
            .select("id_profissional, nome")\
            .eq("ativo", True)\
            .order("nome")\
            .execute()
        
        if pros.error:
            logger.error("Erro profissionais: %s", pros.error)
            return jsonify([])
        
        return jsonify(pros.data or [])
    except Exception as e:
        logger.error("Erro API prof: %s", str(e))
        return jsonify([{"id_profissional": 1, "nome": "Profissional Padrão"}])

@app.route("/api/agendamento/<id>", methods=["GET", "PUT"])
def api_agendamento(id):
    if request.method == "GET":
        try:
            ag_resp = supabase.table("agendamentos")\
                .select("*")\
                .eq("id_agendamento", id)\
                .single().execute()
            
            if not ag_resp.data:
                return jsonify({"error": "Agendamento não encontrado"}), 404
            
            ag = ag_resp.data
            
            cliente_nome = "Cliente não identificado"
            cliente_telefone = "Não informado"
            if ag.get('id_cliente'):
                cli_resp = supabase.table("clientes")\
                    .select("nome, telefone")\
                    .eq("id_cliente", ag['id_cliente'])\
                    .single().execute()
                if cli_resp.data:
                    cliente_nome = cli_resp.data.get('nome', cliente_nome)
                    cliente_telefone = cli_resp.data.get('telefone', cliente_telefone)
            
            servicos_nomes = []
            if ag.get('servicos_ids') and len(ag['servicos_ids']) > 0:
                serv_resp = supabase.table("servicos")\
                    .select("nome")\
                    .in_("id_servico", ag['servicos_ids'])\
                    .execute()
                if serv_resp.data:
                    servicos_nomes = [s['nome'] for s in serv_resp.data]
            
            data_br = ag.get('data_agendamento', 'N/A')
            try:
                data_obj = datetime.strptime(ag['data_agendamento'], '%Y-%m-%d')
                data_br = data_obj.strftime('%d/%m/%Y')
            except:
                pass
            
            return jsonify({
                "id": str(ag['id_agendamento']),
                "data": data_br,
                "hora": str(ag['hora_agendamento']),
                "data_hora_completa": f"{data_br} às {ag['hora_agendamento']}",
                "cliente": cliente_nome,
                "telefone": cliente_telefone,
                "servicos": servicos_nomes,
                "quantidade_servicos": len(servicos_nomes),
                "duracao": f"{ag.get('duracao_total', 0)} minutos",
                "preco": f"R$ {float(ag.get('preco_total', 0)):.2f}",
                "observacoes": ag.get('observacoes', 'Nenhuma'),
                "status": ag.get('status', '🟡Pendente'),
                "id_cliente": ag.get('id_cliente'),
                "id_profissional": ag.get('id_profissional')
            })
        except Exception as e:
            logger.error(f"Erro GET detalhes {id}: {str(e)}")
            return jsonify({"error": str(e)}), 500
    
    elif request.method == "PUT":
        if not supabase:
            logger.error("Supabase não inicializado")
            return jsonify({"error": "Conexão com Supabase indisponível"}), 500
        
        data = request.get_json()
        if not data:
            logger.error("Dados JSON não fornecidos")
            return jsonify({"error": "Dados não fornecidos"}), 400
        
        try:
            logger.debug(f"Dados recebidos para atualização: {data}")
            servicos_ids = data.get("servicos_ids", [])
            if isinstance(servicos_ids, str):
                servicos_ids = [int(x.strip()) for x in servicos_ids.strip("[]").split(",") if x.strip()]
            elif isinstance(servicos_ids, list):
                servicos_ids = [int(x) for x in servicos_ids if str(x).strip()]
            else:
                servicos_ids = []

            if not data.get("data_agendamento") or not data.get("hora_agendamento"):
                logger.error("Data ou horário ausentes")
                return jsonify({"error": "Data e horário são obrigatórios"}), 400

            status = data.get("status", "🟡Pendente")
            logger.debug(f"Status a ser salvo: {status}")

            response = supabase.table("agendamentos").update({
                "data_agendamento": data.get("data_agendamento"),
                "hora_agendamento": data.get("hora_agendamento"),
                "servicos_ids": servicos_ids,
                "status": status
            }).eq("id_agendamento", id).execute()
            
            if not response.data:
                logger.error(f"Agendamento {id} não encontrado")
                return jsonify({"error": "Agendamento não encontrado"}), 404

            if servicos_ids:
                servicos = supabase.table("servicos").select("duracao_minutos, preco").in_("id_servico", servicos_ids).execute().data
                if servicos:
                    duracao_total = sum(s['duracao_minutos'] for s in servicos)
                    buffer_extra = math.floor(duracao_total / 20) * 5
                    duracao_total += buffer_extra
                    preco_total = sum(float(s['preco']) for s in servicos)
                    
                    supabase.table("agendamentos").update({
                        "duracao_total": duracao_total,
                        "preco_total": round(preco_total, 2)
                    }).eq("id_agendamento", id).execute()

            logger.info(f"Agendamento {id} atualizado com sucesso")
            return jsonify({"success": True})
        except Exception as e:
            logger.error(f"Erro PUT ao atualizar agendamento {id}: {str(e)}")
            return jsonify({"error": str(e)}), 500

# Certifique-se de que o bloco acima está fechado antes da próxima rota
@app.route("/api/teste/<int:id_profissional>")
def teste_api(id_profissional):
    return jsonify({
        "message": "API funcionando",
        "id_profissional": id_profissional,
        "supabase_ok": supabase is not None
    })

@app.route("/api/status")
def api_status():
    logger.info("Acessando API /api/status")
    if not supabase:
        logger.error("Supabase não inicializado")
        return jsonify([]), 500
    
    try:
        response = supabase.table("agendamentos")\
            .select("status")\
            .execute()
        statuses = [row['status'] for row in response.data if row['status']]
        unique_statuses = sorted(list(set(statuses)))  # Remove duplicatas e ordena
        logger.debug("Status encontrados: %s", unique_statuses)
        return jsonify(unique_statuses)
    except Exception as e:
        logger.error("Erro ao consultar status: %s", str(e))
        return jsonify([]), 500

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8080))
    logger.info("Iniciando servidor na porta %s", port)
    app.run(host="0.0.0.0", port=port, debug=True)
