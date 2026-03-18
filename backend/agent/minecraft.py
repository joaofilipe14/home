import requests
import json
import os
from datetime import datetime

# ==============================================================================
# CONFIGURAÇÕES E CAMINHOS
# ==============================================================================

# Define o modelo (Usa GLM-5 Cloud se disponível, ou fallback para llama3)
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL_TEXT", "llama3")
OLLAMA_API_URL = "http://localhost:11434/api/generate"

# Caminhos para a pasta 'backend/assets'
BASE_DIR = os.path.dirname(os.path.dirname(__file__)) # Sobe de agent/ para backend/
ASSETS_DIR = os.path.join(BASE_DIR, 'assets')

# Pasta onde ficam os relatórios individuais (Sessões)
PASTA_DIARIOS = os.path.join(ASSETS_DIR, 'diarios_rp')

# Ficheiro único da Memória de Longo Prazo
CAMINHO_MEMORIA = os.path.join(ASSETS_DIR, 'memoria_ambrosio.txt')

# ==============================================================================
# 1. ANÁLISE DE SESSÃO (CURTO PRAZO)
# ==============================================================================

def processar_log_minecraft(texto_log):
    """
    O Ambrósio lê o log da sessão atual e gera um relatório ranzinza.
    """
    prompt = f"""
    Tu és o 'Ambrósio', um Analista de Logística e Especialista em Queijos extremamente ranzinza e burocrático.
    
    LOG DO MINECRAFT (Sessão de Hoje):
    {texto_log}
    
    TAREFA:
    Analisa a eficiência, o loot recolhido e a exploração. Sê crítico.
    
    Responde APENAS em JSON com este formato exato:
    {{
        "analise_geral": "Crítica curta e azeda comparando a performance a um tipo de queijo (ex: 'Caótico como um Roquefort esfarelado').",
        "eficiencia_score": 0 a 100 (número inteiro),
        "eventos_chave": ["Lista", "Curta", "De 3 Eventos"],
        "diario_bordo": "Um texto narrativo curto (estilo diário) escrito na primeira pessoa pelo jogador, relatando o dia."
    }}
    """

    try:
        response = requests.post(OLLAMA_API_URL, json={
            "model": OLLAMA_MODEL,
            "prompt": prompt,
            "stream": False,
            "format": "json"
        })

        if response.status_code == 200:
            resultado = response.json()
            # Garante que é um objeto JSON e não string
            dados = json.loads(resultado['response']) if isinstance(resultado['response'], str) else resultado['response']
            return dados
        return None
    except Exception as e:
        print(f"Erro no Ambrósio (Análise): {e}")
        return None

def salvar_diario_txt(conteudo):
    """
    Grava o diário da sessão num ficheiro .txt físico na pasta assets/diarios_rp.
    """
    if not os.path.exists(PASTA_DIARIOS):
        os.makedirs(PASTA_DIARIOS)

    data_str = datetime.now().strftime("%Y-%m-%d_%H-%M-%S")
    filename = f"Relatorio_Ambrosio_{data_str}.txt"
    caminho_completo = os.path.join(PASTA_DIARIOS, filename)

    # Formata a lista de eventos para texto
    eventos_formatados = "\n".join([f"- {ev}" for ev in conteudo.get('eventos_chave', [])])

    texto_final = f"""RELATÓRIO LOGÍSTICO - {data_str}
AUDITOR: Ambrósio (Dpto. de Queijos e Eficiência)
EFICIÊNCIA: {conteudo.get('eficiencia_score', 0)}%
ANÁLISE: {conteudo.get('analise_geral', 'N/A')}
---------------------------------------------------
REGISTO TÉCNICO (DIÁRIO):
{conteudo.get('diario_bordo', '')}
---------------------------------------------------
EVENTOS CHAVE:
{eventos_formatados}
"""
    with open(caminho_completo, "w", encoding="utf-8") as f:
        f.write(texto_final)

    return filename

# ==============================================================================
# 2. MEMÓRIA DE LONGO PRAZO (O CÉREBRO)
# ==============================================================================

def ler_memoria_atual():
    """Lê o ficheiro .txt da memória permanente."""
    if not os.path.exists(CAMINHO_MEMORIA):
        # Se não existir, cria um template inicial
        template = """=== PERFIL DO PERSONAGEM ===
Nome: Ambrósio | Nível: 1
Estado: Ranzinza

=== INVENTÁRIO ===
- Nada (Pobreza absoluta)

=== HISTÓRICO DE EVENTOS ===
[Dia 00]: Início da aventura.
"""
        with open(CAMINHO_MEMORIA, "w", encoding="utf-8") as f:
            f.write(template)
        return template

    with open(CAMINHO_MEMORIA, 'r', encoding='utf-8') as f:
        return f.read()

def atualizar_memoria_com_ia(novo_log):
    """
    A IA lê a memória antiga + o novo log do dia e reescreve o ficheiro de memória.
    """
    memoria_antiga = ler_memoria_atual()

    prompt = f"""
    Tu és o Guardião da Memória do Ambrósio (RPG Minecraft).
    
    A TUA TAREFA:
    Atualizar o ficheiro de memória permanente do personagem com base nos eventos de hoje.
    
    REGRAS RÍGIDAS:
    1. Mantém a estrutura de cabeçalhos (PERFIL, INVENTÁRIO, HISTÓRICO).
    2. No INVENTÁRIO: Adiciona itens novos ganhos no log, remove itens gastos/perdidos.
    3. No HISTÓRICO: Adiciona UMA nova linha resumida com [Dia X] no final. Não apagues o passado.
    4. No PERFIL: Atualiza nível ou estado se o log sugerir evolução.
    
    --------------------------------------------------
    MEMÓRIA ATUAL (ANTIGA):
    {memoria_antiga}
    --------------------------------------------------
    NOVOS ACONTECIMENTOS (LOG DE HOJE):
    {novo_log}
    --------------------------------------------------
    
    Responde APENAS com o texto completo da nova memória atualizada.
    """

    try:
        response = requests.post(OLLAMA_API_URL, json={
            "model": OLLAMA_MODEL,
            "prompt": prompt,
            "stream": False
        })

        if response.status_code == 200:
            nova_memoria = response.json()['response']

            # Gravar a nova memória no ficheiro (substitui o antigo)
            with open(CAMINHO_MEMORIA, 'w', encoding='utf-8') as f:
                f.write(nova_memoria)

            return nova_memoria
        return None
    except Exception as e:
        print(f"Erro ao atualizar memória: {e}")
        return None