<script setup>
import LiaChatDrawer from '@/components/lia/LiaChatDrawer.vue'
import { scenario, state } from './state'
const toggleTheme = () => document.documentElement.classList.toggle('dark')
</script>

<template>
  <div class="preview-page">
    <header class="preview-toolbar">
      <div><strong>Lia · Prévia da experiência</strong><small>Ambiente local com dados fictícios. Sem conexão com a clínica.</small></div>
      <select aria-label="Cenário de prévia" @change="scenario($event.target.value)"><option value="welcome">Boas-vindas</option><option value="conversation">Conversa</option><option value="report">Relatório de pacientes</option><option value="chart">Gráficos e ranking</option><option value="action">Confirmação de atendimento</option><option value="empty-history">Histórico vazio</option><option value="error">Erro temporário</option></select>
      <button @click="toggleTheme">Claro / escuro</button><button @click="state.isOpen = true">Abrir Lia</button>
    </header>
    <main class="preview-background"><span>AGENDA DOUTOR</span><h1>Um cuidado a mais<br />com sua rotina.</h1><p>Experimente a janela compacta, expanda a conversa<br />e explore o histórico pelo cabeçalho da Lia.</p></main>
    <LiaChatDrawer :open="state.isOpen" @close="state.isOpen = false" />
  </div>
</template>
