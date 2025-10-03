import sqlite3
import os
from werkzeug.security import generate_password_hash

DATABASE_PATH = '/tmp/futsal.db'

def get_db():
    """Conecta ao banco de dados e retorna o objeto de conexão."""
    conn = sqlite3.connect(DATABASE_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    """Cria as tabelas e os usuários iniciais se a base de dados não existir."""
    if os.path.exists(DATABASE_PATH):
        return # A base de dados já existe, não faz nada.

    print("Inicializando nova base de dados em /tmp/futsal.db...")
    try:
        conn = get_db()
        cursor = conn.cursor()
        
        # Criação das tabelas
        cursor.execute('CREATE TABLE jogadores (id INTEGER PRIMARY KEY AUTOINCREMENT, nome TEXT NOT NULL, posicao TEXT)')
        cursor.execute('CREATE TABLE usuarios (id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT NOT NULL UNIQUE, password_hash TEXT NOT NULL)')
        cursor.execute('CREATE TABLE eventos (id INTEGER PRIMARY KEY AUTOINCREMENT, data TEXT NOT NULL, horario TEXT NOT NULL, descricao TEXT NOT NULL)')
        
        # Criação dos usuários iniciais
        users = [
            ('admin', generate_password_hash('senha123')),
            ('time', generate_password_hash('futcria'))
        ]
        cursor.executemany("INSERT INTO usuarios (username, password_hash) VALUES (?, ?)", users)
        
        conn.commit()
        print("Base de dados e usuários iniciais criados com sucesso.")
    
    except sqlite3.Error as e:
        print(f"Ocorreu um erro ao inicializar a base de dados: {e}")
    
    finally:
        if conn:
            conn.close()

