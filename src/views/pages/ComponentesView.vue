<script setup>
import { toast } from 'vue-sonner'

function showDefaultToast() {
  toast('Toast do Sonner apareceu', {
    description: 'Esse e o componente Sonner do shadcn-vue em teste.',
  })
}

function showSuccessToast() {
  toast.success('Acao concluida', {
    description: 'O feedback visual esta funcionando.',
  })
}

function showErrorToast() {
  toast.error('Algo deu errado', {
    description: 'Exemplo de toast de erro para comparacao.',
  })
}

function showActionToast() {
  toast('Paciente atualizado', {
    description: 'Voce pode adicionar uma acao no proprio toast.',
    action: {
      label: 'Desfazer',
      onClick: () => toast.info('Acao desfeita'),
    },
  })
}
</script>

<template>
  <main class="components-page">
    <section class="components-panel">
      <p class="eyebrow">Laboratorio de componentes</p>
      <h1>Sonner</h1>
      <p class="description">
        Pagina isolada para testar o toast do shadcn-vue sem adicionar nada na sidebar.
      </p>

      <div class="actions">
        <button type="button" class="test-button primary" @click="showDefaultToast">
          Mostrar toast
        </button>
        <button type="button" class="test-button" @click="showSuccessToast">
          Sucesso
        </button>
        <button type="button" class="test-button" @click="showErrorToast">
          Erro
        </button>
        <button type="button" class="test-button" @click="showActionToast">
          Com acao
        </button>
      </div>
    </section>
  </main>
</template>

<style scoped>
.components-page {
  min-height: 100vh;
  display: grid;
  place-items: center;
  padding: 2rem;
  background:
    linear-gradient(135deg, rgba(59, 130, 246, 0.08), transparent 34%),
    linear-gradient(225deg, rgba(16, 185, 129, 0.1), transparent 38%),
    #f8fafc;
}

.components-panel {
  width: min(100%, 620px);
  padding: 2rem;
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 18px;
}

.eyebrow {
  margin: 0 0 0.75rem;
  color: #2563eb;
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

h1 {
  margin: 0;
  color: #0f172a;
  font-size: clamp(2rem, 5vw, 3rem);
  line-height: 1;
}

.description {
  margin: 1rem 0 0;
  color: #64748b;
  font-size: 1rem;
  line-height: 1.6;
}

.actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  margin-top: 1.75rem;
}

.test-button {
  min-height: 2.75rem;
  padding: 0 1rem;
  border: 1px solid #d1d5db;
  border-radius: 10px;
  background: #fff;
  color: #111827;
  font-weight: 700;
  cursor: pointer;
  transition: border-color 0.18s ease, background 0.18s ease, color 0.18s ease;
}

.test-button:hover {
  border-color: #9ca3af;
  background: #f9fafb;
}

.test-button.primary {
  border-color: #2563eb;
  background: #2563eb;
  color: #fff;
}

.test-button.primary:hover {
  border-color: #1d4ed8;
  background: #1d4ed8;
}
</style>
