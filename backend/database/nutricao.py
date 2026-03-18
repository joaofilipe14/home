from .connection import get_connection
from psycopg2.extras import RealDictCursor
from datetime import datetime

# --- REFEIÇÕES ---
def salvar_refeicao(usuario_id, dados):
    conn = get_connection(); cursor = conn.cursor()
    cursor.execute('INSERT INTO refeicoes (usuario_id, nome_prato, calorias, data_registo) VALUES (%s, %s, %s, %s)',
                   (usuario_id, dados.get('nome_prato'), dados.get('calorias_totais', 0), datetime.now()))
    conn.commit(); conn.close()

def buscar_historico(usuario_id):
    conn = get_connection(); cursor = conn.cursor(cursor_factory=RealDictCursor)
    cursor.execute('SELECT * FROM refeicoes WHERE usuario_id = %s ORDER BY data_registo DESC LIMIT 10', (usuario_id,))
    res = cursor.fetchall(); conn.close()
    return [{"id": r['id'], "nome_prato": r['nome_prato'], "calorias": r['calorias'], "data": r['data_registo']} for r in res]

def calcular_progresso_hoje(usuario_id):
    conn = get_connection(); cursor = conn.cursor()
    cursor.execute("SELECT SUM(calorias) FROM refeicoes WHERE usuario_id = %s AND DATE(data_registo) = CURRENT_DATE", (usuario_id,))
    total = cursor.fetchone()[0] or 0
    cursor.execute('SELECT meta_calorias FROM usuarios WHERE id = %s', (usuario_id,))
    res = cursor.fetchone()
    meta = res[0] if res else 2000
    conn.close()
    return total, meta

# --- ÁGUA ---
def get_agua_hoje(usuario_id):
    conn = get_connection(); cursor = conn.cursor()
    cursor.execute("SELECT copos FROM agua_diaria WHERE usuario_id = %s AND data_registo = CURRENT_DATE", (usuario_id,))
    res = cursor.fetchone(); conn.close()
    return res[0] if res else 0

def update_agua_hoje(usuario_id, copos):
    conn = get_connection(); cursor = conn.cursor()
    cursor.execute("SELECT id FROM agua_diaria WHERE usuario_id = %s AND data_registo = CURRENT_DATE", (usuario_id,))
    if cursor.fetchone():
        cursor.execute("UPDATE agua_diaria SET copos = %s WHERE usuario_id = %s AND data_registo = CURRENT_DATE", (copos, usuario_id))
    else:
        cursor.execute("INSERT INTO agua_diaria (usuario_id, data_registo, copos) VALUES (%s, CURRENT_DATE, %s)", (usuario_id, copos))
    conn.commit(); conn.close()

# --- PLANOS SEMANAIS ---
def salvar_plano_estruturado(usuario_id, lista_dias):
    conn = get_connection(); cursor = conn.cursor()
    try:
        cursor.execute('INSERT INTO planos_semanais (usuario_id, data_criacao) VALUES (%s, %s) RETURNING id', (usuario_id, datetime.now()))
        plano_id = cursor.fetchone()[0]
        for dia in lista_dias:
            for ref in dia.get('refeicoes', []):
                cursor.execute('INSERT INTO itens_plano (plano_id, dia_semana, tipo_refeicao, prato, calorias) VALUES (%s, %s, %s, %s, %s)',
                               (plano_id, dia.get('dia'), ref['tipo'], ref['prato'], ref['calorias']))
        conn.commit()
    except Exception as e: print(e); conn.rollback()
    finally: conn.close()

def buscar_plano_recente(usuario_id):
    conn = get_connection(); cursor = conn.cursor(cursor_factory=RealDictCursor)
    cursor.execute('SELECT id FROM planos_semanais WHERE usuario_id = %s ORDER BY data_criacao DESC LIMIT 1', (usuario_id,))
    res = cursor.fetchone()
    if not res: conn.close(); return None

    cursor.execute('SELECT * FROM itens_plano WHERE plano_id = %s', (res['id'],))
    itens = cursor.fetchall(); conn.close()

    dias_map = {}
    ordem = []
    for item in itens:
        dia = item['dia_semana']
        if dia not in dias_map: dias_map[dia] = []; ordem.append(dia)
        dias_map[dia].append({"tipo": item['tipo_refeicao'], "prato": item['prato'], "calorias": item['calorias']})
    return [{"dia": dia, "refeicoes": dias_map[dia]} for dia in ordem]