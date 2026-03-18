import csv
import io
import requests
import json
from datetime import datetime

def processar_csv_banco(file_stream):
    print("📊 A processar CSV (Suporte UTF-16)...")

    # 1. LER BYTES CRUS
    raw_data = file_stream.read()
    texto = ""

    # 2. DETETAR ENCODING (A parte mágica ⭐)
    # Se tiver muitos bytes nulos (\x00), é quase garantido que é UTF-16
    if b'\x00' in raw_data:
        try:
            texto = raw_data.decode("utf-16")
            print("   💾 Encoding detetado: UTF-16 (Windows)")
        except:
            texto = raw_data.decode("utf-8", errors='ignore')
    else:
        # Tenta os formatos normais
        try:
            texto = raw_data.decode("utf-8-sig")
        except:
            texto = raw_data.decode("cp1252", errors='ignore')

    # Limpar quebras de linha estranhas
    texto = texto.replace('\r\n', '\n').replace('\r', '\n')

    # 3. DETETAR SEPARADOR
    linhas_amostra = texto.split('\n')[:20]
    count_pv = sum(l.count(';') for l in linhas_amostra)
    count_v = sum(l.count(',') for l in linhas_amostra)
    # O tab (\t) também é comum em UTF-16
    count_tab = sum(l.count('\t') for l in linhas_amostra)

    if count_tab > count_pv and count_tab > count_v:
        delimitador = '\t'
    elif count_pv > count_v:
        delimitador = ';'
    else:
        delimitador = ','

    print(f"   🔧 Delimitador usado: '{delimitador}'")

    # 4. LER DADOS
    stream = io.StringIO(texto, newline='')
    leitor = csv.reader(stream, delimiter=delimitador)

    transacoes = []
    ler_dados = False
    idx_data, idx_desc, idx_valor = 0, 2, 3 # Padrão, mas ajustável

    linhas_para_ia = []

    for linha in leitor:
        if not linha: continue

        # Procura o cabeçalho
        if not ler_dados:
            s = [c.lower() for c in linha]
            # Verifica se tem 'data' E 'valor/montante' na mesma linha
            if any("data" in x for x in s) and any(x in s for x in ["montante", "valor", "débito", "credito"]):
                ler_dados = True
                print("   ✅ Cabeçalho encontrado!")

                # Mapear índices
                for i, col in enumerate(s):
                    if "data" in col and "lan" in col: idx_data = i
                    elif "descri" in col or "movimento" in col: idx_desc = i
                    elif "montante" in col or "valor" in col: idx_valor = i
                continue

        if ler_dados:
            try:
                # Validar tamanho da linha
                if len(linha) <= max(idx_data, idx_desc, idx_valor): continue

                d_raw = linha[idx_data].strip()
                desc = linha[idx_desc].strip()
                v_raw = linha[idx_valor].strip()

                if not d_raw or not v_raw: continue

                # Parse Data
                data_iso = None
                for fmt in ["%d-%m-%Y", "%Y-%m-%d", "%d/%m/%Y"]:
                    try:
                        data_iso = datetime.strptime(d_raw, fmt).strftime("%Y-%m-%d")
                        break
                    except: pass

                if not data_iso: continue

                # Parse Valor
                v_limpo = v_raw.replace(' EUR', '').replace(' €', '')
                # Lógica PT: Se tem ponto e vírgula, remove ponto. Se só tem vírgula, troca por ponto.
                if ',' in v_limpo and '.' in v_limpo:
                    v_limpo = v_limpo.replace('.', '').replace(',', '.')
                elif ',' in v_limpo:
                    v_limpo = v_limpo.replace(',', '.')

                valor = float(v_limpo)

                transacoes.append({
                    "data": data_iso, "descricao": desc, "valor": valor
                })
                linhas_para_ia.append(f"{data_iso} | {desc} | {valor}")

            except:
                continue

    # 5. CATEGORIZAR (Simples + IA)
    print(f"   ✅ Extraídos {len(transacoes)} movimentos. A categorizar...")

    # Categorização rápida baseada em palavras-chave
    keywords = {
        "Supermercado": [
            "MERCADONA", "CONTINENTE", "PINGO DOCE", "LIDL", "AUCHAN", "INTERMARCHE", "CELEIRO",
            "AMANHECER", "MINI MERCADO", "E LECLERC", "ALDI"
        ],
        "Restaurantes": [
            "MCDONALDS", "H3", "BURGER", "RESTAURANTE", "BK21548-CALDAS", "BK28948- NAZARE" , "BK28948-",
            "CAFE", "UBER EATS", "GLOVO", "CENTRAL FOZ", "PADARIA", "PASTELARIA", "PIZZA", "SUSHI", "KFC",
            "CHAPELEIRO MALUCO", "100 MONTADITOS", "MARCIANUS", "CHURRASQUEIRA"
        ],
        "Transporte": [
            "GALP", "BP", "PRIO", "REPSOL", "COMBOIOS", "CP ", "UBER", "BOLT", "EST SERVICO",
            "VIAVERDE", "VIA VERDE", "BRISA", "PARQUE", "MONTEPIO CREDI",
            "PA CALDAS", "CALDAS STATION", "OFICINA", "MECANICO", "ELECLERC CALDAS DA RAINHACALDAS DE"
        ],
        "Habitação": [
            # Contas
            "EDP", "VODAFONE", "MEO", "NOS", "AGUAS", "RENDAS", "MARIA ISABEL", "CONDOMINIO",
            "ALDRO", "RUBIS", "SERVICOS MUNICIPALIZAD", # <-- Adicionados
            # Lojas
            "GOOD MART", "LOJA CHINES", "BAZAR", "IKEA", "LEROY", "JOM"
        ],
        "Salário": [
            "VENCIMENTO", "TRANSFERENCIA", "SALARIO", "BOLDINT", "DEVOTEAM",
            "UNA SEGUROS DE VIDA", "INSTITUTO DE GEST O FINANCE"
        ],
        "Saúde": [
            "FARMACIA", "HOSPITAL", "CUF", "LUSIADAS", "DENTISTA", "ALFAFOZ",
            "RESMASIMBOLICA", "CLIN VET", "WELLS", "FIDELIDADE", "ORIENTE LISBOA", "FITNESS D", "MED NUTRI D"
        ],
        "Lazer": [
            "DECATHLON", "CINEMA", "NETFLIX", "SPOTIFY", "FNAC", "SPORTMULTIMEDIA"
        ],
        "Porquinhos": [ # Animais/Poupança?
            "AGRILOJA", "ZU", "PET", "SAUDADE ANIMAL"
        ],
        "Investimentos": [
            "RISCO DE LAPIS", "ITP", "RISCODELAPISLD", "NEGOCIO VELAS", "MATERIAL VELAS", "RAILWAY"
        ],
        "Educação": [ # Categoria Extra sugerida
            "SOBREIRO", "GRAVE", "ESCOLA", "CONDUCAO"
        ],
        "Transferências": [ # Para não ficar em "Outros"
            "JOAO FILIPE", "JOAO PAULO"
        ]
    }

    for t in transacoes:
        cat_final = "Outros"
        d_upper = t['descricao'].upper()

        for cat, keys in keywords.items():
            if any(k in d_upper for k in keys):
                cat_final = cat
                break

        if cat_final == "Salário" and t['valor'] < 0: cat_final = "Transferências"
        t['categoria'] = cat_final

    return transacoes