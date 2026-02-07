<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { usePatientNotesStore } from '@/stores/patientNotes'
import { useAuthStore } from '@/stores/auth'
import { useToast } from 'vue-toastification'
import { SectionCard, EmptyState } from '@/components/shared'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { MessageSquare, Quote } from 'lucide-vue-next'
import NoteCard from './notes/NoteCard.vue'
import NoteEditor from './notes/NoteEditor.vue'

interface Note {
  _id: string
  content: string
  isPinned?: boolean
  createdAt: string
  author?: { name: string }
}

const props = defineProps<{
  patientId: string
}>()

const notesStore = usePatientNotesStore()
const authStore = useAuthStore()
const toast = useToast()

const isSubmitting = ref(false)
const loadMoreSentinel = ref<HTMLDivElement | null>(null)

onMounted(async () => {
  await notesStore.fetchNotes(props.patientId)
  setupInfiniteScroll()
})

function setupInfiniteScroll() {
  const observer = new IntersectionObserver((entries) => {
    if (entries[0].isIntersecting) {
      handleLoadMore()
    }
  }, { threshold: 0.1 })

  if (loadMoreSentinel.value) {
    observer.observe(loadMoreSentinel.value)
  }
}

async function handleLoadMore() {
  if (notesStore.pagination.hasMore && !notesStore.isFetchingMore) {
    await notesStore.fetchMoreNotes(props.patientId)
  }
}

const sortedNotes = computed(() => notesStore.notes as Note[])
const totalCount = computed(() => notesStore.pagination.totalCount)
const userName = computed(() => (authStore.user as any)?.nickname || (authStore.user as any)?.name || 'Usuário')

async function handleCreateNote(content: string) {
  if (!content.trim()) {
    toast.warning('O conteúdo da nota não pode estar vazio.')
    return
  }

  isSubmitting.value = true
  const { success } = await notesStore.createNote(props.patientId, content)
  
  if (success) {
    toast.success('Anotação postada com sucesso!')
  } else {
    toast.error('Erro ao postar anotação.')
  }
  isSubmitting.value = false
}

async function handleDeleteNote(noteId: string) {
  if (!confirm('Tem certeza que deseja excluir esta anotação?')) return

  const { success } = await notesStore.deleteNote(noteId)
  if (success) {
    toast.success('Anotação excluída.')
  } else {
    toast.error('Erro ao excluir anotação.')
  }
}

async function handleTogglePin(note: { _id: string; isPinned?: boolean }) {
  const { success } = await notesStore.togglePin(note._id, note.isPinned)
  if (!success) {
    toast.error('Erro ao alterar destaque da anotação.')
  }
}
</script>

<template>
  <div class="p-6">
    <div class="grid gap-6 lg:grid-cols-2">
      <!-- Left Column: Notes Feed -->
      <SectionCard accent>
        <template #header>
          <div class="flex items-center justify-between w-full">
            <div class="flex items-center gap-3">
              <MessageSquare class="h-5 w-5 text-brand" />
              <span class="font-semibold">Histórico de Notas</span>
              <Badge variant="secondary" class="ml-2">{{ totalCount }}</Badge>
            </div>
          </div>
        </template>

        <!-- Loading State -->
        <div v-if="notesStore.isLoading && sortedNotes.length === 0" class="space-y-4">
          <div v-for="i in 3" :key="i" class="space-y-3">
            <div class="flex items-center gap-3">
              <Skeleton class="h-9 w-9 rounded-full" />
              <div class="space-y-2">
                <Skeleton class="h-4 w-24" />
                <Skeleton class="h-3 w-16" />
              </div>
            </div>
            <Skeleton class="h-16 w-full" />
          </div>
        </div>

        <!-- Notes List -->
        <div 
          v-else-if="sortedNotes.length > 0" 
          class="space-y-4 max-h-[600px] overflow-y-auto pr-2"
        >
          <TransitionGroup name="list">
            <NoteCard
              v-for="note in sortedNotes"
              :key="note._id"
              :note="note"
              @toggle-pin="handleTogglePin(note)"
              @delete="handleDeleteNote(note._id)"
            />
          </TransitionGroup>
          
          <!-- Load More Sentinel -->
          <div 
            ref="loadMoreSentinel" 
            v-if="notesStore.pagination.hasMore"
            class="flex items-center justify-center py-4"
          >
            <div v-if="notesStore.isFetchingMore" class="flex items-center gap-2 text-muted-foreground text-sm">
              <div class="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full" />
              Carregando mais...
            </div>
          </div>
        </div>

        <!-- Empty State -->
        <EmptyState
          v-else
          :icon="Quote"
          title="Nenhuma anotação ainda"
          description="As notas que você criar aparecerão aqui no histórico."
        />
      </SectionCard>

      <!-- Right Column: Editor -->
      <div class="space-y-4">
        <NoteEditor 
          :user-name="userName"
          :is-submitting="isSubmitting"
          @submit="handleCreateNote"
        />

        <!-- Tip Card -->
        <div class="p-4 bg-blue-50 border border-blue-200 rounded-lg hidden lg:block">
          <div class="flex gap-3">
            <div class="flex-shrink-0 h-9 w-9 bg-white rounded-lg flex items-center justify-center">
              <MessageSquare class="h-5 w-5 text-brand" />
            </div>
            <div>
              <h4 class="font-semibold text-blue-900 text-sm">Dica Organizacional</h4>
              <p class="text-blue-700 text-sm mt-1">
                Fixe notas importantes no topo para visualizá-las rapidamente sempre que abrir o perfil do paciente.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.list-enter-active,
.list-leave-active {
  transition: all 0.3s ease;
}

.list-enter-from,
.list-leave-to {
  opacity: 0;
  transform: translateX(20px);
}
</style>
