import os
import uuid
from flask import Blueprint, request, jsonify, send_from_directory
from database.financeiro import * # Importa todas as funções de BD financeiras
from agent.finance_reader import processar_pdf_banco
from agent.csv_reader import processar_csv_banco
from agent.receipt_scanner import analisar_talao_inteligente
from database.compras import salvar_talao_historico

financas_bp = Blueprint('financas', __name__)
UPLOAD_FOLDER = 'uploads'

@financas_bp.route('/resumo', methods=['GET'])
def get_resumo():
    return jsonify(obter_resumo_financeiro(request.args.get('usuario_id')))

@financas_bp.route('/movimentos', methods=['GET'])
def get_movimentos():
    return jsonify(listar_transacoes_recentes(request.args.get('usuario_id')))

@financas_bp.route('/transacao', methods=['POST'])
def nova_transacao_rota():
    d = request.json
    valor = float(d['valor'])
    # Garante que despesa é negativa e receita é positiva
    valor = -abs(valor) if d['tipo'] == 'DESPESA' else abs(valor)

    adicionar_transacao(d['usuario_id'], d['conta_id'], d['categoria_id'], valor, d['descricao'])
    return jsonify({"msg": "OK"})

@financas_bp.route('/transacao/<int:id>', methods=['PUT'])
def editar_transacao_rota(id):
    # Atualizar categoria de uma transação existente
    atualizar_categoria_transacao(id, request.json['categoria_id'])
    return jsonify({"msg": "OK"})

@financas_bp.route('/anual', methods=['GET'])
def get_anual_rota():
    # Retorna o JSON para a Tabela "Excel" (com projeções baseadas no ordenado)
    return jsonify(obter_resumo_anual(request.args.get('usuario_id')))

@financas_bp.route('/contas', methods=['GET', 'POST'])
def contas_rota():
    if request.method == 'POST':
        d = request.json
        criar_conta(d['usuario_id'], d['nome'], d.get('saldo_inicial', 0))
        return jsonify({"msg": "Criada"})
    return jsonify(listar_contas(request.args.get('usuario_id')))

@financas_bp.route('/categorias', methods=['GET'])
def categorias_rota():
    return jsonify(listar_categorias())

@financas_bp.route('/fixas', methods=['GET', 'POST', 'DELETE'])
def fixas_rota():
    if request.method == 'GET':
        return jsonify(listar_despesas_fixas(request.args.get('usuario_id')))

    if request.method == 'POST':
        d = request.json
        # O campo 'meses' vem do frontend (ex: "5" ou "1,7" ou null)
        adicionar_despesa_fixa(
            d['usuario_id'],
            d['descricao'],
            float(d['valor']),
            int(d.get('dia', 1)),
            d.get('meses') # <--- IMPORTANTE: Passa os meses específicos para a BD
        )
        return jsonify({"msg": "OK"})

    if request.method == 'DELETE':
        remover_despesa_fixa(request.args.get('id'))
        return jsonify({"msg": "OK"})

    return None

# --- UPLOADS ---

@financas_bp.route('/upload-csv', methods=['POST'])
def upload_csv_rota():
    if 'file' not in request.files: return jsonify({"erro": "Falta ficheiro"}), 400
    file = request.files['file']
    usuario_id = request.form.get('usuario_id')
    conta_id = request.form.get('conta_id')

    # 1. Processar o ficheiro CSV
    transacoes = processar_csv_banco(file)

    # 2. Mapear Categorias
    cats = {c['nome'].lower(): c['id'] for c in listar_categorias()}

    count = 0
    ignorados = 0

    for t in transacoes:
        cat_id = cats.get(t.get('categoria', 'Outros').lower(), 1)

        # IMPORTANTE: Passamos verificar_duplicados=True
        inseriu = adicionar_transacao(
            usuario_id,
            conta_id,
            cat_id,
            t['valor'],
            t['descricao'],
            t['data'],
            verificar_duplicados=True
        )

        if inseriu:
            count += 1
        else:
            ignorados += 1

    return jsonify({
        "msg": f"Processo concluído!",
        "importados": count,
        "duplicados_ignorados": ignorados
    })

@financas_bp.route('/upload-talao', methods=['POST'])
def upload_talao_rota():
    if 'file' not in request.files:
        return jsonify({"erro": "Falta ficheiro"}), 400

    file = request.files['file']
    usuario_id = request.form.get('usuario_id')

    try:
        # 1. Guardar a Imagem/PDF no disco
        ext = file.filename.split('.')[-1]
        filename = f"{datetime.now().strftime('%Y%m%d')}_{uuid.uuid4().hex[:8]}.{ext}"
        filepath = os.path.join(UPLOAD_FOLDER, filename)
        file.save(filepath)

        # 2. Reabrir o ficheiro para a IA ler
        with open(filepath, 'rb') as f_read:

            # --- CLASSE CORRIGIDA ---
            class FileWrapper:
                def __init__(self, f, name):
                    self.f = f
                    self.filename = name

                def read(self, n=-1):
                    return self.f.read(n)

                # AQUI ESTAVA O ERRO: Agora aceita 'offset' E 'whence' (0, 1 ou 2)
                def seek(self, offset, whence=0):
                    return self.f.seek(offset, whence)

                # Adicionei também o tell() por segurança, o pypdf às vezes usa
                def tell(self):
                    return self.f.tell()

            wrapper = FileWrapper(f_read, filename)

            # Chama a IA
            dados_ia = analisar_talao_inteligente(wrapper)

        if not dados_ia:
            return jsonify({"erro": "A IA não conseguiu ler o talão."}), 500

        return jsonify({
            "msg": "Análise concluída. Aguardando confirmação.",
            "dados_provisorios": dados_ia,
            "imagem_url": f"/api/financas/imagem/{filename}"
        })

    except Exception as e:
        print(f"Erro Upload: {e}")
        return jsonify({"erro": str(e)}), 500

# --- ROTA 2: SERVIR A IMAGEM PARA O FRONTEND ---
@financas_bp.route('/imagem/<filename>')
def serve_imagem(filename):
    return send_from_directory(UPLOAD_FOLDER, filename)

# --- ROTA 3: GRAVAR FINALMENTE (QUANDO CLICAS EM CONFIRMAR NO REACT) ---
@financas_bp.route('/confirmar-talao', methods=['POST'])
def confirmar_talao_rota():
    data = request.json
    usuario_id = data.get('usuario_id')
    dados_finais = data.get('dados_finais') # Dados já corrigidos por ti

    if not dados_finais or not usuario_id:
        return jsonify({"erro": "Dados inválidos"}), 400

    try:
        # Separa itens do resumo
        itens = dados_finais.pop('itens', [])

        # AGORA SIM, SALVA NA BD
        novo_id = salvar_talao_historico(usuario_id, dados_finais, itens)

        if novo_id:
            return jsonify({"msg": "Sucesso!", "id": novo_id})
        return jsonify({"erro": "Erro ao salvar na BD"}), 500
    except Exception as e:
        return jsonify({"erro": str(e)}), 500

@financas_bp.route('/meta-casa', methods=['GET', 'POST', 'PUT'])
def meta_casa():
    usuario_id = request.args.get('usuario_id') or request.json.get('usuario_id')

    if request.method == 'GET':
        dados = obter_objetivo_casa(usuario_id)
        return jsonify(dados)

    if request.method == 'POST':
        # Adicionar dinheiro ao mealheiro
        dados = request.json
        valor = float(dados.get('valor', 0))
        adicionar_poupanca(usuario_id, valor)
        return jsonify({"msg": "Poupança adicionada!"})

    if request.method == 'PUT':
        # Editar configurações (Meta total ou correção de saldo)
        dados = request.json
        nova_meta = dados.get('meta')
        novo_saldo = dados.get('saldo')
        atualizar_objetivo_casa(usuario_id, novo_saldo, nova_meta)
        return jsonify({"msg": "Objetivo atualizado"})
    return None