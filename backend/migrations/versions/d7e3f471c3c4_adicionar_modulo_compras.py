"""adicionar_modulo_compras

Revision ID: d7e3f471c3c4
Revises: e53e29eb21af
Create Date: 2026-02-08 13:58:10.467090

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'd7e3f471c3c4'
down_revision: Union[str, Sequence[str], None] = 'e53e29eb21af'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Tabela de Listas de Compras (O "Cabeçalho" do Talão)
    op.execute("""
               CREATE TABLE IF NOT EXISTS listas_compras (
                                                             id SERIAL PRIMARY KEY,
                                                             usuario_id INTEGER REFERENCES usuarios(id),
                   loja TEXT,               -- Ex: 'Lidl', 'Continente'
                   data_compra DATE DEFAULT CURRENT_DATE,
                   total_gasto REAL,        -- Valor total do talão

               -- Análise dos Agentes (Resumo)
                   nota_nutricional INTEGER, -- 0 a 100
                   conselho_financeiro TEXT, -- Texto gerado pelo LLM

                   created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                   );
               """)

    # 2. Tabela de Itens da Compra (As "Linhas" do Talão)
    op.execute("""
               CREATE TABLE IF NOT EXISTS itens_compra (
                   id SERIAL PRIMARY KEY,
                   lista_id INTEGER REFERENCES listas_compras(id) ON DELETE CASCADE, -- Se apagar a lista, apaga os itens

               -- Dados Extraídos (OCR)
                   nome_produto TEXT NOT NULL,
                   quantidade TEXT,         -- Ex: '1.5 kg' ou '2 un'
                   unidade TEXT DEFAULT 'un',
                   preco_unitario REAL,
                   preco_total REAL,

                   quantidade_atual REAL,
                   validade DATE,
                   local_armazenamento TEXT DEFAULT 'armario',

                   -- Enriquecimento: Agente Financeiro
                   categoria_financeira TEXT, -- Ex: 'Talho', 'Laticínios', 'Supérfluos'
                   e_essencial BOOLEAN DEFAULT FALSE,

                   -- Enriquecimento: Agente Nutricionista
                   categoria_nutricional TEXT, -- Ex: 'Vegetais', 'Processados', 'Proteína'
                   nivel_processamento TEXT,   -- Ex: 'Natural', 'Processado', 'Ultraprocessado'
                   tem_gluten BOOLEAN DEFAULT FALSE, -- Alerta Crítico para a Laura
                   calorias_estimadas INTEGER
                   
                   );
               """)
    op.execute("""
        CREATE TABLE IF NOT EXISTS  produtos_conhecidos (
            id SERIAL PRIMARY KEY,
        nome_raw TEXT UNIQUE,        -- O nome exato que vem no talão (ex: "LEITE M GORDO")
        nome_limpo TEXT,             -- O nome bonito (ex: "Leite Meio Gordo")
        categoria_padrao TEXT,       -- Ex: "Laticínios"
        preco_ultimo REAL,           -- Para preencher se a IA falhar (0.00)
        contagem_usos INTEGER DEFAULT 1
        );
        """)

    def downgrade() -> None:
        op.execute("DROP TABLE IF EXISTS itens_compra;")
        op.execute("DROP TABLE IF EXISTS listas_compras;")
