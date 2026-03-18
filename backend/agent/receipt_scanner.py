import os
import requests
import base64
from pypdf import PdfReader
from json_repair import repair_json
from dotenv import load_dotenv
import re

# --- NOVA IMPORTAÇÃO DO GOOGLE (SDK V1) ---
from google import genai
from google.genai import types

# Carregar variáveis de ambiente
load_dotenv()

# --- CONFIGURAÇÕES GLOBAIS ---
TIPO_IA = os.getenv("TIPO_IA", "LOCAL").upper() # "CLOUD" ou "LOCAL"
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")
OLLAMA_URL = "http://localhost:11434/api/generate"

# ==============================================================================
#  FUNÇÕES AUXILIARES (LIMPEZA E PÓS-PROCESSAMENTO)
# ==============================================================================

def limpar_dados_finais(dados):
    """
    Padroniza o JSON final.
    """
    if not dados or not isinstance(dados, dict) or 'itens' not in dados: return dados

    lista_final = []

    correcoes_categoria = {
        'ELIXIR': 'Higiene', 'DENTIFRICO': 'Higiene', 'SHAMPOO': 'Higiene', 'GEL': 'Higiene',
        'FRANGO': 'Talho', 'PERU': 'Talho', 'PORCO': 'Talho', 'SALSICHAS': 'Talho', 'CARNE': 'Talho',
        'PEIXE': 'Peixaria', 'BACALHAU': 'Peixaria',
        'AGUA': 'Bebidas', 'SUMO': 'Bebidas', 'VINHO': 'Bebidas',
        'LEITE': 'Laticínios', 'IOGURTE': 'Laticínios', 'QUEIJO': 'Laticínios',
        'MACA': 'Fruta', 'BANANA': 'Fruta', 'LARANJA': 'Fruta', 'PERA': 'Fruta',
        'COUVE': 'Vegetais', 'ALHO': 'Vegetais', 'CEBOLA': 'Vegetais', 'BATATA': 'Vegetais'
    }

    if not isinstance(dados['itens'], list): dados['itens'] = []

    for item in dados['itens']:
        if not isinstance(item, dict): continue

        # Garante números (Se vier a 0, vamos tentar manter para o utilizador corrigir,
        # mas o prompt novo deve resolver a maioria)
        try: item['preco'] = float(item.get('preco', 0))
        except: item['preco'] = 0.0

        nome = str(item.get('item', '')).strip().title()
        if not nome: continue
        item['item'] = nome

        # Categorização
        nome_upper = nome.upper()
        for key, val in correcoes_categoria.items():
            if key in nome_upper:
                item['categoria_financeira'] = val
                break

        lista_final.append(item)

    dados['itens'] = lista_final
    return dados

# ==============================================================================
#  MOTOR 1: GOOGLE GEMINI (CLOUD - SDK NOVO)
# ==============================================================================
def analisar_com_gemini(file_wrapper):
    print("☁️ Usando Google Gemini Flash Latest...")
    try:
        # 1. Inicializar o Cliente
        client = genai.Client(api_key=GOOGLE_API_KEY)

        # 2. Preparar o Ficheiro
        file_wrapper.seek(0)
        file_bytes = file_wrapper.read()
        mime_type = "application/pdf" if file_wrapper.filename.lower().endswith(".pdf") else "image/jpeg"

        # --- PROMPT REFORÇADO PARA PREÇOS ---
        prompt_text = """
        You are an expert accountant reading Portuguese receipts (Lidl, Continente).
        
        CRITICAL RULES FOR EXTRACTION:
        
        1. **IGNORE UNIT PRICES**: 
           - Receipts often show "1.99 EUR/kg". THIS IS NOT THE PRICE.
           - You must find the **TOTAL PRICE** at the end of the line or on the next line.
        
        2. **HANDLE WEIGHED ITEMS (Items with kg)**:
           - Structure usually is:
             Line 1: "Banana Importada"
             Line 2: "0.850 kg x 1.10 EUR/kg   0.94 A"
           - OUTPUT: Item="Banana Importada", Qtd="0.850 kg", Price=0.94
           - DO NOT output 1.10 (that is unit price).
           - DO NOT output 0 (unless it is a free offer).

        3. **DISCOUNTS**: 
           - If a line has a negative value (e.g., -0.50), subtract it from the item price.

        4. **OUTPUT JSON**:
        {
            "loja": "Store Name",
            "data": "YYYY-MM-DD",
            "total": 0.00,
            "itens": [
                { 
                    "item": "Product Name", 
                    "qtd": "1 un" or "1.5 kg", 
                    "preco": 0.00,  <-- MUST BE TOTAL FINAL PRICE
                    "categoria_financeira": "Mercearia" 
                }
            ]
        }
        """

        # 3. Chamada à API
        response = client.models.generate_content(
            model='gemini-flash-latest',
            contents=[
                prompt_text,
                types.Part.from_bytes(data=file_bytes, mime_type=mime_type)
            ]
        )

        return repair_json(response.text, return_objects=True)

    except Exception as e:
        print(f"❌ Erro Gemini (Novo SDK): {e}")
        return None

# ==============================================================================
#  MOTOR 2: OLLAMA (LOCAL - FALLBACK)
# ==============================================================================
def extrair_texto_pdf_local(file_wrapper):
    try:
        file_wrapper.seek(0)
        pdf = PdfReader(file_wrapper)
        text = ""
        for page in pdf.pages:
            raw = page.extract_text() or ""
            text += raw.replace(',,', ' ').replace('"', '') + "\n"
        return text
    except: return ""

def analisar_com_ollama(file_wrapper):
    print("🏠 Usando Ollama Local...")
    filename = file_wrapper.filename.lower()
    prompt = ""
    model = ""
    images = []

    if filename.endswith('.pdf'):
        texto = extrair_texto_pdf_local(file_wrapper)
        model = os.getenv("OLLAMA_MODEL_TEXT", "qwen2.5:32b")
        prompt = f"""
        Extract receipt data to JSON.
        TEXT: {texto[:8000]}
        RULES: 
        1. Extract items and TOTAL PRICES.
        2. Do NOT extract unit prices (EUR/kg). Only the final calculated price.
        3. Structure: {{ "loja": "...", "total": 0.0, "itens": [ {{ "item": "...", "qtd": "...", "preco": 0.0 }} ] }}
        """
    else:
        model = os.getenv("OLLAMA_MODEL_VISION", "llama3.2-vision")
        file_wrapper.seek(0)
        b64 = base64.b64encode(file_wrapper.read()).decode('utf-8')
        images = [b64]
        prompt = "Extract receipt data to JSON. Use TOTAL PRICE for items, ignore unit prices."

    try:
        payload = { "model": model, "prompt": prompt, "stream": False, "format": "json", "options": {"num_ctx": 4096} }
        if images: payload["images"] = images
        res = requests.post(OLLAMA_URL, json=payload)
        return repair_json(res.json()['response'], return_objects=True)
    except Exception as e:
        print(f"❌ Erro Ollama: {e}")
        return None

# ==============================================================================
#  FUNÇÃO PRINCIPAL
# ==============================================================================
def analisar_talao_inteligente(file_wrapper):
    dados = None
    if TIPO_IA == "CLOUD":
        if GOOGLE_API_KEY:
            dados = analisar_com_gemini(file_wrapper)
        else:
            dados = analisar_com_ollama(file_wrapper)
    else:
        dados = analisar_com_ollama(file_wrapper)

    return limpar_dados_finais(dados)