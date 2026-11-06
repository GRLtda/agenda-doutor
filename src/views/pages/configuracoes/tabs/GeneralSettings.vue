<script setup>
import { ref, watch, nextTick, computed } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useClinicStore } from '@/stores/clinic'
import { useToast } from 'vue-toastification'
import { UploadCloud, Building, MapPin, Save, ArrowRight } from 'lucide-vue-next'
import FormInput from '@/components/global/FormInput.vue'
import AppButton from '@/components/global/AppButton.vue'
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

  // Snapshot dos dados do formulário para evitar que o watcher (ativado pelo uploadLogo -> fetchUser)
  // sobrescreva as mudanças de texto com os dados antigos do banco.
  const payload = JSON.parse(JSON.stringify(clinicData.value))
  delete payload.address

  if (selectedLogoFile.value) {
    const formData = new FormData()
    formData.append('image', selectedLogoFile.value)

    const { success, data } = await clinicStore.uploadLogo(formData)

    if (success) {
      // Atualizamos o payload com a nova URL
      payload.logoUrl = data.logoUrl
      
      // Também atualizamos o reactive para a UI refletir (mesmo que o watcher possa brigar depois)
      clinicData.value.logoUrl = data.logoUrl
    } else {
      toast.dismiss(savingToast)
      toast.error('Falha ao enviar o novo logo. Nenhuma alteração foi salva.')
      return
    }
  }

  // Envia o payload que contém os dados digitados PELO USUÁRIO (+ nova logo),
  // ignorando qualquer reset que o watcher tenha feito nesse meio tempo.
  const { success: updateSuccess } = await clinicStore.updateClinicDetails(payload)

  toast.dismiss(savingToast)

  if (updateSuccess) {
    toast.success('Informações da clínica salvas com sucesso!')
    selectedLogoFile.value = null
    // Sincroniza tudo com o sucesso
    clinicData.value = JSON.parse(JSON.stringify(payload))
    originalClinicData.value = JSON.parse(JSON.stringify(payload))
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

      <div class="settings-grid">

        <section class="settings-section">
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


      </div>

      <aside class="units-callout">
        <div class="section-icon"><MapPin :size="20" /></div>
        <div class="callout-copy">
          <h3>Endereços de atendimento</h3>
          <p>Cadastre os endereços e escolha o local padrão dos agendamentos.</p>
        </div>
        <AppButton variant="outline" size="sm" :to="{ query: { ...$route.query, tab: 'unidades' } }">
          Gerenciar endereços <ArrowRight :size="16" />
        </AppButton>
      </aside>

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
      <p>Carregando dados da clínica...</p>
    </div>
  </div>
</template>

<style scoped>
.general-settings { width: 100%; min-width: 0; }
.settings-grid { display: grid; gap: 1.5rem; }
.settings-section { padding: 1.25rem; border: 1px solid #e5e7eb; border-radius: 1rem; background: #f9fafb; }
.identity-content { display: grid; grid-template-columns: 180px minmax(0, 1fr); gap: 2rem; align-items: start; }
.logo-area { display: flex; flex-direction: column; align-items: center; gap: .75rem; padding: 0; }
.logo-label { font-size: .875rem; font-weight: 500; color: #374151; }
.logo-container { width: 96px; height: 96px; border: 1px solid #e5e7eb; border-radius: .75rem; overflow: hidden; background: white; }
.logo-image { width: 100%; height: 100%; object-fit: contain; }
.logo-placeholder { display: grid; place-items: center; height: 100%; color: #9ca3af; }
.logo-hint { font-size: .75rem; color: #6b7280; text-align: center; }
.identity-fields { display: grid; gap: .5rem; min-width: 0; padding-top: .25rem; }
.units-callout { display: flex; gap: 1rem; align-items: center; margin-top: 1.5rem; padding: 1.25rem; border: 1px solid #e5e7eb; border-radius: 1rem; background: #f9fafb; }
.section-icon { width: 40px; height: 40px; display: grid; place-items: center; border-radius: .75rem; color: var(--azul-principal); background: #eef2ff; flex-shrink: 0; }
.callout-copy { flex: 1; min-width: 0; }
.callout-copy h3 { margin: 0 0 .25rem; font-size: .875rem; font-weight: 600; color: #111827; }
.callout-copy p { margin: 0; font-size: .8125rem; line-height: 1.5; color: #6b7280; }
.footer-actions { display: flex; align-items: center; justify-content: flex-end; flex-wrap: wrap; gap: .75rem; margin-top: 1.5rem; padding-top: 1.25rem; border-top: 1px solid #e5e7eb; }
.unsaved-indicator { display: flex; align-items: center; gap: .5rem; margin-right: auto; font-size: .8125rem; color: #6b7280; }
.dot { width: 6px; height: 6px; border-radius: 50%; background: #f59e0b; }
.loading-state { padding: 2rem; text-align: center; color: #6b7280; }
@media (max-width: 640px) {
  .identity-content { grid-template-columns: 1fr; gap: 1.25rem; }
  .logo-area { justify-self: start; }
  .units-callout { flex-wrap: wrap; }
  .callout-copy { flex-basis: calc(100% - 56px); }
  .units-callout > :last-child { width: 100%; }
  .footer-actions > .unsaved-indicator { flex-basis: 100%; }
}
</style>
