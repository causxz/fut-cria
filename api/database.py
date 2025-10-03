import sqlite3
from werkzeug.security import generate_password_hash

DATABASE = 'futsal.db'

def get_db():
    """Conecta ao banco de dados e retorna o objeto de conexão."""
    conn = sqlite3.connect(DATABASE)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    """Cria as tabelas do banco de dados e insere os usuários padrão, se necessário."""
    try:
        conn = get_db()
        cursor = conn.cursor()
        
        print("Conectado ao banco de dados. Verificando tabelas...")
        
        # Criação das tabelas (jogadores, usuarios, eventos)
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS jogadores (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                nome TEXT NOT NULL,
                posicao TEXT,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS usuarios (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT NOT NULL UNIQUE,
                password_hash TEXT NOT NULL
            )
        ''')
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS eventos (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                data TEXT NOT NULL,
                horario TEXT NOT NULL,
                descricao TEXT NOT NULL
            )
        ''')
        print("Tabelas verificadas/criadas.")

        # --- NOVO: Insere os usuários padrão se não existirem ---
        
        # Verifica se o usuário 'admin' já existe
        cursor.execute("SELECT * FROM usuarios WHERE username = 'admin'")
        if cursor.fetchone() is None:
            print("Criando usuários padrão (admin, time)...")
            
            # Usuário para a Faculdade
            admin_pass_hash = generate_password_hash('senha123')
            cursor.execute("INSERT INTO usuarios (username, password_hash) VALUES (?, ?)", ('admin', admin_pass_hash))
            
            # Usuário para a Equipe
            time_pass_hash = generate_password_hash('futcria') # Sugestão de senha, você pode mudar
            cursor.execute("INSERT INTO usuarios (username, password_hash) VALUES (?, ?)", ('time', time_pass_hash))
            
            print("Usuários padrão criados com sucesso.")

        conn.commit()
        print("Banco de dados inicializado com sucesso.")
    
    except sqlite3.Error as e:
        print(f"Ocorreu um erro no banco de dados: {e}")
    
    finally:
        if conn:
            conn.close()

if __name__ == '__main__':
    init_db()

