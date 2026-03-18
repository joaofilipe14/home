import os
from flask import Blueprint, request, jsonify, send_from_directory
from agent.minecraft import processar_log_minecraft, salvar_diario_txt, PASTA_DIARIOS, ler_memoria_atual, \
    atualizar_memoria_com_ia

minecraft_bp = Blueprint('minecraft', __name__)

# ROTA 1: ANALISAR
@minecraft_bp.route('/analisar', methods=['POST'])
def analisar_sessao():
    dados = request.json
    raw_log = dados.get('log')

    if not raw_log:
        return jsonify({"erro": "Cade o log? Não trabalho de graça."}), 400

    # 1. Chamar o Ambrósio
    resultado = processar_log_minecraft(raw_log)

    if resultado:
        # 2. Salvar o ficheiro físico
        caminho_arquivo = salvar_diario_txt(resultado)

        return jsonify({
            "msg": "Processado com desdém.",
            "dados": resultado,
            "arquivo": caminho_arquivo
        })

    return jsonify({"erro": "O Ambrósio foi comer queijo e ignorou o pedido."}), 500

@minecraft_bp.route('/diarios', methods=['GET'])
def listar_diarios():
    if not os.path.exists(PASTA_DIARIOS):
        return jsonify([])

    ficheiros = []
    # Lista ficheiros e ordena pelo mais recente
    for f in os.listdir(PASTA_DIARIOS):
        if f.endswith(".txt"):
            caminho = os.path.join(PASTA_DIARIOS, f)
            stats = os.stat(caminho)
            ficheiros.append({
                "nome": f,
                "data": stats.st_mtime, # Data modificação
                "tamanho": stats.st_size
            })

    # Ordenar (recente primeiro)
    ficheiros.sort(key=lambda x: x['data'], reverse=True)
    return jsonify(ficheiros)

# ROTA 3: LER DIÁRIO
@minecraft_bp.route('/diarios/<path:filename>', methods=['GET'])
def ler_diario(filename):
    return send_from_directory(PASTA_DIARIOS, filename)

@minecraft_bp.route('/memoria', methods=['GET'])
def get_memoria():
    conteudo = ler_memoria_atual()
    return jsonify({"conteudo": conteudo})

# ROTA 5: Atualizar Memória (Trigger Manual)
@minecraft_bp.route('/memoria/atualizar', methods=['POST'])
def update_memoria():
    dados = request.json
    novo_log = dados.get('log')

    if not novo_log:
        return jsonify({"erro": "Preciso de saber o que aconteceu hoje."}), 400

    nova_memoria = atualizar_memoria_com_ia(novo_log)

    if nova_memoria:
        return jsonify({"msg": "Memória consolidada!", "nova_memoria": nova_memoria})

    return jsonify({"erro": "Erro ao atualizar memória."}), 500