import os
import logging
from flask import Flask
from flask_cors import CORS
from alembic.config import Config
from alembic import command

# Importar os Blueprints
from routes.usuarios import usuarios_bp
from routes.financas import financas_bp
from routes.nutricao import nutricao_bp
from routes.despensa import despensa_bp
from routes.saude import saude_bp
from routes.minecraft import minecraft_bp

# Configuração de Logs
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app)

# Criar pasta de uploads se não existir
if not os.path.exists('uploads'):
    os.makedirs('uploads')

# =================================================
# 🔗 REGISTO DE ROTAS (BLUEPRINTS)
# =================================================
# Tudo o que for usuario começa com /api/usuarios
app.register_blueprint(usuarios_bp, url_prefix='/api/usuarios')

# Tudo o que for financas começa com /api/financas
app.register_blueprint(financas_bp, url_prefix='/api/financas')

# Tudo o que for nutricao começa com /api/nutricao (ou api/ diretamente se preferires)
# Nota: No frontend, algumas chamadas de nutrição podem estar como /api/analisar
# Por isso, aqui podes registar sem prefixo extra ou ajustar o frontend.
# Vamos manter simples:
app.register_blueprint(nutricao_bp, url_prefix='/api')
app.register_blueprint(despensa_bp, url_prefix='/api')
app.register_blueprint(saude_bp, url_prefix='/api/saude')
app.register_blueprint(minecraft_bp, url_prefix='/api/minecraft')


def run_migrations():
    alembic_cfg = Config("alembic.ini")
    try:
        command.upgrade(alembic_cfg, "head")
        logger.info("✅ Migrações aplicadas!")
    except Exception as e:
        logger.error(f"⚠️ Erro migrações: {e}")