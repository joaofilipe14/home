import os
import requests
import json
from datetime import datetime

# Configuração do Ollama
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL_TEXT", "llama3")
OLLAMA_API_URL = "http://localhost:11434/api/generate"

def analisar_evolucao_peso(nome, peso_antigo, peso_novo, objetivo, altura):
    """
    Analisa a mudança de peso e dá feedback curto e motivador.
    """

    diferenca = peso_novo - peso_antigo
    imc = peso_novo / (altura * altura)

    prompt = f"""
    Age como um Treinador Pessoal e Nutricionista motivador e empático.
    
    DADOS DO UTILIZADOR:
    - Nome: {nome}
    - Objetivo: {objetivo} (Ex: 'perder' = perder peso, 'ganhar' = ganhar massa)
    - Peso Anterior: {peso_antigo} kg
    - Peso Novo (Hoje): {peso_novo} kg
    - Diferença: {diferenca:.2f} kg
    - IMC Atual: {imc:.2f}
    
    TAREFA:
    Analisa esta evolução e dá um feedback CURTO (máximo 2 frases).
    - Se o objetivo for perder peso e ele perdeu: Dá os parabéns.
    - Se o objetivo for perder e ele ganhou: Sê compreensivo, pergunta se houve deslizes, motiva a não desistir.
    - Se a mudança for muito brusca (mais de 2kg), alerta para a saúde.
    - Sê informal e usa emojis.
    
    Responde APENAS com a mensagem de texto.
    """

    try:
        response = requests.post(OLLAMA_API_URL, json={
            "model": OLLAMA_MODEL,
            "prompt": prompt,
            "stream": False
        })

        if response.status_code == 200:
            resultado = response.json()
            return resultado['response'].strip()
        else:
            return "Bom trabalho! Continua focado nos teus objetivos! 💪"

    except Exception as e:
        print(f"Erro no Health Coach: {e}")
        return "Peso registado! Continua assim! 🚀"