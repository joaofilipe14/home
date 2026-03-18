import os
import json
import requests
from flask import Blueprint, request, jsonify
from database.nutricao import *
from database.usuario import listar_usuarios
from database.compras import *
from agent.vision_brain import analisar_imagem_com_ollama
from agent.planner import gerar_plano_com_ollama, gerar_dia_unico, gerar_lista_compras, gerar_receita_prato

nutricao_bp = Blueprint('nutricao', __name__)
UPLOAD_FOLDER = 'uploads'

@nutricao_bp.route('/analisar', methods=['POST'])
def analisar_comida_rota():
    if 'imagem' not in request.files: return jsonify({"erro": "Sem imagem"}), 400
    file = request.files['imagem']
    usuario_id = request.form.get('usuario_id')

    filepath = os.path.join(UPLOAD_FOLDER, file.filename)
    file.save(filepath)

    res = analisar_imagem_com_ollama(filepath)
    # Salvar automaticamente se tiver dados
    if res['english_data']:
        salvar_refeicao(usuario_id, {
            'nome_prato': res['english_data'].get('dish_name'),
            'calorias_totais': res['english_data'].get('total_calories')
        })
    return jsonify(res['frontend_data'])

@nutricao_bp.route('/historico', methods=['GET'])
def historico_rota():
    return jsonify(buscar_historico(request.args.get('usuario_id')))

@nutricao_bp.route('/progresso', methods=['GET'])
def progresso_rota():
    uid = request.args.get('usuario_id')
    total, meta = calcular_progresso_hoje(uid)
    return jsonify({"total": total, "meta": meta})

# --- PLANEAMENTO ---
@nutricao_bp.route('/planear', methods=['POST'])
def planear_rota():
    # Nota: Precisamos buscar o user para saber a meta
    uid = request.json.get('usuario_id')
    # ... aqui simplifiquei, devias buscar o user à BD ...
    # Assumindo que passas os dados ou buscas na BD:
    # user = buscar_usuario_por_id(uid)
    # plano = gerar_plano_com_ollama(user.nome, user.meta, ...)
    # Para agora, deixo o esqueleto:
    return jsonify({"msg": "Lógica do Planner aqui (copiar do app antigo)"})

@nutricao_bp.route('/agua', methods=['GET', 'POST'])
def agua_rota():
    uid = request.args.get('usuario_id') or request.json.get('usuario_id')
    if request.method == 'GET':
        return jsonify({"copos": get_agua_hoje(uid)})
    update_agua_hoje(uid, request.json['copos'])
    return jsonify({"msg": "OK"})

# --- COMPRAS ---
@nutricao_bp.route('/compras', methods=['GET'])
def compras_rota():
    # Lógica de gerar lista de compras
    return jsonify(buscar_historico_compras(request.args.get('usuario_id')))