import os
import sys
import logging
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo

# DON'T CHANGE THIS !!!
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from flask import Flask, send_from_directory, request, session, redirect, url_for, render_template, jsonify
from dotenv import load_dotenv
from supabase import create_client, Client

# Configuração de logging
logging.basicConfig(level=logging.DEBUG)

# Carrega variáveis de ambiente
load_dotenv()

app = Flask(__name__, 
           static_folder=os.path.join(os.path.dirname(os.path.dirname(__file__)), 'public'),
           template_folder=os.path.join(os.path.dirname(os.path.dirname(__file__)), 'public'))

app.secret_key = os.getenv('SECRET_KEY', 'nail_designer_lucimara_2025')

# Configura o Supabase
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

# Inicializa Supabase apenas se as variáveis estiverem definidas
if SUPABASE_URL and SUPABASE_KEY:
    supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
else:
    supabase = None
    logging.warning("Supabase não configurado - usando modo demo")

@app.route('/')
def home():
    if session.get('autenticado_cliente'):
        return redirect(url_for('index'))
    return redirect(url_for('login'))

@app.route('/index', methods=['GET'])
def index():
    logging.debug(f"Session check in /index: {session.get('autenticado_cliente')}")
    if not session.get('autenticado_cliente'):
        return redirect(url_for('login'))
    
    # Checa tempo de sessão
    last_access = session.get('last_access')
    if last_access:
        if datetime.now(ZoneInfo("America/Sao_Paulo")) - last_access > timedelta(minutes=180):
            session.clear()
            return redirect(url_for('login'))
    
    session['last_access'] = datetime.now(ZoneInfo("America/Sao_Paulo"))
    return render_template('index.html', 
                         session_script="sessionStorage.setItem('autenticado_cliente', 'true');")

@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        nome_input = request.form.get('nome', '').strip()
        senha = request.form.get('senha', '')
        
        if len(senha) < 6:
            return render_template('login.html', 
                                 erro="Senha deve ter pelo menos 6 dígitos", 
                                 authenticated=False, supabase=supabase)
        
        nome_lower = nome_input.lower()
        
        # Modo demo se Supabase não estiver configurado
        if not supabase:
            if nome_lower == "demo" and senha == "123456":
                session['autenticado_cliente'] = True
                session['id_cliente'] = "00000000-0000-0000-0000-000000000000"  # UUID fixo para demo
                session.permanent = True
                app.permanent_session_lifetime = timedelta(minutes=180)
                return redirect(url_for('index'))
            else:
                return render_template('login.html', 
                                     erro="Modo demo: use 'demo' e senha '123456'", 
                                     authenticated=False, supabase=supabase)
        
        # Lógica com Supabase
        try:
            # Autenticar usuário com Supabase Auth
            email = f"{nome_lower}@naildesigner.com"  # Usar um domínio fictício
            user = supabase.auth.sign_in_with_password({
                "email": email,
                "password": senha
            })
            
            if user:
                # Verificar se o cliente existe na tabela clientes
                check_nome = supabase.table('clientes').select('id_cliente, nome, aniversario').eq('nome_lower', nome_lower).execute()
                
                if check_nome.data:
                    existing = check_nome.data[0]
                    session['autenticado_cliente'] = True
                    session['id_cliente'] = str(existing['id_cliente'])  # Converter UUID para string na sessão
                    session.permanent = True
                    app.permanent_session_lifetime = timedelta(minutes=180)

                    # Checagem do aniversário
                    if not existing.get('aniversario'):
                        return render_template('login.html', solicitar_aniversario=True)

                    return redirect(url_for('index'))
                else:
                    # Criar novo cliente
                    id_cliente = user.user.id  # Usar o UUID do usuário autenticado
                    new_client = {
                        'id_cliente': id_cliente,
                        'nome': nome_input,
                        'nome_lower': nome_lower,
                        'created_at': datetime.now(ZoneInfo("America/Sao_Paulo")).isoformat()
                    }
                    
                    result = supabase.table('clientes').insert(new_client).execute()
                    if result.data:
                        session['autenticado_cliente'] = True
                        session['id_cliente'] = str(id_cliente)
                        session.permanent = True
                        app.permanent_session_lifetime = timedelta(minutes=180)
                        return render_template('login.html', solicitar_aniversario=True)
                    else:
                        return render_template('login.html', 
                                             erro="Erro ao cadastrar", 
                                             authenticated=False, supabase=supabase)
            else:
                return render_template('login.html', 
                                     erro="Senha incorreta ou usuário não encontrado", 
                                     authenticated=False, supabase=supabase)
        except Exception as e:
            logging.error(f"Erro ao cadastrar cliente: {str(e)}")
            return render_template('login.html', 
                                 erro="Erro ao cadastrar: Nome já pode estar em uso", 
                                 authenticated=False, supabase=supabase)
    
    return render_template('login.html', authenticated=False, show_tutorial=True, supabase=supabase)

@app.route('/atualizar_aniversario', methods=['POST'])
def atualizar_aniversario():
    if not session.get('id_cliente'):
        return jsonify({"error": "Não autenticado"}), 401
    
    aniversario = request.form.get('aniversario')
    if not aniversario:
        return jsonify({"error": "Data obrigatória"}), 400
    
    id_cliente = session['id_cliente']
    
    if supabase:
        supabase.table('clientes').update({'aniversario': aniversario}).eq('id_cliente', id_cliente).execute()
    
    return redirect(url_for('index'))

@app.route('/esqueci_senha', methods=['POST'])
def esqueci_senha():
    if not supabase:
        return render_template('login.html', 
                             erro="Funcionalidade não disponível no modo demo", 
                             authenticated=False, supabase=supabase)
    
    nome = request.form.get('nome', '').strip().lower()
    aniversario = request.form.get('aniversario')
    nova_senha = request.form.get('nova_senha')

    if not nome or not aniversario:
        return render_template('login.html', 
                             erro="Preencha todos os campos", 
                             authenticated=False, supabase=supabase)

    try:
        query = supabase.table('clientes').select('id_cliente, aniversario').eq('nome_lower', nome).execute()
        if not query.data:
            return render_template('login.html', 
                                 erro="Usuário não encontrado", 
                                 authenticated=False, supabase=supabase)

        cliente = query.data[0]
        if cliente.get('aniversario') != aniversario:
            return render_template('login.html', 
                                 erro="Data de aniversário incorreta", 
                                 authenticated=False, supabase=supabase)

        # Se já veio a nova senha → redefinir usando Supabase Auth
        if nova_senha:
            if len(nova_senha) < 6:
                return render_template('login.html', 
                                     erro="Senha deve ter ao menos 6 dígitos", 
                                     authenticated=False, supabase=supabase)

            email = f"{nome}@naildesigner.com"
            supabase.auth.admin.update_user_by_id(cliente['id_cliente'], {"password": nova_senha})
            return redirect(url_for('login', msg="Senha redefinida com sucesso!"))

        # Se ainda não veio a nova senha → renderiza o login pedindo a senha
        return render_template('login.html', reset_senha=True, nome=nome, aniversario=aniversario)
    
    except Exception as e:
        logging.error(f"Erro ao redefinir senha: {str(e)}")
        return render_template('login.html', 
                             erro="Erro interno do servidor", 
                             authenticated=False, supabase=supabase)

@app.route('/logout')
def logout():
    if supabase:
        supabase.auth.sign_out()
    session.clear()
    return redirect(url_for('login'))

@app.route('/agendamentos', methods=['GET', 'POST'])
def agendamentos():
    if not session.get('autenticado_cliente'):
        return redirect(url_for('login'))
    
    if request.method == 'POST':
        id_servico = request.form.get('id_servico')
        data_agendamento = request.form.get('data_agendamento')
        hora_agendamento = request.form.get('hora_agendamento')
        observacoes = request.form.get('observacoes', '')
        
        if not all([id_servico, data_agendamento, hora_agendamento]):
            return jsonify({"error": "Todos os campos são obrigatórios"}), 400
        
        try:
            new_agendamento = {
                'id_cliente': session['id_cliente'],
                'id_servico': int(id_servico),
                'data_agendamento': data_agendamento,
                'hora_agendamento': hora_agendamento,
                'status': 'pendente',
                'observacoes': observacoes,
                'created_at': datetime.now(ZoneInfo("America/Sao_Paulo")).isoformat()
            }
            
            result = supabase.table('agendamentos').insert(new_agendamento).execute()
            if result.data:
                return jsonify({"message": "Agendamento criado com sucesso"}), 200
            else:
                return jsonify({"error": "Erro ao criar agendamento"}), 500
        except Exception as e:
            logging.error(f"Erro ao criar agendamento: {str(e)}")
            return jsonify({"error": "Erro ao criar agendamento"}), 500
    
    # GET: Listar agendamentos do cliente
    try:
        agendamentos = supabase.table('agendamentos').select('*').eq('id_cliente', session['id_cliente']).execute()
        servicos = supabase.table('servicos').select('*').eq('ativo', True).execute()
        return render_template('agendamentos.html', 
                             agendamentos=agendamentos.data, 
                             servicos=servicos.data,
                             authenticated=True)
    except Exception as e:
        logging.error(f"Erro ao listar agendamentos: {str(e)}")
        return render_template('agendamentos.html', 
                             erro="Erro ao carregar agendamentos", 
                             authenticated=True)

@app.route('/static/<path:path>')
def serve_static(path):
    static_folder_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'static')
    if os.path.exists(os.path.join(static_folder_path, path)):
        return send_from_directory(static_folder_path, path)
    return "File not found", 404

@app.route('/<path:path>')
def serve(path):
    static_folder_path = app.static_folder
    if static_folder_path is None:
        return "Static folder not configured", 404

    if path != "" and os.path.exists(os.path.join(static_folder_path, path)):
        return send_from_directory(static_folder_path, path)
    else:
        # Para rotas não encontradas, verifica se é uma rota da aplicação
        if path in ['login', 'index', 'logout', 'agendamentos']:
            return globals()[path]()
        
        index_path = os.path.join(static_folder_path, 'index.html')
        if os.path.exists(index_path):
            return send_from_directory(static_folder_path, 'index.html')
        else:
            return "index.html not found", 404

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
