<template>
  <section class="summary-card" :class="[themeClass, { 'has-sparkline': hasSparkline }]">
    <div class="summary-card__top">
      <span>{{ label }}</span>
    </div>
    <div class="summary-card__body">
      <strong :class="valueClass">{{ value }}</strong>
      <svg
        v-if="hasSparkline"
        class="summary-card__sparkline"
        viewBox="0 0 112 42"
        preserveAspectRatio="none"
        aria-hidden="true"
        :style="{ color: sparklineColor }"
      >
        <defs>
          <linearGradient :id="sparklineGradientId" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stop-color="currentColor" stop-opacity="0.22" />
            <stop offset="58%" stop-color="currentColor" stop-opacity="0.08" />
            <stop offset="100%" stop-color="currentColor" stop-opacity="0" />
          </linearGradient>
        </defs>
        <path :d="sparklineFillPath" :fill="`url(#${sparklineGradientId})`" />
        <path :d="sparklinePath" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" />
        <circle
          v-if="sparklineFocusPoint"
          :cx="sparklineFocusPoint.x"
          :cy="sparklineFocusPoint.y"
          r="2.4"
          fill="#fff"
          stroke="currentColor"
          stroke-width="2"
        />
      </svg>
    </div>
    <div v-if="subtext || trend" class="summary-card__meta">
      <small v-if="subtext">{{ subtext }}</small>
      <span v-if="trend" class="summary-card__trend">{{ trend }}</span>
    </div>
  </section>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  label: { type: String, required: true },
  value: { type: [String, Number], required: true },
  subtext: { type: String, default: '' },
  trend: { type: String, default: '' },
  theme: { type: String, default: 'default', validator: v => ['default', 'blue', 'red', 'green', 'amber'].includes(v) },
  valueColor: { type: String, default: 'default', validator: v => ['default', 'green', 'red'].includes(v) },
  sparkline: { type: Array, default: () => [] },
  sparklineTone: { type: String, default: '', validator: v => ['', 'blue', 'red', 'green', 'amber', 'slate'].includes(v) },
})

const themeClass = computed(() => {
  return `theme-${props.theme}`
})

const valueClass = computed(() => {
  if (props.valueColor === 'green') return 'txt-green'
  if (props.valueColor === 'red') return 'txt-red'
  return ''
})

const hasSparkline = computed(() => normalizedSparkline.value.length >= 2)

const normalizedSparkline = computed(() =>
  props.sparkline
    .map((value) => Number(value))
    .filter((value) => Number.isFinite(value))
)

const sparklineColor = computed(() => {
  const tone = props.sparklineTone || props.theme
  const colors = {
    blue: '#3b82f6',
    red: '#ef4444',
    green: '#10b981',
    amber: '#d97706',
    slate: '#64748b',
    default: '#10b981',
  }
  return colors[tone] || colors.default
})

const sparklineCoordinates = computed(() => {
  const values = normalizedSparkline.value
  if (values.length < 2) return []

  const width = 112
  const height = 42
  const padding = 4
  const min = Math.min(...values)
  const max = Math.max(...values)
  const range = max - min || 1
  const xStep = (width - padding * 2) / (values.length - 1)

  return values.map((value, index) => ({
    x: padding + index * xStep,
    y: height - padding - ((value - min) / range) * (height - padding * 2),
  }))
})

const sparklineGradientId = computed(() => {
  const key = `${props.label}-${props.theme}-${props.sparklineTone}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
  return `sparkline-gradient-${key || 'default'}`
})

const sparklinePath = computed(() => buildSmoothPath(sparklineCoordinates.value))

const sparklineFillPath = computed(() => {
  const coordinates = sparklineCoordinates.value
  if (!coordinates.length) return ''
  const last = coordinates[coordinates.length - 1]
  const first = coordinates[0]
  return `${sparklinePath.value} L ${last.x.toFixed(2)} 42 L ${first.x.toFixed(2)} 42 Z`
})

const sparklineFocusPoint = computed(() => {
  const coordinates = sparklineCoordinates.value
  if (coordinates.length < 3) return null
  return coordinates[Math.max(1, coordinates.length - 2)]
})

function buildSmoothPath(points) {
  if (!points.length) return ''
  if (points.length === 1) return `M ${points[0].x.toFixed(2)} ${points[0].y.toFixed(2)}`

  const commands = [`M ${points[0].x.toFixed(2)} ${points[0].y.toFixed(2)}`]

  for (let index = 0; index < points.length - 1; index += 1) {
    const current = points[index]
    const next = points[index + 1]
    const previous = points[index - 1] || current
    const following = points[index + 2] || next
    const smoothing = 0.18
    const cp1x = current.x + (next.x - previous.x) * smoothing
    const cp1y = current.y + (next.y - previous.y) * smoothing
    const cp2x = next.x - (following.x - current.x) * smoothing
    const cp2y = next.y - (following.y - current.y) * smoothing

    commands.push(
      `C ${cp1x.toFixed(2)} ${cp1y.toFixed(2)}, ${cp2x.toFixed(2)} ${cp2y.toFixed(2)}, ${next.x.toFixed(2)} ${next.y.toFixed(2)}`
    )
  }

  return commands.join(' ')
}
</script>

<style scoped>
.summary-card {
  padding: 1rem 1.05rem;
  background: linear-gradient(180deg, #ffffff 0%, #fdfefe 100%);
  border: 1px solid #e9edf3;
  border-radius: 0.75rem;
  display: flex;
  flex-direction: column;
  gap: 0.55rem;
  min-height: 104px;
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.03), 0 10px 26px rgba(15, 23, 42, 0.035);
}
.summary-card__top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.75rem;
}
.summary-card__top > span {
  color: #64748b;
  font-size: 0.78rem;
  font-weight: 600;
  line-height: 1.25;
  text-transform: uppercase;
  letter-spacing: 0.03em;
}
.summary-card strong {
  color: #111827;
  font-family: var(--fonte-principal);
  font-size: clamp(1.28rem, 1.15vw + 0.9rem, 1.62rem);
  font-weight: 500;
  line-height: 1.1;
  letter-spacing: 0;
  font-variant-numeric: tabular-nums;
}
.summary-card__body {
  display: flex;
  align-items: end;
  gap: 0.75rem;
  min-height: 45px;
}
.summary-card.has-sparkline .summary-card__body {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(82px, 112px);
}
.summary-card__sparkline {
  width: 100%;
  height: 42px;
  min-width: 0;
  overflow: visible;
}
.summary-card__meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  min-height: 1.2rem;
  margin-top: auto;
}
.summary-card small,
.summary-card__trend {
  color: #94a3b8;
  font-size: 0.78rem;
  line-height: 1.35;
}
.summary-card__trend {
  flex-shrink: 0;
  color: #059669;
  font-weight: 600;
}
.txt-green {
  color: #059669 !important;
}
.txt-red {
  color: #dc2626 !important;
}

</style>
