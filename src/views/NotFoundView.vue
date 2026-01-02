<script setup>
import { useRouter } from 'vue-router';
import { ArrowLeft } from 'lucide-vue-next';

const router = useRouter();
</script>

<template>
  <div class="not-found-container">
    <div class="content">
      <span class="error-code">404</span>
      <h1 class="title">Página Não Encontrada</h1>
      <p class="description">
        Desculpe, a página que você está procurando não existe ou foi movida.
      </p>
      <p class="error-note">
        Se você acredita que isso é um erro no sistema, nossa equipe já foi notificada.
      </p>
      <div class="actions-wrapper">
        <button @click="router.back()" class="btn-secondary">
          <ArrowLeft :size="16" />
          Voltar
        </button>
        <router-link to="/" class="btn-primary">
          Ir para a Página Inicial
        </router-link>
      </div>
    </div>
  </div>
</template>

<style scoped>
.not-found-container {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  text-align: center;
  background-color: #f9fafb;
  padding: 1rem;
}
.content {
  display: flex;
  flex-direction: column;
  align-items: center;
}
.error-code {
  font-family: var(--fonte-titulo);
  font-size: 6rem;
  font-weight: 700;
  color: var(--azul-principal);
  opacity: 0.2;
}
.title {
  font-size: 2rem;
  font-weight: 700;
  margin-top: -2rem;
  color: var(--preto);
}
.description {
  margin-top: 0.5rem;
  max-width: 400px;
  color: var(--cinza-texto);
  font-size: 1.125rem;
  line-height: 1.6;
}
.error-note {
  margin-top: 1rem;
  max-width: 400px;
  color: #9ca3af; /* Cinza mais claro */
  font-size: 0.875rem;
}
.actions-wrapper {
  display: flex;
  gap: 1rem;
  margin-top: 2.5rem;
}
.btn-primary, .btn-secondary {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.5rem;
  border-radius: 0.75rem;
  border: none;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  text-decoration: none;
  transition: all 0.2s ease;
}
.btn-primary {
  background-color: var(--azul-principal);
  color: var(--branco);
}
.btn-primary:hover {
  background-color: var(--azul-escuro);
}
.btn-secondary {
  background-color: var(--branco);
  color: #374151;
  border: 1px solid #d1d5db;
}
.btn-secondary:hover {
  background-color: #f9fafb;
}
</style>
