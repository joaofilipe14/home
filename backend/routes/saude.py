from flask import Blueprint, request, jsonify

# Imports da Base de Dados
from database.saude import obter_historico_peso, adicionar_peso, obter_ultimo_peso
from database.usuario import obter_usuario_por_id

# Import do Agente IA (Se ainda não tiveres este ficheiro criado, avisa!)
# Se não quiseres usar a IA já, podes comentar as linhas relacionadas.
try:
    from agent.health_coach import analisar_evolucao_peso
except ImportError:
    analisar_evolucao_peso = None # Fallback se não tiveres o agente criado

saude_bp = Blueprint('saude', __name__)

# ==========================================================
# 1. ROTA GET - Apenas lê o histórico
# ==========================================================
@saude_bp.route('/peso', methods=['GET'])
def get_historico_peso():
    """Retorna a lista de pesos para o gráfico."""
    usuario_id = request.args.get('usuario_id')
    if not usuario_id:
        return jsonify({"erro": "ID de utilizador obrigatório"}), 400
    historico = obter_historico_peso(usuario_id)
    return jsonify(historico)


# ==========================================================
# 2. ROTA POST - Grava novo peso + IA Motivadora
# ==========================================================
@saude_bp.route('/peso', methods=['POST'])
def novo_peso():
    """Regista peso, atualiza meta calórica e gera feedback IA."""
    dados = request.json
    usuario_id = dados.get('usuario_id')

    # Converte para float para garantir que a matemática funciona
    try:
        novo_peso = float(dados.get('peso'))
    except (ValueError, TypeError):
        return jsonify({"erro": "Peso inválido"}), 400

    data = dados.get('data') # Opcional (se vier vazio, o BD usa HOJE)

    if not usuario_id or not novo_peso:
        return jsonify({"erro": "Dados incompletos"}), 400

    # --- PASSO A: Obter dados ANTIGOS para comparação (Antes de gravar) ---
    peso_antigo = obter_ultimo_peso(usuario_id)
    usuario = obter_usuario_por_id(usuario_id)

    # --- PASSO B: Gravar na BD (Isto atualiza o user e a meta automaticamente) ---
    sucesso = adicionar_peso(usuario_id, novo_peso, data)

    if sucesso:
        mensagem_feedback = "Peso registado com sucesso! ⚖️"

        # --- PASSO C: Chamar o Treinador IA (Se possível) ---
        # Só chamamos se tivermos peso antigo para comparar e se a função da IA existir
        if peso_antigo and usuario and analisar_evolucao_peso:
            try:
                # Só vale a pena motivar se o peso mudou
                if abs(peso_antigo - novo_peso) > 0.0:
                    feedback_ia = analisar_evolucao_peso(
                        nome=usuario['nome'],
                        peso_antigo=peso_antigo,
                        peso_novo=novo_peso,
                        objetivo=usuario['objetivo'],
                        altura=usuario['altura']
                    )
                    if feedback_ia:
                        mensagem_feedback = feedback_ia
            except Exception as e:
                print(f"⚠️ Erro ao gerar feedback IA: {e}")

        return jsonify({
            "msg": "Sucesso",
            "feedback": mensagem_feedback # O Frontend vai mostrar isto num alert
        }), 201

    return jsonify({"erro": "Erro ao gravar na base de dados"}), 500