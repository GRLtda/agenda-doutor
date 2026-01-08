// src/composables/usePlanAccess.js
import { computed } from 'vue'
import { useAuthStore } from '@/stores/auth'

/**
 * Mapa de funcionalidades por plano.
 * - basic: Acesso total às ferramentas (financeiro e workflows inclusos)
 * - premium: Acesso total (diferenciação por limite de médicos)
 * - enterprise: Acesso total
 */
const planFeatures = {
    basic: [
        'calendar',
        'patients',
        'procedures',
        'appointments',
        'marketing_overview',
        'marketing_messages',
        'marketing_templates',
        'marketing_connection',
        'marketing_logs',
        'finance',
        'workflows',
        'settings',
    ],
    premium: [
        'calendar',
        'patients',
        'procedures',
        'appointments',
        'marketing_overview',
        'marketing_messages',
        'marketing_templates',
        'marketing_connection',
        'marketing_logs',
        'finance',
        'workflows',
        'settings',
    ],
    enterprise: ['*'], // Acesso total a todas funcionalidades
}

/**
 * Mapeamento de rotas para features.
 * Usado pelo router guard para verificar acesso.
 */
const routeFeatureMap = {
    'financeiro': 'finance',
    'workflows-list': 'workflows',
    'workflow-editor': 'workflows',
}

/**
 * Verifica acesso a uma feature baseado no plano.
 * Função utilitária para uso fora de componentes Vue.
 */
export function checkPlanAccess(plan, feature) {
    const features = planFeatures[plan] || planFeatures.basic
    if (features.includes('*')) return true
    return features.includes(feature)
}

/**
 * Retorna a feature requerida para uma rota.
 */
export function getRouteFeature(routeName) {
    return routeFeatureMap[routeName] || null
}

/**
 * Composable para controle de acesso baseado no plano da clínica.
 */
export function usePlanAccess() {
    const authStore = useAuthStore()

    /**
     * Plano atual da clínica.
     * Default para 'basic' se não definido.
     */
    const currentPlan = computed(() => {
        return authStore.user?.clinic?.plan || 'basic'
    })

    /**
     * Lista de funcionalidades permitidas para o plano atual.
     */
    const allowedFeatures = computed(() => {
        return planFeatures[currentPlan.value] || planFeatures.basic
    })

    /**
     * Verifica se uma funcionalidade está disponível para o plano atual.
     * @param {string} feature - Nome da funcionalidade
     * @returns {boolean}
     */
    function hasAccess(feature) {
        return checkPlanAccess(currentPlan.value, feature)
    }

    /**
     * Verifica se uma rota é acessível para o plano atual.
     * @param {string} routeName - Nome da rota
     * @returns {boolean}
     */
    function canAccessRoute(routeName) {
        const feature = getRouteFeature(routeName)
        if (!feature) return true // Se não tem restrição, permite
        return hasAccess(feature)
    }

    /**
     * Verifica se o plano é pelo menos premium.
     */
    const isPremiumOrHigher = computed(() => {
        return currentPlan.value === 'premium' || currentPlan.value === 'enterprise'
    })

    /**
     * Verifica se o plano é enterprise.
     */
    const isEnterprise = computed(() => {
        return currentPlan.value === 'enterprise'
    })

    return {
        currentPlan,
        allowedFeatures,
        hasAccess,
        canAccessRoute,
        isPremiumOrHigher,
        isEnterprise,
    }
}

