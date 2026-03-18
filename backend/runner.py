from app import app, run_migrations
import logging

if __name__ == "__main__":
    # Configurar logs
    logging.basicConfig(level=logging.INFO)
    logger = logging.getLogger("Runner")

    print("\n========================================")
    print("🚀 NUTRITION & FINANCE AGENT STARTING...")
    print("========================================\n")

    # 1. Tentar correr migrações de base de dados (se houver alterações)
    try:
        print("🛠️  A verificar base de dados...")
        run_migrations()
    except Exception as e:
        logger.error(f"Erro nas migrações (podes ignorar se for a primeira vez): {e}")

    # 2. Iniciar o servidor Flask
    print("\n🌍 Servidor disponível em: http://127.0.0.1:5000")
    print("Use Ctrl+C para parar.\n")

    app.run(debug=True, port=5000, host='0.0.0.0')