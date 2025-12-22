<script setup>
import { ref, onMounted, computed, watch } from 'vue'
import { usePatientNotesStore } from '@/stores/patientNotes'
import { useAuthStore } from '@/stores/auth'
import { useToast } from 'vue-toastification'
import { Marked } from 'marked'
const marked = new Marked()
import { useEditor, EditorContent } from '@tiptap/vue-3'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import { Markdown } from 'tiptap-markdown'
import EditorToolbar from '@/components/shared/EditorToolbar.vue'
import { 
  Plus, 
  Pin, 
  PinOff, 
  Trash2, 
  MessageSquare,
  Send,
  Calendar,
  Quote,
  Layout
} from 'lucide-vue-next'
import AppButton from '@/components/global/AppButton.vue'

const props = defineProps({
  patientId: {
    type: String,
    required: true
  }
})

const notesStore = usePatientNotesStore()
const authStore = useAuthStore()
const toast = useToast()

const isSubmitting = ref(false)

// Tiptap Editor setup
const editor = useEditor({
  content: '',
  extensions: [
    StarterKit,
    Underline,
    Markdown.configure({
      html: false, // Maintain sanity by avoiding HTML in MD if possible
      tightLists: true,
      bulletListMarker: '-',
    })
  ],
  editorProps: {
    attributes: {
      class: 'prose focus:outline-none max-w-none min-h-[200px] p-6',
    },
  },
})

const loadMoreSentinel = ref(null)

onMounted(async () => {
  await notesStore.fetchNotes(props.patientId)
  setupInfiniteScroll()
})

function setupInfiniteScroll() {
  const observer = new IntersectionObserver((entries) => {
    if (entries[0].isIntersecting) {
      handleLoadMore()
    }
  }, {
    root: document.querySelector('.notes-feed'),
    threshold: 0.1
  })

  if (loadMoreSentinel.value) {
    observer.observe(loadMoreSentinel.value)
  }
}

async function handleLoadMore() {
  if (notesStore.pagination.hasMore && !notesStore.isFetchingMore) {
    await notesStore.fetchMoreNotes(props.patientId)
  }
}

const sortedNotes = computed(() => notesStore.notes)

async function handleCreateNote() {
  const content = editor.value.storage.markdown.getMarkdown()
  
  if (!content || content.trim() === '') {
    toast.warning('O conteúdo da nota não pode estar vazio.')
    return
  }

  isSubmitting.value = true
  const { success } = await notesStore.createNote(props.patientId, content)
  
  if (success) {
    editor.value.commands.setContent('')
    toast.success('Anotação postada com sucesso!')
  } else {
    toast.error('Erro ao postar anotação.')
  }
  isSubmitting.value = false
}

async function handleDeleteNote(noteId) {
  if (!confirm('Tem certeza que deseja excluir esta anotação?')) return

  const { success } = await notesStore.deleteNote(noteId)
  if (success) {
    toast.success('Anotação excluída.')
  } else {
    toast.error('Erro ao excluir anotação.')
  }
}

async function handleTogglePin(note) {
  const { success } = await notesStore.togglePin(note._id, note.isPinned)
  if (!success) {
    toast.error('Erro ao alterar destaque da anotação.')
  }
}

function formatDate(dateString) {
  return new Date(dateString).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

// Function to render content: Always use marked for consistent Markdown rendering
function renderContent(content) {
  if (!content) return ''
  
  try {
    // Tiptap with markdown extension saves clean markdown.
    // marked is now the instance of Marked()
    const html = marked.parse(content)
    return html
  } catch (err) {
    console.error('Marked parsing error:', err)
    return content
  }
}
</script>

<template>
  <div class="patient-notes-redesign">
    <!-- Main Content Grid -->
    <div class="notes-grid">
      
      <!-- LEFT COLUMN: EXISTING NOTES FEED -->
      <section class="notes-column list-column">
        <div class="column-header">
          <h3><MessageSquare :size="20" /> Histórico de Notas</h3>
          <span class="count-badge">{{ sortedNotes.length }}</span>
        </div>

        <div v-if="notesStore.isLoading && notesStore.notes.length === 0" class="loading-container">
          <div class="loader"></div>
          <p>Carregando anotações...</p>
        </div>

        <div v-else-if="sortedNotes.length > 0" class="notes-feed">
          <div 
            v-for="note in sortedNotes" 
            :key="note._id" 
            class="note-card"
            :class="{ 'pinned': note.isPinned }"
          >
            <div v-if="note.isPinned" class="pinned-indicator">
              <Pin :size="12" /> FIXADO
            </div>

            <div class="note-header">
              <div class="note-author">
                <div class="author-avatar">{{ note.author?.name?.charAt(0) }}</div>
                <div class="author-details">
                  <span class="author-name">{{ note.author?.nickname || note.author?.name }}</span>
                  <span class="note-date"><Calendar :size="12" /> {{ formatDate(note.createdAt) }}</span>
                </div>
              </div>
              <div class="note-actions">
                <button 
                  @click="handleTogglePin(note)" 
                  class="action-btn" 
                  :title="note.isPinned ? 'Desafixar' : 'Fixar'"
                  :class="{ 'active': note.isPinned }"
                >
                  <PinOff v-if="note.isPinned" :size="18" />
                  <Pin v-else :size="18" />
                </button>
                <button @click="handleDeleteNote(note._id)" class="action-btn delete" title="Excluir">
                  <Trash2 :size="18" />
                </button>
              </div>
            </div>

            <div class="note-content prose" v-html="renderContent(note.content)"></div>
          </div>

          <!-- Sentinel for Infinite Scroll -->
          <div ref="loadMoreSentinel" class="load-more-sentinel">
            <div v-if="notesStore.isFetchingMore" class="fetch-more-loader">
              <div class="mini-loader"></div>
              <span>Carregando mais notas...</span>
            </div>
          </div>
        </div>

        <div v-else class="empty-notes">
          <div class="empty-icon">
            <Quote :size="48" />
          </div>
          <h4>Nenhuma anotação ainda</h4>
          <p>As notas que você criar aparecerão aqui no histórico.</p>
        </div>
      </section>

      <!-- RIGHT COLUMN: EDITOR -->
      <section class="notes-column editor-column">
        <div class="column-header">
          <h3><Plus :size="20" /> Nova Anotação</h3>
        </div>

        <div class="editor-container-card">
          <div class="editor-user-info">
            <div class="user-avatar">{{ authStore.user?.name?.charAt(0) }}</div>
            <span class="user-label">Postando como <strong>{{ authStore.user?.nickname || authStore.user?.name }}</strong></span>
          </div>

          <div class="tiptap-editor-wrapper">
            <EditorToolbar v-if="editor" :editor="editor" />
            <div class="editor-scroll-area">
              <EditorContent :editor="editor" />
            </div>
            
            <div class="editor-footer">
              <span class="hint">Use o editor acima para formatar sua nota.</span>
              <AppButton 
                @click="handleCreateNote" 
                variant="primary" 
                :disabled="isSubmitting || !editor || editor.isEmpty"
              >
                <Send :size="16" />
                Postar Nota
              </AppButton>
            </div>
          </div>
        </div>

        <!-- Tip Card -->
        <div class="tips-card">
          <div class="tip-icon"><Layout :size="18" /></div>
          <div class="tip-content">
            <h4>Dica Organizacional</h4>
            <p>Fixe notas importantes no topo para visualizá-las rapidamente sempre que abrir o perfil do paciente.</p>
          </div>
        </div>
      </section>

    </div>
  </div>
</template>

<style scoped>
.patient-notes-redesign {
  padding: 0.5rem;
}

.notes-grid {
  display: flex;
  flex-direction: column; /* Mobile first: stacking */
  gap: 2rem;
}

@media (min-width: 1024px) {
  .notes-grid {
    display: grid;
    grid-template-columns: 1.2fr 1fr;
    align-items: start;
  }
  
  /* On desktop, keep list on left and editor on right as per user's split request */
  .list-column { order: 1; }
  .editor-column { order: 2; }
}

@media (max-width: 1023px) {
  /* On mobile, make the editor appear on top */
  .editor-column { order: 1; }
  .list-column { order: 2; }
}

.notes-column {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.column-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding-bottom: 0.5rem;
  border-bottom: 2px solid #f1f5f9;
}

.column-header h3 {
  margin: 0;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: #1e293b;
  font-size: 1.1rem;
  font-weight: 700;
}

.count-badge {
  background: #e2e8f0;
  color: #475569;
  padding: 0.1rem 0.6rem;
  border-radius: 20px;
  font-size: 0.8rem;
  font-weight: 600;
}

/* Feed Column */
.notes-feed {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  max-height: 800px;
  overflow-y: auto;
  padding-right: 0.5rem;
}

/* Custom scrollbar for feed */
.notes-feed::-webkit-scrollbar {
  width: 6px;
}
.notes-feed::-webkit-scrollbar-track {
  background: #f1f5f9;
  border-radius: 10px;
}
.notes-feed::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 10px;
}

.note-card {
  background: white;
  border-radius: 12px;
  padding: 1.25rem;
  border: 1px solid #e2e8f0;
  position: relative;
  transition: all 0.2s;
  box-shadow: 0 2px 4px rgba(0,0,0,0.02);
}

.note-card:hover {
  border-color: #cbd5e1;
  box-shadow: 0 4px 12px rgba(0,0,0,0.05);
}

.note-card.pinned {
  border: 1px solid #3b82f6; /* Borda completa mas fina */
  background: #f0f7ff;
}

.pinned-indicator {
  position: absolute;
  top: 0;
  right: 2rem;
  background: #3b82f6;
  color: white;
  padding: 2px 8px;
  font-size: 0.65rem;
  font-weight: 800;
  border-bottom-left-radius: 6px;
  border-bottom-right-radius: 6px;
  display: flex;
  align-items: center;
  gap: 0.25rem;
  letter-spacing: 0.05em;
  box-shadow: 0 2px 4px rgba(59, 130, 246, 0.2);
}

.note-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 1rem;
}

.note-author {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.author-avatar {
  width: 36px;
  height: 36px;
  background: #f1f5f9;
  color: #475569;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  border: 1px solid #e2e8f0;
}

.author-details {
  display: flex;
  flex-direction: column;
}

.author-name {
  font-weight: 600;
  color: #1e293b;
  font-size: 0.95rem;
}

.note-date {
  font-size: 0.75rem;
  color: #94a3b8;
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.note-actions {
  display: flex;
  gap: 0.25rem;
}

.action-btn {
  background: none;
  border: none;
  padding: 0.4rem;
  border-radius: 6px;
  color: #94a3b8;
  cursor: pointer;
  transition: all 0.2s;
}

.action-btn:hover {
  background: #f1f5f9;
  color: #3b82f6;
}

.action-btn.active {
  color: #3b82f6;
}

.action-btn.delete:hover {
  background: #fee2e2;
  color: #ef4444;
}

.note-content {
  color: #334155;
  line-height: 1.5;
  font-size: 0.95rem;
}

/* Editor Column */
.editor-container-card {
  background: white;
  border-radius: 12px;
  border: 1px solid #e2e8f0;
  overflow: hidden;
  box-shadow: 0 4px 15px rgba(0,0,0,0.05);
  display: flex;
  flex-direction: column;
}

.editor-user-info {
  padding: 1rem 1.25rem;
  background: #f8fafc;
  border-bottom: 1px solid #f1f5f9;
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.editor-user-info .user-avatar {
  width: 28px;
  height: 28px;
  background: #3b82f6;
  color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  font-size: 0.75rem;
}

.user-label {
  font-size: 0.85rem;
  color: #64748b;
}

.tiptap-editor-wrapper {
  display: flex;
  flex-direction: column;
}

.editor-scroll-area {
  min-height: 200px; /* Voltando para o tamanho que estava */
  max-height: 400px;
  overflow-y: auto;
  border-bottom: 1px solid #f1f5f9;
}

/* Tiptap specific resets and live preview */
:deep(.ProseMirror) {
  outline: none;
  min-height: 200px;
  padding: 1.5rem;
}

:deep(.ProseMirror strong), 
:deep(.ProseMirror b) { 
  font-weight: 800 !important; 
  color: #000 !important; 
}

:deep(.ProseMirror em), 
:deep(.ProseMirror i) { 
  font-style: italic !important; 
}

:deep(.ProseMirror del), 
:deep(.ProseMirror s), 
:deep(.ProseMirror strike) { 
  text-decoration: line-through !important; 
  color: #94a3b8 !important; 
}

:deep(.ProseMirror code) { 
  background: #f1f5f9 !important; 
  color: #1e293b !important; /* Cor mais neutra, removendo o vermelho */
  padding: 0.2rem 0.4rem !important; 
  border-radius: 4px !important; 
  font-family: monospace !important;
  font-size: 0.9em !important;
}

:deep(.ProseMirror p.is-editor-empty:first-child::before) {
  content: "Comece a escrever aqui...";
  float: left;
  color: #adb5bd;
  pointer-events: none;
  height: 0;
}

.editor-footer {
  padding: 1rem 1.25rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: white;
}

.hint {
  font-size: 0.75rem;
  color: #94a3b8;
  max-width: 60%;
}

.tips-card {
  background: #f0f9ff;
  border-radius: 12px;
  padding: 1.25rem;
  border: 1px solid #bae6fd;
  display: flex;
  gap: 1rem;
}

.tip-icon {
  color: #0369a1;
  background: white;
  width: 36px;
  height: 36px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.tip-content h4 {
  margin: 0 0 0.25rem;
  color: #0c4a6e;
  font-size: 0.9rem;
  font-weight: 700;
}

.tip-content p {
  margin: 0;
  color: #075985;
  font-size: 0.85rem;
  line-height: 1.4;
}

/* Prose/Markdown styling inside feed */
.prose :deep(h1), .prose :deep(h2), .prose :deep(h3) { margin-top: 0.75rem; margin-bottom: 0.4rem; color: #1e293b; font-weight: 700; }
.prose :deep(h1) { font-size: 1.25rem; }
.prose :deep(h2) { font-size: 1.1rem; }
.prose :deep(h3) { font-size: 1rem; }
.prose :deep(p) { margin-bottom: 0.5rem; }
.prose :deep(ul), .prose :deep(ol) { margin-left: 1.25rem; margin-bottom: 0.5rem; }
.prose :deep(li) { margin-bottom: 0.25rem; }
.prose :deep(blockquote) { border-left: 4px solid #e2e8f0; padding-left: 1rem; color: #64748b; font-style: italic; }
.prose :deep(strong), .prose :deep(b) { font-weight: 800 !important; color: #000 !important; display: inline !important; }
.prose :deep(em), .prose :deep(i) { font-style: italic !important; display: inline !important; }
.prose :deep(del), .prose :deep(s), .prose :deep(strike) { text-decoration: line-through !important; color: #94a3b8 !important; }
.prose :deep(code) { 
  background: #f1f5f9 !important; 
  color: #1e293b !important; /* Cor mais neutra aqui também */
  padding: 0.2rem 0.4rem !important; 
  border-radius: 4px !important; 
  font-family: monospace !important;
  font-size: 0.9em !important;
}

/* Empty state */
.empty-notes {
  text-align: center;
  padding: 3rem 1rem;
  background: #f8fafc;
  border-radius: 12px;
  border: 2px dashed #e2e8f0;
}

.empty-icon {
  margin-bottom: 1rem;
  color: #cbd5e1;
}

.empty-notes h4 {
  margin: 0 0 0.5rem;
  color: #475569;
}

.empty-notes p {
  color: #94a3b8;
  font-size: 0.9rem;
}

.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 3rem;
  color: #64748b;
}

.loader {
  border: 3px solid #f3f3f3;
  border-top: 3px solid #3b82f6;
  border-radius: 50%;
  width: 24px;
  height: 24px;
  animation: spin 1s linear infinite;
  margin-bottom: 0.75rem;
}

.load-more-sentinel {
  padding: 1rem;
  display: flex;
  justify-content: center;
  min-height: 50px;
}

.fetch-more-loader {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  color: #64748b;
  font-size: 0.85rem;
}

.mini-loader {
  border: 2px solid #f3f3f3;
  border-top: 2px solid #3b82f6;
  border-radius: 50%;
  width: 16px;
  height: 16px;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
</style>
