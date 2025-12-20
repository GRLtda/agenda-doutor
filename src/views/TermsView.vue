<script setup>
import { marked } from 'marked'
import AppHeader from '@/components/global/AppHeader.vue'

const markdownContent = `# Termos de Uso, Política de Privacidade e Cookies  
**Agenda Doutor**  
**Última atualização: 19 de dezembro de 2025**

---

## 1. Introdução e Aceitação
Bem-vindo ao **Agenda Doutor**. Esta Política descreve as condições de uso da plataforma, bem como as práticas relacionadas à coleta, utilização, armazenamento e proteção de dados pessoais.

Ao criar uma conta, acessar ou utilizar nossos serviços, você declara que **leu, compreendeu e concorda** com estes Termos de Uso e com esta Política de Privacidade. Caso não concorde com qualquer disposição aqui descrita, você não deverá utilizar a plataforma.

---

## 2. Sobre o Agenda Doutor
O Agenda Doutor é uma plataforma digital destinada à gestão de clínicas e consultórios, oferecendo funcionalidades como:
- agendamento de atendimentos;
- prontuário eletrônico;
- gestão administrativa e financeira;
- comunicação com pacientes.

---

## 3. Cadastro e Responsabilidades do Usuário
Para utilizar nossos serviços, você deverá fornecer informações verdadeiras, completas e atualizadas.

Você é responsável por:
- manter a confidencialidade de suas credenciais de acesso;
- todas as atividades realizadas em sua conta;
- comunicar imediatamente qualquer uso não autorizado ou suspeita de violação de segurança.

O Agenda Doutor não se responsabiliza por prejuízos decorrentes do uso indevido de sua conta por terceiros.

---

## 4. Uso Adequado da Plataforma
É vedado ao usuário:
- utilizar a plataforma para fins ilegais ou não autorizados;
- violar leis, regulamentos ou direitos de terceiros;
- tentar acessar áreas restritas ou sistemas sem autorização;
- inserir conteúdos maliciosos, fraudulentos ou que comprometam a segurança da plataforma.

O descumprimento poderá resultar na suspensão ou cancelamento da conta, sem prejuízo de medidas legais cabíveis.

---

## 5. Planos, Pagamentos e Cancelamento
Algumas funcionalidades poderão estar condicionadas à contratação de planos pagos.

- Os valores, planos e condições poderão ser alterados mediante comunicação prévia;
- o cancelamento poderá ser realizado a qualquer momento, conforme as regras do plano contratado;
- eventuais tributos e encargos são de responsabilidade do usuário, quando aplicável.

---

## 6. Propriedade Intelectual
Todo o conteúdo da plataforma, incluindo código-fonte, layout, marcas, textos, gráficos e funcionalidades, é de titularidade do **Agenda Doutor**, sendo protegido pela legislação vigente.

É proibida a reprodução, modificação ou distribuição sem autorização prévia e expressa.

---

## 7. Coleta de Dados Pessoais
O Agenda Doutor coleta dados pessoais de forma ética e em conformidade com a **Lei Geral de Proteção de Dados (Lei nº 13.709/2018 – LGPD)**.

### 7.1 Dados fornecidos pelo usuário
- Nome completo;
- e-mail;
- telefone;
- dados da clínica ou consultório;
- CPF ou CNPJ;
- dados de pagamento (quando aplicável).

### 7.2 Dados coletados automaticamente
- Endereço IP;
- data e hora de acesso;
- informações do navegador e dispositivo;
- idioma;
- cookies e identificadores similares;
- páginas acessadas e histórico de uso da plataforma.

O Agenda Doutor atua como **controlador** dos dados relativos à sua conta e como **operador** em relação aos dados inseridos sobre pacientes, clientes ou terceiros.

---

## 8. Dados de Pacientes e Terceiros
Os dados inseridos na plataforma referentes a pacientes, clientes ou terceiros são de responsabilidade do usuário controlador.

O Agenda Doutor:
- limita-se ao armazenamento e processamento conforme instruções do usuário;
- adota medidas técnicas e organizacionais de segurança;
- não se responsabiliza pela legitimidade, veracidade ou base legal dos dados inseridos pelo usuário.

---

## 9. Finalidade do Tratamento de Dados
Os dados pessoais poderão ser utilizados para:
- viabilizar e aprimorar o funcionamento da plataforma;
- prestar suporte e atendimento ao usuário;
- processar pagamentos e cobranças;
- cumprir obrigações legais e regulatórias;
- exercer direitos em processos administrativos ou judiciais;
- garantir a segurança da plataforma e prevenir fraudes;
- comunicação sobre atualizações, serviços e funcionalidades.

Em nenhuma hipótese os dados pessoais serão comercializados.

---

## 10. Compartilhamento de Dados
Os dados pessoais poderão ser compartilhados:
- com fornecedores e parceiros essenciais à operação da plataforma;
- com autoridades públicas, mediante obrigação legal ou ordem judicial.

Todos os parceiros seguem padrões compatíveis de segurança e proteção de dados.

---

## 11. Armazenamento e Segurança
Os dados são armazenados em ambiente seguro, com controles técnicos e administrativos adequados.

- Utilizamos serviços de computação em nuvem;
- os dados são mantidos pelo prazo necessário para cumprimento das finalidades legais e contratuais;
- informações técnicas e de uso podem ser armazenadas de forma anonimizada para fins estatísticos e de melhoria da plataforma.

---

## 12. Direitos do Titular de Dados
Você poderá, a qualquer momento:
- solicitar acesso aos seus dados pessoais;
- corrigir informações incorretas ou desatualizadas;
- solicitar a exclusão dos dados, quando aplicável;
- obter informações sobre o tratamento de seus dados.

As solicitações poderão ser realizadas pelos canais de suporte indicados na plataforma e serão atendidas dentro dos prazos legais.

---

## 13. Cookies e Tecnologias Semelhantes
Utilizamos cookies e tecnologias similares para:
- garantir o funcionamento adequado da plataforma;
- melhorar a experiência do usuário;
- analisar métricas de uso;
- personalizar conteúdos e funcionalidades.

### Tipos de cookies utilizados
- **Essenciais**: necessários para autenticação e segurança;
- **Desempenho**: utilizados para análise e melhoria da experiência;
- **Publicidade** (quando aplicável): utilizados por serviços de terceiros.

Você pode gerenciar ou desativar cookies diretamente nas configurações do seu navegador.

---

## 14. Alterações desta Política
O Agenda Doutor poderá atualizar estes Termos e esta Política periodicamente.

Sempre que houver alterações relevantes, o usuário será comunicado. O uso contínuo da plataforma após as mudanças indica concordância com as novas condições.

---

## 15. Contato
Em caso de dúvidas, solicitações ou questões relacionadas a estes Termos ou à proteção de dados, entre em contato conosco por meio dos canais oficiais de atendimento disponíveis na plataforma.
`

const compiledMarkdown = marked(markdownContent)
</script>

<template>
  <div class="page-container">
    <AppHeader />
    <main class="content-wrapper">
      <div class="document-container">
        <div class="markdown-body" v-html="compiledMarkdown"></div>
      </div>
    </main>
    
    <footer class="simple-footer">
      <div class="container">
        <p>© {{ new Date().getFullYear() }} Agenda Doutor. Todos os direitos reservados.</p>
      </div>
    </footer>
  </div>
</template>

<style scoped>
.page-container {
  min-height: 100vh;
  background-color: #f9fafb;
  display: flex;
  flex-direction: column;
}

.content-wrapper {
  flex: 1;
  padding-top: 100px; /* Espaço para o header fixo */
  padding-bottom: 4rem;
}

.document-container {
  max-width: 800px;
  margin: 0 auto;
  padding: 3rem;
  background: white;
  border-radius: 1rem;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
  border: 1px solid #e5e7eb;
}

/* Estilização do Markdown Renderizado */
.markdown-body {
  font-family: 'Inter', sans-serif;
  color: #374151;
  line-height: 1.8;
}

:deep(h1) {
  font-size: 2.25rem;
  font-weight: 800;
  color: #111827;
  margin-bottom: 1.5rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid #e5e7eb;
}

:deep(h2) {
  font-size: 1.5rem;
  font-weight: 700;
  color: #1f2937;
  margin-top: 2.5rem;
  margin-bottom: 1rem;
}

:deep(p) {
  margin-bottom: 1.25rem;
}

:deep(ul) {
  list-style-type: disc;
  padding-left: 1.5rem;
  margin-bottom: 1.25rem;
}

:deep(li) {
  margin-bottom: 0.5rem;
}

:deep(strong) {
  font-weight: 600;
  color: #111827;
}

.simple-footer {
  padding: 2rem 0;
  text-align: center;
  color: #9ca3af;
  font-size: 0.875rem;
  border-top: 1px solid #e5e7eb;
  background: white;
}

@media (max-width: 768px) {
  .document-container {
    padding: 1.5rem;
    margin: 0 1rem;
  }
  
  :deep(h1) {
    font-size: 1.75rem;
  }
}
</style>
