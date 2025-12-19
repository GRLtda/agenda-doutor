<script setup>
import { ref, computed, watch } from 'vue'
import { LayoutGrid, Plus, Trash2, Save, X, Image as ImageIcon, Download } from 'lucide-vue-next'
import { useToast } from 'vue-toastification'
import { useAuthStore } from '@/stores/auth'
import SideDrawer from '@/components/global/SideDrawer.vue'

const authStore = useAuthStore()

const props = defineProps({
  visible: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(['close', 'save'])

const toast = useToast()

// Layouts disponíveis
const layouts = [
  { id: 'grid-2x2', name: 'Grid 2x2', slots: 4, grid: 'repeat(2, 1fr) / repeat(2, 1fr)' },
  { id: 'layout-1-2', name: '1 + 2', slots: 3, grid: '1fr 1fr / 1fr 1fr', areas: '"a a" "b c"' },
  { id: 'layout-2-1', name: '2 + 1', slots: 3, grid: '1fr 1fr / 1fr 1fr', areas: '"a b" "c c"' },
  { id: 'cols-2', name: '2 Colunas', slots: 2, grid: '1fr / repeat(2, 1fr)' },
  { id: 'cols-3', name: '3 Colunas', slots: 3, grid: '1fr / repeat(3, 1fr)' },
]

// Proporções disponíveis
const aspectRatios = [
  { id: '1:1', name: '1:1', width: 1080, height: 1080 },
  { id: '9:16', name: '9:16', width: 1080, height: 1920 },
]

const selectedLayout = ref(layouts[0])
const selectedAspectRatio = ref(aspectRatios[0])
const images = ref([])
const isGenerating = ref(false)
const showWatermark = ref(true) // Toggle para marca d'água
const saveToDevice = ref(false) // Toggle para salvar no dispositivo
const showSaveConfirm = ref(false) // Popup de confirmação

// Computed para verificar se a clínica tem logo
const clinicLogoUrl = computed(() => authStore.user?.clinic?.logoUrl)

const layoutStyle = computed(() => {
  const layout = selectedLayout.value
  const ratio = selectedAspectRatio.value
  const aspectRatio = ratio.id === '9:16' ? '9 / 16' : '1 / 1'
  
  if (layout.areas) {
    return {
      display: 'grid',
      gridTemplate: layout.grid,
      gridTemplateAreas: layout.areas,
      gap: '4px',
      aspectRatio: aspectRatio,
    }
  }
  return {
    display: 'grid',
    gridTemplate: layout.grid,
    gap: '4px',
    aspectRatio: aspectRatio,
  }
})

const slotAreas = computed(() => {
  const layout = selectedLayout.value
  if (layout.id === 'layout-1-2') return ['a', 'b', 'c']
  if (layout.id === 'layout-2-1') return ['a', 'b', 'c']
  return Array(layout.slots).fill(null)
})

function selectLayout(layout) {
  selectedLayout.value = layout
  images.value = Array(layout.slots).fill(null)
}

function triggerFileInput(index) {
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = 'image/*'
  input.onchange = (e) => handleImageSelect(e, index)
  input.click()
}

function handleImageSelect(event, index) {
  const file = event.target.files[0]
  if (!file) return

  const reader = new FileReader()
  reader.onload = (e) => {
    const newImages = [...images.value]
    newImages[index] = {
      src: e.target.result,
      file: file,
      offsetX: 0,   // offset horizontal (0 = centralizado)
      offsetY: 0,   // offset vertical (0 = centralizado)
      scale: 1,     // zoom (1 = normal, 2 = 2x, etc.)
    }
    images.value = newImages
  }
  reader.readAsDataURL(file)
}

function removeImage(index) {
  const newImages = [...images.value]
  newImages[index] = null
  images.value = newImages
}

// ==========================================
// Funcionalidade de Reposicionamento (Long Press + Drag)
// ==========================================
const isDragging = ref(false)
const dragIndex = ref(null)
const dragStartPos = ref({ x: 0, y: 0 })
const longPressTimer = ref(null)
const LONG_PRESS_DURATION = 100 // ms

// Pinch-to-zoom
const isPinching = ref(false)
const initialPinchDistance = ref(0)
const pinchIndex = ref(null)

function getDistance(touch1, touch2) {
  const dx = touch1.clientX - touch2.clientX
  const dy = touch1.clientY - touch2.clientY
  return Math.sqrt(dx * dx + dy * dy)
}

function handlePointerDown(event, index) {
  if (!images.value[index]) return
  
  // Previne menu de contexto padrão do navegador mobile
  if (event.touches) {
    event.preventDefault()
    
    // Detecta pinch (2 dedos)
    if (event.touches.length === 2) {
      isPinching.value = true
      pinchIndex.value = index
      initialPinchDistance.value = getDistance(event.touches[0], event.touches[1])
      clearTimeout(longPressTimer.value)
      return
    }
  }
  
  const clientX = event.touches ? event.touches[0].clientX : event.clientX
  const clientY = event.touches ? event.touches[0].clientY : event.clientY
  
  dragStartPos.value = { x: clientX, y: clientY }
  dragIndex.value = index
  
  // Inicia timer para long press
  longPressTimer.value = setTimeout(() => {
    isDragging.value = true
    // Vibração haptic no mobile (se disponível)
    if (navigator.vibrate) navigator.vibrate(50)
  }, LONG_PRESS_DURATION)
}

function handlePointerMove(event) {
  // Handle pinch zoom
  if (isPinching.value && event.touches?.length === 2 && pinchIndex.value !== null) {
    event.preventDefault()
    const currentDistance = getDistance(event.touches[0], event.touches[1])
    const scaleDelta = currentDistance / initialPinchDistance.value
    
    const img = images.value[pinchIndex.value]
    if (img) {
      const baseScale = img.scale || 1
      const newScale = Math.max(1, Math.min(3, baseScale * scaleDelta))
      
      const newImages = [...images.value]
      newImages[pinchIndex.value] = {
        ...img,
        scale: newScale,
      }
      images.value = newImages
      initialPinchDistance.value = currentDistance
    }
    return
  }
  
  if (!isDragging.value || dragIndex.value === null) return
  
  event.preventDefault()
  
  const clientX = event.touches ? event.touches[0].clientX : event.clientX
  const clientY = event.touches ? event.touches[0].clientY : event.clientY
  
  const deltaX = clientX - dragStartPos.value.x
  const deltaY = clientY - dragStartPos.value.y
  
  const img = images.value[dragIndex.value]
  if (img) {
    // Escalar delta para range de -50 a 50 (porcentagem do offset)
    const newOffsetX = Math.max(-50, Math.min(50, (img.offsetX || 0) + deltaX * 0.5))
    const newOffsetY = Math.max(-50, Math.min(50, (img.offsetY || 0) + deltaY * 0.5))
    
    const newImages = [...images.value]
    newImages[dragIndex.value] = {
      ...img,
      offsetX: newOffsetX,
      offsetY: newOffsetY,
    }
    images.value = newImages
  }
  
  dragStartPos.value = { x: clientX, y: clientY }
}

function handlePointerUp() {
  clearTimeout(longPressTimer.value)
  isDragging.value = false
  dragIndex.value = null
  isPinching.value = false
  pinchIndex.value = null
}

async function generateMontage() {
  const filledImages = images.value.filter(Boolean)
  if (filledImages.length < 2) {
    toast.warning('Adicione pelo menos 2 imagens para criar uma montagem.')
    return
  }

  isGenerating.value = true

  try {
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    
    const { width, height } = selectedAspectRatio.value
    const gap = 8
    canvas.width = width
    canvas.height = height
    
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, width, height)

    const loadedImages = await Promise.all(
      images.value.map((img) => {
        if (!img) return Promise.resolve(null)
        return new Promise((resolve) => {
          const image = new Image()
          image.crossOrigin = 'anonymous'
          image.onload = () => resolve(image)
          image.onerror = () => resolve(null)
          image.src = img.src
        })
      })
    )

    const layout = selectedLayout.value
    
    if (layout.id === 'grid-2x2') {
      const cellWidth = (width - gap) / 2
      const cellHeight = (height - gap) / 2
      const positions = [
        { x: 0, y: 0 },
        { x: cellWidth + gap, y: 0 },
        { x: 0, y: cellHeight + gap },
        { x: cellWidth + gap, y: cellHeight + gap },
      ]
      positions.forEach((pos, i) => {
        if (loadedImages[i]) {
          const img = images.value[i]
          drawImageCover(ctx, loadedImages[i], pos.x, pos.y, cellWidth, cellHeight, img?.offsetX || 0, img?.offsetY || 0, img?.scale || 1)
        }
      })
    } else if (layout.id === 'layout-1-2') {
      const halfHeight = (height - gap) / 2
      const halfWidth = (width - gap) / 2
      if (loadedImages[0]) {
        const img = images.value[0]
        drawImageCover(ctx, loadedImages[0], 0, 0, width, halfHeight, img?.offsetX || 0, img?.offsetY || 0, img?.scale || 1)
      }
      if (loadedImages[1]) {
        const img = images.value[1]
        drawImageCover(ctx, loadedImages[1], 0, halfHeight + gap, halfWidth, halfHeight, img?.offsetX || 0, img?.offsetY || 0, img?.scale || 1)
      }
      if (loadedImages[2]) {
        const img = images.value[2]
        drawImageCover(ctx, loadedImages[2], halfWidth + gap, halfHeight + gap, halfWidth, halfHeight, img?.offsetX || 0, img?.offsetY || 0, img?.scale || 1)
      }
    } else if (layout.id === 'layout-2-1') {
      const halfHeight = (height - gap) / 2
      const halfWidth = (width - gap) / 2
      if (loadedImages[0]) {
        const img = images.value[0]
        drawImageCover(ctx, loadedImages[0], 0, 0, halfWidth, halfHeight, img?.offsetX || 0, img?.offsetY || 0, img?.scale || 1)
      }
      if (loadedImages[1]) {
        const img = images.value[1]
        drawImageCover(ctx, loadedImages[1], halfWidth + gap, 0, halfWidth, halfHeight, img?.offsetX || 0, img?.offsetY || 0, img?.scale || 1)
      }
      if (loadedImages[2]) {
        const img = images.value[2]
        drawImageCover(ctx, loadedImages[2], 0, halfHeight + gap, width, halfHeight, img?.offsetX || 0, img?.offsetY || 0, img?.scale || 1)
      }
    } else if (layout.id === 'cols-2') {
      const cellWidth = (width - gap) / 2
      const positions = [
        { x: 0, y: 0 },
        { x: cellWidth + gap, y: 0 },
      ]
      positions.forEach((pos, i) => {
        if (loadedImages[i]) {
          const img = images.value[i]
          drawImageCover(ctx, loadedImages[i], pos.x, pos.y, cellWidth, height, img?.offsetX || 0, img?.offsetY || 0, img?.scale || 1)
        }
      })
    } else if (layout.id === 'cols-3') {
      const cellWidth = (width - gap * 2) / 3
      const positions = [
        { x: 0, y: 0 },
        { x: cellWidth + gap, y: 0 },
        { x: (cellWidth + gap) * 2, y: 0 },
      ]
      positions.forEach((pos, i) => {
        if (loadedImages[i]) {
          const img = images.value[i]
          drawImageCover(ctx, loadedImages[i], pos.x, pos.y, cellWidth, height, img?.offsetX || 0, img?.offsetY || 0, img?.scale || 1)
        }
      })
    }

    // Desenhar marca d'água se habilitada e houver logo
    if (showWatermark.value && clinicLogoUrl.value) {
      await drawWatermark(ctx, clinicLogoUrl.value, width, height)
    }

    canvas.toBlob((blob) => {
      if (blob) {
        const fileName = `montagem-${Date.now()}.jpg`
        const file = new File([blob], fileName, { type: 'image/jpeg' })
        
        // Sempre salva no servidor
        emit('save', file)
        
        // Se marcou para salvar no dispositivo, faz download
        if (saveToDevice.value) {
          const url = URL.createObjectURL(blob)
          const a = document.createElement('a')
          a.href = url
          a.download = fileName
          document.body.appendChild(a)
          a.click()
          document.body.removeChild(a)
          URL.revokeObjectURL(url)
          toast.success('Montagem salva e baixada!')
        } else {
          toast.success('Montagem criada com sucesso!')
        }
        
        emit('close')
      }
    }, 'image/jpeg', 0.92)

  } catch (error) {
    console.error('Erro ao gerar montagem:', error)
    toast.error('Não foi possível gerar a montagem.')
  } finally {
    isGenerating.value = false
  }
}

function confirmSave() {
  showSaveConfirm.value = false
  generateMontage()
}

function drawImageCover(ctx, img, x, y, width, height, userOffsetX = 0, userOffsetY = 0, scale = 1) {
  const imgRatio = img.width / img.height
  const cellRatio = width / height
  
  let drawWidth, drawHeight, offsetX, offsetY
  
  // Aplicar scale (zoom) - quanto maior o scale, menor a área da imagem usada
  const scaledWidth = img.width / scale
  const scaledHeight = img.height / scale
  
  if (imgRatio > cellRatio) {
    // Imagem mais larga - cortar laterais
    drawHeight = scaledHeight
    drawWidth = scaledHeight * cellRatio
    // Offset base (centralizado) + ajuste do usuário
    const maxOffsetX = (scaledWidth - drawWidth) / 2
    offsetX = ((img.width - scaledWidth) / 2) + maxOffsetX + (userOffsetX / 50) * maxOffsetX
    offsetX = Math.max(0, Math.min(img.width - drawWidth, offsetX))
    offsetY = (img.height - scaledHeight) / 2
  } else {
    // Imagem mais alta - cortar topo/fundo
    drawWidth = scaledWidth
    drawHeight = scaledWidth / cellRatio
    offsetX = (img.width - scaledWidth) / 2
    // Offset base (centralizado) + ajuste do usuário
    const maxOffsetY = (scaledHeight - drawHeight) / 2
    offsetY = ((img.height - scaledHeight) / 2) + maxOffsetY + (userOffsetY / 50) * maxOffsetY
    offsetY = Math.max(0, Math.min(img.height - drawHeight, offsetY))
  }
  
  ctx.drawImage(img, offsetX, offsetY, drawWidth, drawHeight, x, y, width, height)
}

// Função para desenhar marca d'água com cantos arredondados e opacidade
async function drawWatermark(ctx, logoUrl, canvasWidth, canvasHeight) {
  return new Promise((resolve) => {
    const logoImg = new Image()
    logoImg.crossOrigin = 'anonymous'
    logoImg.onload = () => {
      // Calcular tamanho do logo (20% da menor dimensão)
      const minDimension = Math.min(canvasWidth, canvasHeight)
      const logoSize = minDimension * 0.2
      
      // Centralizar
      const x = (canvasWidth - logoSize) / 2
      const y = (canvasHeight - logoSize) / 2
      
      // Border radius (15% do tamanho)
      const radius = logoSize * 0.15
      
      // Salvar estado e aplicar opacidade
      ctx.save()
      ctx.globalAlpha = 0.4
      
      // Criar clipping path com cantos arredondados
      ctx.beginPath()
      ctx.moveTo(x + radius, y)
      ctx.lineTo(x + logoSize - radius, y)
      ctx.quadraticCurveTo(x + logoSize, y, x + logoSize, y + radius)
      ctx.lineTo(x + logoSize, y + logoSize - radius)
      ctx.quadraticCurveTo(x + logoSize, y + logoSize, x + logoSize - radius, y + logoSize)
      ctx.lineTo(x + radius, y + logoSize)
      ctx.quadraticCurveTo(x, y + logoSize, x, y + logoSize - radius)
      ctx.lineTo(x, y + radius)
      ctx.quadraticCurveTo(x, y, x + radius, y)
      ctx.closePath()
      ctx.clip()
      
      // Desenhar o logo dentro do clipping path
      ctx.drawImage(logoImg, x, y, logoSize, logoSize)
      
      // Restaurar estado
      ctx.restore()
      resolve()
    }
    logoImg.onerror = () => resolve() // Continuar mesmo se falhar
    logoImg.src = logoUrl
  })
}

function handleClose() {
  emit('close')
  selectedLayout.value = layouts[0]
  selectedAspectRatio.value = aspectRatios[0]
  images.value = []
}

// Reinicializa quando o modal abre
watch(() => props.visible, (isVisible) => {
  if (isVisible) {
    selectedLayout.value = layouts[0]
    selectedAspectRatio.value = aspectRatios[0]
    images.value = Array(selectedLayout.value.slots).fill(null)
  }
})

watch(selectedLayout, (newLayout) => {
  images.value = Array(newLayout.slots).fill(null)
})
</script>

<template>
  <SideDrawer v-if="visible" size="md" @close="handleClose">
    <template #header>
      <div class="drawer-header">
        <div class="header-content">
          <h2>
            <LayoutGrid :size="20" />
            Criar Montagem
          </h2>
          <p class="header-description">Combine suas fotos em layouts</p>
        </div>
        <button class="close-btn-header" @click="handleClose">
          <X :size="24" />
        </button>
      </div>
    </template>

    <!-- Linha: Proporção + Toggle Watermark -->
    <div class="options-row">
      <div class="aspect-section">
        <h3>Proporção</h3>
        <div class="aspect-options">
          <button
            v-for="ratio in aspectRatios"
            :key="ratio.id"
            class="aspect-option"
            :class="{ active: selectedAspectRatio.id === ratio.id }"
            @click="selectedAspectRatio = ratio"
          >
            <div class="aspect-preview" :class="ratio.id === '9:16' ? 'ratio-9-16' : 'ratio-1-1'"></div>
            <span>{{ ratio.name }}</span>
          </button>
        </div>
      </div>

      <!-- Toggle Marca d'Água (só mostra se houver logo) -->
      <button 
        v-if="clinicLogoUrl" 
        class="watermark-toggle"
        :class="{ active: showWatermark }"
        @click="showWatermark = !showWatermark"
      >
        <img :src="clinicLogoUrl" alt="Logo" class="toggle-logo-preview" />
        <span class="toggle-text">Logo</span>
      </button>
    </div>

    <!-- Seleção de Layout -->
    <div class="layout-section">
      <h3>Layout</h3>
      <div class="layout-options">
        <button
          v-for="layout in layouts"
          :key="layout.id"
          class="layout-option"
          :class="{ active: selectedLayout.id === layout.id }"
          @click="selectLayout(layout)"
        >
          <div class="layout-preview" :class="layout.id">
            <span v-for="n in layout.slots" :key="n" class="preview-cell"></span>
          </div>
          <span>{{ layout.name }}</span>
        </button>
      </div>
    </div>

    <!-- Área de Montagem -->
    <div class="montage-area">
      <h3>Imagens <span v-if="isDragging" class="drag-hint">(Arrastando...)</span></h3>
      <div 
        class="montage-grid" 
        :style="layoutStyle"
        @mousemove="handlePointerMove"
        @touchmove="handlePointerMove"
        @mouseup="handlePointerUp"
        @touchend="handlePointerUp"
        @mouseleave="handlePointerUp"
      >
        <div
          v-for="(img, index) in images"
          :key="index"
          class="image-slot"
          :class="{ dragging: isDragging && dragIndex === index }"
          :style="slotAreas[index] ? { gridArea: slotAreas[index] } : {}"
          @click="!img && triggerFileInput(index)"
          @mousedown="handlePointerDown($event, index)"
          @touchstart="handlePointerDown($event, index)"
        >
          <template v-if="img">
            <img 
              :src="img.src" 
              alt="Imagem selecionada"
              :style="{ 
                objectPosition: `${50 + (img.offsetX || 0)}% ${50 + (img.offsetY || 0)}%`,
                transform: `scale(${img.scale || 1})`
              }"
              draggable="false"
            />
            <span v-if="img.scale && img.scale > 1" class="zoom-indicator">{{ img.scale.toFixed(1) }}x</span>
            <button class="remove-btn" @click.stop="removeImage(index)">
              <Trash2 :size="16" />
            </button>
            <div v-if="isDragging && dragIndex === index" class="drag-overlay">
              <span>Solte para posicionar</span>
            </div>
          </template>
          <template v-else>
            <div class="slot-placeholder">
              <Plus :size="32" />
              <span>Adicionar</span>
            </div>
          </template>
        </div>

        <!-- Preview do Watermark -->
        <div v-if="showWatermark && clinicLogoUrl" class="watermark-preview">
          <img :src="clinicLogoUrl" alt="Logo da clínica" />
        </div>
      </div>
      <p class="reposition-hint">Segure e arraste para mover • Use dois dedos para zoom</p>
    </div>

    <template #footer>
      <div class="drawer-footer-wrapper">
        <!-- Popup de Download (acima do footer) -->
        <Transition name="slide-up">
          <div v-if="showSaveConfirm" class="save-popup">
            <label class="download-checkbox">
              <input type="checkbox" v-model="saveToDevice" />
              <Download :size="18" />
              <span>Também baixar no dispositivo</span>
            </label>
          </div>
        </Transition>

        <!-- Footer -->
        <div class="drawer-footer">
          <button class="btn-cancel" @click="showSaveConfirm ? (showSaveConfirm = false) : handleClose()">
            Cancelar
          </button>
          <button 
            class="btn-save" 
            @click="showSaveConfirm ? confirmSave() : (showSaveConfirm = true)"
            :disabled="isGenerating"
          >
            <Save :size="18" v-if="!isGenerating" />
            <span>{{ isGenerating ? 'Gerando...' : (showSaveConfirm ? 'Confirmar' : 'Salvar Montagem') }}</span>
          </button>
        </div>
      </div>
    </template>
  </SideDrawer>
</template>

<style scoped>
.drawer-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  padding: 1rem 1.25rem;
  border-bottom: 1px solid #e5e7eb;
}

.header-content {
  flex: 1;
}

.drawer-header h2 {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 1.125rem;
  font-weight: 600;
  color: #111827;
  margin: 0;
}

.header-description {
  margin: 0.25rem 0 0 0;
  font-size: 0.75rem;
  color: #6b7280;
}

/* Options Row - Proporção + Watermark Toggle side-by-side */
.options-row {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 1rem;
}

.watermark-toggle {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.375rem;
  padding: 0.5rem 0.75rem;
  background: #f9fafb;
  border: 2px solid transparent;
  border-radius: 0.5rem;
  cursor: pointer;
  transition: all 0.2s;
}

.watermark-toggle:hover {
  background: #f3f4f6;
}

.watermark-toggle.active {
  background: #eef2ff;
  border-color: var(--azul-principal, #3b82f6);
}

.toggle-logo-preview {
  width: 28px;
  height: 28px;
  object-fit: cover;
  border-radius: 4px;
  opacity: 0.5;
  transition: opacity 0.2s;
}

.watermark-toggle.active .toggle-logo-preview {
  opacity: 1;
}

.toggle-text {
  font-size: 0.625rem;
  color: #6b7280;
  font-weight: 500;
}

.watermark-toggle.active .toggle-text {
  color: var(--azul-principal, #3b82f6);
}

.layout-section h3,
.montage-area h3,
.aspect-section h3 {
  font-size: 0.75rem;
  font-weight: 600;
  color: #374151;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin: 0 0 0.5rem 0;
}

/* Aspect Ratio Selection */
.aspect-options {
  display: flex;
  gap: 0.5rem;
}

.aspect-option {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.375rem;
  padding: 0.5rem 0.75rem;
  background: #f9fafb;
  border: 2px solid transparent;
  border-radius: 0.5rem;
  cursor: pointer;
  transition: all 0.2s;
}

.aspect-option:hover {
  background: #f3f4f6;
}

.aspect-option.active {
  background: #eef2ff;
  border-color: var(--azul-principal, #3b82f6);
}

.aspect-option span {
  font-size: 0.625rem;
  color: #6b7280;
  font-weight: 500;
}

.aspect-option.active span {
  color: var(--azul-principal, #3b82f6);
}

.aspect-preview {
  background: #d1d5db;
  border-radius: 3px;
}

.aspect-preview.ratio-1-1 {
  width: 24px;
  height: 24px;
}

.aspect-preview.ratio-9-16 {
  width: 18px;
  height: 32px;
}

.layout-options {
  display: flex;
  gap: 0.5rem;
  overflow-x: auto;
  scroll-snap-type: x mandatory;
  -webkit-overflow-scrolling: touch;
  padding: 0.25rem 0 0.5rem 0;
}

.layout-options::-webkit-scrollbar {
  height: 4px;
}

.layout-options::-webkit-scrollbar-track {
  background: #f1f5f9;
  border-radius: 2px;
}

.layout-options::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 2px;
}

.layout-options::-webkit-scrollbar-thumb:hover {
  background: #94a3b8;
}

/* Espaço extra no final do carrossel */
.layout-options::after {
  content: '';
  flex-shrink: 0;
  width: 1rem;
}

.layout-option {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.375rem;
  padding: 0.5rem 0.75rem;
  background: #f9fafb;
  border: 2px solid transparent;
  border-radius: 0.5rem;
  cursor: pointer;
  transition: all 0.2s;
  flex-shrink: 0;
  scroll-snap-align: start;
}

.layout-option:hover {
  background: #f3f4f6;
}

.layout-option.active {
  background: #eef2ff;
  border-color: var(--azul-principal, #3b82f6);
}

.layout-option span {
  font-size: 0.625rem;
  color: #6b7280;
  font-weight: 500;
}

.layout-option.active span {
  color: var(--azul-principal, #3b82f6);
}

.layout-preview {
  width: 36px;
  height: 36px;
  display: grid;
  gap: 2px;
  border-radius: 3px;
  overflow: hidden;
}

/* Preview cells - elemento base para cada slot */
.preview-cell {
  background: #d1d5db;
  border-radius: 2px;
}

/* Grid 2x2 - 4 quadrados */
.layout-preview.grid-2x2 {
  grid-template: repeat(2, 1fr) / repeat(2, 1fr);
}

/* 1+2 - 1 grande em cima, 2 embaixo */
.layout-preview.layout-1-2 {
  grid-template: 1fr 1fr / 1fr 1fr;
  grid-template-areas: "a a" "b c";
}
.layout-preview.layout-1-2 .preview-cell:nth-child(1) { grid-area: a; }
.layout-preview.layout-1-2 .preview-cell:nth-child(2) { grid-area: b; }
.layout-preview.layout-1-2 .preview-cell:nth-child(3) { grid-area: c; }

/* 2+1 - 2 em cima, 1 grande embaixo */
.layout-preview.layout-2-1 {
  grid-template: 1fr 1fr / 1fr 1fr;
  grid-template-areas: "a b" "c c";
}
.layout-preview.layout-2-1 .preview-cell:nth-child(1) { grid-area: a; }
.layout-preview.layout-2-1 .preview-cell:nth-child(2) { grid-area: b; }
.layout-preview.layout-2-1 .preview-cell:nth-child(3) { grid-area: c; }

/* 2 Colunas - 2 barras verticais */
.layout-preview.cols-2 {
  grid-template: 1fr / repeat(2, 1fr);
}

/* 3 Colunas - 3 barras verticais */
.layout-preview.cols-3 {
  grid-template: 1fr / repeat(3, 1fr);
}

.montage-grid {
  position: relative;
  background: #f3f4f6;
  border-radius: 0.5rem;
  overflow: hidden;
}

/* Preview do Watermark */
.watermark-preview {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 20%;
  aspect-ratio: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;
  z-index: 10;
}

.watermark-preview img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 15%;
  opacity: 0.4;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}

.image-slot {
  position: relative;
  background: #e5e7eb;
  overflow: hidden;
  cursor: pointer;
  transition: all 0.2s;
}

.image-slot:hover {
  background: #d1d5db;
}

.image-slot img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  /* Desabilita menu de contexto no mobile (Android/iPhone) */
  -webkit-touch-callout: none;
  -webkit-user-select: none;
  -moz-user-select: none;
  -ms-user-select: none;
  user-select: none;
  pointer-events: none;
}

/* Indicador de Zoom */
.zoom-indicator {
  position: absolute;
  top: 0.375rem;
  left: 0.375rem;
  background: rgba(0, 0, 0, 0.6);
  color: white;
  padding: 0.125rem 0.375rem;
  border-radius: 0.25rem;
  font-size: 0.625rem;
  font-weight: 600;
  pointer-events: none;
}

.slot-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: #9ca3af;
  gap: 0.25rem;
}

.slot-placeholder span {
  font-size: 0.625rem;
  font-weight: 500;
}

.slot-placeholder svg {
  width: 24px;
  height: 24px;
}

.remove-btn {
  position: absolute;
  top: 0.375rem;
  right: 0.375rem;
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(239, 68, 68, 0.9);
  color: white;
  border-radius: 50%;
  cursor: pointer;
  opacity: 0;
  transform: scale(0.8);
  transition: all 0.2s;
}

.image-slot:hover .remove-btn {
  opacity: 1;
  transform: scale(1);
}

.remove-btn:hover {
  background: rgb(239, 68, 68);
}

/* Estilos de Drag/Reposicionamento */
.image-slot.dragging {
  cursor: move;
  outline: 2px solid var(--azul-principal, #3b82f6);
  outline-offset: -2px;
  z-index: 10;
}

.image-slot.dragging img {
  transition: object-position 0.05s ease-out;
}

.drag-overlay {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 0.75rem;
  font-weight: 500;
  pointer-events: none;
}

.drag-hint {
  font-size: 0.5rem;
  font-weight: 400;
  color: var(--azul-principal, #3b82f6);
  text-transform: none;
  letter-spacing: normal;
}

.reposition-hint {
  margin-top: 0.5rem;
  font-size: 0.625rem;
  color: #6b728089;
  text-align: center;
}

/* Footer Wrapper */
.drawer-footer-wrapper {
  position: relative;
}

.drawer-footer {
  display: flex;
  gap: 0.75rem;
  padding: 1rem 1.25rem;
  border-top: 1px solid #e5e7eb;
  background: #f9fafb;
}

.drawer-footer .btn-cancel,
.drawer-footer .btn-save {
  flex: 1;
  justify-content: center;
}

/* Popup acima do Footer */
.save-popup {
  position: absolute;
  bottom: 100%;
  left: 0;
  right: 0;
  background: white;
  border-top: 1px solid #e5e7eb;
  padding: 1rem 1.25rem;
  box-shadow: 0 -4px 20px rgba(0, 0, 0, 0.1);
}

.popup-actions {
  display: flex;
  gap: 0.75rem;
}

.popup-actions .btn-cancel,
.popup-actions .btn-save {
  flex: 1;
  justify-content: center;
}

.download-checkbox {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem;
  background: #f8fafc;
  border-radius: 0.5rem;
  border: 1px solid #e2e8f0;
  cursor: pointer;
  margin-bottom: 1rem;
  transition: all 0.2s;
}

.download-checkbox:hover {
  background: #f1f5f9;
  border-color: #cbd5e1;
}

.download-checkbox input {
  width: 18px;
  height: 18px;
  accent-color: var(--azul-principal, #3b82f6);
  cursor: pointer;
}

.download-checkbox span {
  font-size: 0.875rem;
  color: #374151;
  font-weight: 500;
}

.download-checkbox svg {
  color: #6b7280;
}

.download-checkbox:has(input:checked) {
  background: #eef2ff;
  border-color: var(--azul-principal, #3b82f6);
}

.download-checkbox:has(input:checked) svg,
.download-checkbox:has(input:checked) span {
  color: var(--azul-principal, #3b82f6);
}

.confirm-actions {
  display: flex;
  gap: 0.75rem;
}

.confirm-actions .btn-cancel,
.confirm-actions .btn-save {
  flex: 1;
}

/* Transição slide-up do popup */
.slide-up-enter-active,
.slide-up-leave-active {
  transition: all 0.2s ease;
}

.slide-up-enter-from,
.slide-up-leave-to {
  opacity: 0;
  transform: translateY(10px);
}

.btn-cancel {
  padding: 0.625rem 1rem;
  background: white;
  border: 1px solid #d1d5db;
  border-radius: 0.5rem;
  font-size: 0.875rem;
  font-weight: 500;
  color: #374151;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-cancel:hover {
  background: #f3f4f6;
}

.btn-save {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.625rem 1rem;
  background: var(--azul-principal, #3b82f6);
  border: none;
  border-radius: 0.5rem;
  font-size: 0.875rem;
  font-weight: 500;
  color: white;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-save:hover:not(:disabled) {
  background: var(--azul-escuro, #2563eb);
}

.btn-save:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

</style>
