"""tabelas_iniciais

Revision ID: 9c585d653482
Revises: 
Create Date: 2026-02-02 11:11:49.823694

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '9c585d653482'
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # AQUI COLOCAS O SQL PARA CRIAR AS TABELAS
    op.execute("""
               CREATE TABLE IF NOT EXISTS usuarios (
                       id SERIAL PRIMARY KEY,
                       nome TEXT,
                       meta_calorias INTEGER,
                       peso REAL,
                       altura REAL,
                       idade INTEGER,
                       genero TEXT,
                       atividade TEXT,
                       objetivo TEXT,
                       restricoes TEXT,
                       orcamento_semanal REAL DEFAULT 50.0,
                       salario_base REAL DEFAULT 0,
                       subsidio_alimentacao REAL DEFAULT 0,
                       seguro_capitalizacao REAL DEFAULT 0
               );

               CREATE TABLE IF NOT EXISTS refeicoes (
                    id SERIAL PRIMARY KEY,
                    usuario_id INTEGER REFERENCES usuarios(id),
                   nome_prato TEXT,
                   calorias INTEGER,
                   data_registo TIMESTAMP
               );

               CREATE TABLE IF NOT EXISTS planos_semanais (
                  id SERIAL PRIMARY KEY,
                  usuario_id INTEGER REFERENCES usuarios(id),
                   data_criacao TIMESTAMP
                   );

               CREATE TABLE IF NOT EXISTS itens_plano (
                  id SERIAL PRIMARY KEY,
                  plano_id INTEGER REFERENCES planos_semanais(id) ON DELETE CASCADE,
                   dia_semana TEXT,
                   tipo_refeicao TEXT,
                   prato TEXT,
                   calorias INTEGER
                   );

               CREATE TABLE IF NOT EXISTS livro_receitas (
                                                             id SERIAL PRIMARY KEY,
                                                             nome TEXT UNIQUE,
                                                             tipo TEXT,
                                                             calorias INTEGER,
                                                             ingredientes TEXT,
                                                             tags TEXT
               );

               -- Adiciona aqui as tabelas de compras e água também...
               """)


def downgrade() -> None:
    # AQUI É O "UNDO" (DESFAZER) - Ordem inversa
    op.execute("""
               DROP TABLE IF EXISTS livro_receitas;
               DROP TABLE IF EXISTS itens_plano;
               DROP TABLE IF EXISTS planos_semanais;
               DROP TABLE IF EXISTS refeicoes;
               DROP TABLE IF EXISTS usuarios;
               """)