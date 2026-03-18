from flask import Blueprint, request, jsonify

from agent.shopping_advisor import analisar_lista_inteligente
from database.compras import adicionar_a_lista_compras
# Importamos as novas funções
from database.despensa import *
# from agent.chef import sugerir_receita_imediata

despensa_bp = Blueprint('despensa', __name__)

@despensa_bp.route('/despensa', methods=['GET', 'POST'])
def despensa_root():
    usuario_id = request.args.get('usuario_id')

    if request.method == 'GET':
        if not usuario_id: return jsonify([]), 400
        # Agora lista da tabela itens_compra
        return jsonify(listar_itens_despensa(usuario_id))

    if request.method == 'POST':
        dados = request.json
        u_id = dados.get('usuario_id') or usuario_id
        # Adiciona item manual (cria compra fictícia 'Despensa Manual')
        novo_item = adicionar_item_manual(u_id, dados)
        return jsonify(novo_item), 201
    return None


@despensa_bp.route('/despensa/<int:id>', methods=['PUT', 'DELETE'])
def despensa_item(id):
    if request.method == 'PUT':
        dados = request.json
        # O frontend envia a nova quantidade
        nova_qtd = dados.get('quantidade')
        if nova_qtd is not None:
            atualizar_stock(id, nova_qtd)
        return jsonify({"msg": "Stock atualizado"})

    if request.method == 'DELETE':
        # "Apagar" na despensa = Definir stock a 0
        remover_item_totalmente(id)
        return jsonify({"msg": "Item consumido/removido"})
    return None


@despensa_bp.route('/compras/adicionar-manual', methods=['POST'])
def adicionar_compra_manual():
    dados = request.json
    usuario_id = dados.get('usuario_id')
    item_nome = dados.get('item')

    if not usuario_id or not item_nome:
        return jsonify({"erro": "Dados incompletos"}), 400

    sucesso = adicionar_a_lista_compras(usuario_id, item_nome)

    if sucesso:
        return jsonify({"msg": "Adicionado à lista de compras com sucesso"}), 201
    else:
        return jsonify({"erro": "Erro ao gravar na base de dados"}), 500

@despensa_bp.route('/lista-compras', methods=['GET'])
def get_lista_compras():
    usuario_id = request.args.get('usuario_id')
    if not usuario_id: return jsonify([]), 400
    itens = obter_lista_compras_atual(usuario_id)
    return jsonify(itens)

@despensa_bp.route('/lista-compras/item/<int:id>', methods=['PUT', 'DELETE'])
def gerir_item_lista(id):
    if request.method == 'PUT':
        dados = request.json
        nova_qtd = dados.get('quantidade')
        novo_preco = dados.get('preco') # Lê o preço se vier

        atualizar_item_lista_completo(id, nova_qtd, novo_preco)
        return jsonify({"msg": "Item atualizado"})

    if request.method == 'DELETE':
        remover_da_lista_compras(id)
        return jsonify({"msg": "Removido"})
    return None

@despensa_bp.route('/lista-compras/analisar', methods=['POST'])
def analisar_lista_endpoint():
    usuario_id = request.json.get('usuario_id')

    # 1. Busca a lista atual da base de dados
    itens = obter_lista_compras_atual(usuario_id)

    if not itens:
        return jsonify({"erro": "Lista vazia"}), 400

    # 2. Chama o Agente
    analise = analisar_lista_inteligente(itens)

    return jsonify(analise)