from .connection import get_connection
from psycopg2.extras import RealDictCursor
from datetime import datetime

# ==========================================
# 1. GESTÃO DE CONTAS
# ==========================================

def criar_conta(usuario_id, nome, saldo_inicial=0):
    conn = get_connection(); cursor = conn.cursor()
    cursor.execute(
        "INSERT INTO contas_bancarias (usuario_id, nome, saldo_atual) VALUES (%s, %s, %s) RETURNING id",
        (usuario_id, nome, saldo_inicial)
    )
    conn.commit(); conn.close()

def listar_contas(usuario_id):
    conn = get_connection(); cursor = conn.cursor(cursor_factory=RealDictCursor)
    cursor.execute("SELECT * FROM contas_bancarias WHERE usuario_id = %s", (usuario_id,))
    res = cursor.fetchall(); conn.close()
    return res

def listar_categorias():
    conn = get_connection(); cursor = conn.cursor(cursor_factory=RealDictCursor)
    cursor.execute("SELECT * FROM categorias_financas")
    res = cursor.fetchall(); conn.close()
    return res

# ==========================================
# 2. MOVIMENTOS E SALDOS (Com Segurança)
# ==========================================
def adicionar_transacao(usuario_id, conta_id, categoria_id, valor, descricao, data=None, verificar_duplicados=False):
    conn = get_connection()
    cursor = conn.cursor()
    try:
        # 1. VERIFICAR DUPLICADOS (Versão Robusta)
        if verificar_duplicados and data:
            # Nota: O ::date converte timestamps para apenas data (YYYY-MM-DD)
            # O ABS(...) < 0.01 resolve problemas de floats (ex: 10.46 vs 10.4600001)
            query_duplicado = """
                              SELECT id FROM transacoes
                              WHERE usuario_id = %s
                                AND conta_id = %s
                                AND TRIM(descricao) = TRIM(%s)
                                AND data_transacao::date = %s::date
                                AND ABS(valor::numeric - %s::numeric) < 0.01 \
                              """
            cursor.execute(query_duplicado, (usuario_id, conta_id, descricao, data, valor))

            if cursor.fetchone():
                print(f"⚠️ Duplicado ignorado: {descricao} | {valor}€")
                return False # Encontrou duplicado, aborta

        # 2. INSERIR (Se não for duplicado)
        cursor.execute("""
                       INSERT INTO transacoes (usuario_id, conta_id, categoria_id, valor, descricao, data_transacao)
                       VALUES (%s, %s, %s, %s, %s, COALESCE(%s, NOW()))
                       """, (usuario_id, conta_id, categoria_id, valor, descricao, data))

        # 3. Atualizar Saldo
        cursor.execute("UPDATE contas_bancarias SET saldo_atual = saldo_atual + %s WHERE id = %s", (valor, conta_id))

        conn.commit()
        return True

    except Exception as e:
        print(f"❌ Erro na transação: {e}")
        conn.rollback()
        return False
    finally:
        conn.close()

def obter_resumo_financeiro(usuario_id):
    conn = get_connection(); cursor = conn.cursor(cursor_factory=RealDictCursor)
    # Saldo Total
    cursor.execute("SELECT SUM(saldo_atual) as total FROM contas_bancarias WHERE usuario_id = %s", (usuario_id,))
    saldo = cursor.fetchone()['total'] or 0

    # Gastos por Categoria (Mês Atual)
    cursor.execute("""
                   SELECT c.nome, SUM(ABS(t.valor)) as total, c.cor_hex
                   FROM transacoes t
                            JOIN categorias_financas c ON t.categoria_id = c.id
                   WHERE t.usuario_id = %s AND t.valor < 0 AND t.data_transacao >= DATE_TRUNC('month', CURRENT_DATE)
                   GROUP BY c.nome, c.cor_hex ORDER BY total DESC
                   """, (usuario_id,))
    gastos = cursor.fetchall()
    conn.close()
    return {"saldo_total": saldo, "gastos_mes": gastos}

def listar_transacoes_recentes(usuario_id):
    conn = get_connection(); cursor = conn.cursor(cursor_factory=RealDictCursor)
    cursor.execute("""
                   SELECT t.id, t.data_transacao, t.descricao, t.valor, c.nome as categoria, c.cor_hex
                   FROM transacoes t LEFT JOIN categorias_financas c ON t.categoria_id = c.id
                   WHERE t.usuario_id = %s ORDER BY t.data_transacao DESC
                   """, (usuario_id,))
    res = cursor.fetchall(); conn.close()
    return res

def atualizar_categoria_transacao(transacao_id, nova_categoria_id):
    conn = get_connection(); cursor = conn.cursor()
    cursor.execute("UPDATE transacoes SET categoria_id = %s WHERE id = %s", (nova_categoria_id, transacao_id))
    conn.commit(); conn.close()

# ==========================================
# 3. DESPESAS FIXAS
# ==========================================

def adicionar_despesa_fixa(usuario_id, descricao, valor, dia, meses=None):
    """ meses: string separada por virgulas (ex: "1,6") ou None para mensal. """
    conn = get_connection(); cursor = conn.cursor()
    cursor.execute(
        "INSERT INTO despesas_fixas (usuario_id, descricao, valor, dia_previsto, meses) VALUES (%s, %s, %s, %s, %s)",
        (usuario_id, descricao, valor, dia, meses)
    )
    conn.commit(); conn.close()

def listar_despesas_fixas(usuario_id):
    conn = get_connection(); cursor = conn.cursor(cursor_factory=RealDictCursor)
    cursor.execute("SELECT * FROM despesas_fixas WHERE usuario_id = %s ORDER BY dia_previsto", (usuario_id,))
    res = cursor.fetchall(); conn.close()
    return res

def remover_despesa_fixa(id_despesa):
    conn = get_connection(); cursor = conn.cursor()
    cursor.execute("DELETE FROM despesas_fixas WHERE id = %s", (id_despesa,))
    conn.commit(); conn.close()

# ==========================================
# 4. RENDIMENTOS E MAPA ANUAL (Lógica Corrigida)
# ==========================================

def atualizar_rendimentos_usuario(usuario_id, base, alimentacao, seguro):
    conn = get_connection(); cursor = conn.cursor()
    try:
        cursor.execute("""
                       UPDATE usuarios SET salario_base = %s, subsidio_alimentacao = %s, seguro_capitalizacao = %s
                       WHERE id = %s
                       """, (base, alimentacao, seguro, usuario_id))
        conn.commit(); return True
    except Exception as e:
        print(f"Erro: {e}"); conn.rollback(); return False
    finally: conn.close()

def get_rendimentos_usuario(usuario_id):
    conn = get_connection(); cursor = conn.cursor(cursor_factory=RealDictCursor)
    cursor.execute("SELECT salario_base, subsidio_alimentacao, seguro_capitalizacao FROM usuarios WHERE id = %s", (usuario_id,))
    res = cursor.fetchone(); conn.close()

    if res:
        total = (res['salario_base'] or 0) + (res['subsidio_alimentacao'] or 0) + (res['seguro_capitalizacao'] or 0)
        return {
            "base": res['salario_base'] or 0,
            "alimentacao": res['subsidio_alimentacao'] or 0,
            "seguro": res['seguro_capitalizacao'] or 0,
            "total": total
        }
    return {"base": 0, "alimentacao": 0, "seguro": 0, "total": 0}

def obter_resumo_anual(usuario_id):
    """Gera o Excel Anual misturando histórico real com projeções."""
    conn = get_connection(); cursor = conn.cursor()

    # 1. Obter Previsão de Receita (Salário + Sub + Seguro)
    rend = get_rendimentos_usuario(usuario_id)
    previsao_receita_total = rend['total']

    # 2. Obter Previsão de Despesas (Fixas + Supermercado)
    # A. Buscar Orçamento de Supermercado
    cursor.execute("SELECT orcamento_semanal FROM usuarios WHERE id = %s", (usuario_id,))
    res_orc = cursor.fetchone()
    orcamento_mensal_estimado = (res_orc[0] * 4.3) if res_orc else 215.0 # (50€ * 4.3 semanas)

    # B. Buscar Despesas Fixas
    cursor.execute("SELECT valor, meses FROM despesas_fixas WHERE usuario_id = %s", (usuario_id,))
    todas_fixas = cursor.fetchall()
    # todas_fixas é uma lista de tuplas [(valor, meses), ...]

    # 3. Buscar Histórico Real (Transações já feitas)
    cursor.execute("""
                   SELECT TO_CHAR(data_transacao, 'YYYY-MM') as mes,
                          SUM(CASE WHEN valor > 0 THEN valor ELSE 0 END) as receitas,
                          ABS(SUM(CASE WHEN valor < 0 THEN valor ELSE 0 END)) as despesas
                   FROM transacoes WHERE usuario_id = %s
                   GROUP BY 1 ORDER BY 1 ASC
                   """, (usuario_id,))
    dados_reais = {row[0]: {'receitas': float(row[1]), 'despesas': float(row[2])} for row in cursor.fetchall()}

    conn.close()

    # 4. Construir o Mapa (Jan a Dez)
    ano_atual = datetime.now().year
    resultado = []

    for i in range(1, 13):
        mes_str = f"{ano_atual}-{i:02d}" # Ex: "2026-04"
        dados = dados_reais.get(mes_str, {'receitas': 0, 'despesas': 0})

        # --- LÓGICA DE PROJEÇÃO DE RECEITA ---
        receita_final = dados['receitas']
        eh_previsao = False

        if receita_final == 0:
            eh_previsao = True
            if i == 8: # Agosto (Férias: Sem subsídio alimentação)
                receita_final = rend['base'] + rend['seguro']
            else:
                receita_final = rend['total']

        # --- LÓGICA DE PROJEÇÃO DE DESPESA ---
        despesa_final = dados['despesas']

        # Se não houver despesas reais significativas neste mês, calculamos a previsão
        if despesa_final < 10:
            # 1. Somar Despesas Fixas que caem neste mês 'i'
            soma_fixas = 0
            for valor, meses_str in todas_fixas:
                if meses_str is None: # Mensal
                    soma_fixas += float(valor)
                else: # Sazonal (ex: "4")
                    lista_meses = [int(x) for x in meses_str.split(',')]
                    if i in lista_meses:
                        soma_fixas += float(valor)

            # 2. Adicionar Supermercado
            despesa_final = soma_fixas + orcamento_mensal_estimado

        resultado.append({
            "mes": mes_str,
            "receitas": receita_final,
            "despesas": despesa_final,
            "eh_previsao": eh_previsao,
            "ferias": (i == 8 and eh_previsao)
        })

    return resultado

def obter_objetivo_casa(usuario_id):
    """Retorna o objetivo 'Entrada da Casa' ou cria um default se não existir"""
    conn = get_connection()
    cursor = conn.cursor(cursor_factory=RealDictCursor)

    # Tenta buscar
    cursor.execute("""
                   SELECT * FROM objetivos_financeiros
                   WHERE usuario_id = %s AND titulo = 'Entrada da Casa'
                       LIMIT 1
                   """, (usuario_id,))
    res = cursor.fetchone()

    # Se não existir, cria um default a zeros
    if not res:
        cursor.execute("""
                       INSERT INTO objetivos_financeiros (usuario_id, titulo, meta_valor, saldo_atual, icone)
                       VALUES (%s, 'Entrada da Casa', 15000, 0, '🏠')
                           RETURNING *
                       """, (usuario_id,))
        res = cursor.fetchone()
        conn.commit()

    conn.close()
    return res

def atualizar_objetivo_casa(usuario_id, novo_saldo=None, nova_meta=None):
    """Atualiza o saldo ou a meta do objetivo"""
    conn = get_connection()
    cursor = conn.cursor()

    try:
        if novo_saldo is not None:
            cursor.execute("""
                           UPDATE objetivos_financeiros
                           SET saldo_atual = %s
                           WHERE usuario_id = %s AND titulo = 'Entrada da Casa'
                           """, (novo_saldo, usuario_id))

        if nova_meta is not None:
            cursor.execute("""
                           UPDATE objetivos_financeiros
                           SET meta_valor = %s
                           WHERE usuario_id = %s AND titulo = 'Entrada da Casa'
                           """, (nova_meta, usuario_id))

        conn.commit()
        return True
    except Exception as e:
        print(e)
        conn.rollback()
        return False
    finally:
        conn.close()

def adicionar_poupanca(usuario_id, valor):
    """Soma um valor ao saldo atual (Mealheiro)"""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
                   UPDATE objetivos_financeiros
                   SET saldo_atual = saldo_atual + %s
                   WHERE usuario_id = %s AND titulo = 'Entrada da Casa'
                   """, (valor, usuario_id))
    conn.commit()
    conn.close()
    return True