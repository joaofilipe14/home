from google import genai
import os
from dotenv import load_dotenv

load_dotenv()

client = genai.Client(api_key=os.getenv("GOOGLE_API_KEY"))

print("--- MODELOS DISPONÍVEIS (NOVO SDK) ---")
try:
    # Lista apenas os que suportam geração de conteúdo
    for m in client.models.list():
        name = m.name.split('/')[-1] # Remove 'models/'
        print(f"Nome: {name}")
except Exception as e:
    print(f"Erro ao listar: {e}")