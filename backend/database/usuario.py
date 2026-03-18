from .connection import get_connection
from psycopg2.extras import RealDictCursor
from agent.calculator import calcular_meta_calorica  # <--- A Lógica está aqui!

# ==============================================================================
# 1. CRIAÇÃO E LEITURA
# ==============================================================================

def listar_usuarios():
    conn = get_connection()
    cursor = conn.cursor(cursor_factory=RealDictCursor)
    cursor.execute('SELECT * FROM usuarios')
    res = cursor.fetchall()
    conn.close()
    return res

def obter_usuario_por_id(usuario_id):
    """Busca todos os dados de um utilizador (útil para o update inteligente)"""
    conn = get_connection()
    cursor = conn.cursor(cursor_factory=RealDictCursor)
    cursor.execute("SELECT * FROM usuarios WHERE id = %s", (usuario_id,))
    res = cursor.fetchone()
    conn.close()
    return res

def criar_usuario(nome, restricoes, orcamento, altura, peso, idade, genero, atividade, objetivo,
                  salario_base=0, subsidio_alimentacao=0, seguro_capitalizacao=0): # <--- NOVOS CAMPOS
    """
    Cria o utilizador completo: Físico + Financeiro.
    """
    # 1. Calcular Meta
    meta_calculada = calcular_meta_calorica(
        peso=peso, altura=altura, idade=idade,
        genero=genero, atividade=atividade, objetivo=objetivo
    )
    conn = get_connection()
    cursor = conn.cursor()
    try:
        # 2. Inserir TUDO numa só query
        cursor.execute("""
                       INSERT INTO usuarios
                       (nome, meta_calorias, restricoes, orcamento_semanal, altura, peso, idade, genero, atividade, objetivo,
                        salario_base, subsidio_alimentacao, seguro_capitalizacao)
                       VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                           RETURNING id
                       """, (
                           nome, meta_calculada, restricoes, orcamento, altura, peso, idade, genero, atividade, objetivo,
                           salario_base, subsidio_alimentacao, seguro_capitalizacao
                       ))

        user_id = cursor.fetchone()[0]
        conn.commit()
        return user_id, meta_calculada

    except Exception as e:
        print(f"Erro ao criar utilizador: {e}")
        conn.rollback()
        return None, None
    finally:
        conn.close()

# ==============================================================================
# 2. ATUALIZAÇÃO INTELIGENTE (SMART UPDATE)
# ==============================================================================

def atualizar_usuario_smart(usuario_id, dados_novos):
    """
    Verifica se mudaste dados físicos (peso, objetivo...).
    Se sim -> Recalcula a meta e grava.
    Se não -> Apenas atualiza os campos (ex: salário, nome).
    """

    campos_fisicos = ['peso', 'altura', 'idade', 'genero', 'atividade', 'objetivo']
    precisa_recalcular = any(campo in dados_novos for campo in campos_fisicos)
    nova_meta = None

    # Lógica de Recálculo
    if precisa_recalcular:
        user_atual = obter_usuario_por_id(usuario_id)
        if user_atual:
            # Merge: Usa o novo valor se existir, senão mantém o antigo
            peso = float(dados_novos.get('peso', user_atual['peso']))
            altura = float(dados_novos.get('altura', user_atual['altura']))
            idade = int(dados_novos.get('idade', user_atual['idade']))
            genero = dados_novos.get('genero', user_atual['genero'])
            atividade = dados_novos.get('atividade', user_atual['atividade'])
            objetivo = dados_novos.get('objetivo', user_atual['objetivo'])

            # Recalcular
            nova_meta = calcular_meta_calorica(peso, altura, idade, genero, atividade, objetivo)

            # Adicionar à lista de updates
            dados_novos['meta_calorias'] = nova_meta
            print(f"🔄 Meta recalculada para: {nova_meta} kcal")

    # Executar SQL Dinâmico
    sucesso = _executar_update_dinamico(usuario_id, dados_novos)
    return sucesso, nova_meta

def _executar_update_dinamico(usuario_id, dados):
    """Função interna que apenas constrói e executa a query SQL"""
    conn = get_connection()
    cursor = conn.cursor()

    colunas_permitidas = [
        'nome', 'meta_calorias', 'altura', 'restricoes', 'orcamento_semanal',
        'salario_base', 'subsidio_alimentacao', 'seguro_capitalizacao',
        'peso', 'idade', 'genero', 'atividade', 'objetivo'
    ]

    campos_sql = []
    valores = []

    try:
        for campo, valor in dados.items():
            if campo in colunas_permitidas:
                campos_sql.append(f"{campo} = %s")
                valores.append(valor)

        if not campos_sql: return False

        valores.append(usuario_id)
        query = f"UPDATE usuarios SET {', '.join(campos_sql)} WHERE id = %s"
        cursor.execute(query, tuple(valores))
        conn.commit()
        return True
    except Exception as e:
        print(f"Erro Update SQL: {e}")
        conn.rollback()
        return False
    finally:
        conn.close()

# ==============================================================================
# 3. GETTERS FINANCEIROS
# ==============================================================================

def get_orcamento(usuario_id):
    conn = get_connection(); cursor = conn.cursor()
    cursor.execute('SELECT orcamento_semanal FROM usuarios WHERE id = %s', (usuario_id,))
    res = cursor.fetchone()
    conn.close()
    return res[0] if res else 50.0

def get_rendimentos_usuario(usuario_id):
    conn = get_connection()
    cursor = conn.cursor(cursor_factory=RealDictCursor)
    cursor.execute("""
                   SELECT salario_base, subsidio_alimentacao, seguro_capitalizacao
                   FROM usuarios WHERE id = %s
                   """, (usuario_id,))
    res = cursor.fetchone()
    conn.close()

    if res:
        base = res['salario_base'] or 0
        ali = res['subsidio_alimentacao'] or 0
        seg = res['seguro_capitalizacao'] or 0
        return {"base": base, "alimentacao": ali, "seguro": seg, "total": base + ali + seg}
    return {"base": 0, "alimentacao": 0, "seguro": 0, "total": 0}