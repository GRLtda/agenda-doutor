<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useToast } from 'vue-toastification'
import {
  CalendarDays,
  CheckCircle2,
  LockKeyhole,
  LockKeyholeOpen,
  LoaderCircle,
  Maximize2,
  Minus,
  MousePointerClick,
  Plus,
  Save,
  Trash2,
} from 'lucide-vue-next'
import AppButton from '@/components/global/AppButton.vue'
import { useFacialPlanningsStore } from '@/stores/facialPlannings'
import { useClinicStore } from '@/stores/clinic'
import faceFemaleImage from '../../../../assets/imgs/facial-planning/face-female.png'
import faceMaleImage from '../../../../assets/imgs/facial-planning/face-male.png'

const props = defineProps({
  patientId: { type: String, required: true },
  patientGender: { type: String, default: '' },
  appointmentId: { type: String, default: null },
  recordId: { type: String, default: null },
  disabled: { type: Boolean, default: false },
})

const toast = useToast()
const planningStore = useFacialPlanningsStore()
const clinicStore = useClinicStore()

const procedureTypes = [
  {
    type: 'BOTULINUM_TOXIN',
    label: 'Toxina Botulínica',
    short: 'TX',
    unit: 'UI',
    color: '#2563eb',
    defaultQuantity: 2,
  },
  {
    type: 'FILLER',
    label: 'Preenchimento',
    short: 'PR',
    unit: 'ml',
    color: '#e11d48',
    defaultQuantity: 0.1,
  },
  {
    type: 'BIOSTIMULATOR',
    label: 'Bioestimulador',
    short: 'BE',
    unit: 'ml',
    color: '#7c3aed',
    defaultQuantity: 0.5,
  },
  {
    type: 'BIOREMODELER',
    label: 'Biorremodelador',
    short: 'BR',
    unit: 'ml',
    color: '#0891b2',
    defaultQuantity: 0.2,
  },
  {
    type: 'SKINBOOSTER',
    label: 'Skinbooster',
    short: 'SB',
    unit: 'ml',
    color: '#16a34a',
    defaultQuantity: 0.1,
  },
]

const activeType = ref(procedureTypes[0].type)
const selectedPointId = ref(null)
const activePlanningId = ref(null)
const faceImageLoadFailed = ref(false)
const faceZoom = ref(100)
const facePan = ref({ x: 0, y: 0 })
const mapInteraction = ref(null)
const ignoreNextMapClick = ref(false)
const draft = ref(createEmptyDraft())

const selectedProcedure = computed(() =>
  procedureTypes.find((item) => item.type === activeType.value) || procedureTypes[0]
)

const selectedPoint = computed(() =>
  draft.value.points.find((point) => point.localId === selectedPointId.value || point._id === selectedPointId.value)
)

const selectedPointProcedure = computed(() =>
  procedureTypes.find((item) => item.type === selectedPoint.value?.procedureType) || procedureTypes[0]
)

const isFinalized = computed(() => draft.value.status === 'FINALIZED')
const canEdit = computed(() => !props.disabled && !isFinalized.value)
const faceImageSrc = computed(() => {
  if (faceImageLoadFailed.value) return null
  return draft.value.faceVariant === 'MALE' ? faceMaleImage : faceFemaleImage
})

const totals = computed(() => {
  return procedureTypes.map((type) => {
    const points = draft.value.points.filter((point) => point.procedureType === type.type)
    const quantity = points.reduce((sum, point) => sum + Number(point.quantity || 0), 0)
    return {
      ...type,
      points: points.length,
      quantity: Number(quantity.toFixed(3)),
    }
  })
})

const quickQuantities = computed(() => {
  return selectedPoint.value?.unit === 'UI' ? [1, 2, 2.5, 3, 5] : [0.1, 0.2, 0.3, 0.5, 1]
})

const historyItems = computed(() => planningStore.plannings || [])

function createLocalId() {
  return globalThis.crypto?.randomUUID?.() || `point_${Date.now()}_${Math.random().toString(16).slice(2)}`
}

function defaultFaceVariantFromGender() {
  const gender = String(props.patientGender || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()

  if (gender.startsWith('masculino') || gender === 'm' || gender === 'male') return 'MALE'
  return 'FEMALE'
}

function createEmptyDraft() {
  return {
    title: 'Planejamento Facial HOF',
    mode: 'PLANNING',
    status: 'DRAFT',
    faceVariant: defaultFaceVariantFromGender(),
    notes: '',
    points: [],
  }
}

function normalizePlanning(planning) {
  const base = planning ? JSON.parse(JSON.stringify(planning)) : createEmptyDraft()
  return {
    ...createEmptyDraft(),
    ...base,
    faceVariant: defaultFaceVariantFromGender(),
    points: (base.points || []).map((point) => ({
      ...point,
      localId: point.localId || point._id || createLocalId(),
    })),
  }
}

function payloadFromDraft() {
  return {
    patientId: props.patientId,
    appointmentId: props.appointmentId || undefined,
    recordId: props.recordId || undefined,
    title: draft.value.title,
    mode: draft.value.mode,
    status: draft.value.status,
    faceVariant: draft.value.faceVariant,
    notes: draft.value.notes,
    points: draft.value.points.map(({ localId, _id, createdAt, updatedAt, ...point }) => point),
  }
}

async function loadPlannings() {
  await planningStore.fetchByPatient(props.patientId)

  const appointmentDraft = props.appointmentId
    ? historyItems.value.find((item) => item.appointment?._id === props.appointmentId || item.appointment === props.appointmentId)
    : null

  const first = appointmentDraft || historyItems.value[0]
  if (first) selectPlanning(first)
  else newPlanning()
}

function selectPlanning(planning) {
  activePlanningId.value = planning?._id || null
  draft.value = normalizePlanning(planning)
  selectedPointId.value = draft.value.points[0]?.localId || draft.value.points[0]?._id || null
}

function newPlanning() {
  activePlanningId.value = null
  draft.value = createEmptyDraft()
  selectedPointId.value = null
}

function inferRegion(x, y) {
  if (y < 24) return 'Frontal'
  if (y < 37 && x < 42) return 'Região periocular esquerda'
  if (y < 37 && x > 58) return 'Região periocular direita'
  if (y < 52 && x > 43 && x < 57) return 'Nariz'
  if (y < 57 && x < 42) return 'Malar esquerda'
  if (y < 57 && x > 58) return 'Malar direita'
  if (y < 68 && x > 38 && x < 62) return 'Lábios'
  if (y < 78) return 'Mandíbula'
  return 'Pescoço'
}

function addPoint(event) {
  if (!canEdit.value) return
  if (ignoreNextMapClick.value) {
    ignoreNextMapClick.value = false
    return
  }
  if (selectedPointId.value) {
    closeQuickEditor()
    return
  }
  const { x, y } = getMapCoordinates(event, event.currentTarget)
  const type = selectedProcedure.value
  const point = {
    localId: createLocalId(),
    procedureType: type.type,
    procedureLabel: type.label,
    region: inferRegion(x, y),
    x: Number(x.toFixed(2)),
    y: Number(y.toFixed(2)),
    quantity: type.defaultQuantity,
    unit: type.unit,
    product: '',
    lot: '',
    note: '',
  }

  draft.value.points.push(point)
  selectedPointId.value = point.localId
}

function closeQuickEditor() {
  selectedPointId.value = null
}

function changeFaceZoom(amount) {
  const nextZoom = Math.max(60, Math.min(180, faceZoom.value + amount))
  faceZoom.value = nextZoom
  if (nextZoom <= 100) facePan.value = { x: 0, y: 0 }
}

function resetFaceZoom() {
  faceZoom.value = 100
  facePan.value = { x: 0, y: 0 }
}

function removeSelectedPoint() {
  if (!selectedPoint.value || !canEdit.value) return
  const pointId = selectedPoint.value.localId || selectedPoint.value._id
  draft.value.points = draft.value.points.filter((point) => (point.localId || point._id) !== pointId)
  closeQuickEditor()
}

async function saveDraft() {
  if (!draft.value.points.length) {
    toast.warning('Adicione pelo menos um ponto no mapa antes de salvar.')
    return
  }

  const result = await planningStore.save(payloadFromDraft(), activePlanningId.value)
  if (result.success) {
    selectPlanning(result.data)
    toast.success('Planejamento facial salvo.')
  } else {
    toast.error(result.error)
  }
}

async function finalizePlanning() {
  if (!activePlanningId.value) {
    await saveDraft()
  }
  if (!activePlanningId.value) return

  const result = await planningStore.finalize(activePlanningId.value, payloadFromDraft())
  if (result.success) {
    selectPlanning(result.data)
    toast.success('Procedimento realizado finalizado no prontuário.')
  } else {
    toast.error(result.error)
  }
}

async function reopenPlanning() {
  if (!activePlanningId.value) {
    toast.warning('Não há planejamento salvo para reabrir.')
    return
  }
  const result = await planningStore.reopen(activePlanningId.value)
  if (result.success) {
    selectPlanning(result.data)
    toast.success('Planejamento reaberto para edição.')
  } else {
    toast.error(result.error)
  }
}

function startMapPan(event) {
  if (event.button !== 0 || faceZoom.value <= 100) return
  mapInteraction.value = {
    type: 'pan',
    startX: event.clientX,
    startY: event.clientY,
    originX: facePan.value.x,
    originY: facePan.value.y,
    moved: false,
  }
  event.currentTarget.setPointerCapture?.(event.pointerId)
}

function moveMapPan(event) {
  const interaction = mapInteraction.value
  if (!interaction || interaction.type !== 'pan') return
  const dx = event.clientX - interaction.startX
  const dy = event.clientY - interaction.startY
  if (Math.abs(dx) > 3 || Math.abs(dy) > 3) interaction.moved = true
  facePan.value = {
    x: Math.max(-180, Math.min(180, interaction.originX + dx)),
    y: Math.max(-180, Math.min(180, interaction.originY + dy)),
  }
}

function stopMapPan() {
  if (mapInteraction.value?.type === 'pan' && mapInteraction.value.moved) {
    ignoreNextMapClick.value = true
  }
  if (mapInteraction.value?.type === 'pan') mapInteraction.value = null
}

function startPointDrag(point, event) {
  if (!canEdit.value || event.button !== 0) return
  selectedPointId.value = point.localId || point._id
  mapInteraction.value = {
    type: 'point',
    pointId: point.localId || point._id,
    startX: event.clientX,
    startY: event.clientY,
    moved: false,
  }
  event.currentTarget.setPointerCapture?.(event.pointerId)
}

function movePoint(event) {
  const interaction = mapInteraction.value
  if (!interaction || interaction.type !== 'point') return
  const point = draft.value.points.find((item) => (item.localId || item._id) === interaction.pointId)
  if (!point) return
  const { x, y } = getMapCoordinates(event, event.currentTarget.parentElement)
  if (Math.abs(event.clientX - interaction.startX) > 3 || Math.abs(event.clientY - interaction.startY) > 3) interaction.moved = true
  point.x = Number(x.toFixed(2))
  point.y = Number(y.toFixed(2))
}

function stopPointDrag() {
  if (mapInteraction.value?.type === 'point' && mapInteraction.value.moved) {
    ignoreNextMapClick.value = true
  }
  if (mapInteraction.value?.type === 'point') mapInteraction.value = null
}

function pointStyle(point) {
  const type = procedureTypes.find((item) => item.type === point.procedureType) || procedureTypes[0]
  const { x, y } = getProjectedCoordinates(point)
  return {
    left: `calc(${x}% + ${facePan.value.x}px)`,
    top: `calc(${y}% + ${facePan.value.y}px)`,
    '--point-color': type.color,
  }
}

function quickEditorStyle(point) {
  const { x, y } = getProjectedCoordinates(point)
  return {
    left: `calc(${x}% + ${facePan.value.x}px)`,
    top: `calc(${y}% + ${facePan.value.y}px)`,
    '--quick-offset-x': x > 62 ? 'calc(-100% - 18px)' : '18px',
    '--quick-offset-y': y > 78 ? 'calc(-100% + 22px)' : '-24px',
  }
}

function getProjectedCoordinates(point) {
  const zoom = faceZoom.value / 100
  return {
    x: 50 + (Number(point.x) - 50) * zoom,
    y: 50 + (Number(point.y) - 50) * zoom,
  }
}

function getMapCoordinates(event, element) {
  const rect = element.getBoundingClientRect()
  const zoom = faceZoom.value / 100
  const visibleX = ((event.clientX - rect.left) / rect.width) * 100
  const visibleY = ((event.clientY - rect.top) / rect.height) * 100
  const panX = (facePan.value.x / rect.width) * 100
  const panY = (facePan.value.y / rect.height) * 100
  return {
    x: Math.max(0, Math.min(100, 50 + (visibleX - 50 - panX) / zoom)),
    y: Math.max(0, Math.min(100, 50 + (visibleY - 50 - panY) / zoom)),
  }
}

function formatDate(date) {
  if (!date) return 'Sem data'
  return new Date(date).toLocaleDateString('pt-BR')
}

function formatQuantity(value) {
  return Number(value || 0).toLocaleString('pt-BR', { maximumFractionDigits: 3 })
}

function planningProcedures(planning) {
  const labels = [...new Set((planning.points || []).map((point) => point.procedureLabel).filter(Boolean))]
  return labels.length ? labels.join(', ') : 'Sem pontos registrados'
}

function planningProfessional(planning) {
  return planning.author?.name || planning.author?.fullName || planning.points?.find((point) => point.professionalName)?.professionalName || 'Profissional não informado'
}

function planningProfessionalImage(planning) {
  const authorId = planning.author?._id || planning.author?.id || planning.author
  if (!authorId) return null

  const staffMember = (clinicStore.currentClinic?.staff || []).find(
    (staff) => String(staff._id || staff.id) === String(authorId)
  )

  return staffMember?.profilePhotoUrl || null
}

function planningProfessionalInitials(planning) {
  return planningProfessional(planning)
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase()
}

watch(() => props.patientId, loadPlannings)

watch(
  () => draft.value.faceVariant,
  () => {
    faceImageLoadFailed.value = false
  }
)

watch(
  () => props.patientGender,
  () => {
    draft.value.faceVariant = defaultFaceVariantFromGender()
  }
)

onMounted(loadPlannings)
</script>

<template>
  <div class="facial-planning">
    <aside class="planning-sidebar">
      <section class="planning-header">
        <div class="planning-title">
          <h3>Planejamento Facial HOF</h3>
          <p>{{ draft.mode === 'PLANNING' ? 'Modo Planejamento' : 'Modo Procedimento Realizado' }}</p>
        </div>

        <div class="segmented-control planning-mode-control">
          <button type="button" :class="{ active: draft.mode === 'PLANNING' }" :disabled="!canEdit" @click="draft.mode = 'PLANNING'">
            Planejamento
          </button>
          <button type="button" :class="{ active: draft.mode === 'REALIZED' }" :disabled="!canEdit" @click="draft.mode = 'REALIZED'">
            Realizado
          </button>
        </div>

      </section>

      <div class="sidebar-heading">
        <span>Procedimentos</span>
      </div>

      <div class="scroll-list procedure-list">
        <button
          v-for="item in totals"
          :key="item.type"
          type="button"
          class="procedure-option"
          :class="{ active: activeType === item.type }"
          @click="activeType = item.type"
        >
          <span class="procedure-color" :style="{ backgroundColor: item.color }"></span>
          <span class="procedure-copy">
            <strong>{{ item.label }}</strong>
            <small>{{ formatQuantity(item.quantity) }} {{ item.unit }} utilizados</small>
          </span>
          <span class="procedure-count">{{ item.points }}</span>
        </button>
      </div>

      <div class="notes-block sidebar-notes-block">
        <span class="panel-label">Observações clínicas</span>
        <textarea v-model="draft.notes" rows="5" placeholder="Observações gerais do planejamento..." :disabled="!canEdit"></textarea>
      </div>
    </aside>

    <section class="planning-workspace">
      <div
        class="map-stage"
        :class="{ pannable: faceZoom > 100 }"
        @pointerdown="startMapPan"
        @pointermove="moveMapPan"
        @pointerup="stopMapPan"
        @pointercancel="stopMapPan"
        @click="closeQuickEditor"
      >
        <div
          class="face-map"
          :class="{ readonly: !canEdit, male: draft.faceVariant === 'MALE', pannable: faceZoom > 100 }"
          @click.stop="addPoint"
        >
          <div class="face-canvas" :style="{ '--face-zoom': faceZoom / 100, '--pan-x': `${facePan.x}px`, '--pan-y': `${facePan.y}px` }">
            <img
              v-if="faceImageSrc"
              class="face-image"
              :src="faceImageSrc"
              alt="Mapa anatômico da face"
              draggable="false"
              @error="faceImageLoadFailed = true"
            />

            <svg v-else viewBox="0 0 420 560" aria-hidden="true" class="face-svg">
            <path class="neck" d="M158 390 C160 455 136 495 92 540 H328 C284 495 260 455 262 390" />
            <path class="face-fill" d="M210 54 C118 54 78 132 82 236 C86 355 154 435 210 435 C266 435 334 355 338 236 C342 132 302 54 210 54 Z" />
            <path class="hair" v-if="draft.faceVariant === 'FEMALE'" d="M82 218 C58 118 112 30 210 24 C308 30 362 118 338 218 C320 84 100 84 82 218 Z" />
            <path class="hair" v-else d="M78 146 C95 52 158 20 214 28 C280 38 328 54 346 146 C298 96 129 90 78 146 Z" />
            <path class="brow" d="M118 178 C145 160 174 160 194 175" />
            <path class="brow" d="M226 175 C249 160 279 160 302 178" />
            <ellipse class="eye" cx="158" cy="208" rx="31" ry="13" />
            <ellipse class="eye" cx="262" cy="208" rx="31" ry="13" />
            <circle class="iris" cx="158" cy="208" r="7" />
            <circle class="iris" cx="262" cy="208" r="7" />
            <path class="nose" d="M210 214 C199 252 190 285 210 298 C230 285 221 252 210 214" />
            <path class="lip" d="M162 340 C190 325 229 325 258 340 C232 360 188 360 162 340 Z" />
            <path class="jaw" d="M102 310 C128 394 173 430 210 430 C247 430 292 394 318 310" />
            </svg>
          </div>

          <button
            v-for="(point, index) in draft.points"
            :key="point.localId || point._id"
            type="button"
            class="map-point"
            :class="{ selected: selectedPointId === (point.localId || point._id) }"
            :style="pointStyle(point)"
            @click.stop="selectedPointId = point.localId || point._id"
            @pointerdown.stop="startPointDrag(point, $event)"
            @pointermove.stop="movePoint"
            @pointerup.stop="stopPointDrag"
            @pointercancel.stop="stopPointDrag"
          >
            <span>{{ index + 1 }}</span>
          </button>

          <div
            v-if="selectedPoint"
            class="quick-editor"
            :style="quickEditorStyle(selectedPoint)"
            @click.stop
            @pointerdown.stop
            @pointermove.stop
            @pointerup.stop
            @pointercancel.stop
          >
            <div class="quick-editor-header">
              <div class="quick-editor-title">
                <i :style="{ backgroundColor: selectedPointProcedure.color }"></i>
                <div>
                  <label>Quantidade</label>
                  <small>{{ selectedPointProcedure.label }}</small>
                </div>
              </div>
              <div class="quick-editor-actions">
                <button v-if="canEdit" type="button" class="delete" title="Excluir ponto" aria-label="Excluir ponto" @click="removeSelectedPoint">
                  <Trash2 :size="13" />
                </button>
                <button v-else type="button" class="locked" title="Planejamento finalizado" aria-label="Planejamento finalizado" disabled>
                  <LockKeyhole :size="13" />
                </button>
              </div>
            </div>
            <div class="quick-row">
              <div class="quick-quantity-field">
                <input v-model.number="selectedPoint.quantity" type="number" min="0" step="0.1" :disabled="!canEdit" />
                <span>{{ selectedPoint.unit }}</span>
              </div>
            </div>
            <div v-if="canEdit" class="quantity-presets">
              <button
                v-for="quantity in quickQuantities"
                :key="quantity"
                type="button"
                :class="{ active: Number(selectedPoint.quantity) === quantity }"
                @click="selectedPoint.quantity = quantity"
              >
                {{ formatQuantity(quantity) }}
              </button>
            </div>
          </div>
        </div>
        <p v-if="canEdit" class="map-hint" @click.stop @pointerdown.stop @pointerup.stop>
          <MousePointerClick :size="15" />
          Clique no rosto para <strong>adicionar pontos</strong>
        </p>
        <div class="zoom-controls" aria-label="Zoom do mapa facial" @click.stop @pointerdown.stop @pointermove.stop @pointerup.stop @pointercancel.stop>
          <div class="zoom-group">
            <button type="button" title="Diminuir zoom" aria-label="Diminuir zoom" :disabled="faceZoom <= 60" @click="changeFaceZoom(-10)">
              <Minus :size="16" />
            </button>
            <button type="button" class="zoom-level" title="Redefinir zoom" @click="resetFaceZoom">{{ faceZoom }}%</button>
            <button type="button" title="Aumentar zoom" aria-label="Aumentar zoom" :disabled="faceZoom >= 180" @click="changeFaceZoom(10)">
              <Plus :size="16" />
            </button>
          </div>
          <button type="button" class="fit-map" title="Ajustar ao mapa" aria-label="Ajustar ao mapa" @click="resetFaceZoom">
            <Maximize2 :size="16" />
          </button>
        </div>
      </div>
    </section>

    <aside class="details-panel">
      <section class="details-header">
        <h3>Ações do planejamento</h3>
        <div class="planning-actions">
          <AppButton v-if="isFinalized" variant="primary" size="sm" @click="newPlanning">
            <Plus :size="15" />
            Novo
          </AppButton>
          <AppButton v-if="canEdit" variant="secondary" size="sm" :loading="planningStore.isLoading" @click="saveDraft">
            <Save :size="15" />
            Salvar
          </AppButton>
          <AppButton v-if="canEdit" variant="primary" size="sm" :loading="planningStore.isLoading" @click="finalizePlanning">
            <CheckCircle2 :size="15" />
            Finalizar
          </AppButton>
          <AppButton v-if="isFinalized" variant="outline" size="sm" :loading="planningStore.isLoading" @click="reopenPlanning">
            <LockKeyholeOpen :size="15" />
            Reabrir
          </AppButton>
        </div>
      </section>

      <div class="summary-block">
        <span class="panel-label">Totais do mapa</span>
        <div v-for="item in totals" :key="item.type" class="total-row">
          <span class="total-name">
            <i :style="{ backgroundColor: item.color }"></i>
            {{ item.label }}
          </span>
          <strong>{{ formatQuantity(item.quantity) }} {{ item.unit }}</strong>
        </div>
        <p v-if="!draft.points.length" class="muted">Clique no rosto para adicionar pontos.</p>
      </div>

      <div class="history-panel details-history-panel">
        <div class="sidebar-heading compact">
          <span>Histórico</span>
          <div class="history-actions">
            <button type="button" class="new-link" @click="newPlanning">
              <Plus :size="14" />
              Novo
            </button>
          </div>
        </div>
        <div class="scroll-list history-list">
          <button
            v-for="item in historyItems"
            :key="item._id"
            type="button"
            class="history-item"
            :class="{ active: activePlanningId === item._id }"
            @click="selectPlanning(item)"
          >
            <div class="history-item-main">
              <span class="professional-avatar">
                <span>{{ planningProfessionalInitials(item) }}</span>
                <img
                  v-if="planningProfessionalImage(item)"
                  :src="planningProfessionalImage(item)"
                  :alt="`Foto de ${planningProfessional(item)}`"
                  @error="$event.target.remove()"
                />
              </span>
              <span class="history-copy">
                <span class="history-title-row">
                  <strong>{{ item.title || 'Planejamento Facial HOF' }}</strong>
                  <small class="history-status" :class="item.status === 'FINALIZED' ? 'finalized' : 'draft'">
                    {{ item.status === 'FINALIZED' ? 'Finalizado' : 'Rascunho' }}
                  </small>
                </span>
                <small class="history-date">
                  <CalendarDays :size="12" />
                  {{ formatDate(item.finalizedAt || item.updatedAt) }}
                </small>
                <small class="history-procedures">{{ planningProcedures(item) }}</small>
                <small class="history-professional">{{ planningProfessional(item) }}</small>
              </span>
            </div>
          </button>
          <p v-if="!historyItems.length" class="empty-history">Nenhum mapa salvo ainda.</p>
        </div>
      </div>

      <div v-if="planningStore.isLoading" class="loading-inline">
        <LoaderCircle :size="16" class="spin" />
        Sincronizando...
      </div>
    </aside>
  </div>
</template>

<style scoped>
.facial-planning {
  display: grid;
  grid-template-columns: 260px minmax(420px, 1fr) 300px;
  min-height: 720px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 18px;
  overflow: hidden;
}

.planning-sidebar,
.details-panel {
  background: #ffffff;
  padding: 18px;
}

.planning-sidebar {
  border-right: 1px solid #e2e8f0;
}

.details-panel {
  border-left: 1px solid #e2e8f0;
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.sidebar-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.sidebar-heading {
  color: #0f172a;
  font-size: 0.82rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  margin-bottom: 12px;
}

.sidebar-heading.compact {
  margin-top: 24px;
}

.new-link {
  border: 0;
  background: transparent;
  color: #2563eb;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-weight: 700;
}

.procedure-option,
.history-item {
  width: 100%;
  border: 1px solid transparent;
  background: transparent;
  border-radius: 12px;
  padding: 12px;
  text-align: left;
  cursor: pointer;
  transition: 0.18s ease;
}

.procedure-option {
  display: grid;
  grid-template-columns: 10px 1fr auto;
  gap: 10px;
  align-items: center;
}

.procedure-option:hover,
.procedure-option.active,
.history-item:hover,
.history-item.active {
  background: #f1f5f9;
  border-color: #dbeafe;
}

.procedure-color {
  width: 10px;
  height: 38px;
  border-radius: 999px;
}

.procedure-copy {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.procedure-copy strong,
.history-item strong {
  color: #0f172a;
  font-size: 0.9rem;
}

.procedure-copy small,
.history-item small,
.muted {
  color: #64748b;
  font-size: 0.78rem;
}

.procedure-count {
  min-width: 28px;
  height: 28px;
  border-radius: 999px;
  background: #e2e8f0;
  color: #334155;
  display: grid;
  place-items: center;
  font-weight: 800;
  font-size: 0.78rem;
}

.history-panel {
  border-top: 1px solid #e2e8f0;
  margin-top: 16px;
}

.history-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.history-procedures {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.empty-history {
  color: #94a3b8;
  font-size: 0.82rem;
}

.planning-workspace {
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.segmented-control,
.face-switch {
  display: inline-flex;
  align-items: center;
  padding: 3px;
  border-radius: 999px;
  background: #e2e8f0;
}

.segmented-control button,
.face-switch button {
  border: 0;
  background: transparent;
  color: #475569;
  border-radius: 999px;
  padding: 7px 10px;
  font-weight: 700;
  font-size: 0.78rem;
  cursor: pointer;
}

.segmented-control button.active,
.face-switch button.active {
  background: #ffffff;
  color: #0f172a;
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.12);
}

.segmented-control button:disabled,
.face-switch button:disabled {
  cursor: not-allowed;
  opacity: 0.7;
}

.map-stage {
  position: relative;
  flex: 1;
  min-height: 0;
  display: grid;
  place-items: center;
  padding: 28px;
}

.face-switch {
  position: absolute;
  top: 18px;
  left: 18px;
  z-index: 3;
}

.face-map {
  position: relative;
  width: min(100%, 560px);
  aspect-ratio: 2 / 3;
  cursor: crosshair;
  filter: drop-shadow(0 24px 45px rgba(15, 23, 42, 0.12));
}

.face-map.readonly {
  cursor: default;
}

.face-svg {
  width: 100%;
  height: 100%;
  display: block;
}

.face-image {
  width: 100%;
  height: 100%;
  display: block;
  object-fit: contain;
  user-select: none;
  pointer-events: none;
}

.neck,
.face-fill {
  fill: #fde8dd;
  stroke: #b99184;
  stroke-width: 2;
}

.hair {
  fill: #efe3dd;
  stroke: #6b5a55;
  stroke-width: 2.2;
}

.face-map.male .hair {
  fill: #6b564d;
}

.brow,
.nose,
.jaw {
  fill: none;
  stroke: #4b5563;
  stroke-width: 2.4;
  stroke-linecap: round;
}

.eye {
  fill: #f8fafc;
  stroke: #334155;
  stroke-width: 1.6;
}

.iris {
  fill: #64748b;
}

.lip {
  fill: #eaa2a2;
  stroke: #9f6b6b;
  stroke-width: 1.8;
}

.map-point {
  position: absolute;
  transform: translate(-50%, -50%);
  width: 30px;
  height: 30px;
  border-radius: 999px;
  border: 3px solid #ffffff;
  background: var(--point-color);
  color: #ffffff;
  display: grid;
  place-items: center;
  font-size: 0.74rem;
  font-weight: 900;
  box-shadow: 0 10px 24px rgba(15, 23, 42, 0.24);
  cursor: pointer;
  transition: transform 0.16s ease, box-shadow 0.16s ease;
}

.map-point:hover,
.map-point.selected {
  transform: translate(-50%, -50%) scale(1.14);
  box-shadow: 0 12px 30px rgba(15, 23, 42, 0.32);
}

.quick-editor {
  position: absolute;
  transform: translate(18px, -18px);
  z-index: 5;
  width: 142px;
  padding: 10px;
  border-radius: 12px;
  background: #ffffff;
  border: 1px solid #dbe2ea;
  box-shadow: 0 16px 35px rgba(15, 23, 42, 0.18);
}

.quick-editor label,
.notes-block {
  display: flex;
  flex-direction: column;
  gap: 6px;
  color: #475569;
  font-size: 0.78rem;
  font-weight: 800;
}

.quick-row {
  display: grid;
  grid-template-columns: 1fr 48px;
  gap: 8px;
  align-items: center;
}

input,
textarea {
  width: 100%;
  border: 1px solid #dbe2ea;
  border-radius: 10px;
  padding: 9px 10px;
  color: #0f172a;
  background: #ffffff;
  font: inherit;
  outline: none;
}

input:focus,
textarea:focus {
  border-color: #2563eb;
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.12);
}

input:disabled,
textarea:disabled {
  background: #f8fafc;
  color: #64748b;
}

.panel-label {
  color: #64748b;
  font-size: 0.72rem;
  font-weight: 900;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.summary-block,
.notes-block {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.total-row {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  padding-bottom: 8px;
  border-bottom: 1px solid #eef2f7;
  font-size: 0.88rem;
}

.loading-inline {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: #64748b;
  font-size: 0.82rem;
}

.spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

@media (max-width: 1180px) {
  .facial-planning {
    grid-template-columns: 220px minmax(360px, 1fr);
  }

  .details-panel {
    grid-column: 1 / -1;
    border-left: 0;
    border-top: 1px solid #e2e8f0;
    display: grid;
    grid-template-columns: repeat(3, 1fr);
  }
}

@media (max-width: 760px) {
  .facial-planning {
    grid-template-columns: 1fr;
    border-radius: 0;
  }

  .planning-sidebar {
    border-right: 0;
    border-bottom: 1px solid #e2e8f0;
  }

  .details-panel {
    display: flex;
  }

  .map-stage {
    padding: 64px 12px 18px;
  }
}

/* Clinical planning workspace: dense, quiet panels around the map. */
.facial-planning {
  grid-template-columns: minmax(235px, 0.9fr) minmax(440px, 1.9fr) minmax(250px, 0.95fr);
  height: 100%;
  min-height: 0;
  gap: 10px;
  background: transparent;
  border: 0;
  border-radius: 0;
  overflow: visible;
}

.planning-sidebar,
.planning-workspace,
.details-panel {
  border: 1px solid #e5eaf2;
  border-radius: 12px;
  background: #ffffff;
}

.planning-sidebar {
  min-height: 0;
  display: flex;
  flex-direction: column;
  padding: 14px;
  border-right: 1px solid #e5eaf2;
  overflow: hidden;
}

.planning-header {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin: -14px -14px 14px;
  padding: 14px;
  border-bottom: 1px solid #e9edf4;
  background: #fbfcff;
  border-radius: 12px 12px 0 0;
}

.planning-title h3 {
  margin: 0;
  color: #17213b;
  font-size: 0.9rem;
  line-height: 1.25;
}

.planning-title p {
  margin: 3px 0 0;
  color: #2860df;
  font-size: 0.74rem;
}

.planning-mode-control {
  width: 100%;
}

.planning-mode-control button {
  flex: 1;
}

.planning-actions {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 7px;
}

.details-header {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 14px;
  border-bottom: 1px solid #e9edf4;
  background: #fbfcff;
}

.details-header h3 {
  margin: 0;
  color: #17213b;
  font-size: 0.9rem;
  line-height: 1.25;
}

.planning-actions :deep(.app-button) {
  width: 100%;
  height: 32px;
  justify-content: center;
  border-radius: 6px;
  box-shadow: none;
  font-size: 0.76rem;
}

.planning-actions :deep(.app-button:only-child) {
  grid-column: 1 / -1;
}

.planning-actions :deep(.app-button:nth-child(3):last-child) {
  grid-column: 1 / -1;
}

.planning-actions :deep(.variant-primary) {
  background: #2563eb;
}

.planning-actions :deep(.variant-secondary) {
  border: 1px solid #36b47e;
  background: #ffffff;
  color: #149765;
}

.planning-actions :deep(.variant-secondary:hover:not(.is-disabled)) {
  border-color: #149765;
  background: #149765;
  color: #ffffff;
}

.details-panel {
  min-height: 0;
  display: flex;
  flex-direction: column;
  padding: 0;
  gap: 0;
  overflow: hidden;
}

.summary-block,
.notes-block {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 14px;
}

.notes-block {
  border-top: 1px solid #e9edf4;
}

.sidebar-notes-block {
  margin-top: 14px;
  padding: 14px 0 0;
}

.sidebar-notes-block textarea {
  min-height: 92px;
}

.sidebar-heading {
  margin-bottom: 10px;
  color: #17213b;
  font-size: 0.83rem;
  letter-spacing: 0;
}

.sidebar-heading.compact {
  margin-top: 18px;
  margin-bottom: 10px;
}

.new-link {
  min-height: 30px;
  padding: 0 8px;
  border-radius: 6px;
  color: #1d5eff;
  font-size: 0.78rem;
}

.new-link:hover {
  background: #eff5ff;
}

.procedure-option {
  grid-template-columns: 36px minmax(0, 1fr) 30px;
  min-height: 52px;
  gap: 8px;
  margin-bottom: 6px;
  padding: 7px;
  border-color: #edf0f5;
  border-radius: 8px;
}

.scroll-list {
  position: relative;
  overflow-y: auto;
  overscroll-behavior: contain;
  scrollbar-width: thin;
  scrollbar-color: #c5d2e7 transparent;
}

.scroll-list::-webkit-scrollbar {
  width: 6px;
}

.scroll-list::-webkit-scrollbar-thumb {
  border-radius: 999px;
  background: #c5d2e7;
}

.scroll-list::after {
  position: sticky;
  bottom: 0;
  display: block;
  height: 28px;
  margin-top: -28px;
  content: '';
  pointer-events: none;
  background: linear-gradient(to bottom, rgba(255, 255, 255, 0), #ffffff 88%);
}

.procedure-list {
  max-height: 286px;
  padding-right: 4px;
}

.procedure-list .procedure-option:last-of-type {
  margin-bottom: 0;
}

.procedure-option:hover,
.procedure-option.active {
  border-color: #cddcff;
  background: #f6f8ff;
}

.procedure-color {
  width: 30px;
  height: 30px;
  border-radius: 50%;
  box-shadow: inset 0 0 0 5px rgba(255, 255, 255, 0.84);
}

.procedure-copy strong {
  color: #1d2944;
  font-size: 0.8rem;
}

.procedure-copy small,
.history-item small,
.muted {
  color: #75819a;
  font-size: 0.73rem;
  line-height: 1.3;
}

.procedure-count {
  min-width: 28px;
  height: 28px;
  border-radius: 6px;
  color: #2860df;
  background: #edf3ff;
  font-size: 0.75rem;
}

.history-panel {
  min-height: 0;
  margin-top: 17px;
  border-top-color: #e9edf4;
}

.history-list {
  max-height: 156px;
  padding-right: 4px;
}

.details-history-panel {
  min-height: 0;
  flex: 1;
  display: flex;
  flex-direction: column;
  margin: 0;
  padding: 14px;
  border-top: 1px solid #e9edf4;
}

.details-history-panel .sidebar-heading.compact {
  margin: 0 0 10px;
}

.history-actions {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.details-history-panel .history-list {
  min-height: 0;
  flex: 1;
  max-height: none;
}

.history-item {
  gap: 3px;
  padding: 9px 8px;
  border-radius: 8px;
}

.history-item strong {
  color: #34415d;
  font-size: 0.76rem;
}

.history-item:hover,
.history-item.active {
  border-color: #d8e3fb;
  background: #f7f9fd;
}

.details-history-panel .history-item {
  margin-bottom: 8px;
  padding: 10px;
  border: 1px solid transparent;
  background: #ffffff;
}

.details-history-panel .history-item:last-of-type {
  margin-bottom: 0;
}

.details-history-panel .history-item:hover {
  border-color: #d8e3fb;
  background: #f8faff;
}

.details-history-panel .history-item.active {
  border-color: #c6d8ff;
  background: #f3f7ff;
}

.history-item-main {
  display: grid;
  grid-template-columns: 34px minmax(0, 1fr);
  align-items: start;
  gap: 9px;
}

.professional-avatar {
  position: relative;
  width: 34px;
  height: 34px;
  display: grid;
  place-items: center;
  overflow: hidden;
  border: 1px solid #dce6f7;
  border-radius: 50%;
  background: #eaf1ff;
  color: #2860df;
  font-size: 0.68rem;
  font-weight: 800;
}

.professional-avatar img {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.history-copy {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.history-title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
}

.history-title-row strong {
  min-width: 0;
  overflow: hidden;
  color: #253452;
  font-size: 0.78rem;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.history-status {
  flex: 0 0 auto;
  padding: 2px 5px;
  border-radius: 4px;
  font-size: 0.63rem;
  font-weight: 700;
  line-height: 1.2;
}

.history-status.finalized {
  background: #eaf8f1;
  color: #16835a;
}

.history-status.draft {
  background: #eef3ff;
  color: #3865c5;
}

.history-date,
.history-professional {
  color: #74819a;
  font-size: 0.7rem;
}

.history-date {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.history-procedures {
  color: #3e5680;
  font-size: 0.72rem;
  font-weight: 600;
}

.planning-workspace {
  min-height: 0;
  height: 100%;
  overflow: hidden;
}

.segmented-control,
.face-switch {
  padding: 3px;
  border-radius: 7px;
  background: #f2f4f8;
}

.segmented-control button,
.face-switch button {
  border-radius: 5px;
  padding: 6px 10px;
  color: #75819a;
  font-size: 0.73rem;
}

.segmented-control button.active,
.face-switch button.active {
  color: #1d5eff;
  box-shadow: 0 1px 3px rgba(37, 54, 96, 0.1);
}

.map-stage {
  padding: 28px 18px 50px;
  overflow: hidden;
  background: #fdfdfe;
}

.map-stage.pannable {
  cursor: grab;
}

.map-stage.pannable:active {
  cursor: grabbing;
}

.face-map {
  width: min(100%, 360px);
  max-height: 100%;
  filter: none;
  touch-action: none;
}

.face-canvas {
  position: absolute;
  inset: 0;
  transform: translate(var(--pan-x), var(--pan-y)) scale(var(--face-zoom));
  transform-origin: center;
  pointer-events: none;
}

.face-map.pannable {
  cursor: grab;
}

.face-map.pannable:active {
  cursor: grabbing;
}

.face-image {
  filter: drop-shadow(0 12px 18px rgba(100, 76, 68, 0.11));
}

.map-point {
  width: 11px;
  height: 11px;
  border-width: 2px;
  color: transparent;
  box-shadow: 0 1px 4px rgba(27, 43, 81, 0.24);
  touch-action: none;
}

.map-point:hover,
.map-point.selected {
  transform: translate(-50%, -50%) scale(1.38);
  box-shadow: 0 2px 8px rgba(27, 43, 81, 0.25);
}

.map-point span {
  display: none;
}

.quick-editor {
  width: 224px;
  padding: 12px;
  border-radius: 10px;
  border-color: #dbe4f2;
  box-shadow: 0 14px 30px rgba(28, 47, 84, 0.18);
  transform: translate(var(--quick-offset-x), var(--quick-offset-y));
}

.reopen-point-button {
  width: 100%;
  min-height: 38px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  border: 1px solid #cddcff;
  border-radius: 7px;
  background: #f4f7ff;
  color: #245ce0;
  cursor: pointer;
  font-size: 0.78rem;
  font-weight: 700;
}

.reopen-point-button:hover {
  background: #eaf0ff;
}

.quick-editor-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding-bottom: 10px;
  border-bottom: 1px solid #edf0f5;
}

.quick-editor-title {
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 8px;
}

.quick-editor-title > i {
  width: 9px;
  height: 9px;
  flex: 0 0 9px;
  border-radius: 50%;
  box-shadow: 0 0 0 4px rgba(37, 99, 235, 0.08);
}

.quick-editor .quick-editor-title label {
  display: block;
  color: #273651;
  font-size: 0.78rem;
  font-weight: 800;
}

.quick-editor-title small {
  display: block;
  max-width: 118px;
  overflow: hidden;
  color: #77849a;
  font-size: 0.68rem;
  line-height: 1.3;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.quick-editor-actions {
  display: inline-flex;
  gap: 3px;
}

.quick-editor-actions button {
  width: 27px;
  height: 27px;
  display: grid;
  place-items: center;
  border: 1px solid transparent;
  border-radius: 6px;
  background: #f5f7fa;
  color: #65728b;
  cursor: pointer;
}

.quick-editor-actions button:hover {
  background: #e3e8f1;
  color: #33415b;
}

.quick-editor-actions button.delete {
  background: #fff1f2;
  color: #dc2626;
}

.quick-editor-actions button.delete:hover {
  background: #fee2e2;
  color: #b91c1c;
}

.quick-editor-actions button.locked,
.quick-editor-actions button.locked:disabled {
  cursor: default;
  opacity: 1;
  background: #f1f3f7;
  color: #77849a;
}

.quick-editor label,
.notes-block {
  color: #62708a;
  font-size: 0.88rem;
  font-weight: 800;
}

.quick-row {
  display: block;
  margin-top: 10px;
}

.quick-quantity-field {
  display: flex;
  align-items: center;
  overflow: hidden;
  border: 1px solid #dbe3ef;
  border-radius: 8px;
  background: #ffffff;
}

.quick-quantity-field:focus-within {
  border-color: #8fb0ff;
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
}

.quick-row input {
  height: 40px;
  min-width: 0;
  padding: 7px 10px;
  border: 0;
  border-radius: 0;
  box-shadow: none;
  font-size: 0.95rem;
  font-variant-numeric: tabular-nums;
}

.quick-row input:focus {
  border: 0;
  box-shadow: none;
}

.quick-quantity-field span {
  align-self: stretch;
  display: inline-flex;
  align-items: center;
  padding: 0 11px;
  border-left: 1px solid #e6ebf2;
  background: #f8faff;
  color: #49617f;
  font-size: 0.74rem;
  font-weight: 800;
}

.quick-row input {
  font-size: 1rem;
  font-weight: 700;
}

.quantity-presets {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 6px;
  margin-top: 8px;
}

.quantity-presets button {
  min-width: 0;
  height: 28px;
  border: 1px solid #e1e6ee;
  border-radius: 6px;
  background: #ffffff;
  color: #68748b;
  cursor: pointer;
  font-size: 0.75rem;
  line-height: 1;
}

.quantity-presets button:hover,
.quantity-presets button.active {
  border-color: #a8c2ff;
  background: #edf3ff;
  color: #1d5eff;
}

.map-hint {
  position: absolute;
  bottom: 12px;
  left: 12px;
  z-index: 2;
  display: inline-flex;
  align-items: center;
  gap: 7px;
  margin: 0;
  padding: 7px 10px;
  border: 1px solid #e7ebf2;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.92);
  color: #68758d;
  font-size: 0.78rem;
  white-space: nowrap;
}

.map-hint strong {
  color: #2563eb;
  font-weight: 700;
}

.zoom-controls {
  position: absolute;
  right: 12px;
  bottom: 12px;
  z-index: 4;
  display: flex;
  align-items: center;
  gap: 10px;
}

.zoom-group,
.zoom-controls .fit-map {
  border: 1px solid #e4e9f1;
  border-radius: 7px;
  background: #ffffff;
  box-shadow: 0 1px 3px rgba(28, 47, 84, 0.06);
}

.zoom-group {
  display: inline-flex;
  overflow: hidden;
}

.zoom-controls button {
  width: 34px;
  height: 34px;
  display: grid;
  place-items: center;
  border: 0;
  border-right: 1px solid #e9edf3;
  background: #ffffff;
  color: #52617c;
  cursor: pointer;
}

.zoom-controls button:hover:not(:disabled) {
  background: #f6f8fc;
  color: #1d5eff;
}

.zoom-controls button:disabled {
  cursor: not-allowed;
  color: #c3cad7;
}

.zoom-controls .zoom-level {
  width: 48px;
  color: #5e6b83;
  font-size: 0.72rem;
  font-weight: 700;
}

.zoom-controls .fit-map {
  border-right: 0;
  border: 1px solid #e4e9f1;
}

.summary-block,
.notes-block {
  gap: 8px;
}

.panel-label {
  color: #1d2944;
  font-size: 0.82rem;
  letter-spacing: 0;
  text-transform: none;
}

.total-row {
  min-height: 32px;
  align-items: center;
  padding: 0;
  border-bottom-color: #edf0f5;
  color: #6c7890;
  font-size: 0.75rem;
}

.total-row strong {
  color: #5f6d87;
  font-size: 0.75rem;
}

.total-name {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.total-name i {
  width: 7px;
  height: 7px;
  border-radius: 50%;
}

.notes-block textarea {
  border-color: #dfe5ee;
  border-radius: 7px;
  padding: 8px 9px;
  font-size: 0.78rem;
}

.notes-block textarea {
  min-height: 112px;
  resize: none;
  font-weight: 400;
}

.notes-block textarea::placeholder {
  font-weight: 400;
}

.loading-inline {
  padding: 0 3px;
}

@media (max-width: 1180px) {
  .facial-planning {
    grid-template-columns: minmax(205px, 0.85fr) minmax(430px, 1.8fr);
    height: auto;
    min-height: 610px;
  }

  .details-panel {
    grid-column: 1 / -1;
    grid-row: auto;
    display: flex;
    flex-direction: column;
  }

}

@media (max-width: 760px) {
  .facial-planning {
    grid-template-columns: 1fr;
    height: auto;
    min-height: 0;
  }

  .details-panel {
    grid-column: auto;
    grid-row: auto;
    display: flex;
  }

  .map-stage {
    min-height: 550px;
    padding-bottom: 108px;
  }

  .map-hint {
    bottom: 58px;
    max-width: calc(100% - 32px);
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .zoom-controls {
    right: 12px;
    bottom: 12px;
  }

  .quick-editor {
    width: min(208px, calc(100vw - 48px));
  }
}
</style>
