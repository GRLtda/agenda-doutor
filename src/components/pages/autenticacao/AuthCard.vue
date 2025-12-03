<script setup>
import { defineProps, computed } from 'vue'

const props = defineProps({
  imageUrl: {
    type: String,
    required: true,
  },
  panelWidth: {
    type: String,
    default: 'default', // 'default' ou 'large'
  },
  imageSide: {
    type: String,
    default: 'right', // 'left' ou 'right'
  },
})

const containerClasses = computed(() => {
  return {
    'auth-container': true,
    'image-left': props.imageSide === 'left',
  }
})
</script>

<template>
  <div :class="containerClasses">
    <div class="form-panel" :class="`panel-${panelWidth}`">
      <div class="form-content">
        <div v-if="$slots.title" class="content-title">
          <slot name="title" />
        </div>
        <div class="content-body">
          <slot />
        </div>
        <div v-if="$slots.footer" class="content-footer">
          <slot name="footer" />
        </div>
      </div>
    </div>
    <div class="image-panel">
      <img :src="imageUrl" alt="Auth Image" class="auth-image" />
      <div class="image-overlay">
        <slot name="image-content" />
      </div>
    </div>
  </div>
</template>

<style scoped>
.auth-container {
  display: flex;
  width: 100%;
  min-height: 100vh;
  background-color: #ffffff;
  background-image:
    /* Pontos de luz (Radial Gradients) */
    radial-gradient(circle at 15% 50%, rgba(59, 130, 246, 0.05) 0%, transparent 25%),
    radial-gradient(circle at 85% 30%, rgba(147, 51, 234, 0.05) 0%, transparent 25%),
    /* Grid (Linear Gradients) */
    linear-gradient(to right, rgba(229, 231, 235, 0.2) 1px, transparent 1px),
    linear-gradient(to bottom, rgba(229, 231, 235, 0.2) 1px, transparent 1px);
  background-size: 100% 100%, 100% 100%, 40px 40px, 40px 40px;
}

.auth-container.image-left {
  flex-direction: row-reverse;
}

.form-panel {
  flex: 1; /* Ocupa o espaço restante */
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 2rem;
  overflow-y: auto;
  position: relative;
}

.form-content {
  width: 100%;
}

.panel-default .form-content {
  max-width: 400px;
}
.panel-large .form-content {
  max-width: 700px;
}

.content-title {
  margin-bottom: 2rem; /* Aumentado espaçamento */
  text-align: left;
}

.content-footer {
  margin-top: 2rem;
  font-size: 0.875rem;
  color: var(--cinza-texto);
  text-align: center;
}

.image-panel {
  width: 50%; /* Mantém 50% como base */
  max-width: 800px; /* Limita a largura máxima */
  position: relative;
  padding: 12px; /* Padding solicitado */
  height: 100vh; /* Garante altura total da viewport */
  display: flex; /* Para centralizar se necessário */
  align-items: center;
}

.auth-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 16px; /* Border radius solicitado */
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1); /* Sutil shadow */
}

.image-overlay {
  position: absolute;
  top: 12px;
  left: 12px;
  width: calc(100% - 24px);
  height: calc(100% - 24px);
  border-radius: 16px; /* Acompanha o radius da imagem */
  background: linear-gradient(to bottom, rgba(0,0,0,0.1) 0%, rgba(0,0,0,0.6) 100%);
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding: 3rem;
  color: white;
}

.auth-container:not(.image-left) .image-overlay {
  align-items: flex-end;
  text-align: right;
}

/* ✨ INÍCIO DAS ALTERAÇÕES PARA RESPONSIVIDADE ✨ */
@media (max-width: 900px) {
  .auth-container,
  .auth-container.image-left {
    display: block; /* Remove o flex layout */
  }

  .image-panel {
    display: none; /* Esconde completamente o painel da imagem */
  }

  .form-panel {
    width: 100%; /* Ocupa a largura total */
    min-height: 100vh;
    padding: 2rem 1.5rem;
  }

  .content-title {
    text-align: center; /* Centraliza o título no mobile */
  }
}
</style>
