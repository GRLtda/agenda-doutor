<script setup>
import { computed, nextTick, ref, watch } from 'vue'
import { ArrowLeft, ChevronRight, X } from 'lucide-vue-next'

const props = defineProps({
  tabs: {
    type: Array,
    required: true,
  },
  activeTab: {
    type: String,
    required: true,
  },
  isMobile: {
    type: Boolean,
    required: true,
  },
  mobileStage: {
    type: String,
    required: true,
  },
  title: {
    type: String,
    required: true,
  },
  sidebarDescription: {
    type: String,
    required: true,
  },
  mobileMenuDescription: {
    type: String,
    default: 'Escolha uma seção para continuar.',
  },
  closeLabel: {
    type: String,
    required: true,
  },
  zIndex: {
    type: Number,
    default: 6000,
  },
  overlayOpacity: {
    type: Number,
    default: 0.34,
  },
  activeIconOnly: {
    type: Boolean,
    default: false,
  },
  showSlidingIndicator: {
    type: Boolean,
    default: false,
  },
  showTabActions: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(['close', 'select-tab', 'mobile-back'])

const sidebarNavRef = ref(null)
const indicatorStyle = ref({
  top: '0px',
  height: '0px',
  opacity: 0,
})

const currentTab = computed(
  () => props.tabs.find((tab) => tab.value === props.activeTab) || props.tabs[0]
)

const mobileHeaderTitle = computed(() =>
  props.mobileStage === 'detail' ? currentTab.value.label : props.title
)

const mobileHeaderDescription = computed(() =>
  props.mobileStage === 'detail' ? currentTab.value.description : props.mobileMenuDescription
)

const shellStyle = computed(() => ({
  '--options-z-index': props.zIndex,
  '--options-overlay-opacity': props.overlayOpacity,
}))

const updateIndicator = () => {
  nextTick(() => {
    if (!props.showSlidingIndicator || !sidebarNavRef.value || props.isMobile) {
      indicatorStyle.value = { ...indicatorStyle.value, opacity: 0 }
      return
    }

    const activeItem = sidebarNavRef.value.querySelector('.sidebar-item.active')
    if (!activeItem) {
      indicatorStyle.value = { ...indicatorStyle.value, opacity: 0 }
      return
    }

    const navRect = sidebarNavRef.value.getBoundingClientRect()
    const itemRect = activeItem.getBoundingClientRect()
    const navScrollTop = sidebarNavRef.value.scrollTop

    indicatorStyle.value = {
      top: `${itemRect.top - navRect.top + navScrollTop}px`,
      height: `${itemRect.height}px`,
      opacity: 1,
    }
  })
}

watch(
  () => [props.activeTab, props.isMobile, props.showSlidingIndicator],
  () => updateIndicator(),
  { immediate: true }
)
</script>

<template>
  <Teleport to="body">
    <div class="options-workspace" :style="shellStyle">
      <template v-if="!isMobile">
        <div class="options-overlay" @click.self="emit('close')">
          <div class="options-modal-frame">
            <button
              type="button"
              class="desktop-close-button"
              :aria-label="closeLabel"
              @click="emit('close')"
            >
              <X :size="18" />
            </button>

            <div class="options-modal">
              <aside class="options-sidebar">
                <div class="sidebar-head">
                  <h1>{{ title }}</h1>
                  <p>{{ sidebarDescription }}</p>
                </div>

                <nav ref="sidebarNavRef" class="sidebar-nav" @scroll.passive="updateIndicator">
                  <div
                    v-if="showSlidingIndicator"
                    class="sliding-indicator"
                    :style="indicatorStyle"
                  ></div>

                  <button
                    v-for="tab in tabs"
                    :key="tab.value"
                    type="button"
                    class="sidebar-item"
                    :class="{ active: tab.value === activeTab }"
                    @click="emit('select-tab', tab.value)"
                  >
                    <span class="sidebar-item-icon" :class="{ 'active-only': activeIconOnly }">
                      <component :is="tab.icon" :size="18" />
                    </span>
                    <span class="sidebar-item-label">{{ tab.label }}</span>
                  </button>
                </nav>
              </aside>

              <section class="options-content">
                <header class="content-header">
                  <div class="content-header-left">
                    <span class="content-tab-icon">
                      <component :is="currentTab.icon" :size="18" />
                    </span>
                    <div>
                      <h2>{{ currentTab.label }}</h2>
                      <p>{{ currentTab.description }}</p>
                    </div>
                  </div>
                  <div v-if="showTabActions" id="tab-actions">
                    <slot name="actions" />
                  </div>
                </header>

                <div class="content-body">
                  <slot />
                </div>
              </section>
            </div>
          </div>
        </div>
      </template>

      <template v-else>
        <div class="options-mobile">
          <header class="mobile-head">
            <div class="mobile-head-main">
              <button type="button" class="mobile-back" @click="emit('mobile-back')">
                <ArrowLeft :size="18" />
              </button>

              <div class="mobile-head-title">
                <h1>{{ mobileHeaderTitle }}</h1>
                <p>{{ mobileHeaderDescription }}</p>
              </div>
            </div>
          </header>

          <template v-if="mobileStage === 'menu'">
            <div class="mobile-menu-stage">
              <nav class="mobile-nav">
                <button
                  v-for="tab in tabs"
                  :key="tab.value"
                  type="button"
                  class="mobile-nav-item"
                  @click="emit('select-tab', tab.value, { mobileFromMenu: true })"
                >
                  <span class="mobile-nav-item-left">
                    <span class="mobile-nav-icon">
                      <component :is="tab.icon" :size="18" />
                    </span>
                    <span class="mobile-nav-text">
                      <span class="mobile-nav-label">{{ tab.label }}</span>
                      <span class="mobile-nav-description">{{ tab.description }}</span>
                    </span>
                  </span>
                  <ChevronRight :size="16" />
                </button>
              </nav>

              <div v-if="$slots['mobile-menu-footer']" class="mobile-menu-footer">
                <slot name="mobile-menu-footer" />
              </div>
            </div>
          </template>

          <template v-else>
            <div v-if="showTabActions" id="tab-actions" class="mobile-tab-actions">
              <slot name="actions" />
            </div>

            <div class="mobile-detail-content">
              <slot />
            </div>
          </template>
        </div>
      </template>
    </div>
  </Teleport>
</template>

<style scoped>
.options-workspace {
  min-height: 100%;
}

.options-overlay {
  position: fixed;
  inset: 0;
  z-index: var(--options-z-index);
  padding: clamp(1rem, 2.4vw, 2rem);
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: rgba(15, 23, 42, var(--options-overlay-opacity));
  animation: options-overlay-in 0.2s ease-out;
}

.options-modal-frame {
  position: relative;
  width: min(1160px, 100%);
  height: min(82dvh, 880px);
  z-index: 1;
  animation: options-modal-in 0.24s cubic-bezier(0.22, 1, 0.36, 1);
  transform-origin: center;
}

.desktop-close-button {
  position: absolute;
  top: -0.8rem;
  right: -0.8rem;
  width: 36px;
  height: 36px;
  border-radius: 999px;
  z-index: 10;
  border: 1px solid #d1d5db;
  background: rgba(255, 255, 255, 0.96);
  color: #4b5563;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-shadow: 0 10px 20px rgba(15, 23, 42, 0.12);
}

.desktop-close-button:hover {
  color: #111827;
  background: #ffffff;
}

.options-modal {
  width: 100%;
  height: 100%;
  background: rgba(255, 255, 255, 0.98);
  border: 1px solid #e5e7eb;
  border-radius: 1.5rem;
  box-shadow: 0 30px 70px rgba(15, 23, 42, 0.2);
  display: grid;
  grid-template-columns: minmax(230px, 280px) minmax(0, 1fr);
  overflow: hidden;
}

.options-sidebar {
  border-right: 1px solid #e5e7eb;
  background: rgba(249, 250, 251, 0.88);
  padding: 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.sidebar-head h1 {
  margin: 0;
  font-size: 1.2rem;
  font-weight: 700;
  color: #111827;
}

.sidebar-head p {
  margin: 0.25rem 0 0;
  font-size: 0.82rem;
  color: #6b7280;
  line-height: 1.45;
}

.sidebar-nav {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  overflow-y: auto;
  position: relative;
}

.sliding-indicator {
  position: absolute;
  left: 3px;
  width: 3px;
  background-color: var(--azul-principal);
  border-radius: 0 2px 2px 0;
  transition:
    top 0.3s cubic-bezier(0.4, 0, 0.2, 1),
    height 0.2s cubic-bezier(0.4, 0, 0.2, 1),
    opacity 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  z-index: 2;
  pointer-events: none;
  transform: scaleY(0.6);
  transform-origin: center;
}

.sidebar-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  width: 100%;
  border: 1px solid transparent;
  background: transparent;
  color: #3f4752;
  padding: 0.5rem 0.75rem;
  border-radius: 0.8rem;
  min-height: 2.25rem;
  font-size: 0.875rem;
  font-weight: 500;
  text-align: left;
  position: relative;
  overflow: hidden;
  transition:
    background-color 0.25s cubic-bezier(0.4, 0, 0.2, 1),
    color 0.2s ease,
    transform 0.2s cubic-bezier(0.22, 1, 0.36, 1);
  z-index: 1;
}

.sidebar-item:hover {
  background: #eef1f4;
  color: #111827;
}

.sidebar-item:active {
  transform: scale(0.985);
}

.sidebar-item.active {
  background: #eef2ff;
  border-color: transparent;
  color: var(--azul-principal);
  font-weight: 600;
}

.sidebar-item-icon {
  width: 28px;
  height: 28px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 0.65rem;
  background: #eef2ff;
  color: var(--azul-principal);
  flex-shrink: 0;
  transition: background-color 0.2s ease, color 0.2s ease, transform 0.2s ease;
}

.sidebar-item-icon.active-only {
  background: #f3f4f6;
  color: #4b5563;
}

.sidebar-item.active .sidebar-item-icon.active-only {
  background: #eef2ff;
  color: var(--azul-principal);
}

.options-content {
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.content-header {
  padding: 1.2rem 1.5rem;
  border-bottom: 1px solid #e5e7eb;
  display: flex;
  gap: 0.8rem;
  align-items: flex-start;
  justify-content: space-between;
  background: rgba(255, 255, 255, 0.94);
}

.content-header-left {
  min-width: 0;
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
}

.content-tab-icon {
  width: 34px;
  height: 34px;
  border-radius: 0.7rem;
  background: #eef2ff;
  color: var(--azul-principal);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.content-header-left h2 {
  margin: 0;
  font-size: 1.05rem;
  color: #111827;
}

.content-header-left p {
  margin: 0.15rem 0 0;
  font-size: 0.82rem;
  color: #6b7280;
}

#tab-actions {
  display: flex;
  gap: 0.65rem;
  align-items: center;
  justify-content: flex-end;
}

.content-body {
  min-height: 0;
  flex: 1;
  overflow-y: auto;
  padding: 1.5rem;
}

.options-mobile {
  position: fixed;
  inset: 0;
  z-index: var(--options-z-index);
  width: 100%;
  max-width: 100%;
  min-height: 100dvh;
  overflow-y: auto;
  padding: 0.35rem 1rem calc(1rem + env(safe-area-inset-bottom, 0px));
  background: #ffffff;
  animation: options-mobile-in 0.28s cubic-bezier(0.22, 1, 0.36, 1);
  display: flex;
  flex-direction: column;
}

.mobile-head,
.mobile-nav,
.mobile-detail-content {
  background: #ffffff;
}

.mobile-head {
  position: sticky;
  top: 0;
  z-index: 4;
  margin-left: -1rem;
  margin-right: -1rem;
  padding: calc(0.9rem + env(safe-area-inset-top, 0px)) 1rem 0.85rem;
  border-bottom: 1px solid #e5e7eb;
}

.mobile-head-main {
  display: flex;
  align-items: flex-start;
  gap: 0.7rem;
}

.mobile-head-title {
  text-align: left;
  min-width: 0;
}

.mobile-head-title h1 {
  margin: 0;
  font-size: 1.25rem;
  color: #111827;
}

.mobile-head-title p {
  margin: 0.25rem 0 0;
  color: #6b7280;
  font-size: 0.86rem;
  text-align: left;
}

.mobile-nav {
  margin-top: 1.2rem;
  display: flex;
  flex-direction: column;
  gap: 0.55rem;
}

.mobile-menu-stage {
  min-height: 0;
  flex: 1;
  display: flex;
  flex-direction: column;
}

.mobile-menu-footer {
  margin-top: auto;
  padding-top: 1rem;
}

.mobile-nav-item {
  width: 100%;
  border: 1px solid #e5e7eb;
  border-radius: 1rem;
  background: #ffffff;
  padding: 0.85rem 0.95rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  color: #4b5563;
  box-shadow: 0 8px 18px rgba(15, 23, 42, 0.04);
  text-align: left;
}

.mobile-nav-item-left {
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex: 1;
}

.mobile-nav-icon {
  width: 32px;
  height: 32px;
  border-radius: 0.7rem;
  border: 1px solid #dbeafe;
  background: #eef2ff;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: var(--azul-principal);
  flex-shrink: 0;
}

.mobile-nav-text {
  min-width: 0;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  text-align: left;
}

.mobile-nav-label {
  font-size: 0.9rem;
  font-weight: 600;
  color: #111827;
}

.mobile-nav-description {
  font-size: 0.77rem;
  color: #6b7280;
  margin-top: 0.1rem;
  line-height: 1.3;
}

.mobile-back {
  width: 42px;
  height: 42px;
  border: 1px solid #d1d5db;
  border-radius: 999px;
  background: #ffffff;
  color: #374151;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  text-align: center;
}

.mobile-tab-actions {
  padding: 0.8rem 0 0.2rem;
}

.mobile-tab-actions :deep(button) {
  width: 100%;
  justify-content: center;
}

.mobile-detail-content {
  margin-top: 0.5rem;
  padding-bottom: 5.5rem;
}

@keyframes options-overlay-in {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

@keyframes options-modal-in {
  from {
    opacity: 0;
    transform: translateY(8px) scale(0.985);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

@keyframes options-mobile-in {
  from {
    opacity: 0;
    transform: translateX(18px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

@media (max-width: 1024px) {
  .options-workspace {
    min-height: 100dvh;
  }
}
</style>
