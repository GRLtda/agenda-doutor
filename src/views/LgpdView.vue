<script setup>
import { marked } from 'marked'
import AppHeader from '@/components/global/AppHeader.vue'
import AppFooter from '@/components/global/AppFooter.vue'

const markdownContent = `# Informações sobre a LGPD  
**Agenda Doutor**  
Última atualização: 20 de dezembro de 2025

---

## 1. Conformidade com a LGPD
O Agenda Doutor atua em conformidade com a **Lei Geral de Proteção de Dados (Lei nº 13.709/2018)**, adotando medidas técnicas e organizacionais para garantir a proteção dos dados pessoais tratados.

---

## 2. Papéis no Tratamento de Dados
- **Controlador**: Agenda Doutor, em relação aos dados de usuários da plataforma.
- **Operador**: Agenda Doutor, em relação aos dados inseridos por clínicas sobre pacientes e terceiros.

---

## 3. Base Legal para Tratamento
O tratamento de dados ocorre com base em:
- execução de contrato;
- cumprimento de obrigação legal;
- exercício regular de direitos;
- legítimo interesse;
- tutela da saúde, quando aplicável.

---

## 4. Dados Sensíveis
A plataforma pode armazenar dados sensíveis relacionados à saúde, inseridos pelo usuário controlador.

O tratamento desses dados ocorre exclusivamente para viabilizar as funcionalidades da plataforma, observando sigilo, segurança e confidencialidade.

---

## 5. Registro de Consentimento
O Agenda Doutor mantém registros técnicos de:
- aceite dos Termos de Uso;
- data e hora do aceite;
- versão vigente do documento.

Esses registros podem incluir informações técnicas como IP e dispositivo, para fins de segurança e comprovação legal.

---

## 6. Medidas de Segurança
Adotamos medidas como:
- controle de acesso;
- criptografia;
- monitoramento de incidentes;
- boas práticas de desenvolvimento seguro.

---

## 7. Incidentes de Segurança
Em caso de incidente que possa acarretar risco aos titulares, o Agenda Doutor adotará as medidas necessárias, incluindo comunicação aos envolvidos e às autoridades competentes, quando exigido por lei.

---

## 8. Direitos dos Titulares
Nos termos da LGPD, o titular poderá solicitar:
- confirmação da existência de tratamento;
- acesso aos dados;
- correção;
- anonimização ou exclusão, quando aplicável;
- informações sobre compartilhamento.

---

## 9. Atualizações
Este documento poderá ser atualizado para refletir mudanças legais ou operacionais.

---

## 10. Contato
Solicitações relacionadas à LGPD poderão ser realizadas pelos canais oficiais da plataforma.
`

const compiledMarkdown = marked(markdownContent)
</script>

<template>
  <div class="page-container landing-theme">
    <AppHeader />
    
    <!-- Background Blobs -->
    <div class="hero-bg-blobs"></div>

    <main class="content-wrapper">
      <div class="document-container glass-panel animate-slide-up">
        <div class="markdown-body" v-html="compiledMarkdown"></div>
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
  position: absolute; top: -10%; left: 50%; transform: translateX(-50%);
  width: 800px; height: 800px;
  background: radial-gradient(circle, rgba(59,130,246,0.1) 0%, rgba(255,255,255,0) 60%);
  border-radius: 50%; z-index: 0; pointer-events: none;
}

.content-wrapper {
  flex: 1;
  padding-top: 120px; /* Mais espaço para o header */
  position: relative;
  z-index: 1;
}

.document-container {
  max-width: 800px;
  margin: 0 auto;
}

/* Estilização do Markdown Renderizado */
.markdown-body {
  color: #374151;
  line-height: 1.8;
}

:deep(h1) {
  font-family: 'Oakes', sans-serif;
  font-size: 2.5rem;
  font-weight: 700;
  color: #0f172a;
  margin-bottom: 2rem;
  padding-bottom: 1.5rem;
  border-bottom: 1px solid #e2e8f0;
  text-align: center;
}

:deep(h2) {
  font-family: 'Oakes', sans-serif;
  font-size: 1.5rem;
  font-weight: 600;
  color: #1e293b;
  margin-top: 3rem;
  margin-bottom: 1rem;
}

:deep(p) {
  margin-bottom: 1.25rem;
  color: #475569;
  font-size: 1.05rem;
}

:deep(ul) {
  list-style-type: disc;
  padding-left: 1.5rem;
  margin-bottom: 1.5rem;
  color: #475569;
}

:deep(li) {
  margin-bottom: 0.5rem;
}

:deep(strong) {
  font-weight: 600;
  color: #0f172a;
}

/* CSS removed as it is now in AppFooter */

/* Animation */
.animate-slide-up { animation: slideUp 0.8s ease forwards; opacity: 0; transform: translateY(20px); }
@keyframes slideUp { to { opacity: 1; transform: translateY(0); } }

@media (max-width: 768px) {
  .document-container {
    padding: 2rem;
    margin: 0 1rem;
  }
  
  :deep(h1) {
    font-size: 2rem;
  }
}
</style>
