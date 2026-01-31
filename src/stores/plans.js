import { defineStore } from 'pinia';
import { ref } from 'vue';
import plansApi from '@/api/plans';

export const usePlansStore = defineStore('plans', () => {
    const plans = ref([]);
    const loading = ref(false);
    const error = ref(null);

    /**
     * Busca os planos da API
     */
    async function fetchPlans() {
        loading.value = true;
        error.value = null;
        try {
            const response = await plansApi.getPlans();
            // Assumindo que a API retorna um array de planos no corpo ou em data
            plans.value = response.data || [];
        } catch (err) {
            console.error('Erro ao buscar planos:', err);
            error.value = 'Falha ao carregar os planos disponíveis.';
        } finally {
            loading.value = false;
        }
    }

    return {
        plans,
        loading,
        error,
        fetchPlans
    };
});
