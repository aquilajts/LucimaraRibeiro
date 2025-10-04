from flask import Flask, render_template, request, redirect, session, url_for, jsonify
import logging
from supabase import create_client, Client
from datetime import datetime, timedelta, time
import os
import zoneinfo

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
    return "user" in session

def get_user():
    return session.get("user")

@app.route("/")
def index():
    return render_template("index.html", user=get_user())

@app.route("/login", methods=["GET", "POST"])
def login():
    erro = None
    solicitar_aniversario = False
    reset_senha = False
    nome = None
    aniversario = None

    if request.method == "POST":
        nome = request.form.get("nome")
        senha = request.form.get("senha")
        logger.info(f"Login tentativa - Nome: {nome}")

        if not nome or not senha:
            erro = "Preencha todos os campos."
            logger.error(f"Erro no login: Campos vazios")
        else:
            if supabase:
                email = f"{nome.lower().replace(' ', '_')}@naildesigner.com"
                cliente = supabase.table("clientes").select("*").eq("nome_lower", nome.lower()).execute()
                logger.info(f"Query cliente: {cliente.data}")

                if cliente.data:
                    cliente = cliente.data[0]
                    if cliente.get("senha") == senha:
                        if not cliente.get("aniversario"):
                            session["temp_user"] = cliente
                            solicitar_aniversario = True
                            logger.info(f"Usuário {nome} sem aniversário, solicitando")
                        else:
                            session["user"] = cliente
                            logger.info(f"Usuário {nome} logado com sucesso")
                            return redirect(url_for("agendamento"))
                    else:
                        erro = "Senha incorreta."
                        logger.error(f"Erro no login: Senha incorreta para {nome}")
                else:
                    data = {
                        "nome": nome,
                        "email": email,
                        "senha": senha,
                        "telefone": None
                    }
                    try:
                        novo = supabase.table("clientes").insert(data).execute()
                        session["temp_user"] = novo.data[0]
                        solicitar_aniversario = True
                        logger.info(f"Novo usuário {nome} cadastrado")
                    except Exception as e:
                        erro = "Erro ao cadastrar usuário."
                        logger.error(f"Erro ao cadastrar: {str(e)}")
            else:
                if nome == "demo" and senha == "123456":
                    session["user"] = {"nome": "Demo"}
                    logger.info("Login demo bem-sucedido")
                    return redirect(url_for("agendamento"))
                else:
                    erro = "Usuário demo inválido."
                    logger.error("Erro no login demo")

    return render_template("login.html", erro=erro,
                           solicitar_aniversario=solicitar_aniversario,
                           reset_senha=reset_senha,
                           nome=nome, aniversario=aniversario,
                           supabase=supabase)

@app.route("/atualizar_aniversario", methods=["POST"])
def atualizar_aniversario():
    if "temp_user" not in session:
        logger.error("Sessão temp_user ausente")
        return redirect(url_for("login"))

    aniversario = request.form.get("aniversario")
    telefone = request.form.get("telefone")
    logger.info(f"Atualizando aniversário: {aniversario}, telefone: {telefone}")

    user = session["temp_user"]
    if supabase:
        try:
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
            logger.error(f"Erro ao atualizar aniversário: {str(e)}")
            return render_template("login.html", erro="Erro ao salvar dados.", supabase=supabase)
    return redirect(url_for("agendamento"))

@app.route("/esqueci_senha", methods=["POST"])
def esqueci_senha():
    logger.info("Entrando em /esqueci_senha")
    nova_senha = request.form.get("nova_senha")
    logger.info(f"Nova senha presente: {bool(nova_senha)}")

    nome = request.form.get("nome", "").strip().lower()
    aniversario = request.form.get("aniversario")

    # Validar nome e aniversário na primeira etapa
    if not nova_senha:
        logger.info(f"Do form - Nome: {nome}, Aniv: {aniversario}")
        if not nome or not aniversario:
            logger.error("Campos nome/aniv vazios")
            return jsonify({"success": False, "error": "Preencha todos os campos."})

        if not supabase:
            logger.error("Supabase não inicializado")
            return jsonify({"success": False, "error": "Erro no servidor."})

        try:
            cliente = supabase.table("clientes").select("*").eq("nome_lower", nome).execute()
            logger.info(f"Query Supabase: {cliente.data}")
            if cliente.data:
                cliente = cliente.data[0]
                logger.info(f"Cliente encontrado: {cliente}")
                if str(cliente.get("aniversario")) == aniversario:
                    logger.info("Validação bem-sucedida")
                    return jsonify({"success": True})
                else:
                    logger.error("Dados de aniversário não conferem")
                    return jsonify({"success": False, "error": "Dados não conferem."})
            else:
                logger.error("Usuário não encontrado")
                return jsonify({"success": False, "error": "Usuário não encontrado."})
        except Exception as e:
            logger.error(f"Erro Supabase: {str(e)}")
            return jsonify({"success": False, "error": f"Erro no servidor: {str(e)}"})

    # Redefinição de senha na segunda etapa
    else:
        logger.info(f"Da sessão - Nome: {nome}, Aniv: {aniversario}")
        if not nome or not aniversario:
            logger.error("Campos nome/aniv ausentes")
            return render_template("login.html", erro="Erro na recuperação de senha.", supabase=supabase)

        if not supabase:
            logger.error("Supabase não inicializado")
            return jsonify({"success": False, "error": "Erro no servidor."})

        try:
            cliente = supabase.table("clientes").select("*").eq("nome_lower", nome).execute()
            logger.info(f"Query Supabase: {cliente.data}")
            if cliente.data:
                cliente = cliente.data[0]
                if str(cliente.get("aniversario")) == aniversario:
                    if len(nova_senha) < 6:
                        logger.error("Nova senha muito curta")
                        return jsonify({"success": False, "error": "A nova senha deve ter pelo menos 6 dígitos."})
                    supabase.table("clientes").update({"senha": nova_senha}).eq("id_cliente", cliente["id_cliente"]).execute()
                    logger.info("Senha redefinida com sucesso")
                    return redirect(url_for("login", msg="Senha redefinida com sucesso."))
                else:
                    logger.error("Dados de aniversário não conferem")
                    return jsonify({"success": False, "error": "Dados não conferem."})
            else:
                logger.error("Usuário não encontrado")
                return jsonify({"success": False, "error": "Usuário não encontrado."})
        except Exception as e:
            logger.error(f"Erro Supabase: {str(e)}")
            return jsonify({"success": False, "error": f"Erro no servidor: {str(e)}"})

@app.route("/logout")
def logout():
    session.clear()
    logger.info("Usuário deslogado")
    return redirect(url_for("index"))

# Rotas atualizadas para agendamento
@app.route("/agendamento")
def agendamento():
    if not usuario_logado():
        logger.error("Acesso não autorizado a /agendamento")
        return redirect(url_for("login", msg="Faça login para agendar."))
    min_date = (datetime.now(TZ) + timedelta(days=1)).strftime('%Y-%m-%d')
    return render_template("agendamento.html", user=get_user(), min_date=min_date)

# API: Listar categorias distintas
@app.route("/api/categorias")
def api_categorias():
    if supabase:
        categorias = supabase.table("servicos").select("categoria").eq("ativo", True).execute().data
        unique_categorias = sorted(set(cat['categoria'] for cat in categorias if cat['categoria']))
        return jsonify(unique_categorias)
    return jsonify([])

# API: Listar serviços por categoria
@app.route("/api/servicos")
def api_servicos():
    categoria = request.args.get('categoria')
    if supabase and categoria:
        servicos = supabase.table("servicos").select("id_servico, nome, duracao_minutos").eq("ativo", True).eq("categoria", categoria).execute().data
        return jsonify(servicos)
    return jsonify([])

# API: Profissionais por serviço
@app.route("/api/profissionais/<int:id_servico>")
def api_profissionais(id_servico):
    if supabase:
        profs = supabase.from_("profissionais_servicos").select("profissionais!inner(id_profissional, nome)").eq("id_servico", id_servico).eq("profissionais.ativo", True).execute().data
        return jsonify([p['profissionais'] for p in profs])
    return jsonify([])

# API: Horários disponíveis
@app.route("/api/horarios_disponiveis/<int:id_profissional>/<data>/<int:id_servico>")
def api_horarios_disponiveis(id_profissional, data, id_servico):
    if not supabase:
        return jsonify([])

    try:
        # Pegar dados do profissional e serviço
        prof = supabase.table("profissionais").select("horario_inicio, horario_fim, dias_trabalho").eq("id_profissional", id_profissional).single().execute().data
        servico = supabase.table("servicos").select("duracao_minutos").eq("id_servico", id_servico).single().execute().data

        if not prof or not servico:
            return jsonify([])

        duracao = servico['duracao_minutos']
        inicio = datetime.strptime(prof['horario_inicio'], '%H:%M').time()
        fim = datetime.strptime(prof['horario_fim'], '%H:%M').time()
        data_dt = datetime.strptime(data, '%Y-%m-%d').date()
        dia_semana = data_dt.strftime('%A').lower()
        dia_pt = {'monday': 'segunda', 'tuesday': 'terca', 'wednesday': 'quarta', 'thursday': 'quinta', 'friday': 'sexta', 'saturday': 'sabado', 'sunday': 'domingo'}[dia_semana]

        if dia_pt not in prof['dias_trabalho']:
            return jsonify([])

        # Gerar slots possíveis (intervalos de 15min)
        slots = []
        current = datetime.combine(data_dt, inicio)
        end = datetime.combine(data_dt, fim)
        while current + timedelta(minutes=duracao) <= end:
            slots.append(current.strftime('%H:%M'))
            current += timedelta(minutes=15)

        # Pegar agendamentos existentes
        agends = supabase.table("agendamentos").select("hora_agendamento, id_servico").eq("id_profissional", id_profissional).eq("data_agendamento", data).eq("status", "pendente").execute().data

        occupied = []
        for ag in agends:
            hora_start = datetime.strptime(ag['hora_agendamento'], '%H:%M')
            serv_dur = supabase.table("servicos").select("duracao_minutos").eq("id_servico", ag['id_servico']).single().execute().data['duracao_minutos']
            hora_end = hora_start + timedelta(minutes=serv_dur)
            occupied.append((hora_start, hora_end))

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

        return jsonify(disponiveis)
    except Exception as e:
        logger.error(f"Erro ao calcular horários: {str(e)}")
        return jsonify([])

# API: Salvar agendamento
@app.route("/api/agendar", methods=["POST"])
def api_agendar():
    if not usuario_logado():
        return jsonify({"success": False, "error": "Não autenticado"}), 401

    data = request.json
    required = ['id_servico', 'id_profissional', 'data_agendamento', 'hora_agendamento']
    if not all(k in data for k in required):
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

    try:
        supabase.table('agendamentos').insert(new_agend).execute()
        return jsonify({"success": True})
    except Exception as e:
        logger.error(f"Erro ao agendar: {str(e)}")
        return jsonify({"success": False, "error": "Erro ao salvar agendamento"}), 500

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8080))
    app.run(host="0.0.0.0", port=port)
