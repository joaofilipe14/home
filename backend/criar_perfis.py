import os
from database.connection import get_connection

# --- IMPORTS DA BASE DE DADOS ---
from database.usuario import criar_usuario
from database.financeiro import (
    criar_conta,
    adicionar_despesa_fixa,
    listar_contas,
    listar_categorias,
    adicionar_transacao
)
# ✅ NOVO IMPORT: Para registar o peso
from database.saude import adicionar_peso

# --- IMPORT DA TUA FUNÇÃO DE LEITURA ---
from agent.csv_reader import processar_csv_banco

# Caminho base (assets/csv)
BASE_CSV_FOLDER = os.path.join(os.path.dirname(__file__), 'assets', 'csv')

def limpar_dados_antigos():
    """Limpa os dados antigos para recriar tudo do zero."""
    print("🧹 A limpar dados antigos...")
    conn = get_connection()
    cursor = conn.cursor()
    try:
        # Apagar por ordem para não violar Foreign Keys
        cursor.execute("DELETE FROM historico_peso;") # <--- ✅ LIMPAR PESOS
        cursor.execute("DELETE FROM despesas_fixas;")
        cursor.execute("DELETE FROM transacoes;")
        cursor.execute("DELETE FROM itens_compra;")
        cursor.execute("DELETE FROM listas_compras;")
        cursor.execute("DELETE FROM contas_bancarias;")
        cursor.execute("DELETE FROM usuarios;")
        conn.commit()
    except Exception as e:
        print(f"⚠️ Aviso ao limpar: {e}")
        conn.rollback()
    finally:
        conn.close()

def importar_csvs_da_pasta(usuario_id, conta_id, nome_pasta):
    """Vai à pasta assets/csv/{nome_pasta}, processa e insere na BD."""
    pasta_alvo = os.path.join(BASE_CSV_FOLDER, nome_pasta)

    if not os.path.exists(pasta_alvo):
        print(f"⚠️ Pasta não encontrada: {pasta_alvo}.")
        return

    # 1. Preparar Mapa de Categorias da BD (Nome -> ID)
    todas_categorias = listar_categorias()
    mapa_ids = {c['nome'].lower(): c['id'] for c in todas_categorias}

    # 2. Listar ficheiros
    try:
        ficheiros = [f for f in os.listdir(pasta_alvo) if f.endswith('.csv')]
    except FileNotFoundError:
        print(f"⚠️ Erro ao abrir pasta: {pasta_alvo}")
        return

    if not ficheiros:
        print(f"ℹ️ Pasta {nome_pasta} está vazia. Nenhuma transação importada.")
        return

    print(f"📂 [{nome_pasta}] A importar {len(ficheiros)} ficheiros CSV...")

    for nome_ficheiro in ficheiros:
        caminho_completo = os.path.join(pasta_alvo, nome_ficheiro)

        try:
            with open(caminho_completo, 'rb') as f:
                transacoes = processar_csv_banco(f)

            count = 0
            for t in transacoes:
                cat_nome = t.get('categoria', 'Outros')
                cat_id = mapa_ids.get(cat_nome.lower(), 1)

                inseriu = adicionar_transacao(
                    usuario_id,
                    conta_id,
                    cat_id,
                    t['valor'],
                    t['descricao'],
                    t['data'],
                    verificar_duplicados=True
                )
                if inseriu: count += 1

            print(f"      ✅ {nome_ficheiro}: {count} movimentos inseridos.")

        except Exception as e:
            print(f"      ❌ Erro ao ler {nome_ficheiro}: {e}")


def criar_dados():
    limpar_dados_antigos()
    print("👥 A criar perfis...")

    # ==========================================
    # 1. JOÃO (Com Salário Definido)
    # ==========================================

    id_joao, meta_joao = criar_usuario(
        nome='João',
        restricoes="Nenhuma",
        orcamento=100.0,
        altura=1.72,
        peso=90,
        idade=33,
        genero='masculino',
        atividade='sedentario',
        objetivo='perder',
        salario_base=1569.09,
        subsidio_alimentacao=219.66,
        seguro_capitalizacao=601.23
    )

    if id_joao:
        print(f"✅ João criado (ID: {id_joao}, Meta Calculada: {meta_joao}kcal).")

        # --- ✅ ADICIONAR HISTÓRICO DE PESO ---
        print("   ⚖️ A registar pesos antigos...")
        # Nota: Formato da data deve ser YYYY-MM-DD para o SQL
        adicionar_peso(id_joao, 88.0, "2025-11-04")
        adicionar_peso(id_joao, 90.7, "2026-01-18")

        # Criar conta bancária
        criar_conta(id_joao, "Millennium João", 2500.00)

        # Obter ID da conta criada
        contas = listar_contas(id_joao)
        if contas:
            conta_id_joao = contas[0]['id']

            # Despesas Fixas João
            despesas_joao = [("TRF P/ MARIA ISABEL JORGE NUNES", 800.00, 1, None)]
            for desc, valor, dia, meses in despesas_joao:
                adicionar_despesa_fixa(id_joao, desc, valor, dia, meses)

            # Importar CSVs do João
            importar_csvs_da_pasta(id_joao, conta_id_joao, "Joao")
    else:
        print("❌ Erro ao criar João.")

    # ==========================================
    # 2. LAURA (Sem Salário / Valores a 0)
    # ==========================================

    id_laura, meta_laura = criar_usuario(
        nome='Laura',
        restricoes="Sem Glúten",
        orcamento=100.0,
        altura=1.53,
        peso=57,
        idade=25,
        genero='feminino',
        atividade='sedentario',
        objetivo='manter'
    )

    if id_laura:
        print(f"✅ Laura criada (ID: {id_laura}, Meta Calculada: {meta_laura}kcal).")

        adicionar_peso(id_laura, 56.9, "2025-11-04")
        adicionar_peso(id_laura,  57.3, "2026-01-18")

        criar_conta(id_laura, "Millennium Laura", 1200.00)

        contas_laura = listar_contas(id_laura)
        if contas_laura:
            conta_id_laura = contas_laura[0]['id']

            # Despesas Fixas Laura
            adicionar_despesa_fixa(id_laura, "DD ALDRO ENERGIA", 45, 1, None)
            adicionar_despesa_fixa(id_laura, "PAGSERV SERVICOS MUNICIPALIZAD", 25, 5, None)

            # Importar CSVs da Laura
            importar_csvs_da_pasta(id_laura, conta_id_laura, "Laura")
    else:
        print("❌ Erro ao criar Laura.")

if __name__ == "__main__":
    criar_dados()
    print("\n🚀 Base de dados populada com sucesso!")