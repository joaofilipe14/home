import pdfplumber
import json
import requests
import re
from datetime import datetime

def limpar_json(texto):
    texto = texto.replace("```json", "").replace("```", "").strip()
    inicio = texto.find('[')
    fim = texto.rfind(']')
    if inicio != -1 and fim != -1: return texto[inicio:fim+1]
    return "[]"

def processar_pdf_banco(caminho_pdf):
    print(f"📄 A ler PDF como TEXTO (Mais fiável): {caminho_pdf}...")

    texto_bruto = ""

    # 1. Extração "Cirúrgica" do Texto
    with pdfplumber.open(caminho_pdf) as pdf:
        for i, pagina in enumerate(pdf.pages):
            # Ignorar primeira página se for só capa (opcional)
            # if i == 0: continue

            # Extrair texto mantendo algum layout
            texto_pagina = pagina.extract_text()
            if texto_pagina:
                texto_bruto += f"\n--- PÁGINA {i+1} ---\n"
                texto_bruto += texto_pagina

    print("   ✅ Texto extraído. A pedir à IA para categorizar...")

    # 2. Enviar Texto para o Ollama (Llama Texto é mais inteligente que Llama Vision)
    url = "http://localhost:11434/api/generate"
    ano_atual = datetime.now().year

    # Cortar o texto se for muito grande (Ollama tem limite de contexto)
    # Vamos processar em blocos se necessário, mas para teste enviamos tudo
    texto_para_ia = texto_bruto[:12000]

    prompt = f"""
    You are a Data Parser. I have extracted raw text from a Portuguese Bank Statement.
    
    RAW TEXT:
    {texto_para_ia}
    
    TASK:
    Identify valid transactions and convert them to JSON.
    
    RULES:
    1. Look for lines with dates (DD-MM or DD.MM or YYYY-MM-DD).
    2. Ignore lines with "Saldo Inicial", "Saldo Contabilistico", "Transporte".
    3. Identify amounts. If the line suggests a DEBIT (compra, pagamento, levantamento), make it NEGATIVE. If CREDIT (transferencia recebida), make POSITIVE.
    4. Categorize based on description (Supermercado, Restaurantes, etc).
    5. Assume year {ano_atual} if missing.
    
    Return ONLY JSON list:
    [
      {{ "data": "YYYY-MM-DD", "descricao": "Title", "valor": -10.50, "categoria": "Category" }}
    ]
    """

    payload = {
        "model": "llama3.2", # Nota: Usamos o modelo de TEXTO, não o vision
        "prompt": prompt,
        "format": "json",
        "stream": False,
        "options": {"temperature": 0.1, "num_ctx": 8192}
    }

    try:
        res = requests.post(url, json=payload)
        json_txt = limpar_json(res.json()['response'])
        dados = json.loads(json_txt)

        print(f"   📊 IA encontrou {len(dados)} movimentos.")
        return dados

    except Exception as e:
        print(f"❌ Erro na IA: {e}")
        return []