from .connection import get_connection

def listar_itens_despensa(usuario_id):
    """
    Lista apenas os itens que ainda têm stock (quantidade_atual > 0).
    Adaptado para PostgreSQL (%s em vez de ?) e nomes corretos das tabelas.
    """
    conn = get_connection()
    cursor = conn.cursor()

    # NOTA:
    # 1. Usamos %s em vez de ?
    # 2. Tabela listas_compras em vez de historico_compras
    # 3. Coluna nome_produto em vez de item
    # 4. Coluna lista_id em vez de id_compra

    cursor.execute("""
                   SELECT
                       ic.id,
                       ic.nome_produto,
                       COALESCE(ic.local_armazenamento, 'armario') as categoria,
                       COALESCE(ic.quantidade_atual, 1) as quantidade,
                       COALESCE(ic.unidade, 'un') as unidade,
                       ic.validade,
                       lc.data_compra
                   FROM itens_compra ic
                            JOIN listas_compras lc ON ic.lista_id = lc.id
                   WHERE lc.usuario_id = %s
                     AND ic.quantidade_atual > 0.05
                   ORDER BY ic.validade ASC, lc.data_compra DESC
                   """, (usuario_id,))

    rows = cursor.fetchall()
    conn.close()

    return [
        {
            "id": r[0],
            "nome": r[1],
            "categoria": r[2],
            "quantidade": r[3],
            "unidade": r[4],
            "validade": r[5],
            "data_compra": r[6]
        }
        for r in rows
    ]

def adicionar_item_manual(usuario_id, dados):
    """
    Adiciona um item manualmente à despensa.
    Cria ou reutiliza uma lista de compras fictícia 'Despensa Manual'.
    """
    conn = get_connection()
    cursor = conn.cursor()

    try:
        # 1. Procura lista manual existente
        cursor.execute("SELECT id FROM listas_compras WHERE usuario_id = %s AND loja = 'Despensa Manual' LIMIT 1", (usuario_id,))
        res = cursor.fetchone()

        if res:
            lista_id = res[0]
        else:
            # Postgres usa CURRENT_DATE e RETURNING id
            cursor.execute("""
                           INSERT INTO listas_compras (usuario_id, loja, data_compra, total_gasto)
                           VALUES (%s, 'Despensa Manual', CURRENT_DATE, 0)
                               RETURNING id
                           """, (usuario_id,))
            lista_id = cursor.fetchone()[0]

        # 2. Insere o item
        qtd = float(dados.get('quantidade', 1))

        cursor.execute("""
                       INSERT INTO itens_compra
                       (lista_id, nome_produto, preco_total, categoria_financeira, quantidade, quantidade_atual, local_armazenamento, validade)
                       VALUES (%s, %s, 0, 'Despensa', %s, %s, %s, %s)
                           RETURNING id
                       """, (
                           lista_id,
                           dados['nome'],
                           qtd, # Qtd Histórico
                           qtd, # Qtd Atual
                           dados.get('categoria', 'armario'),
                           dados.get('validade')
                       ))

        novo_id = cursor.fetchone()[0]
        conn.commit()

        return {
            "id": novo_id,
            "nome": dados['nome'],
            "quantidade": qtd,
            "categoria": dados.get('categoria')
        }

    except Exception as e:
        conn.rollback()
        print(f"Erro ao adicionar manual: {e}")
        return None
    finally:
        conn.close()

def atualizar_stock(id_item, nova_quantidade):
    """
    Atualiza apenas o stock atual.
    """
    conn = get_connection()
    cursor = conn.cursor()

    try:
        cursor.execute("UPDATE itens_compra SET quantidade_atual = %s WHERE id = %s", (nova_quantidade, id_item))
        conn.commit()
        return True
    except Exception as e:
        conn.rollback()
        print(f"Erro update stock: {e}")
        return False
    finally:
        conn.close()

def remover_item_totalmente(id_item):
    """
    Força a quantidade a zero (Consumido).
    """
    return atualizar_stock(id_item, 0)

def obter_lista_compras_atual(usuario_id):
    conn = get_connection()
    cursor = conn.cursor()

    # Busca ID da lista
    cursor.execute("SELECT id FROM listas_compras WHERE usuario_id = %s AND loja = 'Lista de Compras' LIMIT 1", (usuario_id,))
    res = cursor.fetchone()
    if not res:
        conn.close()
        return []

    lista_id = res[0]

    # QUERY MELHORADA:
    # 1. Usa ILIKE para comparar nomes (ignora maiúsculas/minúsculas)
    # 2. Se o item já tiver um preco_unitario definido na lista (manual), usa esse.
    # 3. Se não, tenta adivinhar pelo histórico.
    cursor.execute("""
                   SELECT
                       ic.id,
                       ic.nome_produto,
                       ic.quantidade,
                       ic.unidade,
                       ic.categoria_financeira,
                       ic.e_essencial,
                       COALESCE(
                               NULLIF(ic.preco_unitario, 0), -- Se já definiste preço manual, usa-o
                               (
                                   SELECT ic2.preco_unitario
                                   FROM itens_compra ic2
                                            JOIN listas_compras lc2 ON ic2.lista_id = lc2.id
                                   WHERE ic2.nome_produto ILIKE ic.nome_produto -- Comparação Flexível
                                   AND lc2.loja != 'Lista de Compras'
                          AND lc2.usuario_id = %s
                        ORDER BY lc2.data_compra DESC 
                        LIMIT 1
                    ),
                    0 -- Se não encontrar nada, é 0
                ) as preco_final
                   FROM itens_compra ic
                   WHERE ic.lista_id = %s
                   ORDER BY ic.nome_produto
                   """, (usuario_id, lista_id))

    rows = cursor.fetchall()
    conn.close()

    return [
        {
            "id": r[0],
            "item": r[1],
            "qtd": r[2],
            "unidade": r[3],
            "categoria": r[4],
            "essencial": r[5],
            "preco_estimado_unitario": float(r[6])
        }
        for r in rows
    ]

# Nova função para atualizar preço
def atualizar_item_lista_completo(item_id, nova_qtd=None, novo_preco=None):
    conn = get_connection()
    cursor = conn.cursor()
    try:
        if nova_qtd is not None:
            cursor.execute("UPDATE itens_compra SET quantidade = %s WHERE id = %s", (nova_qtd, item_id))

        if novo_preco is not None:
            cursor.execute("UPDATE itens_compra SET preco_unitario = %s WHERE id = %s", (novo_preco, item_id))

        conn.commit()
        return True
    except Exception as e:
        print(e)
        conn.rollback()
        return False
    finally:
        conn.close()

def remover_da_lista_compras(item_id):
    """Remove um item específico da lista de compras"""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM itens_compra WHERE id = %s", (item_id,))
    conn.commit()
    conn.close()
    return True
