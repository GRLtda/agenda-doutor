<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useAuditStore } from '@/stores/audit'
import { useEmployeesStore } from '@/stores/employees'
import { format, formatDistanceToNowStrict } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
  Activity,
  AlertCircle,
  Box,
  Calendar,
  CalendarMinus,
  ChevronDown,
  ClipboardList,
  Clock,
  FileText,
  Package,
  User,
} from 'lucide-vue-next'
import AppTableList from '@/components/global/AppTableList.vue'
import StyledSelect from '@/components/global/StyledSelect.vue'

const auditStore = useAuditStore()
const employeesStore = useEmployeesStore()

const selectedUserId = ref(null)
const selectedEntity = ref(null)
const currentPage = ref(1)
const expandedLogId = ref(null)

const logs = computed(() => auditStore.logs)
const pagination = computed(() => auditStore.pagination)

const userOptions = computed(() => {
  const users = employeesStore.activeEmployees.map((employee) => ({
    value: employee._id,
    label: employee.name,
  }))
  return [{ value: null, label: 'Todos os usuários' }, ...users]
})

const entityOptions = computed(() => [
  { value: null, label: 'Todas as ações' },
  ...(auditStore.displayOptions.entities || []),
])

async function fetchData() {
  await auditStore.fetchLogs({
    page: currentPage.value,
    limit: 20,
    userId: selectedUserId.value || undefined,
    entity: selectedEntity.value || undefined,
  })
}

onMounted(() => {
  fetchData()
  employeesStore.fetchEmployees()
})

function handlePageChange(newPage) {
  currentPage.value = newPage
  fetchData()
}

function applyFilters() {
  currentPage.value = 1
  fetchData()
}

watch(selectedUserId, applyFilters)
watch(selectedEntity, applyFilters)

function formatDateTime(dateString) {
  if (!dateString) return ''
  return format(new Date(dateString), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })
}

function formatRelativeTime(dateString) {
  if (!dateString) return ''
  const date = new Date(dateString)
  const distance = formatDistanceToNowStrict(date, { locale: ptBR, addSuffix: true })

  if (new Date().getTime() - date.getTime() > 7 * 24 * 60 * 60 * 1000) {
    return format(date, 'dd/MM/yyyy', { locale: ptBR })
  }
  return distance
}

function getEntityIcon(entity) {
  if (entity === 'Appointment') return Calendar
  if (entity === 'ScheduleBlock') return CalendarMinus
  if (entity === 'Patient') return User
  if (entity === 'Clinic') return FileText
  if (entity === 'ProdutoCatalogo') return Package
  if (entity === 'Lote') return Box
  if (entity === 'KitProcedimento') return ClipboardList
  if (entity === 'Movimentacao') return Activity
  return Clock
}

function hasChanges(log) {
  return Array.isArray(log.displayChanges) && log.displayChanges.length > 0
}

function toggleExpand(log) {
  if (!hasChanges(log)) return
  expandedLogId.value = expandedLogId.value === log._id ? null : log._id
}
</script>

<template>
  <div style="height: calc(100vh - 300px);">
    <AppTableList
      :loading="auditStore.isLoading && logs.length === 0"
      :is-empty="logs.length === 0"
      :pagination="pagination"
      @page-change="handlePageChange"
    >
      <template #filters>
        <div class="filter-group">
          <StyledSelect
            v-model="selectedUserId"
            :options="userOptions"
            :loading="employeesStore.isLoading"
          />
          <StyledSelect v-model="selectedEntity" :options="entityOptions" />
        </div>
      </template>

      <template #header-info>
        <div class="retention-info" title="O sistema mantém registros dos últimos 30 dias">
          <AlertCircle :size="14" />
          <span>Histórico de 30 dias</span>
        </div>
      </template>

      <ul class="audit-list">
        <li v-for="log in logs" :key="log._id" class="audit-item-wrapper">
          <div
            class="audit-item"
            :class="{
              'is-expandable': hasChanges(log),
              'is-expanded': expandedLogId === log._id,
            }"
            @click="toggleExpand(log)"
          >
            <div class="log-icon-wrapper">
              <component :is="getEntityIcon(log.entity)" :size="18" />
            </div>

            <div class="user-avatar-mobile">
              {{ log.user?.name?.charAt(0) || '?' }}
            </div>

            <div class="log-content">
              <div class="log-summary">{{ log.description }}</div>
              <div class="log-timestamp-mobile">
                {{ formatRelativeTime(log.createdAt) }}
              </div>

              <div class="log-header-desktop">
                <span class="user-name">{{ log.title }}</span>
              </div>
              <div class="log-details-desktop">
                <span class="entity-info">
                  {{ log.description }}
                </span>
              </div>
            </div>

            <div class="log-timestamp-desktop">
              <span class="timestamp-text">{{ formatDateTime(log.createdAt) }}</span>
              <ChevronDown
                v-if="hasChanges(log)"
                :size="16"
                class="expand-icon"
              />
            </div>
          </div>

          <Transition name="expand">
            <div v-if="expandedLogId === log._id" class="changes-details-wrapper">
              <h4 class="changes-title">Alterações:</h4>
              <ul class="changes-list">
                <li v-for="(change, index) in log.displayChanges" :key="index" class="change-item">
                  <span class="change-number">{{ String(index + 1).padStart(2, '0') }}</span>
                  <span class="change-content" :class="{ 'is-long-text': change.isLongText }">
                    <span class="change-field">{{ change.field }}</span>
                    <span v-if="change.oldValue !== null && change.oldValue !== undefined" class="change-old">
                      {{ change.oldValue }}
                    </span>
                    <span
                      v-if="
                        change.oldValue !== null &&
                        change.oldValue !== undefined &&
                        change.newValue !== null &&
                        change.newValue !== undefined
                      "
                      class="change-arrow"
                    >
                      →
                    </span>
                    <span v-if="change.newValue !== null && change.newValue !== undefined" class="change-new">
                      {{ change.newValue }}
                    </span>
                    <span class="change-description">{{ change.description }}</span>
                  </span>
                </li>
              </ul>
            </div>
          </Transition>
        </li>
      </ul>
    </AppTableList>
  </div>
</template>

<style scoped>
.filter-group {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
}
.filter-group :deep(.form-group) {
  margin-bottom: 0;
}
.filter-group :deep(.select-button) {
  background-color: var(--branco);
  border-radius: 0.5rem;
  font-size: 0.875rem;
  min-width: 180px;
  padding: 0.5rem 0.75rem;
}

.audit-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  list-style: none;
  margin: 0;
  padding: 0.5rem;
}

.audit-item-wrapper {
  background-color: var(--branco);
  border: 1px solid #e5e7eb;
  border-radius: 1rem;
  flex-shrink: 0;
  transition: box-shadow 0.2s ease;
}
.audit-item-wrapper:has(.is-expanded) {
  border-color: #d1d5db;
  box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.05);
}

.audit-item {
  align-items: flex-start;
  display: flex;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
}
.audit-item.is-expandable {
  cursor: pointer;
}
.audit-item.is-expanded {
  border-bottom: 1px solid #f3f4f6;
}
.log-icon-wrapper {
  align-items: center;
  background-color: #eef2ff;
  border-radius: 50%;
  color: var(--azul-principal);
  display: flex;
  flex-shrink: 0;
  height: 36px;
  justify-content: center;
  width: 36px;
}
.user-avatar-mobile {
  display: none;
}
.log-content {
  flex-grow: 1;
  min-width: 0;
}
.log-summary,
.log-timestamp-mobile {
  display: none;
}
.log-header-desktop {
  align-items: center;
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}
.user-name {
  color: var(--preto);
  font-size: 1rem;
  font-weight: 600;
}
.log-details-desktop {
  align-items: center;
  color: var(--cinza-texto);
  display: flex;
  flex-wrap: wrap;
  font-size: 0.8rem;
  gap: 0.5rem;
  margin-top: 0.25rem;
}
.log-timestamp-desktop {
  align-items: center;
  color: var(--cinza-texto);
  display: flex;
  flex-shrink: 0;
  font-size: 0.8rem;
  gap: 0.5rem;
  padding-top: 2px;
  white-space: nowrap;
}
.expand-icon {
  color: #9ca3af;
  transition: transform 0.3s ease;
}
.audit-item.is-expanded .expand-icon {
  transform: rotate(180deg);
}

.changes-details-wrapper {
  overflow: hidden;
  padding: 0.75rem 1rem 1rem 1rem;
}
.changes-title {
  color: var(--cinza-texto);
  font-size: 0.7rem;
  font-weight: 600;
  letter-spacing: 0.05em;
  margin-bottom: 0.75rem;
  text-transform: uppercase;
}
.changes-list {
  border-left: 2px solid #0d924d;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  list-style: none;
  padding-left: 1rem;
}
.change-item {
  align-items: baseline;
  display: flex;
  gap: 0.5rem;
}
.change-number {
  color: var(--cinza-texto);
  font-family: monospace;
  font-size: 0.8rem;
}
.change-content {
  align-items: center;
  color: #374151;
  display: flex;
  flex-wrap: wrap;
  font-size: 0.8rem;
  gap: 0.4rem;
  line-height: 1.5;
}
.change-content.is-long-text {
  align-items: stretch;
  flex-direction: column;
  gap: 0.5rem;
  width: 100%;
}
.change-field {
  font-weight: 700;
}
.change-old {
  background-color: #fef2f2;
  border-radius: 0.25rem;
  color: #c81e1e;
  padding: 0.1rem 0.3rem;
  text-decoration: line-through;
}
.change-new {
  background-color: #f0fdf4;
  border-radius: 0.25rem;
  color: #0d924d;
  padding: 0.1rem 0.3rem;
}
.change-content.is-long-text .change-old,
.change-content.is-long-text .change-new {
  display: block;
  line-height: 1.55;
  max-height: 220px;
  overflow: auto;
  padding: 0.65rem 0.75rem;
  text-decoration: none;
  white-space: pre-wrap;
  width: 100%;
}
.change-description {
  color: #6b7280;
  flex-basis: 100%;
}

.expand-enter-active {
  animation: expand-in 0.3s ease;
  overflow: hidden;
}
.expand-leave-active {
  animation: expand-in 0.3s ease reverse;
  overflow: hidden;
}
@keyframes expand-in {
  from {
    max-height: 0;
    opacity: 0;
  }
  to {
    max-height: 500px;
    opacity: 1;
  }
}

.retention-info {
  align-items: center;
  background-color: #f3f4f6;
  border-radius: 99px;
  color: #9ca3af;
  cursor: help;
  display: flex;
  font-size: 0.75rem;
  gap: 0.5rem;
  margin-left: auto;
  padding: 0.35rem 0.75rem;
}
.retention-info:hover {
  background-color: #e5e7eb;
  color: #4b5563;
}

@media (max-width: 768px) {
  .filter-group {
    flex-direction: column;
    flex-grow: 1;
    width: 100%;
  }
  .filter-group :deep(.select-button) {
    min-width: 100%;
    white-space: nowrap;
    width: 100%;
  }
  .audit-item-wrapper {
    border-left: none;
    border-radius: 0;
    border-right: none;
    border-top: none;
  }
  .audit-item-wrapper:first-child {
    border-top: 1px solid #e5e7eb;
  }
  .audit-item {
    align-items: center;
    flex-wrap: nowrap;
    gap: 0.75rem;
    padding: 1rem 0.5rem 1rem 1rem;
  }
  .log-icon-wrapper,
  .log-header-desktop,
  .log-details-desktop,
  .log-timestamp-desktop {
    display: none;
  }
  .log-summary,
  .log-timestamp-mobile {
    display: block;
  }
  .user-avatar-mobile {
    align-items: center;
    background-color: #eef2ff;
    border-radius: 50%;
    color: var(--azul-principal);
    display: flex;
    flex-shrink: 0;
    font-size: 0.875rem;
    font-weight: 600;
    height: 28px;
    justify-content: center;
    width: 28px;
  }
  .log-content {
    display: flex;
    flex-direction: column;
    flex-grow: 1;
    gap: 0.1rem;
  }
  .log-summary {
    color: var(--preto);
    font-size: 0.9rem;
    line-height: 1.4;
    word-break: break-word;
  }
  .log-timestamp-mobile {
    color: var(--cinza-texto);
    font-size: 0.8rem;
  }
  .changes-details-wrapper {
    padding: 0.5rem 1rem 1rem 1rem;
  }
  .changes-list {
    padding-left: 10px;
  }
  .retention-info {
    margin-left: 0;
    width: fit-content;
  }
}
</style>
