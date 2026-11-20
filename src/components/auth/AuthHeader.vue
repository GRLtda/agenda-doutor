<script setup>
/**
 * Cabeçalho das telas de acesso: título com uma palavra em destaque (rabisco azul) e subtítulo.
 * Ex.: before="Bem-vindo" accent="de volta".
 */
defineProps({
  before: { type: String, default: '' },
  accent: { type: String, required: true },
  after: { type: String, default: '' },
  subtitle: { type: String, default: '' },
})
</script>

<template>
  <header class="auth-header">
    <h1>
      <template v-if="before">{{ before }}{{ ' ' }}</template>
      <span class="auth-accent">
        {{ accent }}
        <svg class="auth-squiggle" viewBox="0 0 120 9" preserveAspectRatio="none" aria-hidden="true">
          <path d="M2 5.5C20 1 35 8.5 55 4.5S95 1.5 118 5" />
        </svg>
      </span>
      <template v-if="after">{{ ' ' }}{{ after }}</template>
    </h1>
    <p v-if="subtitle">{{ subtitle }}</p>
  </header>
</template>

<style scoped>
.auth-header {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  text-align: left;
}
h1 {
  margin: 0;
  font-size: 2.375rem;
  font-weight: 650;
  line-height: 1.1;
  letter-spacing: -0.02em;
  color: var(--ds-text, #0f172a);
}
.auth-accent {
  position: relative;
  display: inline-block;
  white-space: nowrap;
}
.auth-squiggle {
  position: absolute;
  left: 0;
  right: 0;
  bottom: -7px;
  width: 100%;
  height: 9px;
}
.auth-squiggle path {
  fill: none;
  stroke: var(--azul-principal, #0057ff);
  stroke-width: 3;
  stroke-linecap: round;
  opacity: 0.9;
}
p {
  margin: 0;
  max-width: 42ch;
  font-size: 1rem;
  line-height: 1.5;
  color: var(--ds-text-muted, #64748b);
}
@media (min-width: 901px) and (max-height: 1080px) {
  h1 {
    font-size: 2.125rem;
  }
  .auth-header {
    gap: 0.5rem;
  }
}
@media (max-width: 900px) {
  h1 {
    font-size: 1.875rem;
  }
  p {
    font-size: 0.9375rem;
  }
}
</style>
