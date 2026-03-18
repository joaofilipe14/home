import re
from datetime import datetime
from psycopg2.extras import RealDictCursor
from .connection import get_connection

# ==============================================================================
#  FUNÇÕES AUXILIARES
# ==============================================================================
def extrair_float(valor):
    """
    Transforma "1 un", "1.5 kg", "2 garrafas" em números puros: 1.0, 1.5, 2.0
    """
    if not valor: return 1.0

    # Se já for número, devolve logo
    if isinstance(valor, (int, float)): return float(valor)

    # Se for string, usa Regex para apanhar o primeiro número (aceita 1.5 ou 1,5)
    match = re.search(r'(\d+(?:[.,]\d+)?)', str(valor))
    if match:
        return float(match.group(1).replace(',', '.'))

    return 1.0

# ==============================================================================
#  PARTE 1: HISTÓRICO DE TALÕES (O QUE OS AGENTES USAM) 🧾
# ==============================================================================

def salvar_talao_historico(usuario_id, dados_talao, itens):
    """
    Grava o cabeçalho do talão e todos os seus itens.
    Preenche automaticamente a Despensa (quantidade_atual).
    Calcula preço unitário se necessário.
    """
    conn = get_connection()
    cursor = conn.cursor()

    try:
        # 1. Inserir o Cabeçalho (Tabela: listas_compras)
        cursor.execute("""
                       INSERT INTO listas_compras
                       (usuario_id, loja, data_compra, total_gasto, nota_nutricional, conselho_financeiro, created_at)
                       VALUES (%s, %s, %s, %s, %s, %s, %s)
                           RETURNING id
                       """, (
                           usuario_id,
                           dados_talao.get('loja', 'Desconhecido'),
                           dados_talao.get('data', datetime.now()),
                           dados_talao.get('total', 0.0),
                           dados_talao.get('nota_nutricional', 0),
                           dados_talao.get('conselho_financeiro', ''),
                           datetime.now()
                       ))

        lista_id = cursor.fetchone()[0]

        # 2. Inserir os Itens Detalhados (Tabela: itens_compra)
        for item in itens:
            # A. Limpeza de Quantidade (para Stock)
            qtd_real = extrair_float(item.get('qtd', 1))
            preco_total = float(item.get('preco', 0)) # O Preço Total da Linha

            # B. Cálculo Inteligente do Unitário
            # Se o frontend enviou 'preco_unitario', usa-o.
            # Se não, calcula: Total / Quantidade
            preco_unitario_enviado = item.get('preco_unitario')

            if preco_unitario_enviado is not None:
                preco_unitario_final = float(preco_unitario_enviado)
            elif qtd_real > 0:
                preco_unitario_final = round(preco_total / qtd_real, 2)
            else:
                preco_unitario_final = preco_total

            # C. Lógica de Localização (Despensa)
            categoria = item.get('categoria_financeira', 'Outros')
            local = 'armario' # Default
            if categoria in ['Laticínios', 'Charcutaria', 'Peixaria', 'Talho', 'Iogurtes', 'Congelados']:
                local = 'frigorifico' if categoria != 'Congelados' else 'congelador'

            # D. Inserção Completa
            cursor.execute("""
                           INSERT INTO itens_compra
                           (
                               lista_id,
                               nome_produto,
                               quantidade,          -- Qtd Original da Compra (Histórico)
                               quantidade_atual,    -- Qtd Atual (Stock Despensa)
                               unidade,             -- 'un', 'kg', etc.
                               preco_unitario,      -- Calculado ou Recebido
                               preco_total,         -- Total da Linha
                               categoria_financeira,
                               e_essencial,
                               categoria_nutricional,
                               nivel_processamento,
                               tem_gluten,
                               calorias_estimadas,
                               local_armazenamento,
                               validade
                           )
                           VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                           """, (
                               lista_id,
                               item.get('item'),
                               qtd_real,
                               qtd_real,
                               str(item.get('qtd', 'un')),
                               preco_unitario_final,
                               preco_total,

                               item.get('categoria_financeira', 'Outros'),
                               item.get('e_essencial', False),

                               item.get('categoria_nutricional', 'Indefinido'),
                               item.get('nivel_processamento', 'Desconhecido'),
                               item.get('tem_gluten', False),
                               item.get('calorias', 0),

                               local,
                               None
                           ))

        conn.commit()
        return lista_id

    except Exception as e:
        conn.rollback()
        print(f"❌ Erro ao salvar talão histórico: {e}")
        return None
    finally:
        conn.close()

def buscar_historico_compras(usuario_id):
    """Retorna os últimos talões importados."""
    conn = get_connection()
    cursor = conn.cursor(cursor_factory=RealDictCursor)
    cursor.execute("""
                   SELECT id, loja, data_compra, total_gasto, nota_nutricional
                   FROM listas_compras
                   WHERE usuario_id = %s AND loja != 'Lista de Compras' -- Ignora a lista pendente
                   ORDER BY data_compra DESC
                       LIMIT 20
                   """, (usuario_id,))
    res = cursor.fetchall()
    conn.close()
    return res

def buscar_detalhes_talao(lista_id):
    """Retorna os itens de um talão específico."""
    conn = get_connection()
    cursor = conn.cursor(cursor_factory=RealDictCursor)
    cursor.execute("SELECT * FROM itens_compra WHERE lista_id = %s ORDER BY preco_total DESC", (lista_id,))
    res = cursor.fetchall()
    conn.close()
    return res


# ==============================================================================
#  PARTE 2: GESTÃO DE LISTAS (PLANEAMENTO E PENDENTES) 📝
# ==============================================================================

def adicionar_a_lista_compras(usuario_id, nome_produto):
    """
    Adiciona um item à 'Lista de Compras' pendente.
    Se não existir lista aberta, cria uma.
    """
    conn = get_connection()
    cursor = conn.cursor()

    try:
        # 1. Procura lista manual existente
        cursor.execute("SELECT id FROM listas_compras WHERE usuario_id = %s AND loja = 'Lista de Compras' LIMIT 1", (usuario_id,))
        res = cursor.fetchone()

        if res:
            lista_id = res[0]
        else:
            # Cria lista nova
            cursor.execute("""
                           INSERT INTO listas_compras (usuario_id, loja, data_compra, total_gasto)
                           VALUES (%s, 'Lista de Compras', CURRENT_DATE, 0)
                               RETURNING id
                           """, (usuario_id,))
            lista_id = cursor.fetchone()[0]

        # 2. Verifica se já existe para incrementar
        cursor.execute("""
                       SELECT id FROM itens_compra
                       WHERE lista_id = %s AND nome_produto = %s
                       """, (lista_id, nome_produto))

        item_existente = cursor.fetchone()

        if item_existente:
            cursor.execute("UPDATE itens_compra SET quantidade = quantidade + 1 WHERE id = %s", (item_existente[0],))
        else:
            cursor.execute("""
                           INSERT INTO itens_compra
                           (lista_id, nome_produto, quantidade, quantidade_atual, categoria_financeira, e_essencial)
                           VALUES (%s, %s, 1, 0, 'Despensa', true)
                           """, (lista_id, nome_produto))

        conn.commit()
        return True

    except Exception as e:
        conn.rollback()
        print(f"Erro BD ao adicionar à lista de compras: {e}")
        return False
    finally:
        conn.close()

def aprender_produtos(itens_finais):
    """
    Guarda os nomes dos produtos numa tabela separada para aprender preços e categorias.
    (Opcional: Requer tabela 'produtos_conhecidos')
    """
    conn = get_connection()
    cursor = conn.cursor()
    try:
        for item in itens_finais:
            # Tenta inserir, se der erro (tabela não existe), ignora silenciosamente
            try:
                cursor.execute("""
                               INSERT INTO produtos_conhecidos (nome_raw, nome_limpo, categoria_padrao, preco_ultimo)
                               VALUES (%s, %s, %s, %s)
                                   ON CONFLICT (nome_raw) DO UPDATE SET
                                   preco_ultimo = EXCLUDED.preco_ultimo,
                                                                 contagem_usos = produtos_conhecidos.contagem_usos + 1;
                               """, (item['item'].upper(), item['item'], item['categoria_financeira'], item['preco']))
            except:
                pass
        conn.commit()
    except Exception as e:
        print(f"Erro ao aprender produtos: {e}")
    finally:
        conn.close()