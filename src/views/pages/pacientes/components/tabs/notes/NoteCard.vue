<script setup lang="ts">
import { computed } from 'vue'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Pin, PinOff, Trash2, Calendar } from 'lucide-vue-next'
import { Marked } from 'marked'

const marked = new Marked()

interface Author {
  name?: string
  nickname?: string
}

interface Note {
  _id: string
  content: string
  isPinned?: boolean
  createdAt: string
  author?: Author
}

const props = defineProps<{
  note: Note
}>()

const emit = defineEmits<{
  (e: 'toggle-pin'): void
  (e: 'delete'): void
}>()

const authorInitial = computed(() => 
  props.note.author?.name?.charAt(0).toUpperCase() || '?'
)

const authorName = computed(() => 
  props.note.author?.nickname || props.note.author?.name || 'Autor'
)

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

function renderContent(content: string): string {
  if (!content) return ''
  try {
    return marked.parse(content) as string
  } catch (err) {
    return content
  }
}
</script>

<template>
  <Card 
    :class="[
      'transition-all hover:shadow-md',
      note.isPinned ? 'border-primary/50 bg-primary/5' : ''
    ]"
  >
    <CardContent class="p-4">
      <!-- Pinned Badge -->
      <Badge 
        v-if="note.isPinned" 
        class="badge-pinned mb-3 text-xs px-2 py-0.5"
      >
        <Pin class="h-3 w-3 mr-1" />
        FIXADO
      </Badge>

      <!-- Header: Author + Actions -->
      <div class="flex items-start justify-between mb-3">
        <div class="flex items-center gap-3">
          <Avatar class="h-9 w-9">
            <AvatarFallback class="bg-muted text-muted-foreground text-sm font-semibold">
              {{ authorInitial }}
            </AvatarFallback>
          </Avatar>
          <div>
            <p class="font-semibold text-sm">{{ authorName }}</p>
            <p class="text-xs text-muted-foreground flex items-center gap-1">
              <Calendar class="h-3 w-3" />
              {{ formatDate(note.createdAt) }}
            </p>
          </div>
        </div>
        
        <div class="flex items-center gap-1">
          <Button 
            variant="ghost" 
            size="icon" 
            class="h-8 w-8"
            :class="{ 'text-primary': note.isPinned }"
            @click="emit('toggle-pin')"
            :title="note.isPinned ? 'Desafixar' : 'Fixar'"
          >
            <PinOff v-if="note.isPinned" class="h-4 w-4" />
            <Pin v-else class="h-4 w-4" />
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            class="h-8 w-8 text-destructive hover:bg-destructive/10"
            @click="emit('delete')"
            title="Excluir"
          >
            <Trash2 class="h-4 w-4" />
          </Button>
        </div>
      </div>

      <!-- Content -->
      <div 
        class="prose prose-sm max-w-none text-foreground"
        v-html="renderContent(note.content)"
      />
    </CardContent>
  </Card>
</template>
