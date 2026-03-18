from .connection import get_connection
from datetime import datetime
from .usuario import atualizar_usuario_smart

def adicionar_peso(usuario_id, novo_peso, data_registo=None):
    """
    1. Grava o registo no histórico (Tabela 'registos_peso').
    2. Manda atualizar o perfil do utilizador (Tabela 'usuarios'),
       o que vai acionar o recálculo automático da meta calórica.
    """
    conn = get_connection()
    cursor = conn.cursor()

    if not data_registo:
        data_registo = datetime.now().strftime('%Y-%m-%d')

    try:
        # 1. Garantir Tabela e Inserir no Histórico
        cursor.execute("""
                       CREATE TABLE IF NOT EXISTS registos_peso (
                                                                    id SERIAL PRIMARY KEY,
                                                                    usuario_id INTEGER REFERENCES usuarios(id),
                           peso REAL NOT NULL,
                           data_registo DATE NOT NULL,
                           created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                           );
                       """)

        cursor.execute("""
                       INSERT INTO registos_peso (usuario_id, peso, data_registo)
                       VALUES (%s, %s, %s)
                       """, (usuario_id, novo_peso, data_registo))

        conn.commit()

        # Fechamos a conexão aqui para libertar recursos antes de chamar a próxima função
        cursor.close()
        conn.close()

        # 2. Chamar a atualização do Utilizador
        # Passamos apenas o peso novo. A função 'smart' vai detetar a mudança,
        # ir buscar os outros dados (idade, altura) e recalcular a meta sozinha.
        print(f"⚖️ Histórico gravado. A atualizar perfil e meta...")
        atualizar_usuario_smart(usuario_id, {'peso': novo_peso})

        return True

    except Exception as e:
        print(f"❌ Erro ao adicionar peso: {e}")
        # Só fazemos rollback se a conexão ainda estiver aberta
        if conn and not conn.closed:
            conn.rollback()
            conn.close()
        return False

def obter_historico_peso(usuario_id):
    """Retorna todo o histórico ordenado por data"""
    conn = get_connection()
    cursor = conn.cursor()

    # Criar tabela se não existir (para evitar erros na primeira vez)
    cursor.execute("""
                   CREATE TABLE IF NOT EXISTS registos_peso (
                                                                id SERIAL PRIMARY KEY,
                                                                usuario_id INTEGER REFERENCES usuarios(id),
                       peso REAL NOT NULL,
                       data_registo DATE NOT NULL,
                       created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                       );
                   """)

    cursor.execute("""
                   SELECT id, peso, to_char(data_registo, 'YYYY-MM-DD') as data
                   FROM registos_peso
                   WHERE usuario_id = %s
                   ORDER BY data_registo ASC
                   """, (usuario_id,))

    rows = cursor.fetchall()
    conn.close()

    return [{"id": r[0], "peso": r[1], "data": r[2]} for r in rows]

def obter_ultimo_peso(usuario_id):
    """Retorna o último registo de peso (o mais recente)"""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
                   SELECT peso FROM registos_peso
                   WHERE usuario_id = %s
                   ORDER BY data_registo DESC, created_at DESC
                       LIMIT 1
                   """, (usuario_id,))
    res = cursor.fetchone()
    conn.close()
    return res[0] if res else None