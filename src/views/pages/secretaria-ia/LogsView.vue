<script setup>
import { computed, onMounted } from 'vue'
import { History } from 'lucide-vue-next'
import { useAiSecretaryStore } from '@/stores/aiSecretary'

const store = useAiSecretaryStore()
const conversations = computed(() => store.conversations)

onMounted(() => {
  store.fetchConversations(1, { status: 'closed' })
})

function formatDateTime(value) {
  if (!value) return '-'
  return new Date(value).toLocaleString('pt-BR')
}
</script>

<template>
  <div class="logs-page">
    <header class="page-header">
      <div>
        <h1 class="title">Histórico</h1>
        <p class="subtitle">Primeiro histórico de conversas encerradas. Logs detalhados entram na próxima etapa.</p>
      </div>
    </header>

    <section class="panel">
      <table>
        <thead>
          <tr>
            <th>Contato</th>
            <th>Status</th>
            <th>Última mensagem</th>
            <th>Motivo humano</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="conversations.length === 0">
            <td colspan="4" class="empty">
              <History :size="18" />
              Nenhuma conversa encerrada ainda.
            </td>
          </tr>
          <tr v-for="conversation in conversations" :key="conversation._id">
            <td>{{ conversation.patient?.name || conversation.contactName || conversation.contactPhone }}</td>
            <td>{{ conversation.status }}</td>
            <td>{{ formatDateTime(conversation.lastMessageAt) }}</td>
            <td>{{ conversation.humanReason || '-' }}</td>
          </tr>
        </tbody>
      </table>
    </section>
  </div>
</template>

<style scoped>
.logs-page { display: flex; flex-direction: column; gap: 1rem; }
.title { margin: 0; font-size: 2rem; color: #111827; }
.subtitle { margin: 0.25rem 0 0; color: #64748b; }
.panel { background: #fff; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden; }
table { width: 100%; border-collapse: collapse; }
th, td { padding: 0.9rem 1rem; border-bottom: 1px solid #e5e7eb; text-align: left; }
th { background: #f8fafc; color: #64748b; font-size: 0.75rem; text-transform: uppercase; }
.empty { color: #64748b; text-align: center; padding: 2rem; }
</style>

