import axios from '@/api/index';

export default {
    /**
     * Lista todos os planos disponíveis
     */
    getPlans() {
        return axios.get('/plans');
    },

    /**
     * Obtém detalhes de um plano específico
     */
    getPlan(id) {
        return axios.get(`/plans/${id}`);
    }
};
