<script setup>
import { ref, watch, nextTick, computed } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useClinicStore } from '@/stores/clinic'
import { useToast } from 'vue-toastification'
import { UploadCloud, Building, MapPin, Save } from 'lucide-vue-next'
import FormInput from '@/components/global/FormInput.vue'
import AppButton from '@/components/global/AppButton.vue'
import { fetchAddressByCEP } from '@/api/external'
import { onBeforeRouteLeave } from 'vue-router'

const authStore = useAuthStore()
const clinicStore = useClinicStore()
const toast = useToast()

const isDataLoaded = ref(false)
const logoInput = ref(null)
const selectedLogoFile = ref(null)
const logoPreviewUrl = ref('')

const clinicData = ref({
  name: '',
  cnpj: '',
  logoUrl: '',
  address: {
    cep: '',
    city: '',
    state: '',
    street: '',
    number: '',
    district: '',
    complement: '',
  },
})

const originalClinicData = ref(null)

watch(
  () => authStore.user?.clinic,
  async (clinic) => {
    if (clinic) {
      isDataLoaded.value = false

      const clinicWithDefaults = {
          ...clinic,
          address: {
              ...clinic.address,
              complement: clinic.address?.complement || '',
          }
      }

      originalClinicData.value = JSON.parse(JSON.stringify(clinicWithDefaults))

      clinicData.value = JSON.parse(JSON.stringify(clinicWithDefaults))
      logoPreviewUrl.value = clinic.logoUrl || ''
      await nextTick()
      isDataLoaded.value = true
    } else if (!authStore.isLoading) {
      isDataLoaded.value = true
    }
  },
  { immediate: true, deep: true },
)

watch(
  () => clinicData.value.address.cep,
  async (newCep) => {
    const currentComplement = clinicData.value.address.complement;

    const numericCep = newCep.replace(/\D/g, '')
    if (numericCep.length === 8) {
      const address = await fetchAddressByCEP(numericCep)
      if (address) {
        clinicData.value.address.street = address.street
        clinicData.value.address.district = address.neighborhood
        clinicData.value.address.city = address.city
        clinicData.value.address.state = address.state
        clinicData.value.address.complement = currentComplement;
      }
    }
  },
)


function handleFileSelect(event) {
  const file = event.target.files[0]
  if (!file) {
    return
  }
  selectedLogoFile.value = file
  logoPreviewUrl.value = URL.createObjectURL(file)
}

async function handleUpdate() {
  const savingToast = toast.info('Salvando alterações...', { timeout: false })

  if (selectedLogoFile.value) {
    const formData = new FormData()
    formData.append('image', selectedLogoFile.value)

    const { success, data } = await clinicStore.uploadLogo(formData)

    if (success) {
      clinicData.value.logoUrl = data.logoUrl
    } else {
      toast.dismiss(savingToast)
      toast.error('Falha ao enviar o novo logo. Nenhuma alteração foi salva.')
      return
    }
  }

  const { success: updateSuccess } = await clinicStore.updateClinicDetails(clinicData.value)

  toast.dismiss(savingToast)

  if (updateSuccess) {
    toast.success('Informações da clínica salvas com sucesso!')
    selectedLogoFile.value = null
    originalClinicData.value = JSON.parse(JSON.stringify(clinicData.value))
  } else {
    toast.error('Erro ao salvar as informações da clínica.')
  }
}

const hasUnsavedChanges = computed(() => {
    if (!originalClinicData.value || !clinicData.value) return false;

    return JSON.stringify(originalClinicData.value) !== JSON.stringify(clinicData.value);
});

const handleCancel = () => {
    if (originalClinicData.value) {
        clinicData.value = JSON.parse(JSON.stringify(originalClinicData.value))
        selectedLogoFile.value = null
        logoPreviewUrl.value = clinicData.value.logoUrl
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
  <div class="general-settings">
    <form v-if="isDataLoaded" @submit.prevent="handleUpdate">
      <!-- Grid de duas colunas -->
      <div class="settings-grid">
        <!-- Coluna: Identidade da Clínica -->
        <section class="settings-section">
          <div class="section-header">
            <div class="section-icon">
              <Building :size="20" />
            </div>
            <div class="section-title">
              <h3>Identidade da Clínica</h3>
              <p>Logo e informações principais</p>
            </div>
          </div>

          <div class="identity-content">
            <!-- Logo Uploader -->
            <div class="logo-area">
              <span class="logo-label">Logo</span>
              <div class="logo-container">
                <img
                  v-if="logoPreviewUrl"
                  :src="logoPreviewUrl"
                  alt="Logo da Clínica"
                  class="logo-image"
                />
                <div v-else class="logo-placeholder">
                  <Building :size="32" />
                </div>
              </div>
              <input
                type="file"
                @change="handleFileSelect"
                accept="image/png, image/jpeg"
                ref="logoInput"
                hidden
              />
              <AppButton 
                type="button" 
                variant="outline" 
                size="sm"
                @click="logoInput.click()" 
                class="upload-btn"
              >
                <UploadCloud :size="16" />
                <span>Alterar logo</span>
              </AppButton>
              <span class="logo-hint">PNG ou JPG, máx 2MB</span>
            </div>

            <!-- Campos de Texto -->
            <div class="identity-fields">
              <FormInput 
                v-model="clinicData.name" 
                label="Nome da Clínica" 
                placeholder="Digite o nome da clínica"
                required 
              />
              <FormInput 
                v-model="clinicData.cnpj" 
                label="CNPJ" 
                placeholder="00.000.000/0000-00"
                cnpj-mask 
                required 
              />
            </div>
          </div>
        </section>

        <!-- Coluna: Endereço -->
        <section class="settings-section">
          <div class="section-header">
            <div class="section-icon">
              <MapPin :size="20" />
            </div>
            <div class="section-title">
              <h3>Endereço</h3>
              <p>Localização da clínica</p>
            </div>
          </div>

          <div class="address-grid">
            <div class="field-row field-row-cep">
              <FormInput 
                v-model="clinicData.address.cep" 
                label="CEP" 
                placeholder="00000-000"
                required 
              />
              <FormInput 
                v-model="clinicData.address.street" 
                label="Logradouro" 
                placeholder="Rua, Avenida, etc."
                required 
              />
            </div>

            <div class="field-row field-row-address">
              <FormInput 
                v-model="clinicData.address.number" 
                label="Número" 
                placeholder="123"
                required 
              />
              <FormInput
                v-model="clinicData.address.complement"
                label="Complemento"
                placeholder="Sala, Andar"
              />
              <FormInput 
                v-model="clinicData.address.district" 
                label="Bairro" 
                placeholder="Centro"
              />
              <FormInput 
                v-model="clinicData.address.state" 
                label="UF" 
                placeholder="SP"
              />
            </div>

            <div class="field-row field-row-city">
              <FormInput 
                v-model="clinicData.address.city" 
                label="Cidade" 
                placeholder="São Paulo"
              />
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
        <AppButton type="submit" variant="primary" class="save-btn" :disabled="!hasUnsavedChanges && !selectedLogoFile">
          <Save :size="18" />
          Salvar Alterações
        </AppButton>
      </div>
    </form>

    <!-- Loading State -->
    <div v-else class="loading-state">
      <div class="spinner"></div>
      <p>Carregando dados da clínica...</p>
    </div>
  </div>
</template>

<style scoped>
.general-settings {
  width: 100%;
}

/* Grid Principal */
.settings-grid {
  display: grid;
  grid-template-columns: 1fr 1.5fr;
  gap: 1.5rem;
  align-items: stretch;
}

/* Seções */
.settings-section {
  background: var(--branco);
  border-radius: 1rem;
  border: 1px solid #e5e7eb;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  padding: 1.5rem;
}

.section-header {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  margin-bottom: 1.25rem;
}

.section-icon {
  width: 36px;
  height: 36px;
  background: linear-gradient(135deg, #eef2ff 0%, #e0e7ff 100%);
  border-radius: 0.625rem;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--azul-principal);
  flex-shrink: 0;
}

.section-title h3 {
  font-size: 1rem;
  font-weight: 600;
  color: #111827;
  margin: 0 0 0.125rem 0;
}

.section-title p {
  font-size: 0.8rem;
  color: #6b7280;
  margin: 0;
}

/* Identidade da Clínica */
.identity-content {
  display: flex;
  flex-direction: row;
  gap: 1.5rem;
  align-items: flex-start;
  min-width: 0;
}

.logo-area {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
  min-width: 120px;
}

.logo-container {
  width: 80px;
  height: 80px;
  border-radius: 0.75rem;
  overflow: hidden;
  border: 2px solid #e5e7eb;
  background: #f9fafb;
  flex-shrink: 0;
}

.logo-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.logo-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #9ca3af;
  background: linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%);
}



.logo-label {
  font-size: 0.875rem;
  font-weight: 500;
  color: #374151;
}

.logo-hint {
  font-size: 0.75rem;
  color: #9ca3af;
}


.identity-fields {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
}

/* Grid de Endereço */
.address-grid {
  display: flex;
  flex-direction: column;
}

.field-row {
  display: grid;
  gap: 1rem;
}

.field-row-cep {
  grid-template-columns: 130px 1fr;
}

.field-row-address {
  grid-template-columns: 80px 1fr 1fr 60px;
}

.field-row-city {
  grid-template-columns: 200px;
}

/* Footer */
.footer-actions {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 1.5rem;
  margin-top: 1.5rem;
  padding-top: 1.5rem;
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
@media (max-width: 900px) {
  .settings-grid {
    grid-template-columns: 1fr;
  }

  .identity-content {
    flex-direction: column;
    gap: 1.5rem;
  }

  .logo-area {
    width: 100%;
    flex-shrink: 1;
  }

  .identity-fields {
    width: 100%;
  }

  .identity-fields :deep(.form-group),
  .identity-fields :deep(input) {
    width: 100% !important;
    max-width: 100% !important;
  }
}

@media (max-width: 768px) {
  .settings-section {
    padding: 1.25rem;
  }

  .identity-content {
    flex-direction: column;
    gap: 1.5rem;
  }

  .logo-area {
    flex-direction: row;
    align-items: center;
    gap: 1rem;
    flex-wrap: wrap;
    flex-shrink: 1;
    width: 100%;
  }

  .logo-label {
    width: 100%;
  }

  .field-row-cep,
  .field-row-city {
    grid-template-columns: 1fr;
  }

  .field-row-address {
    grid-template-columns: 1fr 1fr;
  }

  .identity-fields {
    width: 100%;
  }

  .identity-fields :deep(.form-group),
  .identity-fields :deep(input) {
    width: 100% !important;
    max-width: 100% !important;
  }

  .footer-actions {
    flex-direction: column-reverse;
    align-items: stretch;
  }

  .unsaved-indicator {
    justify-content: center;
  }
}

@media (max-width: 480px) {
  .settings-section {
    padding: 1rem;
  }

  .section-header {
    flex-direction: column;
    gap: 0.5rem;
  }

  .identity-content {
    gap: 1rem;
  }

  .logo-area {
    flex-direction: column;
    align-items: center;
    text-align: center;
  }

  .logo-label {
    width: auto;
  }

  .identity-fields {
    width: 100%;
  }

  .identity-fields :deep(.form-group),
  .identity-fields :deep(input) {
    width: 100% !important;
    max-width: 100% !important;
  }

  .address-grid :deep(.form-group),
  .address-grid :deep(input) {
    width: 100% !important;
    max-width: 100% !important;
  }

  .field-row-address {
    grid-template-columns: 1fr;
  }
}
</style>
