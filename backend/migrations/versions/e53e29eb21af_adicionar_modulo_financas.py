"""adicionar_modulo_financas

Revision ID: e53e29eb21af
Revises: 9c585d653482
Create Date: 2026-02-02 11:29:29.386079

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'e53e29eb21af'
down_revision: Union[str, Sequence[str], None] = '9c585d653482'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Tabela de Contas (Ex: Banco, Carteira)
    op.execute("""
               CREATE TABLE IF NOT EXISTS contas_bancarias (
                                                               id SERIAL PRIMARY KEY,
                                                               usuario_id INTEGER REFERENCES usuarios(id),
                   nome TEXT NOT NULL,
                   tipo TEXT DEFAULT 'CORRENTE', -- 'POUPANCA', 'INVESTIMENTO', 'DINHEIRO'
                   saldo_atual REAL DEFAULT 0.0
                   );
               """)

    # 2. Tabela de Categorias (Ex: Alimentação, Casa)
    op.execute("""
               CREATE TABLE IF NOT EXISTS categorias_financas (
                                                                  id SERIAL PRIMARY KEY,
                                                                  usuario_id INTEGER REFERENCES usuarios(id), -- Pode ser NULL se for categoria global
                   nome TEXT NOT NULL,
                   tipo TEXT NOT NULL, -- 'DESPESA' ou 'RECEITA'
                   orcamento_alvo REAL DEFAULT 0.0, -- O budget mensal para esta categoria
                   cor_hex TEXT DEFAULT '#94a3b8' -- Para os gráficos
                   );
               """)

    # 3. Tabela de Transações (O coração do sistema)
    op.execute("""
               CREATE TABLE IF NOT EXISTS transacoes (
                                                         id SERIAL PRIMARY KEY,
                                                         usuario_id INTEGER REFERENCES usuarios(id),
                   conta_id INTEGER REFERENCES contas_bancarias(id),
                   categoria_id INTEGER REFERENCES categorias_financas(id),
                   valor REAL NOT NULL, -- Negativo para gastos, Positivo para ganhos
                   descricao TEXT,
                   data_transacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                   tags TEXT -- Para o Agente IA pesquisar melhor (ex: 'ferias', 'presente')
                   );
               """)

    # 4. Tabela de Despesas Fixas
    op.execute("""
               CREATE TABLE IF NOT EXISTS despesas_fixas (
                                                             id SERIAL PRIMARY KEY,
                                                             usuario_id INTEGER REFERENCES usuarios(id),
                   descricao TEXT NOT NULL,
                   valor REAL NOT NULL,
                   dia_previsto INTEGER DEFAULT 1, -- Dia do mês que costuma cair
                   meses VARCHAR(50)
                   );
               """)

    # 5. Tabela de Objetivos Financeiros (Mealheiros / Casa) - [NOVO]
    op.execute("""
               CREATE TABLE IF NOT EXISTS objetivos_financeiros (
                                                                    id SERIAL PRIMARY KEY,
                                                                    usuario_id INTEGER REFERENCES usuarios(id),
                   titulo TEXT NOT NULL,         -- Ex: 'Casa Própria'
                   meta_valor REAL NOT NULL,     -- Ex: 20000.00
                   saldo_atual REAL DEFAULT 0,   -- Ex: 5000.00
                   icone TEXT DEFAULT '🏠',
                   created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                   );
               """)

    # --- POVOAR COM DADOS INICIAIS (SEED) ---
    # Vamos criar categorias padrão para todos os utilizadores
    op.execute("""
               INSERT INTO categorias_financas (nome, tipo, cor_hex) VALUES
                                                                         ('Supermercado', 'DESPESA', '#10b981'), -- Verde (Ligação à Nutrição)
                                                                         ('Restaurantes', 'DESPESA', '#f59e0b'), -- Laranja
                                                                         ('Habitação', 'DESPESA', '#3b82f6'),    -- Azul
                                                                         ('Transporte', 'DESPESA', '#6366f1'),   -- Índigo
                                                                         ('Saúde', 'DESPESA', '#ef4444'),        -- Vermelho
                                                                         ('Lazer', 'DESPESA', '#ec4899'),        -- Rosa
                                                                         ('Porquinhos', 'DESPESA', '#d2b48c'),
                                                                         ('Salário', 'RECEITA', '#22c55e'),      -- Verde Escuro
                                                                         ('Investimentos', 'DESPESA', '#8b5cf6'), -- Roxo
                                                                         ('Educação', 'DESPESA', '#8b5cf6'),     -- Roxo
                                                                         ('Outros', 'DESPESA', '#000000');       -- Preto
               """)

def downgrade() -> None:
    # Ordem inversa para apagar sem erros de chave estrangeira
    op.execute("DROP TABLE IF EXISTS objetivos_financeiros;") # [NOVO]
    op.execute("DROP TABLE IF EXISTS despesas_fixas;")
    op.execute("DROP TABLE IF EXISTS transacoes;")
    op.execute("DROP TABLE IF EXISTS categorias_financas;")
    op.execute("DROP TABLE IF EXISTS contas_bancarias;")