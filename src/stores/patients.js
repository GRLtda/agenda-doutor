import { defineStore } from 'pinia'
import { ref } from 'vue'
import {
  createPatient as apiCreatePatient,
  searchPatients as apiSearchPatients,
  getPatientById as apiGetPatientById,
  updatePatient as apiUpdatePatient,
  deletePatient as apiDeletePatient, // ✨ 2. Importar a função da API
  getAllPatients as apiGetAllPatients, // ✨ 1. Importar a nova função
  getBirthdayPatients as apiGetBirthdayPatients,
  addProcedureToPatient as apiAddProcedureToPatient,
  deleteProcedureFromPatient as apiDeleteProcedureFromPatient, // ✨ Importar a função de deletar procedimento
  checkout as apiCheckout, // ✨ Import checkout
} from '@/api/patients'


export const usePatientsStore = defineStore('patients', () => {
  // STATE
  const allPatients = ref([]) // ✨ INICIALIZADO COMO ARRAY VAZIO (CRUCIAL)
  const searchResults = ref([])
  const selectedPatient = ref(null)
  const isLoading = ref(false)
  const error = ref(null)
  const pagination = ref({
    total: 0,
    page: 1,
    pages: 1,
    limit: 10,
  })

  // Estado para aniversariantes do mês
  const birthdayPatients = ref([])

  // ACTIONS

  /**
   * ✨ 3. NOVA ACTION: Busca a lista paginada de pacientes.
   */
  async function fetchAllPatients(page = 1, limit = 10) {
    isLoading.value = true
    error.value = null
    try {
      const response = await apiGetAllPatients({ page, limit })

      // ✨ AQUI ESTÁ A CORREÇÃO PRINCIPAL ✨
      // Atribuímos o array de pacientes (response.data.data) ao nosso estado.
      allPatients.value = response.data.data

      // E guardamos as informações de paginação.
      pagination.value = {
        total: response.data.total,
        page: response.data.page,
        pages: response.data.pages,
        limit: response.data.limit,
      }
      return { success: true }
    } catch (err) {
      error.value = 'Erro ao carregar pacientes.'
      allPatients.value = [] // Em caso de erro, garante que seja um array vazio
      console.error('Falha em fetchAllPatients:', err)
      return { success: false, error: error.value }
    } finally {
      isLoading.value = false
    }
  }

  async function searchPatients(query) {
    if (!query) {
      searchResults.value = []
      return
    }
    isLoading.value = true
    error.value = null
    try {
      const response = await apiSearchPatients(query)
      searchResults.value = response.data.data
    } catch (err) {
      error.value = 'Erro ao buscar pacientes.'
      searchResults.value = []
      console.error('Falha em searchPatients:', err)
    } finally {
      isLoading.value = false
    }
  }

  async function createPatient(patientData) {
    isLoading.value = true
    this.error = null
    try {
      const response = await apiCreatePatient(patientData)
      // Recarrega a lista para refletir a adição
      await fetchAllPatients(1, pagination.value.limit)
      return { success: true, data: response.data }
    } catch (err) {
      this.error = err.response?.data?.message || 'Erro ao criar o paciente.'
      console.error('Falha em createPatient:', err)
      return { success: false, error: this.error }
    } finally {
      this.isLoading = false
    }
  }

  async function fetchPatientById(patientId) {
    isLoading.value = true
    error.value = null
    try {
      const response = await apiGetPatientById(patientId)
      selectedPatient.value = response.data
      return { success: true, data: response.data }
    } catch (err) {
      error.value = 'Paciente não encontrado.'
      console.error('Falha em fetchPatientById:', err)
      return { success: false, error: error.value }
    } finally {
      isLoading.value = false
    }
  }

  async function updatePatient(patientId, patientData) {
    isLoading.value = true
    error.value = null
    try {
      const response = await apiUpdatePatient(patientId, patientData)
      selectedPatient.value = response.data
      return { success: true, data: response.data }
    } catch (err) {
      error.value = err.response?.data?.message || 'Erro ao atualizar o paciente.'
      console.error('Falha em updatePatient:', err)
      return { success: false, error: error.value }
    } finally {
      isLoading.value = false
    }
  }

  /**
   * ✨ 6. NOVA ACTION: Exclui um paciente.
   */
  async function deletePatient(patientId) {
    isLoading.value = true
    error.value = null
    try {
      await apiDeletePatient(patientId)
      // Remove o paciente da lista local para atualização imediata da UI
      allPatients.value = allPatients.value.filter((p) => p._id !== patientId)
      pagination.value.total-- // Decrementa o total

      // Se a página atual ficar vazia, busca a página anterior para evitar uma página em branco
      if (allPatients.value.length === 0 && pagination.value.page > 1) {
        await fetchAllPatients(pagination.value.page - 1)
      }

      return { success: true }
    } catch (err) {
      error.value = err.response?.data?.message || 'Erro ao excluir o paciente.'
      console.error('Falha em deletePatient:', err)
      return { success: false, error: error.value }
    } finally {
      isLoading.value = false
    }
  }

  // Busca pacientes que fazem aniversário no mês atual
  async function fetchBirthdayPatients() {
    isLoading.value = true
    error.value = null
    try {
      const response = await apiGetBirthdayPatients()
      // A resposta vem com paginação: { total, page, pages, limit, data: [...] }
      birthdayPatients.value = response.data.data || []
      return { success: true }
    } catch (err) {
      error.value = 'Erro ao carregar aniversariantes.'
      birthdayPatients.value = []
      console.error('Falha em fetchBirthdayPatients:', err)
      return { success: false, error: error.value }
    } finally {
      isLoading.value = false
    }
  }

  // Adicionar procedimento ao paciente
  async function addProcedureToPatient(patientId, procedureData) {
    isLoading.value = true
    error.value = null
    try {
      const response = await apiAddProcedureToPatient(patientId, procedureData)
      // Atualiza o paciente selecionado com os novos dados retornados
      selectedPatient.value = response.data
      return { success: true, data: response.data }
    } catch (err) {
      error.value = err.response?.data?.message || 'Erro ao adicionar procedimento.'
      console.error('Falha em addProcedureToPatient:', err)
      return { success: false, error: error.value }
    } finally {
      isLoading.value = false
    }
  }


  // Checkout - Finalizar atendimento com pagamento
  async function checkout(checkoutData) {
    isLoading.value = true
    error.value = null
    try {
      const response = await apiCheckout(checkoutData)
      return { success: true, data: response.data }
    } catch (err) {
      error.value = err.response?.data?.message || 'Erro ao processar checkout.'
      console.error('Falha em checkout:', err)
      return { success: false, error: error.value }
    } finally {
      isLoading.value = false
    }
  }

  // Remove procedimento do paciente
  async function removeProcedureFromPatient(patientId, procedureId) {
    isLoading.value = true
    error.value = null
    try {
      const response = await apiDeleteProcedureFromPatient(patientId, procedureId)
      // Atualiza o paciente selecionado com os novos dados retornados (que já vem sem o procedimento)
      selectedPatient.value = response.data
      return { success: true }
    } catch (err) {
      error.value = err.response?.data?.message || 'Erro ao remover procedimento.'
      console.error('Falha em removeProcedureFromPatient:', err)
      return { success: false, error: error.value }
    } finally {
      isLoading.value = false
    }
  }

  // RETURN
  return {
    allPatients,
    searchResults,
    selectedPatient,
    pagination, // ✨ 4. Expor o estado da paginação
    isLoading,
    error,
    birthdayPatients,
    createPatient,
    searchPatients,
    fetchPatientById,
    updatePatient,
    deletePatient, // ✨ 7. Expor a nova action
    fetchAllPatients, // ✨ 5. Expor a nova action
    fetchBirthdayPatients,
    addProcedureToPatient,
    checkout, // ✨ Export checkout
    removeProcedureFromPatient,
  }
})
