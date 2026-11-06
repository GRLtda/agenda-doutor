<script setup>
import { ref, onMounted, onUnmounted, computed, watch } from 'vue'
import { useMediaQuery } from '@vueuse/core'
import { useRouter } from 'vue-router'
import { usePatientsStore } from '@/stores/patients'
import { useToast } from 'vue-toastification'
import { UserPlus, Search, X, UserRound, Calendar, History, SlidersHorizontal } from 'lucide-vue-next'
import AppTableList from '@/components/global/AppTableList.vue'
import PatientListActions from '@/components/pages/pacientes/PatientListActions.vue'
import PatientListCard from '@/components/pages/pacientes/PatientListCard.vue'
import AppointmentDetailsModal from '@/components/pages/dashboard/AppointmentDetailsModal.vue'
import CreateAppointmentModal from '@/components/pages/dashboard/CreateAppointmentModal.vue'
import { getAppointmentById } from '@/api/appointments'
import AppSkeleton from '@/components/global/AppSkeleton.vue'
import AppEmptyState from '@/components/global/AppEmptyState.vue'
import StyledSelect from '@/components/global/StyledSelect.vue'
import FormInput from '@/components/global/FormInput.vue'
import AppButton from '@/components/global/AppButton.vue'
import PatientPhoneDisplay from '@/components/global/PatientPhoneDisplay.vue'
import CopyContact from '@/components/global/CopyContact.vue'
import { Checkbox } from '@/components/ui/checkbox'
import patientsEmpty from '@/assets/illustrations/patients-empty.svg?raw'

const patientsStore = usePatientsStore()
const router = useRouter()
const toast = useToast()
const patients = computed(() => patientsStore.allPatients)
const pagination = computed(() => patientsStore.pagination)
const showProfessional = computed(() => patientsStore.professionalCount > 1)
const columnCount = computed(() => showProfessional.value ? 7 : 6)
const selectedKeys = ref([])
const isFiltersOpen = ref(false)
const isMobile = useMediaQuery('(max-width: 768px)')
const isDetailsOpen = ref(false)
const appointmentError = ref('')
const appointmentPatient = ref(null)
const selectedAppointment = ref(null)
const createData = ref(null)
const isCreateOpen = ref(false)
const loadingAppointmentId = ref(null)
let appointmentRequest = 0
async function openAppointment(patient) {
  const id = patient.nextAppointment?._id
  if (!id) { toast.error('Atualize a lista para carregar o agendamento.'); return }
  const request = ++appointmentRequest
  loadingAppointmentId.value = id
  appointmentPatient.value = patient
  selectedAppointment.value = null
  appointmentError.value = ''
  isDetailsOpen.value = true
  try {
    const { data } = await getAppointmentById(id)
    if (request !== appointmentRequest) return
    selectedAppointment.value = { originalEvent: data, start: data.startTime, end: data.endTime, title: data.patient?.name || patient.name }
  } catch { if (request === appointmentRequest) appointmentError.value = 'Não foi possível carregar o agendamento.' }
  finally { if (request === appointmentRequest) loadingAppointmentId.value = null }
}
function openCreate(patient) {
  ++appointmentRequest
  loadingAppointmentId.value = null
  selectedAppointment.value = null
  isDetailsOpen.value = false
  createData.value = { patient }
  isCreateOpen.value = true
}
function editAppointment(data) {
  const appointment = data?.originalEvent || data || selectedAppointment.value?.originalEvent
  createData.value = { ...appointment, _mode: 'rebook' }
  selectedAppointment.value = null
  isDetailsOpen.value = false
  isCreateOpen.value = true
}
function createReturn() {
  const appointment = selectedAppointment.value.originalEvent
  createData.value = { patient: appointment.patient, doctor: appointment.doctor, _mode: 'reschedule' }
  selectedAppointment.value = null
  isDetailsOpen.value = false
  isCreateOpen.value = true
}
function closeDetails() { ++appointmentRequest; isDetailsOpen.value = false; loadingAppointmentId.value = null; selectedAppointment.value = null; handlePageChange(pagination.value.page) }
const search = ref('')
const professional = ref('')
watch(showProfessional, visible => { if (!visible) professional.value = '' })
const scheduling = ref('')
const attendance = ref('')
const hasFilters = computed(() => !!(search.value.trim() || professional.value || scheduling.value || attendance.value))
const professionalOptions = computed(() => [{ value: '', label: 'Todos os profissionais' }, ...patientsStore.professionalOptions])
const schedulingOptions = [{ value: '', label: 'Todos' }, { value: 'with', label: 'Com agendamento' }, { value: 'without', label: 'Sem agendamento' }]
const attendanceOptions = [{ value: '', label: 'Todos' }, { value: 'never', label: 'Nunca atendidos' }, { value: 'recent', label: 'Últimos 30 dias' }, { value: 'overdue', label: 'Há mais de 90 dias' }]
const failedPhotos = ref(new Set())
let debounceTimeout = null
function filters() {
  return { search: search.value.trim() || undefined, professional: professional.value || undefined,
    scheduling: scheduling.value || undefined, attendance: attendance.value || undefined }
}
watch([search, professional, scheduling, attendance], () => {
  clearTimeout(debounceTimeout)
  selectedKeys.value = []
  debounceTimeout = setTimeout(() => handlePageChange(1), 300)
})
function clearFilters() { search.value = ''; professional.value = ''; scheduling.value = ''; attendance.value = '' }
watch(patients, () => { selectedKeys.value = [] })
onMounted(() => patientsStore.fetchAllPatients(1, 10, {}))
onUnmounted(() => { clearTimeout(debounceTimeout); ++appointmentRequest })
function handlePageChange(page) { clearTimeout(debounceTimeout); patientsStore.fetchAllPatients(page, pagination.value.limit, filters()) }
function goToPatient(id) { router.push(`/pacientes/${id}`) }
async function handleDelete(id) {
  if (!confirm('Tem certeza que deseja excluir este paciente? Esta ação não pode ser desfeita.')) return
  const { success } = await patientsStore.deletePatient(id)
  if (success) toast.success('Paciente excluído com sucesso!')
  else toast.error(patientsStore.error || 'Não foi possível excluir o paciente.')
}
const dateFormatter = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'America/Sao_Paulo' })
const timeFormatter = new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' })
function formatDate(value, time = false) {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '—' : (time ? timeFormatter : dateFormatter).format(date)
}
const initial = name => name?.trim().split(/\s+/).slice(0, 2).map(part => Array.from(part)[0]).join('').toUpperCase() || '?'
const hasPhoto = url => url && !failedPhotos.value.has(url)
function photoFailed(url) { failedPhotos.value = new Set([...failedPhotos.value, url]) }
</script>

<template>
  <div class="patients-list-page">
    <header class="page-header">
      <div><h1 class="title">Pacientes</h1><p class="subtitle">Gerencie todos os pacientes da sua clínica.</p></div>
      <div class="header-actions">
        <AppButton variant="primary" to="/pacientes/novo" class="add-patient-btn" aria-label="Adicionar paciente" title="Adicionar paciente"><UserPlus :size="18" /><span>Adicionar paciente</span></AppButton>
      </div>
    </header>
    <AppTableList v-model:selected-keys="selectedKeys" :items="patients" selectable :pagination="pagination" @page-change="handlePageChange">
      <template #filters>
        <div class="patient-filters" :class="{ 'filters-open': isFiltersOpen }">
          <div class="search-field"><Search :size="17" class="search-icon" aria-hidden="true" /><FormInput v-model="search" type="search" aria-label="Buscar paciente por nome, CPF, telefone ou e-mail" placeholder="Nome, CPF, telefone ou e-mail" class="filter-search" /><button v-if="search" type="button" class="clear-search" aria-label="Limpar busca" @click="search = ''"><X :size="15" /></button></div>
          <AppButton variant="outline" class="filter-toggle" :aria-expanded="isFiltersOpen" @click="isFiltersOpen = !isFiltersOpen"><SlidersHorizontal :size="16" />Filtros</AppButton>
          <div class="advanced-filters" :inert="isMobile && !isFiltersOpen"><div class="advanced-inner">
          <StyledSelect v-if="showProfessional" v-model="professional" class="filter-detail" placeholder="Filtrar por profissional" :options="professionalOptions">
            <template #prefix><span class="select-prefix"><UserRound :size="14" />Profissional:</span></template>
          </StyledSelect>
          <StyledSelect v-model="scheduling" class="filter-detail" placeholder="Filtrar por próximo agendamento" :options="schedulingOptions">
            <template #prefix><span class="select-prefix"><Calendar :size="14" />Agendamento:</span></template>
          </StyledSelect>
          <StyledSelect v-model="attendance" class="filter-detail" placeholder="Filtrar por último atendimento" :options="attendanceOptions">
            <template #prefix><span class="select-prefix"><History :size="14" />Atendimento:</span></template>
          </StyledSelect>
          <AppButton variant="outline" class="filter-detail clear-filters" :disabled="!hasFilters" @click="clearFilters">Limpar</AppButton>
          </div></div>
        </div>
      </template>
      <template #default="{ isSelected, selectRow, selectAll, allSelected, someSelected }">
        <div class="table-container" :aria-busy="patientsStore.isLoading">
          <table>
            <caption class="sr-only">Pacientes da clínica</caption>
            <thead><tr>
              <th class="selection-cell"><Checkbox :model-value="someSelected ? 'indeterminate' : allSelected"
                :disabled="patientsStore.isLoading || !patients.length" aria-label="Selecionar todos os pacientes desta página"
                @update:model-value="selectAll($event === true)" /></th>
              <th scope="col">Paciente</th><th scope="col">Contato</th><th scope="col">Último atendimento</th>
              <th scope="col">Próximo agendamento</th><th v-if="showProfessional" scope="col">Profissional</th>
              <th scope="col" class="actions-cell">Ações</th>
            </tr></thead>
            <tbody>
              <template v-if="patientsStore.isLoading && !patients.length">
                <tr v-for="n in 10" :key="n">
                  <td class="selection-cell"><AppSkeleton width="16px" height="16px" /></td>
                  <td><div class="person-cell"><AppSkeleton width="40px" height="40px" border-radius="50%" /><div class="person-details"><AppSkeleton width="150px" /><AppSkeleton width="180px" height="12px" /></div></div></td>
                  <td><AppSkeleton width="140px" /></td><td><AppSkeleton width="100px" /></td>
                  <td><div class="person-details"><AppSkeleton width="110px" /><AppSkeleton width="50px" height="12px" /></div></td>
                  <td v-if="showProfessional"><AppSkeleton width="130px" /></td><td class="actions-cell"><AppSkeleton width="28px" height="28px" /></td>
                </tr>
              </template>
              <tr v-else-if="patientsStore.error && !patients.length"><td :colspan="columnCount" class="state-cell"><div class="error-state" role="alert"><p>{{ patientsStore.error }}</p><AppButton variant="outline" @click="handlePageChange(pagination.page)">Tentar novamente</AppButton></div></td></tr>
              <tr v-else-if="!patients.length"><td :colspan="columnCount" class="state-cell">
                <AppEmptyState title="Nenhum paciente encontrado" :text="hasFilters ? 'Nenhum paciente corresponde aos filtros. Use Limpar para ver todos.' : 'Os pacientes cadastrados na clínica aparecerão aqui.'">
                  <template #illustration><div class="empty-illustration" aria-hidden="true" v-html="patientsEmpty"></div></template>
                </AppEmptyState>
              </td></tr>
              <tr v-for="patient in patients" v-else :key="patient._id" class="patient-row" :class="{ 'is-selected': isSelected(patient) }" @click="goToPatient(patient._id)">
                <td class="selection-cell" @click.stop><Checkbox :model-value="isSelected(patient)" :aria-label="`Selecionar ${patient.name}`" @update:model-value="selectRow(patient, $event === true)" /></td>
                <td><div class="person-cell">
                  <div class="avatar"><img v-if="hasPhoto(patient.photoUrl)" :src="patient.photoUrl" alt="" @error="photoFailed(patient.photoUrl)" /><span v-else>{{ initial(patient.name) }}</span></div>
                  <div class="person-details"><router-link :to="`/pacientes/${patient._id}`" class="patient-name" @click.stop>{{ patient.name }}</router-link><CopyContact v-if="patient.email" class="secondary" :value="patient.email" label="Copiar e-mail" message="E-mail copiado"><span class="email-copy" :title="patient.email">{{ patient.email }}</span></CopyContact><span v-else class="secondary">Sem e-mail</span></div>
                </div></td>
                <td><CopyContact v-if="patient.phone" :value="`+${patient.countryCode || '55'}${patient.phone.replace(/\D/g, '')}`" label="Copiar telefone" message="Telefone copiado"><PatientPhoneDisplay :phone="patient.phone" :country-code="patient.countryCode" :show-flag="true" /></CopyContact><span v-else class="secondary">Sem contato</span></td>
                <td><span v-if="patient.lastAppointment">{{ formatDate(patient.lastAppointment.startTime) }}</span><span v-else class="empty-value">Sem atendimento</span></td>
                <td><button v-if="patient.nextAppointment" class="appointment-link" :disabled="loadingAppointmentId === patient.nextAppointment._id" @click.stop="openAppointment(patient)"><Calendar :size="17" /><span class="person-details"><span>{{ formatDate(patient.nextAppointment.startTime) }}</span><span class="secondary">{{ formatDate(patient.nextAppointment.startTime, true) }}</span></span></button><span v-else class="empty-value">Sem agendamento</span></td>
                <td v-if="showProfessional"><div v-if="patient.professional" class="person-cell professional-cell"><div class="avatar professional-avatar"><img v-if="hasPhoto(patient.professional.photoUrl)" :src="patient.professional.photoUrl" alt="" @error="photoFailed(patient.professional.photoUrl)" /><span v-else>{{ initial(patient.professional.name) }}</span></div><span>{{ patient.professional.name }}</span></div><span v-else class="secondary">Sem profissional</span></td>
                <td class="actions-cell" @click.stop><PatientListActions :patient="patient" :loading="loadingAppointmentId === patient.nextAppointment?._id" @view-appointment="openAppointment(patient)" @create-attendance="openCreate(patient)" @delete="handleDelete(patient._id)" /></td>
              </tr>
            </tbody>
          </table>
        </div>
        <label v-if="patients.length" class="select-page"><Checkbox :model-value="someSelected ? 'indeterminate' : allSelected" aria-label="Selecionar todos os pacientes desta página" @update:model-value="selectAll($event === true)" />Selecionar página</label>
        <div class="mobile-cards" :aria-busy="patientsStore.isLoading">
          <template v-if="patientsStore.isLoading && !patients.length"><div v-for="n in 3" :key="n" class="card-skeleton"><AppSkeleton width="65%" /><AppSkeleton width="85%" height="12px" /><AppSkeleton width="50%" /></div></template>
          <div v-else-if="patientsStore.error && !patients.length" class="error-state" role="alert"><p>{{ patientsStore.error }}</p><AppButton variant="outline" @click="handlePageChange(pagination.page)">Tentar novamente</AppButton></div>
          <AppEmptyState v-else-if="!patients.length" title="Nenhum paciente encontrado" :text="hasFilters ? 'Ajuste ou limpe os filtros para ver pacientes.' : 'Os pacientes cadastrados aparecerão aqui.'"><template #illustration><div class="empty-illustration" aria-hidden="true" v-html="patientsEmpty"></div></template></AppEmptyState>
          <template v-else>
            <PatientListCard v-for="patient in patients" :key="patient._id" :patient="patient" :selected="isSelected(patient)" :loading="loadingAppointmentId === patient.nextAppointment?._id" :show-professional="showProfessional" :initial="initial" :has-photo="hasPhoto" :format-date="formatDate" @select="selectRow(patient, $event)" @view-appointment="openAppointment(patient)" @create-attendance="openCreate(patient)" @delete="handleDelete(patient._id)" @photo-error="photoFailed" />
          </template>
        </div>
      </template>
    </AppTableList>
    <AppointmentDetailsModal v-if="isDetailsOpen" :event="selectedAppointment" :loading="!!loadingAppointmentId" :error="appointmentError" :total-count="1" @retry="openAppointment(appointmentPatient)" @close="closeDetails" @edit="editAppointment" @reschedule="editAppointment()" @return="createReturn" />
    <CreateAppointmentModal v-if="isCreateOpen" :initial-data="createData" @close="isCreateOpen = false" @saved="handlePageChange(pagination.page)" />
  </div>
</template>

<style scoped>
.patients-list-page { height: 100%; min-height: 0; min-width: 0; display: flex; flex-direction: column; }
.patients-list-page > :deep(.app-table-list-container) { flex: 1; height: auto; min-height: 0; }
.patients-list-page :deep(.list-content) { min-height: 0; overflow: hidden; }
.patients-list-page :deep(.pagination-container) { flex-shrink: 0; }
.page-header { flex-shrink: 0; }
.page-header { display: flex; justify-content: space-between; align-items: center; gap: 1.5rem; margin-bottom: 1rem; flex-wrap: wrap; }
.title { font-size: 2rem; font-weight: 700; margin-bottom: .25rem; }
.subtitle, .secondary { color: var(--cinza-texto, #6b7280); }
.header-actions { display: flex; align-items: center; gap: .75rem; }
.add-patient-btn { height: 40px; }
.select-page { display: none; }
.advanced-filters, .advanced-inner { display: contents; }
.patient-filters { width: 100%; display: grid; grid-template-columns: minmax(200px, 1.3fr) minmax(240px, 1.2fr) repeat(2, minmax(200px, 1fr)) auto; align-items: center; gap: .75rem; }
.select-prefix { display: inline-flex; align-items: center; color: #64748b; font-size: .8125rem; font-weight: 600; white-space: nowrap; flex-shrink: 0; }
.patient-filters > * { min-width: 0; margin-bottom: 0; }
.clear-filters { width: 88px; min-width: 88px; max-width: 88px; justify-self: end; }
.email-copy { max-width: 280px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.search-field { position: relative; }
.search-field :deep(.form-group) { margin-bottom: 0; }
.search-field :deep(.form-input) { padding-left: 2.5rem; padding-right: 2.25rem; }
.search-field :deep(input[type='search']::-webkit-search-cancel-button),
.search-field :deep(input[type='search']::-webkit-search-decoration) { -webkit-appearance: none; appearance: none; }
.search-icon { position: absolute; left: .875rem; top: 50%; transform: translateY(-50%); z-index: 1; color: #94a3b8; pointer-events: none; }
.clear-search { position: absolute; right: .625rem; top: 50%; transform: translateY(-50%); width: 25px; height: 25px; display: grid; place-items: center; border: 0; border-radius: 6px; background: #f1f5f9; color: #64748b; cursor: pointer; }
.clear-search:hover { background: #e2e8f0; color: #1e293b; }
.filter-toggle, .mobile-cards { display: none; }
.appointment-link { display: inline-flex; align-items: center; gap: .625rem; color: var(--azul-principal); background: transparent; padding: .5rem .625rem; margin-left: -.625rem; border: 1px solid transparent; border-radius: 8px; cursor: pointer; text-align: left; transition: background-color 150ms, border-color 150ms; }
.appointment-link:disabled { opacity: .5; }
.appointment-link:hover, .appointment-link:focus-visible { background: #edf3ff; border-color: #dce6fa; text-decoration: none; }
.select-prefix { gap: .35rem; }
.patient-filters :deep(.form-input) { height: 44px; border-color: #d1d5db; box-shadow: 0 1px 2px rgba(15, 23, 42, .04); }
.patient-filters :deep(.form-input:focus) { border-color: var(--azul-principal); box-shadow: 0 0 0 3px rgba(59, 131, 246, .1); }
.patient-filters :deep(label) { font-size: .8125rem; }
.patients-list-page :deep(.filters-header) { background: #fff; padding: 1rem 1.25rem; }
.patients-list-page :deep(.filters-content) { min-width: 0; }
.table-container { flex: 1; min-height: 0; overflow: auto; }
table { width: 100%; border-collapse: collapse; }
th, td { padding: 1rem 1.25rem; text-align: left; border-bottom: 1px solid #e5e7eb; vertical-align: middle; white-space: nowrap; font-size: .875rem; }
th { background: #f5f6f8; color: #64748b; font-size: .75rem; font-weight: 500; letter-spacing: .01em; }
thead th { position: sticky; top: 0; z-index: 1; height: 44px; padding-top: 0; padding-bottom: 0; box-shadow: inset 0 -1px #e5e7eb; border-bottom: 0; }
thead .selection-cell { line-height: 0; }
tbody tr:last-child td { border-bottom: none; }
.selection-cell { width: 48px; padding-right: .5rem; }
.patient-row { cursor: pointer; }
.patient-row:hover, .patient-row.is-selected { background: #f0f4fc; }
.person-cell { display: flex; align-items: center; gap: .75rem; }
.person-details { display: flex; flex-direction: column; gap: .3rem; min-width: 0; }
.patient-name { color: var(--preto, #111827); font-weight: 600; text-decoration: none; }
.patient-name, .person-details .secondary { max-width: 280px; overflow: hidden; text-overflow: ellipsis; }
.secondary { font-size: .8125rem; }
.avatar { width: 40px; height: 40px; flex-shrink: 0; display: flex; align-items: center; justify-content: center; border-radius: 50%; overflow: hidden; color: var(--azul-principal, #2563eb); background: #eef2ff; font-weight: 600; }
.avatar img { width: 100%; height: 100%; object-fit: cover; }
.professional-avatar { width: 30px; height: 30px; font-size: .75rem; }
.empty-value { color: var(--cinza-texto, #6b7280); background: #f3f4f6; border-radius: 6px; padding: .3rem .5rem; font-size: .8125rem; }
.actions-cell { text-align: right; width: 70px; }
.state-cell { white-space: normal; }
.error-state { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 1rem; padding: 2rem 0; }
.empty-illustration { width: 200px; max-width: 100%; }
.empty-illustration :deep(svg) { width: 100%; height: auto; }
.sr-only { position: absolute; width: 1px; height: 1px; padding: 0; overflow: hidden; clip: rect(0,0,0,0); white-space: nowrap; border: 0; }
@media (max-width: 768px) {
  .patient-filters { grid-template-columns: minmax(0, 1fr) auto; gap: .5rem; }
  .filter-toggle { display: inline-flex; height: 44px; }
  .advanced-filters { display: grid; grid-column: 1 / -1; grid-template-rows: 0fr; opacity: 0; transition: grid-template-rows 200ms ease, opacity 200ms ease; }
  .advanced-inner { display: grid; min-height: 0; overflow: hidden; gap: .5rem; }
  .filters-open .advanced-filters { grid-template-rows: 1fr; opacity: 1; }
  .patients-list-page > :deep(.app-table-list-container) { background: transparent; }
  .patients-list-page :deep(.filters-header) { padding: 0 0 .75rem; background: transparent; border: 0; }
  .patients-list-page :deep(.pagination-container) { background: transparent; padding: .5rem 0 0; min-height: 44px; border: 0; }
  .patients-list-page :deep(.pagination-container .summary-text),
  .patients-list-page :deep(.pagination-container [aria-label='Primeira página']),
  .patients-list-page :deep(.pagination-container [aria-label='Última página']) { display: none; }
  .table-container { display: none; }
  .mobile-cards { display: flex; flex: 1; min-height: 0; flex-direction: column; gap: .75rem; overflow-y: auto; scrollbar-gutter: stable; padding: 2px 8px 2px 2px; background: transparent; }
  .select-page { display: flex; flex-shrink: 0; align-items: center; gap: .625rem; padding: 5px 4px 10px; font-size: .75rem; color: #64748b; }
  .add-patient-btn { width: 40px; padding: 0; }
  .add-patient-btn span { display: none; }
  .card-skeleton { padding: 1rem; border: 1px solid #e5e7eb; border-radius: 12px; display: flex; flex-direction: column; gap: 1rem; }
  .patient-filters :deep(label) { font-size: .75rem; }
  .page-header { align-items: center; flex-wrap: nowrap; gap: .75rem; }
  .header-actions { flex-shrink: 0; }
  .title { font-size: 1.5rem; }
  .subtitle { font-size: .8125rem; }
  th, td { padding: .875rem 1rem; }
  .selection-cell { padding-right: .5rem; }
}
@media (prefers-reduced-motion: reduce) { .advanced-filters, .appointment-link { transition: none; } }
@media (min-width: 769px) and (max-width: 1200px) {
  .patient-filters { grid-template-columns: repeat(3, minmax(0, 1fr)); }
  .search-field { grid-column: span 2; }
}
</style>
