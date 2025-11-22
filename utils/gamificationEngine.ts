import type { Achievement, UserGamificationStats } from '../types';

/**
 * PURE FUNCTION: Gamification Engine
 * Compara as estatísticas atuais do usuário com as regras globais de conquistas
 * para determinar se houve novos desbloqueios.
 * 
 * Esta função é "pura":
 * 1. Não faz chamadas ao Firebase.
 * 2. Não altera o estado diretamente.
 * 3. Retorna apenas os objetos das conquistas que DEVEM ser desbloqueadas agora.
 *
 * @param currentStats - Os contadores atuais do usuário (ex: { quizzesCompleted: 10 })
 * @param allAchievements - Lista de todas as conquistas globais disponíveis no sistema
 * @param unlockedMap - Mapa O(1) das conquistas que o usuário JÁ possui (ID -> Data)
 * @returns Array de objetos Achievement que foram desbloqueados nesta verificação
 */
export function checkNewAchievements(
    currentStats: UserGamificationStats,
    allAchievements: Achievement[],
    unlockedMap: Record<string, any>
): Achievement[] {
    const newUnlocks: Achievement[] = [];

    // Itera sobre todas as conquistas possíveis
    for (const achievement of allAchievements) {
        
        // 1. Otimização: Se já está no mapa de desbloqueados, pula.
        if (unlockedMap[achievement.id]) {
            continue;
        }

        // 2. Regra de Negócio: Se a conquista está Inativa pelo admin, ignora.
        if (achievement.status === 'Inativa') {
            continue;
        }

        // 3. Verificação de Critérios
        let isUnlocked = false;
        const target = achievement.criterionCount || 0;

        // Evita desbloquear conquistas com critério 0 ou indefinido por segurança
        if (target <= 0) continue;

        switch (achievement.criterionType) {
            case 'quizzes':
                // Ex: Fez 5 quizzes >= Meta de 5
                if ((currentStats.quizzesCompleted || 0) >= target) {
                    isUnlocked = true;
                }
                break;
            
            case 'modules':
                // Ex: Completou 3 módulos >= Meta de 3
                if ((currentStats.modulesCompleted || 0) >= target) {
                    isUnlocked = true;
                }
                break;
            
            case 'activities':
                // Ex: Enviou 10 atividades >= Meta de 10
                if ((currentStats.activitiesCompleted || 0) >= target) {
                    isUnlocked = true;
                }
                break;
            
            // Futuro: Adicionar novos tipos aqui (ex: 'loginStreak', 'xpTotal')
            default:
                break;
        }

        // 4. Se passou na regra, adiciona à lista de "Novas Conquistas"
        if (isUnlocked) {
            // Injetamos a data atual para facilitar o uso imediato na UI
            const achievementWithDate = {
                ...achievement,
                unlocked: true,
                date: new Date().toLocaleDateString('pt-BR') // Data visual para o Toast
            };
            newUnlocks.push(achievementWithDate);
        }
    }

    return newUnlocks;
}