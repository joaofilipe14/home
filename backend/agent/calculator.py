def calcular_meta_calorica(peso, altura, idade, genero, atividade, objetivo):
    """
    Calcula as calorias diárias usando a fórmula Mifflin-St Jeor.

    peso: kg
    altura: cm
    idade: anos
    genero: 'masculino' ou 'feminino'
    atividade: 'sedentario', 'ligeiro', 'moderado', 'muito_ativo'
    objetivo: 'perder', 'manter', 'ganhar'
    """

    # 1. Taxa Metabólica Basal (TMB)
    tmb = (10 * peso) + (6.25 * altura) - (5 * idade)

    if genero == 'masculino':
        tmb += 5
    else:
        tmb -= 161

    # 2. Fator de Atividade
    fatores = {
        'sedentario': 1.2,      # Pouco ou nenhum exercício
        'ligeiro': 1.375,       # 1-3 dias por semana
        'moderado': 1.55,       # 3-5 dias por semana
        'muito_ativo': 1.725    # Treino pesado diário
    }

    tmb_total = tmb * fatores.get(atividade, 1.2)

    # 3. Ajuste pelo Objetivo
    if objetivo == 'perder':
        return int(tmb_total - 400) # Défice calórico
    elif objetivo == 'ganhar':
        return int(tmb_total + 300) # Superavit
    else:
        return int(tmb_total) # Manter