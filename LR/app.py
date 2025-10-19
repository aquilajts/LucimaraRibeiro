
from flask import Flask, render_template, request, redirect, session, url_for, jsonify
import logging
from supabase import create_client, Client
from collections import defaultdict
from datetime import datetime, timedelta, time
import os
import zoneinfo
import math
import time as time_module
import re
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

CACHE_TTL_SECONDS = 300  # 5 minutos de cache para dados estáveis
TRANSIENT_ERROR_KEYWORDS = (
    "ConnectionTerminated",
    "RemoteProtocolError",
    "ServerDisconnectedError",
    "ConnectionResetError",
    "ReadError",
    "ReadTimeout",
)

SERVICE_INFO_CACHE: dict[tuple[int, ...], tuple[float, list]] = {}
PROFISSIONAL_INFO_CACHE: dict[int, tuple[float, dict]] = {}

ALLOWED_STATUS = {
    "🔴Desistência",
    "Desistência",
    "🔴Não veio",
    "🟡Pendente",
    "🟢Atendido",
    "🔵Agendado",
    "⚫Pago",
}


def _cache_get(cache, key):
    entry = cache.get(key)
    if not entry:
        return None
    timestamp, value = entry
    if time_module.time() - timestamp > CACHE_TTL_SECONDS:
        cache.pop(key, None)
        return None
    return value


def _cache_set(cache, key, value):
    cache[key] = (time_module.time(), value)


def _normalize_service_ids(ids):
    try:
        return tuple(sorted(int(sid) for sid in ids))
    except (TypeError, ValueError):
        return tuple()


def calcular_buffer_tempo(duracao_total):
    """Adiciona 5 minutos de buffer a cada 35 minutos de serviço acumulado."""
    if not duracao_total:
        return 0
    return math.floor(duracao_total / 35) * 5


def supabase_execute_with_retry(callback, retries=3, delay=0.3):
    last_exc = None
    for attempt in range(retries):
        try:
            return callback()
        except Exception as exc:  # noqa: BLE001 - Queremos capturar erros transitórios específicos
            message = repr(exc)
            if attempt < retries - 1 and any(keyword in message for keyword in TRANSIENT_ERROR_KEYWORDS):
                logger.warning(
                    "Erro transitório ao consultar Supabase (tentativa %s/%s): %s",
                    attempt + 1,
                    retries,
                    message,
                )
                time_module.sleep(delay * (attempt + 1))
                last_exc = exc
                continue
            raise
    if last_exc:
        raise last_exc


def get_servicos_info(ids):
    if not supabase:
        return []
    normalized_ids = _normalize_service_ids(ids)
    if not normalized_ids:
        return []
    cached = _cache_get(SERVICE_INFO_CACHE, normalized_ids)
    if cached is not None:
        return cached
    response = supabase_execute_with_retry(
        lambda: supabase
        .table("servicos")
        .select("id_servico, duracao_minutos, preco")
        .in_("id_servico", list(normalized_ids))
        .execute()
    )
    data = response.data or []
    _cache_set(SERVICE_INFO_CACHE, normalized_ids, data)
    return data


def get_profissional_config(id_profissional):
    if not supabase:
        return None
    try:
        pid = int(id_profissional)
    except (TypeError, ValueError):
        return None
    cached = _cache_get(PROFISSIONAL_INFO_CACHE, pid)
    if cached is not None:
        return cached
    response = supabase_execute_with_retry(
        lambda: supabase
        .table("profissionais")
        .select("horario_inicio, horario_fim, dias_trabalho")
        .eq("id_profissional", pid)
        .execute()
    )
    data = (response.data or [])
    if data:
        config = data[0]
        _cache_set(PROFISSIONAL_INFO_CACHE, pid, config)
        return config
    return None

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
    stage = "phone"
    nome = None
    ddd = "27"
    telefone = None

    pending_user = session.get("pending_user")

    if request.method == "POST":
        stage = request.form.get("stage", "phone")
        if stage == "birthday":
            aniversario = (request.form.get("aniversario") or "").strip()
            logger.info("Processando etapa de aniversário")
            if not pending_user or "id_cliente" not in pending_user:
                erro = "Sessão expirada. Informe seus dados novamente."
                logger.error("Etapa de aniversário sem usuário pendente na sessão")
                session.pop("pending_user", None)
                stage = "phone"
            elif not aniversario:
                erro = "Informe a data de aniversário."
                logger.error(
                    "Data de aniversário vazia para usuário %s",
                    pending_user.get("id_cliente"),
                )
            else:
                try:
                    aniversario_date = datetime.strptime(aniversario, "%Y-%m-%d").date()
                except ValueError:
                    erro = "Informe uma data de aniversário válida."
                    logger.error("Data de aniversário inválida recebida: %s", aniversario)
                else:
                    today = datetime.now(TZ).date()
                    if aniversario_date > today:
                        erro = "A data de aniversário não pode ser futura."
                        logger.error("Data de aniversário futura informada: %s", aniversario)
                    else:
                        try:
                            supabase.table("clientes").update({
                                "aniversario": aniversario
                            }).eq("id_cliente", pending_user["id_cliente"]).execute()
                            pending_user["aniversario"] = aniversario
                            session["user"] = pending_user
                            session.pop("pending_user", None)
                            logger.info(
                                "Aniversário registrado para o cliente %s",
                                pending_user["id_cliente"],
                            )
                            return redirect(url_for("agendamento"))
                        except Exception as exc:
                            erro = "Não foi possível salvar a data agora."
                            logger.error(
                                "Erro ao salvar aniversário do cliente %s: %s",
                                pending_user.get("id_cliente"),
                                exc,
                            )
            stage = "birthday"
        else:
            session.pop("pending_user", None)
            nome = (request.form.get("nome") or "").strip()
            ddd = (request.form.get("ddd") or "").strip() or "27"
            telefone = (request.form.get("telefone") or "").strip()
            logger.info("Tentativa de login - Nome: %s", nome)

            if not nome or not telefone or not ddd:
                erro = "Informe nome, DDD e telefone."
                logger.error("Erro no login: campos vazios")
            else:
                ddd_digitos = re.sub(r"\D", "", ddd)
                telefone_digitos = re.sub(r"\D", "", telefone)
                if ddd_digitos:
                    ddd = ddd_digitos
                if telefone_digitos:
                    telefone = telefone_digitos
                if len(ddd_digitos) != 2:
                    erro = "Informe um DDD válido (2 dígitos)."
                    logger.error("Erro no login: DDD inválido para %s", nome)
                elif len(telefone_digitos) != 9:
                    erro = "Informe um telefone válido com 9 dígitos."
                    logger.error("Erro no login: telefone inválido para %s", nome)
                else:
                    telefone_completo = f"{ddd_digitos}{telefone_digitos}"
                    if supabase:
                        try:
                            nome_lower = nome.lower()
                            base_email = nome_lower.replace(' ', '_')
                            email = f"{base_email}_{telefone_completo}@naildesigner.com"
                            logger.debug(
                                "Consultando cliente no Supabase - Nome_lower: %s, Email: %s",
                                nome_lower,
                                email,
                            )
                            resposta_match = supabase.table("clientes").select("*") \
                                .eq("nome_lower", nome_lower) \
                                .eq("telefone", telefone_completo).execute()
                            dados_match = resposta_match.data or []

                            if dados_match:
                                cliente = dados_match[0]
                                if cliente.get("aniversario"):
                                    session["user"] = cliente
                                    logger.info("Usuário %s autenticado (nome + telefone)", nome)
                                    return redirect(url_for("agendamento"))
                                session["pending_user"] = cliente
                                logger.info("Usuário %s precisa informar aniversário", nome)
                                return redirect(url_for("login"))

                            resposta_nome = supabase.table("clientes").select("*") \
                                .eq("nome_lower", nome_lower).execute()
                            dados_nome = resposta_nome.data or []

                            for cliente in dados_nome:
                                telefone_cadastrado = re.sub(
                                    r"\D",
                                    "",
                                    str(cliente.get("telefone") or ""),
                                )
                                if not telefone_cadastrado:
                                    logger.info("Atualizando telefone ausente para %s", nome)
                                    supabase.table("clientes").update({
                                        "telefone": telefone_completo
                                    }).eq("id_cliente", cliente["id_cliente"]).execute()
                                    cliente["telefone"] = telefone_completo
                                    if cliente.get("aniversario"):
                                        session["user"] = cliente
                                        logger.info(
                                            "Usuário %s autenticado após preencher telefone",
                                            nome,
                                        )
                                        return redirect(url_for("agendamento"))
                                    session["pending_user"] = cliente
                                    logger.info(
                                        "Usuário %s precisa informar aniversário após preencher telefone",
                                        nome,
                                    )
                                    return redirect(url_for("login"))

                            payload = {
                                "nome": nome,
                                "email": email,
                                "telefone": telefone_completo
                            }
                            logger.debug("Cadastrando novo usuário via telefone: %s", payload)
                            novo = supabase.table("clientes").insert(payload).execute()
                            cliente = novo.data[0]
                            cliente["telefone"] = telefone_completo
                            session["pending_user"] = cliente
                            logger.info("Novo usuário %s cadastrado; aguardando aniversário", nome)
                            return redirect(url_for("login"))
                        except Exception as exc:
                            erro = "Erro ao processar login."
                            logger.error("Erro ao autenticar usuário %s: %s", nome, exc)
                    else:
                        if nome.lower() == "demo" and telefone_completo == "27000000000":
                            session["user"] = {"nome": "Demo", "telefone": telefone_completo}
                            logger.info("Login demo bem-sucedido")
                            return redirect(url_for("agendamento"))
                        erro = "Serviço de login indisponível."
                        logger.error("Supabase indisponível para login.")

    pending_user = session.get("pending_user")
    birthday_step = bool(pending_user)
    birthday_max = datetime.now(TZ).strftime('%Y-%m-%d')
    pending_info = None
    if pending_user:
        telefone_digits = re.sub(r"\D", "", str(pending_user.get("telefone") or ""))
        ddd_prefill = telefone_digits[:2] if len(telefone_digits) >= 2 else "27"
        telefone_prefill = telefone_digits[2:] if len(telefone_digits) > 2 else ""
        pending_info = {
            "nome": pending_user.get("nome") or "",
            "ddd": ddd_prefill,
            "telefone": telefone_prefill,
            "aniversario": pending_user.get("aniversario"),
        }

    logger.debug(
        "Renderizando login.html com erro: %s, stage: %s, birthday_step: %s",
        erro,
        stage,
        birthday_step,
    )
    return render_template(
        "login.html",
        erro=erro,
        nome=nome,
        ddd=ddd or "27",
        telefone=telefone,
        birthday_step=birthday_step,
        pending_user=pending_info,
        birthday_max=birthday_max,
        supabase=supabase,
    )


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
    

# API: Listar categorias disttintas
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
    """Lista serviços, opcionalmente filtrando por categoria, retornando dados completos.

    Query params:
    - categoria: string (opcional)
    """
    if not supabase:
        return jsonify([])
    try:
        categoria = request.args.get("categoria")
        query = supabase.table("servicos").select("id_servico, nome, categoria, duracao_minutos, preco").eq("ativo", True)
        if categoria:
            query = query.eq("categoria", categoria)
        response = query.order("nome").execute()
        return jsonify(response.data or [])
    except Exception as e:
        logger.error("Erro serviços: %s", str(e))
        return jsonify([])


@app.route("/api/agendamento/opcoes")
def api_agendamento_opcoes():
    """Retorna dados agregados para o formulário de agendamento (categorias, serviços e profissionais)."""
    logger.info("Acessando API /api/agendamento/opcoes")
    if not supabase:
        logger.error("Supabase não inicializado em /api/agendamento/opcoes")
        return jsonify({
            "categorias": [],
            "servicos": [],
            "profissionais": []
        }), 503

    try:
        servicos_resp = supabase.table("servicos").select(
            "id_servico, nome, categoria, duracao_minutos, preco, ativo"
        ).eq("ativo", True).order("categoria").order("nome").execute()
        servicos_data = servicos_resp.data or []

        relacionamentos_resp = supabase.table("profissionais_servicos") \
            .select("id_servico, id_profissional").execute()
        relacionamentos = relacionamentos_resp.data or []

        profissionais_resp = supabase.table("profissionais").select(
            "id_profissional, nome, ativo"
        ).eq("ativo", True).order("nome").execute()
        profissionais_data = profissionais_resp.data or []

        profissionais_map = {}
        for prof in profissionais_data:
            try:
                pid = int(prof["id_profissional"])
            except (TypeError, ValueError):
                continue
            if not prof.get("ativo", True):
                continue
            profissionais_map[pid] = {
                "id_profissional": pid,
                "nome": prof.get("nome", f"Profissional {pid}")
            }

        profissionais_por_servico: dict[int, set[int]] = defaultdict(set)
        for rel in relacionamentos:
            try:
                sid = int(rel.get("id_servico"))
                pid = int(rel.get("id_profissional"))
            except (TypeError, ValueError):
                continue
            if pid in profissionais_map:
                profissionais_por_servico[sid].add(pid)

        categorias = set()
        servicos_payload = []
        for servico in servicos_data:
            try:
                sid = int(servico["id_servico"])
            except (TypeError, ValueError):
                logger.warning("ID de serviço inválido ignorado em /api/agendamento/opcoes: %s", servico)
                continue

            categoria = servico.get("categoria") or "Outros"
            categorias.add(categoria)
            profissionais_ids = profissionais_por_servico.get(sid, set())
            profissionais_lista = [profissionais_map[pid] for pid in profissionais_ids if pid in profissionais_map]
            profissionais_lista.sort(key=lambda p: p["nome"].lower())

            servicos_payload.append({
                "id_servico": sid,
                "nome": servico.get("nome"),
                "categoria": categoria,
                "preco": float(servico.get("preco") or 0),
                "duracao_minutos": servico.get("duracao_minutos"),
                "profissionais": profissionais_lista
            })

        servicos_payload.sort(key=lambda s: (s["categoria"].lower(), s["nome"].lower()))

        resposta = {
            "categorias": sorted(categorias, key=lambda c: c.lower()),
            "servicos": servicos_payload,
            "profissionais": list(profissionais_map.values())
        }

        logger.debug("Dados agregados de agendamento gerados com %d serviços e %d profissionais",
                     len(servicos_payload), len(profissionais_map))
        return jsonify(resposta)

    except Exception as exc:
        logger.exception("Erro ao montar dados agregados de agendamento: %s", exc)
        return jsonify({
            "categorias": [],
            "servicos": [],
            "profissionais": [],
            "error": "Erro ao obter dados de agendamento"
        }), 500

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
            relacionamentos_resp = supabase.table("profissionais_servicos") \
                .select("id_profissional") \
                .eq("id_servico", id_servico) \
                .execute()

            relacionamentos = relacionamentos_resp.data or []
            ids_profissionais = set()
            for rel in relacionamentos:
                try:
                    if rel.get("id_profissional") is not None:
                        ids_profissionais.add(int(rel["id_profissional"]))
                except (TypeError, ValueError):
                    logger.warning(
                        "ID de profissional inválido no relacionamento do serviço %s: %s",
                        id_servico,
                        rel,
                        exc_info=True
                    )

            if not ids_profissionais:
                logger.debug("Nenhum profissional associado ao serviço %s", id_servico)
                return jsonify([])

            profissionais_resp = supabase.table("profissionais") \
                .select("id_profissional, nome") \
                .in_("id_profissional", sorted(ids_profissionais)) \
                .eq("ativo", True) \
                .order("nome") \
                .execute()

            profissionais = profissionais_resp.data or []
            logger.debug("Profissionais encontrados para serviço %s: %s", id_servico, profissionais)
            return jsonify(profissionais)
        except Exception as e:
            logger.exception("Erro ao consultar profissionais para o serviço %s: %s", id_servico, str(e))
            # Retorna lista vazia para evitar falha no frontend, mantendo log detalhado do erro.
            return jsonify([])
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
        servicos = get_servicos_info(id_servicos)
        if not servicos:
            logger.error("Serviços não encontrados para cálculo de disponibilidade: %s", id_servicos)
            return jsonify({"error": "Serviços não encontrados"}), 404
        duracao_total = sum((s.get('duracao_minutos') or 0) for s in servicos)
        buffer_extra = calcular_buffer_tempo(duracao_total)
        duracao_total += buffer_extra
        logger.debug("Duração total ajustada: %s min", duracao_total)
        if duracao_total <= 0:
            logger.warning("Duração total calculada como zero para serviços %s", id_servicos)
            return jsonify([])

        # Consultar profissional
        logger.debug("Consultando profissional %s", id_profissional)
        prof = get_profissional_config(id_profissional)
        if not prof:
            logger.error("Profissional %s não encontrado", id_profissional)
            return jsonify({"error": "Profissional não encontrado"}), 404
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
        # Considera agendamentos que bloqueiam horário: pendentes e agendados
        agends_resp = supabase_execute_with_retry(
            lambda: supabase.table("agendamentos")
            .select("hora_agendamento, duracao_total")
            .eq("id_profissional", id_profissional)
            .eq("data_agendamento", data)
            .in_("status", ["🟡Pendente", "🔵Agendado"])
            .execute()
        )
        agends = agends_resp.data or []
        logger.debug("Agendamentos encontrados: %s", agends)

        occupied = []
        for ag in agends:
            try:
                # Tenta com segundos e depois sem segundos para compatibilidade
                try:
                    hora_start = datetime.strptime(ag['hora_agendamento'], '%H:%M:%S')
                except ValueError:
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
        servicos = get_servicos_info(id_servicos)
        if not servicos:
            logger.error("Nenhum serviço encontrado para IDs: %s", id_servicos)
            return jsonify({"success": False, "error": "Serviços não encontrados"}), 404
        duracao_total = sum((s.get('duracao_minutos') or 0) for s in servicos)
        buffer_extra = calcular_buffer_tempo(duracao_total)
        duracao_total += buffer_extra
        preco_total = sum(float(s.get('preco') or 0) for s in servicos)
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
            prof = get_profissional_config(id_profissional)
            if prof:
                return jsonify(prof)
            return jsonify({"error": "Profissional não encontrado"}), 404
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
                    buffer_extra = calcular_buffer_tempo(duracao_total)
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


@app.route("/api/agendamento/<id>/status", methods=["PATCH"])
def api_agendamento_status(id):
    logger.info("Atualizando status do agendamento %s", id)
    if not supabase:
        logger.error("Supabase não inicializado em PATCH de status")
        return jsonify({"success": False, "error": "Serviço indisponível"}), 500

    payload = request.get_json(silent=True) or {}
    novo_status = payload.get("status")
    if not novo_status:
        logger.error("Status não fornecido no PATCH")
        return jsonify({"success": False, "error": "Status obrigatório"}), 400

    if novo_status not in ALLOWED_STATUS:
        logger.warning("Status inválido recebido: %s", novo_status)
        return jsonify({"success": False, "error": "Status inválido"}), 400

    ag_id = str(id or "").strip()
    if not ag_id:
        logger.error("ID de agendamento vazio ou inválido: %s", id)
        return jsonify({"success": False, "error": "ID inválido"}), 400

    try:
        response = supabase.table("agendamentos").update({
            "status": novo_status
        }).eq("id_agendamento", ag_id).execute()

        if not response.data:
            logger.error("Agendamento %s não encontrado ao atualizar status", ag_id)
            return jsonify({"success": False, "error": "Agendamento não encontrado"}), 404

        logger.info("Status do agendamento %s atualizado para %s", ag_id, novo_status)
        return jsonify({"success": True})
    except Exception as exc:
        logger.error("Erro ao atualizar status do agendamento %s: %s", ag_id, str(exc))
        return jsonify({"success": False, "error": "Erro ao atualizar status"}), 500

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
