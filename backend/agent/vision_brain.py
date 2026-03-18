import base64
import json
import requests
import copy # Para duplicar o objeto sem estragar o original
from deep_translator import GoogleTranslator

def traduzir_texto(texto):
    try:
        return GoogleTranslator(source='auto', target='pt').translate(texto)
    except:
        return texto

def analisar_imagem_com_ollama(caminho_imagem):
    print(f"🦙 Ollama a analisar (Modo Dual: EN + PT)...")

    with open(caminho_imagem, "rb") as image_file:
        base64_image = base64.b64encode(image_file.read()).decode('utf-8')

    url = "http://localhost:11434/api/generate"

    # Prompt estrito em INGLÊS
    prompt = """
    Analyze this food image.
    Response ONLY with this JSON format (no extra text):
    {
        "dish_name": "Name of the dish",
        "total_calories": 500,
        "ingredients": [{"item": "Rice", "calories": 150}],
        "macros": {"protein": 20, "carbs": 40, "fat": 10},
        "tip": "Short nutritional tip"
    }
    """

    payload = {
        "model": "llama3.2-vision",
        "prompt": prompt,
        "images": [base64_image],
        "stream": False,
        "format": "json",
        "options": {"temperature": 0.1}
    }

    try:
        response = requests.post(url, json=payload)
        response.raise_for_status()

        # 1. Obter os dados ORIGINAIS em Inglês
        resultado_raw = response.json()['response']
        dados_en = json.loads(resultado_raw)

        print(f"🇬🇧 Original: {dados_en.get('dish_name')}")

        # 2. Criar versão TRADUZIDA para o Frontend
        # Mapeamos os campos do Inglês para o formato que o React espera
        dados_pt = {
            "nome_prato": traduzir_texto(dados_en.get('dish_name', 'Unknown')),
            "calorias_totais": dados_en.get('total_calories', 0),
            "macros": {
                "proteina": dados_en.get('macros', {}).get('protein', 0),
                "carbs": dados_en.get('macros', {}).get('carbs', 0),
                "gordura": dados_en.get('macros', {}).get('fat', 0)
            },
            "dica": traduzir_texto(dados_en.get('tip', '')),
            "detalhes": []
        }

        for item in dados_en.get('ingredients', []):
            dados_pt['detalhes'].append({
                "item": traduzir_texto(item.get('item', '')),
                "calorias": item.get('calories', 0)
            })

        # RETORNAR OS DOIS: O original (EN) e o traduzido (PT)
        return {
            "english_data": dados_en,
            "frontend_data": dados_pt
        }

    except Exception as e:
        print(f"❌ Erro: {e}")
        # Retorno de erro seguro
        erro_pt = {
            "nome_prato": "Erro", "calorias_totais": 0,
            "dica": "Tenta de novo.", "macros": {}, "detalhes": []
        }
        return {"english_data": {}, "frontend_data": erro_pt}