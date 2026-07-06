<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useFinanceStore } from '@/stores/finance'
import AppPagination from '@/components/global/AppPagination.vue'
import AppSkeleton from '@/components/global/AppSkeleton.vue'
import AppEmptyState from '@/components/global/AppEmptyState.vue'
import {
  Users,
  Activity,
  DollarSign,
  CheckCircle,
  Search
} from 'lucide-vue-next'

const props = defineProps({
  selectedPeriod: {
    type: String,
    required: true
  },
  selectedProfessional: {
    type: String,
    default: ''
  },
  getCustomPeriodDates: {
    type: Function,
    required: true
  }
})

const financeStore = useFinanceStore()
const router = useRouter()
const clientSearch = ref('')
let searchTimeout = null

const formatCurrency = (value) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value || 0)
}

const navigateToPatient = (patientId) => {
  if (patientId) {
    router.push({ name: 'detalhes-paciente', params: { id: patientId } })
  }
}

const handleSearch = (event) => {
    const query = event.target.value
    clientSearch.value = query

    clearTimeout(searchTimeout)
    searchTimeout = setTimeout(async () => {
        const { startDate, endDate } = props.selectedPeriod === 'custom'
          ? props.getCustomPeriodDates()
          : { startDate: null, endDate: null }

        await financeStore.fetchTopClients({
            period: props.selectedPeriod,
            startDate,
            endDate,
            page: 1,
            search: query,
            professionalId: props.selectedProfessional || null
        })
    }, 500)
}

const handlePageChange = async (page) => {
    const { startDate, endDate } = props.selectedPeriod === 'custom'
      ? props.getCustomPeriodDates()
      : { startDate: null, endDate: null }

    await financeStore.fetchTopClients({
        period: props.selectedPeriod,
        startDate,
        endDate,
        page,
        search: clientSearch.value,
        professionalId: props.selectedProfessional || null
    })
}
</script>

<template>
      <div class="table-card">
        <div class="card-header">
          <div class="header-text-group">
            <h3 class="card-title">Principais Clientes</h3>
            <p class="card-subtitle">Pacientes com maior volume financeiro.</p>
          </div>
          <div class="ubc-icon-wrapper">
            <Users :size="20" class="text-blue-600" />
          </div>
        </div>

        <div class="search-box table-search-container">
          <Search :size="14" />
          <input
              type="text"
              placeholder="Buscar..."
              v-model="clientSearch"
              @input="handleSearch"
              class="table-search-input"
          />
        </div>

        <!-- Mobile Cards View -->
        <div class="mobile-cards-list">
          <template v-if="financeStore.topClientsPaginated.isLoading">
            <div v-for="i in 3" :key="i" class="mobile-card">
              <div class="mobile-card-header">
                <AppSkeleton width="36px" height="36px" borderRadius="50%" />
                <div class="mobile-card-info">
                  <AppSkeleton width="100px" height="14px" class="mb-1" />
                  <AppSkeleton width="60px" height="12px" />
                </div>
              </div>
              <AppSkeleton width="80px" height="18px" />
            </div>
          </template>
          <template v-else>
            <div v-for="client in financeStore.topClientsPaginated.data" :key="client._id" class="mobile-card w-full max-w-full">
              <div class="mobile-card-header min-w-0">
                <div class="client-avatar shrink-0">{{ client.name.charAt(0) }}</div>
                <div class="mobile-card-info min-w-0">
                  <span class="mobile-card-name block truncate" :title="client.name">{{ client.name }}</span>
                  <span class="mobile-card-sub">{{ client.appointmentsCount }} procedimentos</span>
                </div>
              </div>
              <span class="mobile-card-value font-semibold text-emerald-600 shrink-0">{{ formatCurrency(client.totalRevenue) }}</span>
            </div>
            <div v-if="financeStore.topClientsPaginated.data.length === 0">
              <AppEmptyState title="Nenhum cliente" text="Nenhum cliente encontrado." :icon="Users" />
            </div>
          </template>
        </div>

        <!-- Desktop Table View -->
        <div class="table-responsive desktop-only">
          <table class="premium-table fixed-table">
            <thead>
              <tr>
                <th style="width: 45%;"><div class="th-content"><User :size="14" /> Cliente</div></th>
                <th style="width: 20%;" class="text-center"><div class="th-content center"><Activity :size="14" /> Procedimento</div></th>
                <th style="width: 20%;" class="text-right"><div class="th-content right"><DollarSign :size="14" /> Total Gasto</div></th>
                <th style="width: 15%;" class="text-right"><div class="th-content right"><CheckCircle :size="14" /> Status</div></th>
              </tr>
            </thead>
            <tbody>
              <template v-if="financeStore.topClientsPaginated.isLoading">
                  <tr v-for="i in 5" :key="i">
                      <td>
                          <div class="flex items-center gap-3">
                              <AppSkeleton width="32px" height="32px" borderRadius="50%" />
                              <AppSkeleton width="120px" height="16px" />
                          </div>
                      </td>
                      <td class="text-center"><AppSkeleton width="40px" height="16px" class="mx-auto" /></td>
                      <td class="text-right"><AppSkeleton width="80px" height="16px" class="ml-auto" /></td>
                      <td class="text-right"><AppSkeleton width="60px" height="20px" borderRadius="1rem" class="ml-auto" /></td>
                  </tr>
              </template>
              <template v-else>
                <tr v-for="client in financeStore.topClientsPaginated.data" :key="client._id" @click="navigateToPatient(client._id)" class="clickable-row modern-row" title="Ver detalhes do paciente">
                    <td>
                    <div class="client-info">
                        <div class="client-avatar shrink-0">{{ client.name.charAt(0) }}</div>
                        <span class="client-name truncate" :title="client.name">{{ client.name }}</span>
                    </div>
                    </td>
                    <td class="text-center">
                      <span class="inline-flex items-center justify-center min-w-[28px] h-7 px-2 rounded-md bg-slate-100 text-slate-600 font-medium text-sm border border-slate-200">
                        {{ client.appointmentsCount }}
                      </span>
                    </td>
                    <td class="text-right font-semibold text-emerald-600">{{ formatCurrency(client.totalRevenue) }}</td>
                    <td class="text-right">
                        <span class="status-badge modern-badge">Ativo</span>
                    </td>
                </tr>
                <tr v-if="financeStore.topClientsPaginated.data.length === 0" class="empty-row">
                    <td colspan="4" style="padding: 0; border: 0;">
                        <AppEmptyState title="Nenhum cliente" text="Nenhum cliente encontrado." :icon="Users" />
                    </td>
                </tr>
              </template>
            </tbody>
          </table>
        </div>
        <div class="card-footer" v-if="financeStore.topClientsPaginated.pagination.total > 0">
            <AppPagination
                :current-page="financeStore.topClientsPaginated.pagination.page"
                :total-pages="financeStore.topClientsPaginated.pagination.pages"
                :total-items="financeStore.topClientsPaginated.pagination.total"
                :limit="financeStore.topClientsPaginated.pagination.limit"
                @page-change="handlePageChange"
            ></AppPagination>
        </div>
      </div>
</template>

<style scoped>
.table-card {
  background-color: var(--branco);
  border: 1px solid #e5e7eb;
  border-radius: 1rem;
  padding: 1.5rem;
  height: 550px;
  display: flex;
  flex-direction: column;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 1.5rem;
}

.card-title {
  font-size: 1.125rem;
  font-weight: 700;
  color: var(--preto);
}

.card-subtitle {
  font-size: 0.875rem;
  color: var(--cinza-texto);
  margin-top: 0.25rem;
  font-weight: 400;
}

.ubc-icon-wrapper {
  background-color: #eff6ff;
  padding: 0.6rem;
  border-radius: 0.75rem;
  display: flex;
  align-items: center;
  justify-content: center;
}

.table-search-container {
  width: 100%;
  margin-bottom: 1rem;
  margin-top: -0.5rem;
}

.search-box {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background-color: #f8fafc;
  padding: 0.5rem 1rem;
  border-radius: 0.5rem;
  border: 1px solid #e5e7eb;
}

.table-search-input {
  width: 100%;
  background-color: transparent;
  outline: none;
  border: none;
  font-size: 0.875rem;
  color: #334155;
}

.table-responsive {
  overflow-x: auto;
  flex: 1;
  overflow-y: auto;
}

.fixed-table {
  table-layout: fixed;
}

.premium-table {
  width: 100%;
  border-collapse: separate;
  border-spacing: 0 0.5rem;
}

.premium-table th {
  position: sticky;
  top: 0;
  z-index: 10;
  text-align: left;
  padding: 0.75rem 1rem;
  background: var(--branco);
  color: #64748b;
  font-weight: 600;
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  border-bottom: 2px solid #f1f5f9;
}

.premium-table td {
  padding: 1rem;
  background-color: transparent;
  font-size: 0.9rem;
  transition: background-color 0.2s ease, border-color 0.2s ease;
  border-top: 1px solid transparent;
  border-bottom: 1px solid transparent;
}

.modern-row td:first-child {
  border-top-left-radius: 0.6rem;
  border-bottom-left-radius: 0.6rem;
  border-left: 1px solid transparent;
}

.modern-row td:last-child {
  border-top-right-radius: 0.6rem;
  border-bottom-right-radius: 0.6rem;
  border-right: 1px solid transparent;
}

.premium-table tr.modern-row:hover td {
    background-color: #f8fafc;
    border-color: #f1f5f9;
}

.client-info {
  display: flex;
  align-items: center;
  gap: 0.85rem;
  min-width: 0;
}

.client-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: linear-gradient(135deg, #eff6ff 0%, #e0e7ff 100%);
  color: var(--azul-principal);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: 0.85rem;
  flex-shrink: 0;
  border: 1px solid rgba(255, 255, 255, 0.4);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.02);
}

.clickable-row {
  cursor: pointer;
  transition: background-color 0.2s;
}

.clickable-row:hover td {
  background-color: #f8fafc !important;
}

.client-name {
  font-weight: 600;
  color: var(--preto);
  font-size: 0.95rem;
}

.status-badge {
  padding: 0.25rem 0.75rem;
  border-radius: 1rem;
  font-size: 0.75rem;
  font-weight: 600;
}

.status-badge.modern-badge {
  background-color: transparent;
  border: 1px solid rgba(16, 185, 129, 0.3);
  color: #059669;
  letter-spacing: 0.02em;
}

.text-center { text-align: center; }
.text-right { text-align: right; }
.font-semibold { font-weight: 600; }
.text-emerald-600 { color: #059669; }

.card-footer {
  border-top: 1px solid #f1f5f9;
}

.mobile-cards-list {
  display: none;
  flex-direction: column;
  gap: 0.5rem;
  flex: 1;
  overflow-y: auto;
}

.mobile-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.875rem;
  background-color: #f8fafc;
  border-radius: 0.75rem;
  transition: background-color 0.15s ease;
}

.mobile-card:hover {
  background-color: #f1f5f9;
}

.mobile-card-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex: 1;
  min-width: 0;
}

.mobile-card-info {
  display: flex;
  flex-direction: column;
  min-width: 0;
  flex: 1;
}

.mobile-card-name {
  font-weight: 600;
  color: var(--preto);
  font-size: 0.9rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 160px;
}

.mobile-card-sub {
  font-size: 0.75rem;
  color: var(--cinza-texto);
  margin-top: 0.125rem;
}

.mobile-card-value {
  font-weight: 700;
  font-size: 0.95rem;
  color: var(--preto);
  white-space: nowrap;
  margin-left: 0.5rem;
}

.th-content {
    display: flex;
    align-items: center;
    gap: 0.5rem;
}

.th-content.center {
    justify-content: center;
}

.th-content.right {
    justify-content: flex-end;
}

@media (max-width: 768px) {
  .mobile-cards-list {
    display: flex;
  }
  .desktop-only {
    display: none !important;
  }
  .table-card {
    padding: 1rem;
    height: auto;
    min-height: auto;
    max-height: none;
  }
  .card-header {
    flex-direction: row;
    gap: 0.75rem;
    margin-bottom: 1rem;
    align-items: flex-start;
  }
  .card-title {
    font-size: 1rem;
  }
  .search-box {
    width: 100%;
    padding: 0.5rem 0.875rem;
  }
  .search-box input {
    width: 100%;
    font-size: 0.875rem;
  }
  .card-footer {
    padding: 0.875rem;
  }
  .mobile-card .client-avatar {
    width: 36px;
    height: 36px;
    font-size: 0.875rem;
    flex-shrink: 0;
  }
}
@media (max-width: 480px) {
  .mobile-card {
    padding: 0.75rem;
  }
  .mobile-card-name {
    font-size: 0.85rem;
    max-width: 120px;
  }
  .mobile-card-value {
    font-size: 0.875rem;
  }
}
</style>
