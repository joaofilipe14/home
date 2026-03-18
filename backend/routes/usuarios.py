from flask import Blueprint, request, jsonify
from database.financeiro import criar_conta

# Importações limpas (sem calcular_meta_calorica aqui!)
from database.usuario import (
    listar_usuarios,
    criar_usuario,
    atualizar_usuario_smart,
    get_orcamento,
    get_rendimentos_usuario
)

usuarios_bp = Blueprint('usuarios', __name__)

# ==========================================================
# ROTAS PRINCIPAIS (Criação e Listagem)
# ==========================================================

@usuarios_bp.route('/', methods=['GET'])
def get_usuarios():
    return jsonify(listar_usuarios())

@usuarios_bp.route('/', methods=['POST'])
def novo_usuario():
    dados = request.json

    # Validar campos obrigatórios
    required = ['nome', 'peso', 'altura', 'idade', 'genero', 'atividade', 'objetivo']
    if not all(k in dados for k in required):
        return jsonify({"erro": "Faltam dados obrigatórios"}), 400

    # 1. Chamar a função inteligente (ela calcula a meta lá dentro)
    user_id, meta_inicial = criar_usuario(
        nome=dados['nome'],
        restricoes=dados.get('restricoes', ""),
        orcamento=dados.get('orcamento_semanal', 50),
        altura=dados['altura'],
        peso=dados['peso'],
        idade=dados['idade'],
        genero=dados['genero'],
        atividade=dados['atividade'],
        objetivo=dados['objetivo']
    )

    if not user_id:
        return jsonify({"erro": "Erro ao criar utilizador na BD"}), 500

    # 2. Criar contas iniciais (opcional)
    contas = dados.get('contas_iniciais', [])
    for conta in contas:
        criar_conta(user_id, conta['nome'], float(conta['saldo']))

    return jsonify({
        "mensagem": "Perfil criado!",
        "id": user_id,
        "meta_calculada": meta_inicial
    }), 201


# ==========================================================
# ROTA MESTRA DE UPDATE (Serve para Tudo)
# ==========================================================

@usuarios_bp.route('/perfil', methods=['PUT'])
def atualizar_perfil_unificado():
    """
    Atualiza qualquer dado: peso, salário, nome, restrições.
    Se necessário, a BD recalcula a meta calórica automaticamente.
    """
    dados = request.json
    usuario_id = dados.get('usuario_id')

    if not usuario_id:
        return jsonify({"erro": "ID obrigatório"}), 400

    # Remove ID para não quebrar o SQL
    dados_limpos = {k: v for k, v in dados.items() if k != 'usuario_id'}

    # Chama a função inteligente
    sucesso, nova_meta = atualizar_usuario_smart(usuario_id, dados_limpos)

    if sucesso:
        resposta = {"msg": "Dados atualizados com sucesso!"}
        if nova_meta:
            resposta["nova_meta"] = nova_meta
            resposta["aviso"] = "Meta calórica ajustada!"
        return jsonify(resposta), 200

    return jsonify({"erro": "Erro ao atualizar BD"}), 500


# ==========================================================
# GETTERS AUXILIARES (Para o Frontend carregar dados)
# ==========================================================

@usuarios_bp.route('/rendimentos', methods=['GET'])
def get_rendimentos():
    uid = request.args.get('usuario_id')
    if not uid: return jsonify({"erro": "ID em falta"}), 400
    return jsonify(get_rendimentos_usuario(uid))

@usuarios_bp.route('/orcamento', methods=['GET'])
def get_orcamento_rota():
    uid = request.args.get('usuario_id')
    if not uid: return jsonify({"erro": "ID em falta"}), 400
    return jsonify({"orcamento": get_orcamento(uid)})