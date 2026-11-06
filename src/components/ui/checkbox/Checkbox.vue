<script setup lang="ts">
import type { CheckboxRootEmits, CheckboxRootProps } from "reka-ui"
import type { HTMLAttributes } from "vue"
import { Check, Minus } from "@lucide/vue"
import { reactiveOmit } from "@vueuse/core"
import { CheckboxIndicator, CheckboxRoot, useForwardPropsEmits } from "reka-ui"
import { cn } from "@/lib/utils"

const props = defineProps<CheckboxRootProps & { class?: HTMLAttributes["class"] }>()
const emits = defineEmits<CheckboxRootEmits>()

const delegatedProps = reactiveOmit(props, "class")

const forwarded = useForwardPropsEmits(delegatedProps, emits)
</script>

<template>
  <CheckboxRoot
    v-slot="slotProps"
    data-slot="checkbox"
    class="app-checkbox"
    v-bind="forwarded"
    :class="
      cn('peer border-input data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground data-[state=checked]:border-primary focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive size-4 shrink-0 rounded-[4px] border shadow-xs transition-shadow outline-none focus-visible:ring-3 disabled:cursor-not-allowed disabled:opacity-50',
         props.class)"
  >
    <CheckboxIndicator
      data-slot="checkbox-indicator"
      class="grid place-content-center text-current transition-none"
    >
      <slot v-bind="slotProps">
        <Minus v-if="slotProps.state === 'indeterminate'" class="size-3.5" />
        <Check v-else class="size-3.5" />
      </slot>
    </CheckboxIndicator>
  </CheckboxRoot>
</template>

<style scoped>
.app-checkbox {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  vertical-align: middle;
  box-sizing: border-box;
  flex: 0 0 18px;
  line-height: 1;
  position: relative;
  isolation: isolate;
  width: 18px;
  height: 18px;
  padding: 0;
  border: 1.5px solid #94a3b8;
  border-radius: 4px;
  background: #fff;
  color: #fff;
  cursor: pointer;
  transition: border-color 180ms ease;
}
.app-checkbox::before {
  content: '';
  position: absolute;
  inset: -1px;
  z-index: -1;
  border-radius: 3px;
  background: var(--azul-principal, #0057ff);
  transform: scale(0);
  transition: transform 180ms ease-out;
}
.app-checkbox[data-state='checked'],
.app-checkbox[data-state='indeterminate'] {
  border-color: var(--azul-principal, #0057ff);
  background: #fff;
  color: #fff;
}
.app-checkbox[data-state='checked']::before,
.app-checkbox[data-state='indeterminate']::before { transform: scale(1); }
.app-checkbox:focus-visible {
  outline: 2px solid var(--azul-principal, #0057ff);
  outline-offset: 3px;
}
.app-checkbox:disabled { cursor: not-allowed; }
.app-checkbox :deep([data-slot='checkbox-indicator']) {
  position: absolute;
  inset: 0;
  display: grid;
  place-content: center;
}
@media (prefers-reduced-motion: reduce) {
  .app-checkbox, .app-checkbox::before { transition: none; }
}
</style>
