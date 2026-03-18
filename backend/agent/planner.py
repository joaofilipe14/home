import requests
import json
import time
from deep_translator import GoogleTranslator

# Dias da semana para o loop (Mantemos em PT para controlar o loop, mas o prompt usa EN)
DIAS_SEMANA = [
    "Segunda-feira", "Terça-feira", "Quarta-feira",
    "Quinta-feira", "Sexta-feira", "Sábado", "Domingo"
]

def traduzir_texto(texto):
    """Traduz de Inglês (auto) para Português."""
    if not texto: return ""
    try:
        return GoogleTranslator(source='auto', target='pt').translate(texto)
    except Exception as e:
        print(f"⚠️ Erro tradução: {e}")
        return texto

def limpar_resposta_json(texto):
    """Limpa a resposta para extrair apenas o JSON."""
    texto = texto.replace("```json", "").replace("```", "").strip()
    idx_lista = texto.find('[')
    idx_obj = texto.find('{')

    if idx_lista == -1 and idx_obj == -1: return texto

    if idx_lista != -1 and (idx_obj == -1 or idx_lista < idx_obj):
        inicio = idx_lista; fim = texto.rfind(']')
    else:
        inicio = idx_obj; fim = texto.rfind('}')

    if inicio != -1 and fim != -1: return texto[inicio:fim+1]
    return texto

def gerar_um_dia_especifico(nome_usuario, meta_calorias, dia_atual, pratos_proibidos, restricoes_user=""):
    print(f"   ⏳ A planear {dia_atual} (Modo EN -> PT)...")

    url = "http://localhost:11434/api/generate"

    # Traduzir as restrições para Inglês para a IA entender melhor
    try:
        restricoes_en = GoogleTranslator(source='auto', target='en').translate(restricoes_user) if restricoes_user else "None"
    except:
        restricoes_en = restricoes_user

    # Lista de proibidos em texto
    lista_proibida_txt = ", ".join(pratos_proibidos) if pratos_proibidos else "None"

    # --- PROMPT EM INGLÊS (MUITO MAIS ROBUSTO) ---
    prompt = f"""
    You are a Nutritionist specializing in Portuguese Cuisine. 
    Create a 1-day meal plan for {nome_usuario} ({meta_calorias} kcal).
    
    ⚠️ CRITICAL DIETARY RESTRICTIONS:
    User Input: "{restricoes_en}".
    You MUST respect these restrictions absolutely.
    
    RULES:
    1. Do NOT repeat these dishes: [{lista_proibida_txt}].
    2. Use traditional Portuguese dishes (adapted to restrictions).
    3. Respond ONLY with JSON.
    
    JSON STRUCTURE:
    {{
      "day": "{dia_atual}",
      "meals": [
        {{"type": "Breakfast", "dish": "Name of dish", "calories": 300}},
        {{"type": "Lunch", "dish": "Name of dish", "calories": 600}},
        {{"type": "Dinner", "dish": "Name of dish", "calories": 400}}
      ]
    }}
    """

    payload = {
        "model": "llama3.2-vision",
        "prompt": prompt,
        "format": "json",
        "stream": False,
        "options": {"temperature": 0.6}
    }

    try:
        response = requests.post(url, json=payload)
        json_limpo = limpar_resposta_json(response.json()['response'])
        dados = json.loads(json_limpo)

        # Normalização de lista/dict
        dia_dados = dados[0] if isinstance(dados, list) and len(dados) > 0 else dados

        # --- FASE DE TRADUÇÃO (EN -> PT) ---
        # Mapa estático para os tipos de refeição (mais rápido e seguro)
        mapa_tipos = {
            "Breakfast": "Pequeno-Almoço", "Lunch": "Almoço",
            "Snack": "Lanche", "Dinner": "Jantar"
        }

        refeicoes_traduzidas = []
        if 'meals' in dia_dados:
            for ref in dia_dados['meals']:
                # 1. Traduzir o Tipo (Breakfast -> Pequeno-Almoço)
                tipo_pt = mapa_tipos.get(ref.get('type'), ref.get('type'))

                # 2. Traduzir o Prato (Scrambled Eggs -> Ovos Mexidos)
                prato_en = ref.get('dish', 'Unknown')
                prato_pt = traduzir_texto(prato_en)

                refeicoes_traduzidas.append({
                    "tipo": tipo_pt,
                    "prato": prato_pt,
                    "calorias": ref.get('calories', 0)
                })

        return {
            "dia": dia_atual, # Mantemos o dia em PT que veio da nossa lista
            "refeicoes": refeicoes_traduzidas
        }

    except Exception as e:
        print(f"   ❌ Erro dia {dia_atual}: {e}")
        return {
            "dia": dia_atual,
            "refeicoes": [
                {"tipo": "Almoço", "prato": "Erro na IA (Tenta recriar)", "calorias": 0},
                {"tipo": "Jantar", "prato": "Erro na IA", "calorias": 0}
            ]
        }

def gerar_plano_com_ollama(nome_usuario, meta_calorias, restricoes=""):
    print(f"👨‍🍳 Chef Ollama a iniciar Loop (EN->PT) para {nome_usuario}...")

    plano_completo = []
    pratos_usados = []

    # Traduzimos pratos usados para inglês para o contexto (opcional, mas ajuda)
    # Por simplicidade, passamos os nomes em PT, o Llama costuma entender nomes próprios.

    for dia in DIAS_SEMANA:
        dia_gerado = gerar_um_dia_especifico(nome_usuario, meta_calorias, dia, pratos_usados, restricoes)
        plano_completo.append(dia_gerado)

        if 'refeicoes' in dia_gerado:
            for ref in dia_gerado['refeicoes']:
                nome = ref.get('prato')
                if nome: pratos_usados.append(nome)

    print("✅ Semana completa gerada!")
    return plano_completo

def gerar_dia_unico(nome_usuario, meta_calorias, dia_semana, restricoes=""):
    res = gerar_um_dia_especifico(nome_usuario, meta_calorias, dia_semana, [], restricoes)
    return res.get('refeicoes', [])

def gerar_lista_compras(lista_pratos):
    print(f"🛒 Gerar lista de compras com PREÇOS (EN -> PT)...")

    pratos_txt = ", ".join(lista_pratos)
    url = "http://localhost:11434/api/generate"

    prompt = f"""
    You are a Shopping Assistant in Portugal.
    Menu: {pratos_txt}.
    
    TASK:
    Create a Shopping List with ESTIMATED PRICES in EUR (€).
    
    RULES:
    1. Group by: "Produce", "Meat_Fish", "Pantry", "Dairy".
    2. Estimate cost per item (e.g., 1kg Rice = 1.20).
    3. JSON ONLY.
    
    JSON STRUCTURE:
    {{
      "Produce": [{{"item": "Onions", "cost": 1.50}}, {{"item": "Apples", "cost": 2.00}}],
      "Meat_Fish": [{{"item": "Codfish", "cost": 8.50}}],
      "Pantry": [{{"item": "Rice", "cost": 1.20}}],
      "Dairy": [{{"item": "Milk", "cost": 0.90}}]
    }}
    """

    payload = { "model": "llama3.2-vision", "prompt": prompt, "format": "json", "stream": False, "options": {"temperature": 0.2} }

    try:
        res = requests.post(url, json=payload)
        json_limpo = limpar_resposta_json(res.json()['response'])
        lista_en = json.loads(json_limpo)

        mapa_categorias = {
            "Produce": "Frutaria_Legumes", "Meat_Fish": "Talho_Peixaria",
            "Pantry": "Mercearia", "Dairy": "Laticínios", "Frozen": "Congelados", "Bakery": "Padaria"
        }

        lista_pt = {}
        for cat_en, itens_en in lista_en.items():
            cat_pt = mapa_categorias.get(cat_en, cat_en)
            lista_pt[cat_pt] = []

            for item_obj in itens_en:
                # Traduzir nome e manter preço
                nome_pt = traduzir_texto(item_obj.get('item', ''))
                custo = item_obj.get('cost', 0.0)

                lista_pt[cat_pt].append({
                    "item": nome_pt,
                    "custo": custo
                })

        return lista_pt

    except Exception as e:
        print(f"❌ Erro compras: {e}")
        return None

def gerar_receita_prato(nome_prato):
    print(f"🍳 Gerar receita para: {nome_prato} (EN -> PT)...")
    url = "http://localhost:11434/api/generate"

    # Traduzimos o nome do prato para EN para a IA procurar melhor na sua "memória"
    nome_prato_en = traduzir_texto(nome_prato) # Na verdade traduz para PT no default, vamos forçar EN aqui?
    # deep-translator default é PT. Vamos assumir que a IA conhece o prato pelo nome PT ou EN.

    prompt = f"""
    You are a Chef. Provide the recipe for: "{nome_prato}".
    JSON ONLY.
    
    STRUCTURE:
    {{
      "time": "30 min",
      "difficulty": "Easy",
      "ingredients": ["item 1", "item 2"],
      "steps": ["Step 1", "Step 2"]
    }}
    """

    try:
        res = requests.post(url, json={"model": "llama3.2-vision", "prompt": prompt, "format": "json", "stream": False, "options": {"temperature": 0.3}})
        dados = json.loads(limpar_resposta_json(res.json()['response']))

        # --- TRADUÇÃO ---
        receita_pt = {
            "tempo": dados.get('time'), # O tempo geralmente é universal (30 min)
            "dificuldade": traduzir_texto(dados.get('difficulty')),
            "ingredientes": [traduzir_texto(i) for i in dados.get('ingredients', [])],
            "passos": [traduzir_texto(s) for s in dados.get('steps', [])]
        }
        return receita_pt

    except Exception as e:
        print(f"Erro receita: {e}")
        return None