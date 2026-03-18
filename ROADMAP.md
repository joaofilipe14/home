# 🗺️ ROADMAP: AI Nutrition & Finance Agent
**Objetivo:** Um assistente pessoal local para equilibrar saúde e finanças.
**Meta Principal:** Poupar para comprar casa 🏠 + Manter a forma 💪.

---

## 🟢 ESTADO ATUAL
- **Backend:** Flask a correr (Porta 5000).
- **Frontend:** React Dashboard (Porta 5173).
- **IA:** Ollama (Llama 3.2 Vision + Qwen2.5 Coder).
- **BD:** PostgreSQL com Tabelas de Utilizadores, Transações e Despesas Fixas.

---

## 🏰 ÉPICO 1: Finanças & Controlo (Foco: Casa Própria)
*Agente Responsável: FinanceGuard (Qwen Coder)*

### ✅ Fase 1: O Básico (Feito)
- [x] Importar CSV do Banco (Millennium/Outros).
- [x] Dashboard com Saldo Total e Gráficos de Despesas.
- [x] Tabela de Movimentos com Edição de Categoria.
- [x] Gestão de Despesas Fixas (Renda, Luz, Água).
- [x] Cálculo de "Saldo Real" (Saldo - Contas a Pagar).
- [x] Indicador "Quanto posso gastar hoje?".

### 🚧 Fase 2: Otimização & Poupança (A Fazer)
- [ ] **Mapa Anual (Visão Estratégica):**
    - Gráfico de Barras: Comparar Receita vs. Despesa mês a mês.
    - Objetivo: Identificar meses perigosos (ex: IMI, Seguros) para prevenir.
- [ ] **O Cofre "Pagar-se Primeiro":**
    - Criar uma "Despesa de Poupança" automática (ex: 500€).
    - Esse dinheiro sai do "Saldo Livre" para o "Mealheiro Virtual".
- [ ] **Barra de Progresso da Casa:**
    - Visualizar quanto falta para a Entrada (ex: 15.000€).
- [ ] **Alerta de Desvios:**
    - Se gastar > 20€ em "Restaurantes", aviso: "Isso são 2 tijolos da casa!".
- [ ] **Simulador de Cenários:**
    - Prompt: "Se eu cortar o ginásio, quanto poupo num ano?"
---

## 🍎 ÉPICO 2: Saúde & Motivação
*Agente Responsável: NutriCoach (Llama 3.2 Vision)*

### 🚧 Fase 1: Recolha de Dados (Em Curso)
- [x] Perfil de Utilizador (Peso, Altura, Meta Calórica).
- [x] **Scanner de Talões (Vision):**
    - [x] Ler foto do talão.
    - [ ] Classificar itens em "Saudável" vs "Lixo".
    - [ ] Somar o custo do "Lixo" (Ligação ao Épico Financeiro).
- [ ] **Registo de Refeições Rápido:**
    - *Ideia:* Input texto/voz: "Comi um bitoque com ovo".
    - A IA estima calorias.

### ⏳ Fase 2: O Coach (A Fazer)
- [ ] **O Motivador Diário:**
    - Widget no Dashboard com frase personalizada.
    - Ex: "João, ontem portaste-te bem. Hoje mantém o foco!" ou "Laura, essa pizza atrasou a dieta 2 dias."
- [ ] **Gráfico de Peso:**
    - Registar peso semanalmente e cruzar com a linha de despesas de supermercado.

---

## ⚙️ ÉPICO 3: Infraestrutura & Qualidade de Vida
- [ ] **Backup Automático:** Script para guardar a BD SQL uma vez por semana.
- [ ] **Mobile View:** Garantir que o Dashboard funciona bem no telemóvel (CSS Responsivo).
- [ ] **Chat Global:** Uma janela de chat onde falo com o "Agente" e ele decide se é dúvida de saúde ou dinheiro.

---

## 🎮 EASY WINS (Para dias de Cansaço 😴)
*Tarefas de 10-15 min. Baixo esforço mental, alta recompensa visual.*

### 🎨 Visual & UI (React)
- [ ] **Favicon & Título:** Mudar o ícone da aba e o texto de "React App" para "NutriAgent".
    - *Ficheiro:* `public/index.html`.
- [ ] **Emoji Picker:** Adicionar emojis às categorias na Tabela de Movimentos.
    - *Ex:* 🍔 Restaurantes, 💡 Luz, 🏠 Renda.
- [ ] **Mensagem de Bom Dia:**
    - Componente simples que diz "Bom dia, João!" ou "Boa noite!" dependendo da hora.
- [ ] **Botão "Café Rápido":**
    - Um botão no Dashboard que lança imediatamente uma despesa de 0.80€ ("Café") sem pedir mais nada.

### 🧹 Limpeza & Organização
- [ ] **Organizar Imports:** Passar pelos ficheiros `.jsx` e apagar imports não usados (o VS Code sublinha a amarelo).
- [ ] **Comentários:** Escrever comentários no `database.py` a explicar o que cada função faz (bom para quando o Agente Qwen ler o código).
- [ ] **Backup Manual:** Criar uma pasta `backups/` e guardar lá uma cópia dos ficheiros importantes (`app.py`, `database.py`).

### 🛠️ Pequenas Funcionalidades (Backend)
- [ ] **Contador de Água:**
    - Uma tabela simples `copos_agua` e um botão `+` no frontend. Sem IAs, sem lógica complexa.
- [ ] **Endpoint "Ping":**
    - Uma rota `/api/status` que responde `{"status": "online"}` só para testar se o servidor está vivo.

---

## 📝 NOTAS TÉCNICAS
- Usar `ollama pull llama3.2-vision` para os talões.
- Usar `ollama pull qwen2.5-coder:7b` para gerar código SQL/React (via plugin Continue).
- Manter as chaves de API locais.