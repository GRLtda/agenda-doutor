<script setup>
import { computed, nextTick, onMounted, ref } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useToast } from 'vue-toastification'
import { listUnits, saveUnit, deleteUnit, formatUnitAddress } from '@/api/units'
import FormInput from '@/components/global/FormInput.vue'
import AppButton from '@/components/global/AppButton.vue'
import AppTableList from '@/components/global/AppTableList.vue'
import Switch from '@/components/global/Switch.vue'
import AppSkeleton from '@/components/global/AppSkeleton.vue'
import { fetchAddressByCEP } from '@/api/external'
import { Trash2, Plus, Pencil, Star, Save, MapPin } from 'lucide-vue-next'

const auth = useAuthStore()
const toast = useToast()
const canManage = computed(() => ['owner', 'medico'].includes(auth.user?.role))
const units = ref([])
const loading = ref(true)
const cepLoading = ref(false)
const cepMessage = ref('')
let cepRequest = 0
const saving = ref(false)
const loadError = ref('')
const formError = ref('')
const errors = ref({})
const form = ref(null)
const formElement = ref(null)
const legacyAddress = ref(null)
const labels = { cep: 'CEP', street: 'Rua', number: 'Número', district: 'Bairro', complement: 'Complemento', city: 'Cidade', state: 'UF' }
const limits = { cep: 9, street: 150, number: 20, district: 100, complement: 150, city: 100, state: 2 }

async function load() {
  loading.value = true
  loadError.value = ''
  try {
    const { data } = await listUnits()
    units.value = data.units
    legacyAddress.value = data.legacyAddress
  } catch { loadError.value = 'Não foi possível carregar os endereços. Tente novamente.' }
  finally { loading.value = false }
}
async function edit(unit) {
  cepRequest++; cepLoading.value = false; cepMessage.value = ''
  errors.value = {}; formError.value = ''
  form.value = {
    id: unit?._id || null, name: unit?.name || '', isDefault: unit?.isDefault || !units.value.length,
    address: Object.fromEntries(Object.keys(labels).map(key => [key, unit?.address?.[key] || (!units.value.length ? legacyAddress.value?.[key] : '') || ''])),
  }
  await nextTick()
  formElement.value?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  formElement.value?.querySelector('input')?.focus({ preventScroll: true })
}
function clearError(field) { delete errors.value[field]; formError.value = '' }
async function updateAddress(key) {
  clearError('address.' + key)
  if (key !== 'cep') return
  const request = ++cepRequest
  const currentForm = form.value
  const cep = currentForm.address.cep.replace(/\D/g, '')
  cepMessage.value = ''; cepLoading.value = false
  if (cep.length !== 8) return
  const before = { ...currentForm.address }
  cepLoading.value = true
  try {
    const address = await fetchAddressByCEP(cep)
    if (request !== cepRequest || form.value !== currentForm) return
    if (!address) {
      cepMessage.value = 'Não foi possível consultar este CEP. Tente novamente ou preencha o endereço manualmente.'
      return
    }
    for (const [field, value] of Object.entries({ street: address.street, district: address.neighborhood, city: address.city, state: address.state })) {
      if (value && currentForm.address[field] === before[field]) {
        currentForm.address[field] = value
        clearError('address.' + field)
      }
    }
  } finally {
    if (request === cepRequest) cepLoading.value = false
  }
}
async function focusError() {
  await nextTick()
  formElement.value?.querySelector('.has-error input, input.has-error, [aria-invalid="true"], .form-error')?.focus()
}
function validate() {
  errors.value = {}
  if (!form.value.name.trim()) errors.value.name = 'Nome é obrigatório.'
  else if (form.value.name.trim().length > 100) errors.value.name = 'Nome deve ter no máximo 100 caracteres.'
  for (const [key, label] of Object.entries(labels)) {
    const value = form.value.address[key].trim()
    if (key !== 'complement' && !value) errors.value[`address.${key}`] = `${label} é obrigatório.`
    else if (value.length > limits[key]) errors.value[`address.${key}`] = `${label} deve ter no máximo ${limits[key]} caracteres.`
  }
  if (!/^\d{5}-?\d{3}$/.test(form.value.address.cep.trim())) errors.value['address.cep'] = 'Informe um CEP com 8 dígitos.'
  if (!'AC AL AP AM BA CE DF ES GO MA MT MS MG PA PB PR PE PI RJ RN RS RO RR SC SP SE TO'.split(' ').includes(form.value.address.state.trim().toUpperCase())) errors.value['address.state'] = 'Informe uma UF válida.'
  return !Object.keys(errors.value).length
}
async function submit() {
  if (saving.value) return
  formError.value = ''
  if (!validate()) { await focusError(); return }
  saving.value = true
  try {
    await saveUnit(form.value.id, { name: form.value.name, address: form.value.address, isDefault: form.value.isDefault })
    form.value = null
    toast.success('Endereço salvo com sucesso.')
    await load()
    await auth.fetchUser()
  } catch (error) {
    errors.value = error.response?.data?.fields || {}
    if (!Object.keys(errors.value).length || errors.value.form) formError.value = errors.value.form || error.response?.data?.message || 'Não foi possível salvar. Tente novamente.'
    await focusError()
  } finally { saving.value = false }
}
async function makeDefault(unit) {
  if (saving.value) return
  saving.value = true; loadError.value = ''
  try {
    await saveUnit(unit._id, { name: unit.name, address: unit.address, isDefault: true })
    await load()
    await auth.fetchUser()
    toast.success('Endereço padrão atualizado.')
  } catch (error) {
    if (error.response?.data?.fields) { await edit(unit); errors.value = error.response.data.fields; await focusError() }
    else loadError.value = error.response?.data?.message || 'Não foi possível definir o padrão. Tente novamente.'
  } finally { saving.value = false }
}
const truncate = (value, limit) => value.length > limit ? value.slice(0, limit - 3) + '...' : value
async function remove(unit) {
  if (saving.value || !window.confirm('Excluir o endereço ' + unit.name + '? Atendimentos existentes manterão o vínculo.')) return
  saving.value = true; loadError.value = ''
  try {
    await deleteUnit(unit._id)
    if (form.value?.id === unit._id) form.value = null
    await load()
    toast.success('Endereço excluído.')
  } catch (error) { loadError.value = error.response?.data?.message || 'Não foi possível excluir o endereço. Tente novamente.' }
  finally { saving.value = false }
}
onMounted(load)
</script>

<template>
  <div class="units-settings">
    <Teleport to="#tab-actions">
      <AppButton v-if="canManage" variant="primary" :disabled="loading || saving || !!loadError" @click="edit(null)">
        <Plus :size="18" /> Adicionar endereço
      </AppButton>
    </Teleport>
    <div v-if="loading" class="units-skeleton" role="status" aria-label="Carregando endereços">
      <div v-for="row in 4" :key="row" class="skeleton-row">
        <AppSkeleton width="25%" height="20px" /><AppSkeleton width="45%" height="20px" /><AppSkeleton width="100px" height="32px" />
      </div>
    </div>
    <div v-else-if="loadError" role="alert" class="error-box">
      <span>{{ loadError }}</span>
      <AppButton variant="outline" size="sm" :disabled="loading" @click="load">Tentar novamente</AppButton>
    </div>
    <AppTableList v-else class="units-table" hide-header :is-empty="!units.length"
      empty-title="Nenhum endereço cadastrado"
      :empty-message="legacyAddress?.street ? 'O endereço atual da clínica continua sendo usado. Adicione um endereço para gerenciar os locais.' : 'Adicione o primeiro local de atendimento da clínica.'">
      <div class="table-scroll">
        <table>
          <thead><tr><th>Nome</th><th>Endereço de atendimento</th><th v-if="canManage" class="actions-heading">Ações</th></tr></thead>
          <tbody>
            <tr v-for="unit in units" :key="unit._id">
              <td><div class="unit-name"><span class="unit-name-text" :title="unit.name">{{ truncate(unit.name, 32) }}</span><span v-if="unit.isDefault" class="default-badge"><Star :size="12" /> Padrão</span></div></td>
              <td class="unit-address"><span class="unit-address-text" :title="formatUnitAddress(unit.address)">{{ truncate(formatUnitAddress(unit.address), 80) }}</span></td>
              <td v-if="canManage"><div class="actions row-actions">
                <AppButton variant="outline" size="sm" :disabled="saving" @click="edit(unit)"><Pencil :size="14" /> Editar</AppButton>
                <AppButton v-if="!unit.isDefault" variant="outline" size="sm" :disabled="saving" @click="makeDefault(unit)"><Star :size="14" /> Definir padrão</AppButton>
                <AppButton variant="outline" size="sm" :disabled="saving" @click="remove(unit)"><Trash2 :size="14" /> Excluir</AppButton>
              </div></td>
            </tr>
          </tbody>
        </table>
      </div>
    </AppTableList>
    <form v-if="form && canManage" ref="formElement" class="unit-form" novalidate @submit.prevent="submit">
      <div class="form-heading"><div class="form-icon"><MapPin :size="20" /></div><div>
        <h3>{{ form.id ? 'Editar endereço' : 'Novo endereço' }}</h3>
        <p>Este endereço será usado nos próximos envios dos atendimentos vinculados.</p>
      </div></div>
      <div v-if="formError" class="error-box form-error" role="alert" tabindex="-1">{{ formError }}</div>
      <FormInput v-model="form.name" label="Nome do endereço" placeholder="Ex.: Consultório Centro" :error="errors.name" required :disabled="saving" @update:model-value="clearError('name')" />
      <div class="address-fields">
        <div v-for="(label, key) in labels" :key="key" :class="'field-' + key">
          <div v-if="cepLoading && ['street', 'district', 'city', 'state'].includes(key)" class="loading-field" aria-busy="true" :aria-label="'Consultando ' + label">
            <span class="loading-field-label">{{ label }} <span class="required-mark">*</span></span>
            <AppSkeleton height="46px" border-radius="0.75rem" />
          </div>
          <FormInput v-else v-model="form.address[key]" :label="label" :required="key !== 'complement'" :error="errors['address.' + key]" :cep-mask="key === 'cep'" :disabled="saving" :placeholder="key === 'number' ? 'Ex.: 120 ou s/n' : key === 'state' ? 'Ex.: SP' : ''" @update:model-value="updateAddress(key)" />
        </div>
      </div>
      <div v-if="cepMessage" class="cep-status" role="status">
        <span>{{ cepMessage }}</span>
        <AppButton v-if="cepMessage" variant="outline" size="sm" :disabled="saving" @click="updateAddress('cep')">Consultar novamente</AppButton>
      </div>
      <div class="default-option">
        <Switch v-model="form.isDefault" label="Usar como endereço padrão" :disabled="saving || units.find(unit => unit._id === form.id)?.isDefault || !units.length" />
        <p>Pré-selecionada ao criar novos agendamentos.</p>
      </div>
      <div class="actions form-actions">
        <AppButton variant="outline" :disabled="saving" @click="form = null">Cancelar</AppButton>
        <AppButton variant="primary" type="submit" :loading="saving" :disabled="saving"><Save :size="16" /> Salvar endereço</AppButton>
      </div>
    </form>
  </div>
</template>

<style scoped>
.unit-name-text { max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.unit-address-text { display: block; max-width: 320px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.loading-field { margin-bottom: 1.25rem; }
.loading-field-label { display: block; margin-bottom: .5rem; font-size: .875rem; font-weight: 500; }
.required-mark { color: #ef4444; }
.units-skeleton { border: 1px solid #e5e7eb; border-radius: 1rem; overflow: hidden; }
.skeleton-row { display: flex; align-items: center; justify-content: space-between; gap: 1rem; padding: 1rem; border-bottom: 1px solid #e5e7eb; }
.cep-status { display: flex; align-items: center; flex-wrap: wrap; gap: .75rem; font-size: .8125rem; color: #6b7280; }
.units-settings { display: grid; gap: 1.25rem; min-width: 0; color: #111827; }
.units-toolbar { display: flex; align-items: center; justify-content: space-between; gap: 1rem; }
p { margin: 0; font-size: .8125rem; line-height: 1.5; color: #6b7280; }
.units-table { height: auto; }
.table-scroll { overflow-x: auto; }
table { width: 100%; border-collapse: collapse; font-size: .875rem; }
th, td { padding: 1rem; text-align: left; border-bottom: 1px solid #e5e7eb; vertical-align: middle; }
th { background: #f9fafb; color: #6b7280; font-weight: 500; font-size: .75rem; }
tr:last-child td { border-bottom: 0; }
.unit-name { display: flex; flex-wrap: wrap; align-items: center; gap: .5rem; font-weight: 600; }
.unit-address { color: #6b7280; line-height: 1.6; min-width: 200px; overflow-wrap: anywhere; }
.default-badge { display: inline-flex; align-items: center; gap: .25rem; padding: .25rem .5rem; border-radius: .375rem; background: #eef2ff; color: var(--azul-principal); font-size: .6875rem; font-weight: 500; }
.actions { display: flex; gap: .5rem; align-items: center; }
.row-actions { justify-content: flex-end; flex-wrap: wrap; }
.actions-heading { text-align: right; }
.unit-form { display: grid; gap: 1rem; padding: 1.5rem; border: 1px solid #e5e7eb; border-radius: 1rem; background: white; }
.form-heading { display: flex; align-items: center; gap: .75rem; margin-bottom: .25rem; }
.form-heading h3 { margin: 0 0 .25rem; font-size: 1rem; font-weight: 600; }
.form-icon { display: grid; place-items: center; width: 40px; height: 40px; flex-shrink: 0; border-radius: .75rem; background: #eef2ff; color: var(--azul-principal); }
.address-fields { display: grid; grid-template-columns: repeat(6, minmax(0, 1fr)); column-gap: 1rem; }
.field-cep, .field-number { grid-column: span 2; }
.field-street, .field-complement { grid-column: span 4; }
.field-district, .field-city { grid-column: span 2; }
.field-state { grid-column: span 2; }
.default-option { padding: 1rem; border: 1px solid #e5e7eb; border-radius: .75rem; background: #f9fafb; }
.default-option p { margin: .375rem 0 0 68px; }
.form-actions { justify-content: flex-end; padding-top: 1rem; border-top: 1px solid #e5e7eb; }
.error-box { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: .75rem; padding: 1rem; color: #b42318; background: #fff1f0; border: 1px solid #fecaca; border-radius: .75rem; font-size: .875rem; }
@media (max-width: 640px) {
  .units-toolbar { align-items: stretch; flex-direction: column; }
  .unit-form { padding: 1rem; }
  .address-fields { grid-template-columns: 1fr; }
  .address-fields > * { grid-column: auto; }
  .form-actions { flex-wrap: wrap; }
}
</style>
