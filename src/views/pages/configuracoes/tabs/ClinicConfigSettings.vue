<script setup>
import { ref, watch, computed, nextTick } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useClinicStore } from '@/stores/clinic'
import { useToast } from 'vue-toastification'
import { Settings, Save, AlertCircle, ShieldAlert, Clock, PowerOff, Activity, DollarSign } from 'lucide-vue-next'
import StyledSelect from '@/components/global/StyledSelect.vue'
import AppButton from '@/components/global/AppButton.vue'
import Switch from '@/components/global/Switch.vue'
import { onBeforeRouteLeave } from 'vue-router'

const authStore = useAuthStore()
const clinicStore = useClinicStore()
const toast = useToast()

const isDataLoaded = ref(false)

const clinicData = ref({
  config: {
    cancellationReason: 'desativado',
    showCheckoutStockExpense: true,
    autoStatus: {
      timeInMinutes: 120,
      targetStatus: 'Não Compareceu'
    }
  }
})

const originalClinicData = ref(null)

const cancellationOptions = [
  { value: 'obrigatorio', label: 'Obrigatório' },
  { value: 'opcional', label: 'Opcional' },
  { value: 'desativado', label: 'Desativado' }
]

const autoStatusTimeOptions = [
  { value: 30, label: '30 minutos' },
  { value: 60, label: '1 hora' },
  { value: 120, label: '2 horas' },
  { value: 240, label: '4 horas' },
  { value: 720, label: '12 horas' },
  { value: 1440, label: '24 horas' }
]

const autoStatusTargetOptions = [
  { value: 'Não Compareceu', label: 'Não Compareceu' },
  { value: 'Cancelado', label: 'Cancelado' },
  { value: 'Desativado', label: 'Desativado' }
]

watch(
  () => authStore.user?.clinic,
  async (clinic) => {
    if (clinic) {
      isDataLoaded.value = false

      const configObj = clinic.config || {}
      
      const clinicWithDefaults = {
        config: {
            ...configObj,
            cancellationReason: configObj.cancellationReason || 'desativado',
            showCheckoutStockExpense: configObj.showCheckoutStockExpense !== false,
            autoStatus: configObj.autoStatus || {
              timeInMinutes: 120,
              targetStatus: 'Não Compareceu'
            }
        }
      }

      originalClinicData.value = JSON.parse(JSON.stringify(clinicWithDefaults))
      clinicData.value = JSON.parse(JSON.stringify(clinicWithDefaults))

      await nextTick()
      isDataLoaded.value = true
    } else if (!authStore.isLoading) {
      isDataLoaded.value = true
    }
  },
  { immediate: true, deep: true },
)

async function handleUpdate() {
  const savingToast = toast.info('Salvando configurações...', { timeout: false })

  const payload = JSON.parse(JSON.stringify(clinicData.value))

  const { success: updateSuccess } = await clinicStore.updateClinicDetails(payload)

  toast.dismiss(savingToast)

  if (updateSuccess) {
    toast.success('Configurações da clínica salvas com sucesso!')
    clinicData.value = JSON.parse(JSON.stringify(payload))
    originalClinicData.value = JSON.parse(JSON.stringify(payload))
  } else {
    toast.error('Erro ao salvar as configurações da clínica.')
  }
}

const hasUnsavedChanges = computed(() => {
    if (!originalClinicData.value || !clinicData.value) return false;
    return JSON.stringify(originalClinicData.value) !== JSON.stringify(clinicData.value);
});

const handleCancel = () => {
    if (originalClinicData.value) {
        clinicData.value = JSON.parse(JSON.stringify(originalClinicData.value))
        toast.info('Alterações descartadas.')
    }
}

onBeforeRouteLeave((to, from, next) => {
    if (hasUnsavedChanges.value) {
        const confirmation = window.confirm(
            'Você tem alterações não salvas. Deseja realmente sair sem salvar?'
        );
        if (confirmation) {
            next();
        } else {
            next(false);
        }
    } else {
        next();
    }
});
</script>

<template>
  <div class="config-settings">
    <form v-if="isDataLoaded" @submit.prevent="handleUpdate">
      <div class="settings-grid">
        <section class="settings-section">
          <div class="preferences-content">            <div class="preference-item">
              <div class="preference-info">
                <div class="preference-label">
                  <ShieldAlert :size="18" class="label-icon" />
                  <h4>Motivo de Cancelamento</h4>
                </div>
                <p>Define se é necessário informar um motivo ao cancelar agendamentos.</p>
              </div>
              
              <div class="preference-input">
                <StyledSelect
                  v-model="clinicData.config.cancellationReason"
                  :options="cancellationOptions"
                  placeholder="Selecione o comportamento"
                />
              </div>
            </div>            <div class="preference-item">
              <div class="preference-info">
                <div class="preference-label">
                  <DollarSign :size="18" class="label-icon" />
                  <h4>Despesa de Produtos no Checkout</h4>
                </div>
                <p>Mostra o total de despesa com produtos no resumo do checkout do atendimento.</p>
              </div>

              <div class="preference-input">
                <Switch v-model="clinicData.config.showCheckoutStockExpense" />
              </div>
            </div>
            <div class="preference-item">
              <div class="preference-info">
                <div class="preference-label">
                  <PowerOff :size="18" class="label-icon" />
                  <h4>Status Automático de Atraso</h4>
                </div>
                <p>Muda o status do agendamento automaticamente caso o horário passe e ele continue como "Agendado".</p>
              </div>
              
              <div class="preference-input auto-status-inputs">
                

                <div class="time-select-wrap" v-if="clinicData.config.autoStatus.targetStatus !== 'Desativado'">
                  <StyledSelect
                    v-model="clinicData.config.autoStatus.timeInMinutes"
                    :options="autoStatusTimeOptions"
                    placeholder="Selecione o tempo"
                  >
                    <template #prefix>
                      <div class="prefix-slot">
                        <Clock :size="14" />
                        <span>Tolerância:</span>
                      </div>
                    </template>
                  </StyledSelect>
                </div>

                <div class="status-select-wrap">
                  <StyledSelect
                    v-model="clinicData.config.autoStatus.targetStatus"
                    :options="autoStatusTargetOptions"
                    placeholder="Qual status aplicar?"
                  >
                    <template #prefix>
                      <div class="prefix-slot">
                        <Activity :size="14" />
                        <span>Ação:</span>
                      </div>
                    </template>
                  </StyledSelect>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>

      <!-- Footer Actions -->
      <div class="footer-actions">
        <span v-if="hasUnsavedChanges" class="unsaved-indicator">
          <span class="dot"></span>
          Alterações não salvas
        </span>
        <AppButton 
          v-if="hasUnsavedChanges" 
          type="button" 
          variant="default" 
          @click="handleCancel"
        >
          Cancelar
        </AppButton>
        <AppButton type="submit" variant="primary" class="save-btn" :disabled="!hasUnsavedChanges">
          <Save :size="18" />
          Salvar Alterações
        </AppButton>
      </div>
    </form>

    <!-- Loading State -->
    <div v-else class="loading-state">
      <div class="spinner"></div>
      <p>Carregando configurações...</p>
    </div>
  </div>
</template>

<style scoped>
.config-settings {
  width: 100%;
}

.settings-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 1.5rem;
}

.preferences-content {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.preference-item {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 1.25rem 1.5rem;
  border: 1px solid #e5e7eb;
  border-radius: 0.75rem;
  background-color: #ffffff;
  transition: box-shadow 0.2s;
}

.preference-item:hover {
    transition: border 0.3s ease-in-out;
    border: 1px solid #004be23a;
}

.preference-info {
  flex: 1;
  padding-right: 2rem;
}

.preference-label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.25rem;
}

.label-icon {
  color: #3b82f6;
}

.preference-info h4 {
  font-size: 0.95rem;
  font-weight: 500;
  color: #111827;
  margin: 0;
}

.preference-info p {
  font-size: 0.85rem;
  color: #6b7280;
  margin: 0;
}

.preference-input {
  width: 250px;
  flex-shrink: 0;
}

.auto-status-inputs {
  display: flex;
  flex-direction: row;
  align-items: center;
  flex-wrap: wrap;
  gap: 1rem;
  width: auto;
}

.status-select-wrap {
  width: 250px;
}

.time-select-wrap {
  width: 280px;
}

.prefix-slot {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  color: #6b7280;
  margin-right: 0.5rem;
  font-size: 0.85rem;
  font-weight: 500;
  white-space: nowrap;
}

/* Footer Actions */
.footer-actions {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 1.5rem;
  margin-top: 1.5rem;
  padding-top: 1.5rem;
  border-top: 1px solid #e5e7eb;
}

.unsaved-indicator {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
  color: #f59e0b;
  font-weight: 500;
}

.unsaved-indicator .dot {
  width: 8px;
  height: 8px;
  background: #f59e0b;
  border-radius: 50%;
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.save-btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

/* Loading */
.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 4rem;
  gap: 1rem;
  color: #6b7280;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 3px solid #e5e7eb;
  border-top-color: var(--azul-principal);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* Responsividade */
@media (max-width: 768px) {
  .preference-item {
    flex-direction: column;
    gap: 1rem;
  }
  
  .preference-info {
    padding-right: 0;
  }
  
  .preference-input {
    width: 100%;
  }

  .auto-status-inputs {
    width: 100%;
  }

  .status-select-wrap,
  .time-select-wrap {
    width: 100%;
  }

  .footer-actions {
    flex-direction: column-reverse;
    align-items: stretch;
  }

  .unsaved-indicator {
    justify-content: center;
  }
}
</style>
