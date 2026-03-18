import os
import requests
from dotenv import load_dotenv
from json_repair import repair_json

load_dotenv()

# Configurações do Ollama
OLLAMA_URL = "http://localhost:11434/api/generate"
# Usa o modelo definido no .env ou 'llama3' como default
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL_TEXT", "llama3")

def analisar_lista_inteligente(itens_lista):
    """
    Analisa a lista de compras usando OLLAMA (Local).
    Sugere melhorias de saúde e poupança.
    """
    if not itens_lista:
        return None

    print(f"🦙 A chamar o Consultor Ollama ({OLLAMA_MODEL})...")

    # 1. Prepara a lista para texto simples
    texto_lista = ""
    for i in itens_lista:
        preco = i.get('preco_estimado_unitario', 0)
        texto_lista += f"- {i['qtd']} {i.get('unidade','')} de {i['item']} (aprox {preco}€)\n"

    # 2. O Prompt (Instruções para a IA)
    prompt = f"""
    És um Nutricionista e Consultor Financeiro Pessoal em Portugal.
    Analisa esta lista de compras e sugere melhorias.

    LISTA DE COMPRAS:
    {texto_lista}

    TAREFAS:
    1. Atribui uma NOTA (0-100) baseada no equilíbrio saúde/custo.
    2. Escreve um RESUMO curto (1 frase).
    3. Sugere 3 trocas inteligentes (pode ser por SAUDE ou DINHEIRO/POUPANÇA).
    
    REGRAS:
    - Sê conciso.
    - Responde APENAS em JSON válido.
    - Usa Português de Portugal.

    FORMATO JSON OBRIGATÓRIO:
    {{
        "nota": 85,
        "resumo": "Lista equilibrada mas com excesso de açúcares.",
        "sugestoes": [
            {{
                "item_original": "Nome do item na lista",
                "item_sugerido": "Alternativa melhor",
                "tipo": "SAUDE" ou "DINHEIRO",
                "motivo": "Explicação curta"
            }}
        ]
    }}
    """

    # 3. Payload para o Ollama
    payload = {
        "model": OLLAMA_MODEL,
        "prompt": prompt,
        "stream": False,
        "format": "json", # Força a saída JSON (funciona bem no Llama3/Qwen)
        "options": {
            "temperature": 0.2, # Criatividade baixa para seguir regras
            "num_ctx": 4096
        }
    }

    try:
        # 4. Envio do pedido
        response = requests.post(OLLAMA_URL, json=payload)
        response.raise_for_status()

        resultado = response.json()
        texto_resposta = resultado.get('response', '')

        # 5. Limpeza e conversão para Objeto Python
        return repair_json(texto_resposta, return_objects=True)

    except Exception as e:
        print(f"❌ Erro Shopping Advisor (Ollama): {e}")
        # Retorna um fallback amigável em caso de erro
        return {
            "nota": 0,
            "resumo": "O consultor está a dormir (Erro de conexão com Ollama).",
            "sugestoes": []
        }