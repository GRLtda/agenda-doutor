<script setup lang="js">
import { ref, computed } from 'vue'


// Components
import HelpCenterHeader from './components/HelpCenterHeader.vue'
import HelpCenterSearch from './components/HelpCenterSearch.vue'
import HelpCenterFaqList from './components/HelpCenterFaqList.vue'
import HelpCenterContact from './components/HelpCenterContact.vue'

const searchQuery = ref('')

// Dados simulados (mantendo os originais)
const faqs = ref([
  {
    category: 'Gerenciamento de Pacientes',
    items: [
      {
        id: 'p1',
        question: 'Como faço para cadastrar um novo paciente?',
        answer:
          'Para cadastrar um novo paciente, vá para a seção "Pacientes" no menu lateral e clique no botão "Adicionar Paciente". Preencha os dados necessários e salve.',
      },
      {
        id: 'p2',
        question: 'É possível editar as informações de um paciente?',
        answer:
          'Sim. Acesse a lista de pacientes, clique no paciente desejado para abrir seu perfil e, em seguida, clique no botão "Editar Paciente".',
      },
    ],
  },
  {
    category: 'Agenda e Atendimentos',
    items: [
      {
        id: 'a1',
        question: 'Como marcar um novo atendimento?',
        answer:
          'Você pode marcar um novo atendimento diretamente da tela de "Calendário" ou da tela de "Atendimentos", clicando no botão "Agendar Atendimento". Uma janela modal se abrirá para que você preencha os detalhes.',
      },
      {
        id: 'a2',
        question: 'Como funcionam os lembretes automáticos de consulta?',
        answer:
          'Os lembretes são enviados via WhatsApp para o paciente 1 dia antes e 2 horas antes do horário agendado. Você pode ativar ou desativar essa opção ao criar ou editar um agendamento.',
      },
      {
        id: 'a3',
        question: 'Onde registro as informações do atendimento (prontuário)?',
        answer:
          'Na tela de "Atendimentos", encontre o agendamento do dia e clique em "Iniciar Atendimento". Isso levará você à tela de registro clínico, onde você pode preencher o prontuário eletrônico do paciente.',
      },
    ],
  },
  {
    category: 'Configurações da Clínica',
    items: [
      {
        id: 'c1',
        question: 'Como altero o horário de funcionamento da clínica?',
        answer:
          'Vá para "Configurações" no menu lateral e selecione a aba "Horário de Funcionamento". Lá você pode ajustar os dias e horários em que a clínica está aberta.',
      },
    ],
  },
])

const filteredFaqs = computed(() => {
  if (!searchQuery.value) {
    return faqs.value
  }
  const lowerCaseQuery = searchQuery.value.toLowerCase()
  const filtered = []
  
  faqs.value.forEach((category) => {
    const matchingItems = category.items.filter(
      (item) =>
        item.question.toLowerCase().includes(lowerCaseQuery) ||
        item.answer.toLowerCase().includes(lowerCaseQuery),
    )
    if (matchingItems.length > 0) {
      filtered.push({ ...category, items: matchingItems })
    }
  })
  
  return filtered
})
</script>

<template>
  <div class="container py-10 mx-auto max-w-4xl animate-fade-in px-4 md:px-6"> 
    <HelpCenterHeader />
    
    <HelpCenterSearch v-model="searchQuery" />

    <HelpCenterFaqList 
      :categories="filteredFaqs" 
      :search-query="searchQuery" 
    />

    <HelpCenterContact />
  </div>
</template>
