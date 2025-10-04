from flask import Flask, render_template, request, redirect, session, url_for
import logging
from supabase import create_client, Client
from datetime import datetime
import os

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
supabase: Client = create_client(url, key) if url and key else None

# Funções Auxiliares
def usuario_logado():
    return "user" in session

def get_user():
    return session.get("user")

# Rotas principais
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

    # Separar lógica de verificação inicial e redefinição de senha
    if nova_senha:
        # Etapa de redefinição de senha
        nome = session.get("reset_nome")
        aniversario = session.get("reset_aniversario")
        logger.info(f"Da sessão - Nome: {nome}, Aniv: {aniversario}")
        if not nome or not aniversario:
            logger.error("Sessão reset ausente")
            return render_template("login.html", erro="Sessão expirada. Tente recuperar a senha novamente.", supabase=supabase)
    else:
        # Etapa inicial de verificação
        nome = request.form.get("nome", "").strip().lower()
        aniversario = request.form.get("aniversario")
        logger.info(f"Do form - Nome: {nome}, Aniv: {aniversario}")
        session["reset_nome"] = nome
        session["reset_aniversario"] = aniversario
        logger.info("Sessão reset setada")

    # Validar nome e aniversário apenas na etapa inicial
    if not nova_senha and (not nome or not aniversario):
        logger.error("Campos nome/aniv vazios")
        return render_template("login.html", erro="Preencha todos os campos.", supabase=supabase)

    try:
        cliente = supabase.table("clientes").select("*").eq("nome_lower", nome).execute()
        logger.info(f"Query cliente: {cliente.data}")
        if cliente.data:
            cliente = cliente.data[0]
            if str(cliente.get("aniversario")) == aniversario:
                if nova_senha:
                    if len(nova_senha) < 6:
                        logger.error("Nova senha muito curta")
                        return render_template("login.html", erro="A nova senha deve ter pelo menos 6 dígitos.", reset_senha=True, reset_nome=nome, supabase=supabase)
                    supabase.table("clientes").update({"senha": nova_senha}).eq("id_cliente", cliente["id_cliente"]).execute()
                    session.pop("reset_nome", None)
                    session.pop("reset_aniversario", None)
                    logger.info("Senha redefinida com sucesso")
                    return redirect(url_for("login", msg="Senha redefinida com sucesso."))
                else:
                    logger.info("Validação bem-sucedida, renderizando form de nova senha")
                    return render_template("login.html", reset_senha=True, reset_nome=nome, supabase=supabase)
            else:
                logger.error("Dados de aniversário não conferem")
                return render_template("login.html", erro="Dados não conferem.", supabase=supabase)
        else:
            logger.error("Usuário não encontrado")
            return render_template("login.html", erro="Usuário não encontrado.", supabase=supabase)
    except Exception as e:
        logger.error(f"Erro Supabase: {str(e)}")
        return render_template("login.html", erro="Erro no servidor.", supabase=supabase)

@app.route("/logout")
def logout():
    session.clear()
    logger.info("Usuário deslogado")
    return redirect(url_for("index"))

@app.route("/agendamento")
def agendamento():
    if not usuario_logado():
        logger.error("Acesso não autorizado a /agendamento")
        return redirect(url_for("login", msg="Faça login para agendar."))
    return render_template("agendamento.html", user=get_user())

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8080))
    app.run(host="0.0.0.0", port=port)
