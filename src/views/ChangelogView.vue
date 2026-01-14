<script setup>
import AppHeader from '@/components/global/AppHeader.vue'
import AppFooter from '@/components/global/AppFooter.vue'

// Changelog entries - futuramente pode vir de um .md ou API
const changelog = [
  {
    date: '14 Jan 2026',
    version: 'v1.9.2',
    title: 'Correção de Rótulos',
    description: 'Ajuste na nomenclatura dos logs de mensagens.',
    items: [
      { category: 'CRM:', items: [
        'Corrigido os rótulos de "Envio Manual" para "Lembrete Automático" nos logs de mensagens automáticas',
        'Adicionado suporte para logs de workflows automáticos'
      ] }
    ]
  },
  {
    date: '12 Jan 2026',
    version: 'v1.9.0',
    title: 'Suporte Internacional',
    description: 'Expansão do sistema para suportar números de telefone globais.',
    items: [
      { category: 'Pacientes:', items: [
        'Agora é possível adicionar números internacionais no sistema',
        'Na aba de paciente é possível anexar o DDD do país do paciente'
      ] }
    ]
  },
  {
    date: '08 Jan 2025',
    version: 'v1.8.0',
    title: 'Gestão de Fotos e Especialistas',
    description: 'Novas funcionalidades para gestão de anexos e expansão da equipe médica.',
    items: [
      { category: 'Novidades:', items: [
        'Pré-visualização de fotos antes do envio',
        'Adição de tags e descrições em fotos',
        'Filtro de fotos por tags e descrição',
        'Possibilidade de baixar fotos',
        'Múltiplos doutores disponíveis em planos superiores'
      ] }
    ]
  },
  {
    date: '07 Jan 2025',
    version: 'v1.7.2',
    title: 'Infraestrutura Cloud',
    description: 'Atualização crítica do sistema de armazenamento.',
    items: [
      { category: 'Infraestrutura:', items: [
        'Migração completa de fotos, assinaturas e logos para Amazon S3'
      ] }
    ]
  },
  {
    date: '05 Jan 2026',
    version: 'v1.7.1',
    title: 'Melhorias nos Atendimentos',
    description: 'Novos recursos para acompanhamento e gestão de atendimentos.',
    items: [
      { category: 'Atendimentos:', items: [
        'Timeline do atendimento agora exibe quem finalizou, com data e hora',
        'Possibilidade de reabrir atendimento direto do perfil do paciente'
      ] }
    ]
  },
  {
    date: '04 Jan 2026',
    version: 'v1.6.0',
    title: 'WhatsApp e Interface',
    description: 'Redesign de telas e refinamentos visuais.',
    items: [
      { category: 'Atendimentos:', items: ['Refinamentos na seção de atendimento do perfil'] },
      { category: 'Mensagens:', items: ['Tela de gestão de modelos de mensagens refinada'] },
      { category: 'WhatsApp:', items: ['Tela de conexão do WhatsApp completamente redesenhada'] }
    ]
  },
  {
    date: '30 Dez 2025',
    version: 'v1.5.0',
    title: 'Termos e Interface',
    description: 'Melhorias na gestão de termos de consentimento e visual do sistema.',
    items: [
      { category: 'Termos de Consentimento:', items: ['Agora é possível deletar termo de consentimento'] },
      { category: 'Interface:', items: ['Alteração dos ícones da sidebar'] }
    ]
  }
]
</script>

<template>
  <div class="page-container landing-theme">
    <AppHeader />
    
    <!-- Background Blobs -->
    <div class="hero-bg-blobs"></div>

    <main class="content-wrapper">
      <div class="changelog-container animate-slide-up">
        <!-- Header -->
        <header class="changelog-header">
          <h1 class="changelog-title">Atualizações</h1>
          <p class="changelog-subtitle">Atualizações, melhorias e correções do Agenda Doutor</p>
        </header>

        <!-- Timeline -->
        <div class="timeline">
          <article 
            v-for="(entry, index) in changelog" 
            :key="index" 
            class="timeline-entry"
          >
            <!-- Date -->
            <div class="timeline-date">
              {{ entry.date }}
            </div>

            <!-- Timeline line and dot -->
            <div class="timeline-marker">
              <span class="timeline-dot"></span>
              <span v-if="index < changelog.length - 1" class="timeline-line"></span>
            </div>

            <!-- Content -->
            <div class="timeline-content glass-panel">
              <div class="entry-header">
                <h2 class="entry-title">{{ entry.title }}</h2>
                <span v-if="entry.version" class="entry-version">{{ entry.version }}</span>
              </div>
              <p v-if="entry.description" class="entry-description">{{ entry.description }}</p>
              
              <div v-for="(group, groupIndex) in entry.items" :key="groupIndex" class="entry-group">
                <span class="entry-category">{{ group.category }}</span>
                <ul class="entry-list">
                  <li v-for="(item, itemIndex) in group.items" :key="itemIndex">
                    {{ item }}
                  </li>
                </ul>
              </div>
            </div>
          </article>
        </div>
      </div>
    </main>
    
    <AppFooter />
  </div>
</template>

<style scoped>
@font-face {
  font-family: 'Oakes';
  src: url('@/assets/fonts/OakesLight.ttf') format('ttf');
  font-weight: 300;
  font-style: normal;
  font-display: swap;
}
@font-face {
  font-family: 'Oakes';
  src: url('@/assets/fonts/OakesRegular.woff2') format('woff2');
  font-weight: 400;
  font-style: normal;
  font-display: swap;
}
@font-face {
  font-family: 'Oakes';
  src: url('@/assets/fonts/OakesMedium.woff2') format('woff2');
  font-weight: 500;
  font-style: normal;
  font-display: swap;
}
@font-face {
  font-family: 'Oakes';
  src: url('@/assets/fonts/OakesSemiBold.woff2') format('woff2');
  font-weight: 600;
  font-style: normal;
  font-display: swap;
}

.landing-theme {
  font-family: 'Inter', sans-serif;
  --primary: #2563eb;
  --glass-bg: rgba(255, 255, 255, 0.7);
}

.page-container {
  min-height: 100vh;
  background-color: #f8fafc;
  display: flex;
  flex-direction: column;
  position: relative;
  overflow: hidden;
}

.hero-bg-blobs {
  position: absolute; 
  top: -10%; 
  left: 50%; 
  transform: translateX(-50%);
  width: 800px; 
  height: 800px;
  background: radial-gradient(circle, rgba(59,130,246,0.1) 0%, rgba(255,255,255,0) 60%);
  border-radius: 50%; 
  z-index: 0; 
  pointer-events: none;
}

.content-wrapper {
  flex: 1;
  padding-top: 120px;
  padding-bottom: 60px;
  position: relative;
  z-index: 1;
}

.changelog-container {
  max-width: 900px;
  margin: 0 auto;
  padding: 0 2rem;
}

/* Header */
.changelog-header {
  text-align: center;
  margin-bottom: 4rem;
}

.changelog-title {
  font-size: 3.5rem;
  font-weight: 400;
  color: #0f172a;
  margin-bottom: 0.5rem;
  letter-spacing: -0.02em;
}

.changelog-subtitle {
  font-size: 1.1rem;
  color: #64748b;
  font-weight: 400;
}

/* Timeline */
.timeline {
  position: relative;
}

.timeline-entry {
  display: grid;
  grid-template-columns: 100px 40px 1fr;
  gap: 0;
  margin-bottom: 2rem;
}

.timeline-date {
  font-size: 0.9rem;
  font-weight: 500;
  color: var(--primary);
  text-align: right;
  padding-top: 1.5rem;
  padding-right: 1rem;
  white-space: nowrap;
}

.timeline-marker {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding-top: 1.5rem;
}

.timeline-dot {
  width: 10px;
  height: 10px;
  background-color: #22c55e;
  border-radius: 50%;
  flex-shrink: 0;
  box-shadow: 0 0 0 4px rgba(34, 197, 94, 0.15);
}

.timeline-line {
  width: 2px;
  background-color: #e2e8f0;
  margin-top: 0.75rem;
  flex-grow: 1;
  margin-bottom: -4rem;
}

.timeline-content {
  background: rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(10px);
  border-radius: 16px;
  padding: 1.75rem 2rem;
  box-shadow: 
    0 4px 6px -1px rgba(0, 0, 0, 0.05),
    0 2px 4px -2px rgba(0, 0, 0, 0.05);
  border: 1px solid rgba(226, 232, 240, 0.8);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.timeline-content:hover {
  transform: translateY(-2px);
  box-shadow: 
    0 10px 15px -3px rgba(0, 0, 0, 0.08),
    0 4px 6px -4px rgba(0, 0, 0, 0.05);
}

.entry-title {
  font-family: 'Oakes', sans-serif;
  font-size: 1.35rem;
  font-weight: 600;
  color: #0f172a;
  margin: 0;
}

.entry-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 0.5rem;
}

.entry-version {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--primary);
  background: rgba(37, 99, 235, 0.1);
  padding: 0.25rem 0.6rem;
  border-radius: 9999px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  line-height: 1;
}

.entry-description {
  font-size: 0.95rem;
  color: #64748b;
  margin-bottom: 1.25rem;
  line-height: 1.6;
}

.entry-group {
  margin-bottom: 1rem;
}

.entry-group:last-child {
  margin-bottom: 0;
}

.entry-category {
  font-size: 0.875rem;
  font-weight: 600;
  color: #1e293b;
  display: block;
  margin-bottom: 0.5rem;
}

.entry-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.entry-list li {
  position: relative;
  padding-left: 1.25rem;
  font-size: 0.9rem;
  color: #475569;
  margin-bottom: 0.35rem;
  line-height: 1.5;
}

.entry-list li::before {
  content: '•';
  position: absolute;
  left: 0;
  color: #94a3b8;
  font-weight: bold;
}

/* Animation */
.animate-slide-up { 
  animation: slideUp 0.8s ease forwards; 
  opacity: 0; 
  transform: translateY(20px); 
}

@keyframes slideUp { 
  to { 
    opacity: 1; 
    transform: translateY(0); 
  } 
}

/* Responsive */
@media (max-width: 768px) {
  .changelog-container {
    padding: 0 1rem;
  }
  
  .changelog-title {
    font-size: 2.5rem;
  }
  
  .timeline-entry {
    grid-template-columns: 1fr;
    gap: 0.5rem;
  }
  
  .timeline-date {
    text-align: left;
    padding-top: 0;
    padding-right: 0;
    padding-left: 0;
    font-size: 0.85rem;
  }
  
  .timeline-marker {
    display: none;
  }
  
  .timeline-content {
    padding: 1.25rem 1.5rem;
    margin-left: 0;
    position: relative;
    max-width: 100%;
    overflow: hidden;
  }
  
  .timeline-content::before {
    display: none;
  }

  .entry-header {
    flex-wrap: nowrap;
    max-width: 100%;
    overflow: hidden;
  }

  .entry-title {
    font-size: 1.15rem;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    min-width: 0;
  }
}
</style>
