import psycopg2
from psycopg2.extras import RealDictCursor

# Configurações de conexão
DB_CONFIG = {
    "host": "localhost",
    "database": "nutri_agent",
    "user": "admin",
    "password": "password",
    "port": "5432"
}

def get_connection():
    conn = psycopg2.connect(**DB_CONFIG)
    return conn