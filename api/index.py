from flask import Flask, jsonify, request, session, render_template, redirect, url_for
from werkzeug.security import generate_password_hash, check_password_hash
from functools import wraps
import os
import requests
from . import database as db 

# A linha "db.init_db()" foi REMOVIDA do topo do ficheiro.

# Configuração da aplicação Flask
app = Flask(__name__, template_folder='../templates', static_folder='../static')
app.secret_key = 'uma-chave-bem-aleatoria-e-segura'

# --- GATILHO DE INICIALIZAÇÃO DA BASE DE DADOS (A SOLUÇÃO DEFINITIVA) ---
@app.before_request
def initialize_database():
    # A função 'init_db' só vai criar a base de dados na primeira vez que for chamada.
    # Este gatilho garante que isso aconteça antes do primeiro pedido real.
    db.init_db()

# --- DECORATOR PARA PROTEGER ROTAS ---
def login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'user_id' not in session:
            if request.path.startswith('/api/'):
                return jsonify({"status": "erro", "message": "Acesso não autorizado."}), 401
            else:
                return redirect(url_for('pagina_login'))
        return f(*args, **kwargs)
    return decorated_function

# --- ROTAS DE PÁGINAS HTML ---
@app.route('/')
@login_required
def pagina_principal():
    return redirect(url_for('pagina_menu'))

@app.route('/login')
def pagina_login():
    if 'user_id' in session:
        return redirect(url_for('pagina_menu'))
    return render_template('index.html')

@app.route('/menu')
@login_required
def pagina_menu():
    return render_template('menu.html')

@app.route('/jogadores')
@login_required
def pagina_jogadores():
    return render_template('jogadores.html')

@app.route('/times')
@login_required
def pagina_times():
    return render_template('times.html')

@app.route('/calendario')
@login_required
def pagina_calendario():
    return render_template('calendario.html')


# --- ROTAS DA API (back-end) ---

@app.route('/api/login', methods=['POST'])
def api_login():
    dados = request.get_json()
    username = dados.get('username')
    password = dados.get('password')

    conn = db.get_db()
    user = conn.execute("SELECT * FROM usuarios WHERE username = ?", (username,)).fetchone()
    conn.close()

    if user and check_password_hash(user['password_hash'], password):
        session['user_id'] = user['id']
        session['username'] = user['username']
        return jsonify({"status": "sucesso", "message": "Login realizado com sucesso!"})
    else:
        return jsonify({"status": "erro", "message": "Credenciais inválidas."}), 401
        
@app.route('/api/logout', methods=['POST'])
@login_required
def api_logout():
    session.clear()
    return jsonify({"status": "sucesso", "message": "Logout realizado com sucesso."})

@app.route('/api/jogadores', methods=['GET', 'POST'])
@login_required
def api_gerenciar_jogadores():
    conn = db.get_db()
    try:
        if request.method == 'GET':
            jogadores_rows = conn.execute("SELECT id, nome, posicao FROM jogadores ORDER BY nome ASC").fetchall()
            return jsonify([dict(row) for row in jogadores_rows])
        elif request.method == 'POST':
            dados = request.get_json()
            nome = dados.get('nome')
            if not nome or not nome.strip():
                return jsonify({"status": "erro", "message": "O nome é obrigatório."}), 400
            posicao = dados.get('posicao')
            cursor = conn.cursor()
            cursor.execute("INSERT INTO jogadores (nome, posicao) VALUES (?, ?)", (nome, posicao))
            conn.commit()
            return jsonify({"status": "sucesso", "message": "Jogador criado!", "id": cursor.lastrowid}), 201
    finally:
        if conn: conn.close()

@app.route('/api/jogadores/<int:id>', methods=['PUT', 'DELETE'])
@login_required
def api_gerenciar_jogador_especifico(id):
    conn = db.get_db()
    try:
        if request.method == 'PUT':
            dados = request.get_json()
            nome = dados.get('nome')
            if not nome or not nome.strip():
                return jsonify({"status": "erro", "message": "O nome é obrigatório."}), 400
            posicao = dados.get('posicao')
            conn.execute("UPDATE jogadores SET nome = ?, posicao = ? WHERE id = ?", (nome, posicao, id))
            conn.commit()
            return jsonify({"status": "sucesso", "message": "Jogador atualizado!"})
        elif request.method == 'DELETE':
            cursor = conn.cursor()
            cursor.execute("DELETE FROM jogadores WHERE id = ?", (id,))
            conn.commit()
            if cursor.rowcount == 0:
                return jsonify({"status": "erro", "message": "Jogador não encontrado."}), 404
            return jsonify({"status": "sucesso", "message": "Jogador deletado!"})
    finally:
        if conn: conn.close()

@app.route('/api/eventos', methods=['GET', 'POST'])
@login_required
def api_gerenciar_eventos():
    conn = db.get_db()
    try:
        if request.method == 'GET':
            eventos_rows = conn.execute("SELECT id, data, horario, descricao FROM eventos ORDER BY data, horario").fetchall()
            return jsonify([dict(row) for row in eventos_rows])
        elif request.method == 'POST':
            dados = request.get_json()
            if not all(k in dados and dados[k] for k in ['data', 'horario', 'descricao']):
                return jsonify({"status": "erro", "message": "Todos os campos são obrigatórios."}), 400
            cursor = conn.cursor()
            cursor.execute("INSERT INTO eventos (data, horario, descricao) VALUES (?, ?, ?)",
                           (dados['data'], dados['horario'], dados['descricao']))
            conn.commit()
            return jsonify({"status": "sucesso", "message": "Evento criado!", "id": cursor.lastrowid}), 201
    finally:
        if conn: conn.close()

@app.route('/api/eventos/<int:id>', methods=['DELETE'])
@login_required
def api_deletar_evento(id):
    conn = db.get_db()
    try:
        cursor = conn.cursor()
        cursor.execute("DELETE FROM eventos WHERE id = ?", (id,))
        conn.commit()
        if cursor.rowcount == 0:
            return jsonify({"status": "erro", "message": "Evento não encontrado."}), 404
        return jsonify({"status": "sucesso", "message": "Evento deletado!"})
    finally:
        if conn: conn.close()

@app.route('/api/clima', methods=['POST'])
@login_required
def api_clima():
    dados = request.get_json()
    cidade = dados.get('cidade')
    if not cidade:
        return jsonify({"erro": "Cidade não fornecida"}), 400
    
    API_KEY = os.getenv('API_KEY')
    if not API_KEY:
        return jsonify({"erro": "Chave da API de clima não configurada no servidor."}), 500
    
    URL_BASE = "http://api.openweathermap.org/data/2.5/forecast"
    params = {'q': cidade, 'appid': API_KEY, 'units': 'metric', 'lang': 'pt_br'}
    
    try:
        response = requests.get(URL_BASE, params=params)
        response.raise_for_status()
        data = response.json()

        previsao_diaria = {}
        for previsao in data.get('list', []):
            data_texto = previsao['dt_txt'].split(' ')[0]
            if data_texto not in previsao_diaria:
                previsao_diaria[data_texto] = {
                    "data": data_texto,
                    "temp": round(previsao['main']['temp']),
                    "descricao": previsao['weather'][0]['description'],
                    "icone": f"http://openweathermap.org/img/wn/{previsao['weather'][0]['icon']}@2x.png"
                }
        
        previsoes_finais = list(previsao_diaria.values())[:5]
        
        return jsonify({
            "cidade": data.get('city', {}).get('name', 'Não encontrada'),
            "previsao": previsoes_finais
        })

    except requests.exceptions.HTTPError as err:
        if err.response.status_code == 404:
            return jsonify({"erro": "Cidade não encontrada."}), 404
        return jsonify({"erro": f"Erro ao buscar dados do clima: {err}"}), 500
    except Exception as e:
        return jsonify({"erro": f"Ocorreu um erro inesperado: {e}"}), 500

if __name__ == '__main__':
    app.run(debug=True, port=5000)

