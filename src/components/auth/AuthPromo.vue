<script setup>
/**
 * Cartão de promoção/contexto do cadastro: campanha (dias grátis), plano escolhido ou convite.
 */
import { computed } from 'vue'
import { Building2, Gift, Ticket } from 'lucide-vue-next'

const props = defineProps({
  // 'campaign' | 'plan' | 'invite'
  kind: { type: String, default: 'campaign' },
  title: { type: String, required: true },
  tag: { type: String, default: '' },
  subtitle: { type: String, default: '' },
  description: { type: String, default: '' },
})

const icon = computed(() => ({ campaign: Gift, plan: Building2, invite: Ticket })[props.kind] || Gift)
</script>

<template>
  <div class="auth-promo" role="status">
    <span class="auth-promo-glow" aria-hidden="true" />
    <span class="auth-promo-icon" aria-hidden="true"><component :is="icon" :size="22" /></span>
    <div class="auth-promo-body">
      <div class="auth-promo-head">
        <strong>{{ title }}</strong>
        <span v-if="tag" class="auth-promo-tag">{{ tag }}</span>
      </div>
      <div v-if="subtitle" class="auth-promo-sub">{{ subtitle }}</div>
      <p v-if="description">{{ description }}</p>
    </div>
  </div>
</template>

<style scoped>
.auth-promo {
  position: relative;
  overflow: hidden;
  display: flex;
  align-items: flex-start;
  gap: 0.875rem;
  padding: 1rem;
  border: 1px solid #cfdcff;
  border-radius: 16px;
  background: linear-gradient(135deg, #eff4ff 0%, #f7f9ff 55%, #ffffff 100%);
  text-align: left;
}
.auth-promo-glow {
  position: absolute;
  right: -28px;
  top: -28px;
  width: 110px;
  height: 110px;
  border-radius: 9999px;
  background: radial-gradient(circle, rgba(0, 87, 255, 0.14), transparent 70%);
}
.auth-promo-icon {
  position: relative;
  flex: none;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  border-radius: 14px;
  background: linear-gradient(160deg, #3d78ff, var(--azul-principal, #0057ff));
  color: #fff;
  box-shadow: 0 8px 16px -6px rgba(0, 87, 255, 0.5);
}
.auth-promo-body {
  position: relative;
  min-width: 0;
}
.auth-promo-head {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem;
}
.auth-promo-head strong {
  font-size: 1rem;
  font-weight: 700;
  color: var(--ds-text, #0f172a);
}
.auth-promo-tag {
  padding: 2px 9px;
  border: 1px solid #cfdcff;
  border-radius: 9999px;
  background: #fff;
  color: var(--azul-principal, #0057ff);
  font-size: 0.75rem;
  font-weight: 700;
}
.auth-promo-sub {
  margin-top: 2px;
  font-size: 0.84375rem;
  font-weight: 600;
  color: #334155;
}
.auth-promo p {
  margin: 0.3rem 0 0;
  font-size: 0.84375rem;
  line-height: 1.45;
  color: var(--ds-text-muted, #64748b);
}
</style>
