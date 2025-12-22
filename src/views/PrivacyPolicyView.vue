<script setup>
import { marked } from 'marked'
import AppHeader from '@/components/global/AppHeader.vue'
import AppFooter from '@/components/global/AppFooter.vue'

const markdownContent = `# Política de Privacidade  
**Agenda Doutor**  
Última atualização: 20 de dezembro de 2025

---

## 1. Introdução
Esta Política de Privacidade descreve como o **Agenda Doutor** coleta, utiliza, armazena e protege os dados pessoais de seus usuários, em conformidade com a legislação aplicável.

---

## 2. Dados Coletados

### 2.1 Dados fornecidos pelo usuário
- nome completo;
- e-mail;
- telefone;
- dados da clínica ou consultório;
- CPF ou CNPJ;
- dados de pagamento, quando aplicável.

### 2.2 Dados coletados automaticamente
- endereço IP;
- data e hora de acesso;
- informações do navegador e dispositivo;
- idioma;
- cookies e identificadores similares;
- histórico de navegação e uso da plataforma.

---

## 3. Finalidade do Tratamento
Os dados são utilizados para:
- viabilizar a prestação dos serviços;
- aprimorar funcionalidades e experiência do usuário;
- processar pagamentos e cobranças;
- prestar suporte e comunicação operacional;
- cumprir obrigações legais e regulatórias;
- garantir segurança e prevenção a fraudes.

Os dados nunca serão comercializados.

---

## 4. Compartilhamento de Dados
Os dados poderão ser compartilhados:
- com fornecedores essenciais à operação da plataforma;
- com autoridades públicas, quando exigido por lei ou ordem judicial.

Todos os terceiros seguem padrões adequados de segurança da informação.

---

## 5. Armazenamento e Segurança
Os dados são armazenados em ambientes seguros, com medidas técnicas e administrativas adequadas.

O Agenda Doutor adota boas práticas de segurança para prevenir acessos não autorizados, vazamentos ou uso indevido.

---

## 6. Retenção dos Dados
Os dados pessoais serão mantidos pelo período necessário para:
- cumprimento de obrigações legais;
- execução do contrato;
- exercício regular de direitos.

Após esse período, poderão ser anonimizados ou excluídos.

---

## 7. Direitos do Titular
O usuário poderá:
- acessar seus dados;
- solicitar correção;
- solicitar exclusão, quando aplicável;
- obter informações sobre o tratamento.

As solicitações serão atendidas dentro dos prazos legais.

---

## 8. Cookies
Utilizamos cookies para:
- funcionamento da plataforma;
- análise de desempenho;
- personalização da experiência.

O usuário pode gerenciar cookies diretamente em seu navegador.

---

## 9. Alterações
Esta Política poderá ser atualizada periodicamente. O uso contínuo da plataforma indica concordância com as alterações.

---

## 10. Contato
Questões relacionadas à privacidade podem ser encaminhadas pelos canais oficiais da plataforma.
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
