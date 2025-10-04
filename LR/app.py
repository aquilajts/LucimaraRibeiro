from flask import Flask, render_template, request, redirect, session, url_for, jsonify
import logging
from supabase import create_client, Client
from datetime import datetime, timedelta, time
import os
import zoneinfo

# Configuração de logging
logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s [%(levelname)s] %(message)s',
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler('app.log')
    ]
)
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

# Rotas existentes (mantidas intactas)
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
                        if not cliente.get("aniversario"):
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
    return render_template("login.html", erro=erro,
                           solicitar_aniversario=solicitar_aniversario,
                           reset_senha=reset_senha,
                           nome=nome, aniversario=aniversario,
                           supabase=supabase)

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
        except Exception as e:
            logger.error("Erro ao atualizar aniversário: %s", str(e))
            return render_template("login.html", erro="Erro ao salvar dados.", supabase=supabase)
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
            return render_template("login.html", erro="Erro na recuperação de senha.", supabase=supabase)

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

# Rotas para agendamento
@app.route("/agendamento")
def agendamento():
    logger.info("Acessando rota /agendamento")
    if not usuario_logado():
        logger.error("Acesso não autorizado a /agendamento")
        return redirect(url_for("login", msg="Faça login para agendar."))
    min_date = (datetime.now(TZ) + timedelta(days=1)).strftime('%Y-%m-%d')
    logger.debug("Renderizando agendamento.html com min_date: %s", min_date)
    return render_template("agendamento.html", user=get_user(), min_date=min_date)

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
    categoria = request.args.get('categoria')
    logger.info("Acessando API /api/servicos com categoria: %s", categoria)
    if supabase and categoria:
        try:
            logger.debug("Consultando serviços no Supabase - Categoria: %s", categoria)
            servicos = supabase.table("servicos").select("id_servico, nome, duracao_minutos").eq("ativo", True).eq("categoria", categoria).execute().data
            logger.debug("Serviços encontrados: %s", servicos)
            return jsonify(servicos)
        except Exception as e:
            logger.error("Erro ao consultar serviços: %s", str(e))
            return jsonify([]), 500
    logger.warning("Supabase não inicializado ou categoria não fornecida")
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
@app.route("/api/horarios_disponiveis/<int:id_profissional>/<data>/<int:id_servico>")
def api_horarios_disponiveis(id_profissional, data, id_servico):
    logger.info("Acessando API /api/horarios_disponiveis/%s/%s/%s", id_profissional, data, id_servico)
    if not supabase:
        logger.error("Supabase não inicializado")
        return jsonify({"error": "Servidor de banco de dados não disponível"}), 500

    try:
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

        # Consultar serviço
        logger.debug("Consultando serviço %s", id_servico)
        servico_response = supabase.table("servicos").select("duracao_minutos").eq("id_servico", id_servico).execute()
        if not servico_response.data:
            logger.error("Serviço %s não encontrado", id_servico)
            return jsonify({"error": "Serviço não encontrado"}), 404
        servico = servico_response.data[0]
        logger.debug("Serviço encontrado: %s", servico)

        # Validar dias_trabalho
        if not isinstance(prof.get('dias_trabalho'), list):
            logger.error("dias_trabalho inválido para profissional %s: %s", id_profissional, prof.get('dias_trabalho'))
            return jsonify({"error": "Configuração de dias de trabalho inválida"}), 500

        duracao = servico['duracao_minutos']
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
        while current + timedelta(minutes=duracao) <= end:
            slots.append(current.strftime('%H:%M'))
            current += timedelta(minutes=15)
        logger.debug("Slots possíveis gerados: %s", slots)

        # Consultar agendamentos existentes
        logger.debug("Consultando agendamentos para profissional %s na data %s", id_profissional, data)
        agends = supabase.table("agendamentos").select("hora_agendamento, id_servico").eq("id_profissional", id_profissional).eq("data_agendamento", data).eq("status", "pendente").execute().data
        logger.debug("Agendamentos encontrados: %s", agends)

        occupied = []
        for ag in agends:
            try:
                hora_start = datetime.strptime(ag['hora_agendamento'], '%H:%M')
                logger.debug("Consultando duração do serviço %s", ag['id_servico'])
                serv_dur_response = supabase.table("servicos").select("duracao_minutos").eq("id_servico", ag['id_servico']).execute()
                if not serv_dur_response.data:
                    logger.error("Serviço %s não encontrado para agendamento", ag['id_servico'])
                    continue
                serv_dur = serv_dur_response.data[0]['duracao_minutos']
                hora_end = hora_start + timedelta(minutes=serv_dur)
                occupied.append((hora_start, hora_end))
            except ValueError as e:
                logger.error("Erro ao parsear hora_agendamento %s: %s", ag['hora_agendamento'], str(e))
                continue
        logger.debug("Horários ocupados: %s", occupied)

        # Filtrar slots livres
        disponiveis = []
        for slot in slots:
            slot_start = datetime.strptime(slot, '%H:%M')
            slot_end = slot_start + timedelta(minutes=duracao)
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
        logger.error("Erro ao calcular horários disponíveis - Profissional: %s, Data: %s, Serviço: %s, Erro: %s", id_profissional, data, id_servico, str(e))
        return jsonify({"error": f"Erro ao calcular horários: {str(e)}"}), 500

# API: Salvar agendamento
@app.route("/api/agendar", methods=["POST"])
def api_agendar():
    logger.info("Acessando API /api/agendar")
    if not usuario_logado():
        logger.error("Usuário não autenticado")
        return jsonify({"success": False, "error": "Não autenticado"}), 401

    data = request.json
    logger.debug("Dados recebidos para agendamento: %s", data)
    required = ['id_servico', 'id_profissional', 'data_agendamento', 'hora_agendamento']
    if not all(k in data for k in required):
        logger.error("Campos obrigatórios faltando: %s", required)
        return jsonify({"success": False, "error": "Campos obrigatórios faltando"}), 400

    new_agend = {
        'id_cliente': get_user()['id_cliente'],
        'id_servico': int(data['id_servico']),
        'id_profissional': int(data['id_profissional']),
        'data_agendamento': data['data_agendamento'],
        'hora_agendamento': data['hora_agendamento'],
        'status': 'pendente',
        'observacoes': data.get('observacoes', ''),
        'created_at': datetime.now(TZ).isoformat()
    }
    logger.debug("Novo agendamento a ser inserido: %s", new_agend)

    try:
        logger.debug("Inserindo agendamento no Supabase")
        supabase.table('agendamentos').insert(new_agend).execute()
        logger.info("Agendamento salvo com sucesso")
        return jsonify({"success": True})
    except Exception as e:
        logger.error("Erro ao agendar: %s", str(e))
        return jsonify({"success": False, "error": "Erro ao salvar agendamento"}), 500

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8080))
    logger.info("Iniciando servidor na porta %s", port)
    app.run(host="0.0.0.0", port=port)
