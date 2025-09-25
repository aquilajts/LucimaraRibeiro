from flask import Flask, render_template, request, redirect, session, url_for
from supabase import create_client, Client
from datetime import datetime
import os

app = Flask(__name__)
app.secret_key = os.getenv('SECRET_KEY', 'nail_designer_lucimara_2025')

# Config Supabase
url = os.getenv("SUPABASE_URL")
key = os.getenv("SUPABASE_KEY")
supabase: Client = create_client(url, key) if url and key else None


# -------------------------
# Funções Auxiliares
# -------------------------
def usuario_logado():
    return "user" in session

def get_user():
    return session.get("user")


# -------------------------
# Rotas principais
# -------------------------
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

        if not nome or not senha:
            erro = "Preencha todos os campos."
        else:
            if supabase:
                email = f"{nome.lower().replace(' ', '_')}@naildesigner.com"

                # Verificar se cliente existe
                cliente = supabase.table("clientes").select("*").eq("nome_lower", nome.lower()).execute()

                if cliente.data:
                    cliente = cliente.data[0]
                    if cliente.get("senha") == senha:
                        # Se não tem aniversário cadastrado → solicitar
                        if not cliente.get("aniversario"):
                            session["temp_user"] = cliente
                            solicitar_aniversario = True
                        else:
                            session["user"] = cliente
                            return redirect(url_for("index"))
                    else:
                        erro = "Senha incorreta."
                else:
                    # Cadastrar novo usuário
                    data = {
                        "nome": nome,
                        "nome_lower": nome.lower(),
                        "email": email,
                        "senha": senha,
                        "telefone": None
                    }
                    novo = supabase.table("clientes").insert(data).execute()
                    session["temp_user"] = novo.data[0]
                    solicitar_aniversario = True
            else:
                # Modo Demo
                if nome == "demo" and senha == "123456":
                    session["user"] = {"nome": "Demo"}
                    return redirect(url_for("index"))
                else:
                    erro = "Usuário demo inválido."

    return render_template("login.html", erro=erro,
                           solicitar_aniversario=solicitar_aniversario,
                           reset_senha=reset_senha,
                           nome=nome, aniversario=aniversario,
                           supabase=supabase)


@app.route("/atualizar_aniversario", methods=["POST"])
def atualizar_aniversario():
    if "temp_user" not in session:
        return redirect(url_for("login"))

    aniversario = request.form.get("aniversario")
    telefone = request.form.get("telefone")

    user = session["temp_user"]
    if supabase:
        supabase.table("clientes").update({
            "aniversario": aniversario,
            "telefone": telefone
        }).eq("id_cliente", user["id_cliente"]).execute()

        user["aniversario"] = aniversario
        user["telefone"] = telefone

    session["user"] = user
    session.pop("temp_user", None)
    return redirect(url_for("index"))


@app.route("/esqueci_senha", methods=["POST"])
def esqueci_senha():
    nome = request.form.get("nome")
    aniversario = request.form.get("aniversario")
    nova_senha = request.form.get("nova_senha")

    if supabase:
        cliente = supabase.table("clientes").select("*").eq("nome_lower", nome.lower()).execute()
        if cliente.data:
            cliente = cliente.data[0]
            if str(cliente.get("aniversario")) == aniversario:
                if nova_senha:
                    supabase.table("clientes").update({"senha": nova_senha}).eq("id_cliente", cliente["id_cliente"]).execute()
                    return redirect(url_for("login", msg="Senha redefinida com sucesso."))
                else:
                    return render_template("login.html", reset_senha=True, nome=nome, aniversario=aniversario, supabase=supabase)
            else:
                return render_template("login.html", erro="Dados não conferem.", supabase=supabase)
    return render_template("login.html", erro="Usuário não encontrado.", supabase=supabase)


@app.route("/logout")
def logout():
    session.clear()
    return redirect(url_for("index"))


# -------------------------
# Agendamento
# -------------------------
@app.route("/agendamento")
def agendamento():
    if not usuario_logado():
        return redirect(url_for("login", msg="Faça login para agendar."))
    return render_template("agendamento.html", user=get_user())


# -------------------------
# Execução
# -------------------------
if __name__ == "__main__":
    import os
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port)
