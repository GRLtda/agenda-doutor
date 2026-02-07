<script setup lang="ts">
import { computed, onBeforeUnmount } from 'vue'
import { useEditor, EditorContent } from '@tiptap/vue-3'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card'
import EditorToolbar from '@/components/shared/EditorToolbar.vue'
import { Send, Plus } from 'lucide-vue-next'

const props = defineProps<{
  userName?: string
  isSubmitting?: boolean
}>()

const emit = defineEmits<{
  (e: 'submit', content: string): void
}>()

const editor = useEditor({
  content: '',
  extensions: [
    StarterKit,
    Underline,
  ],
  editorProps: {
    attributes: {
      class: 'prose prose-sm focus:outline-none max-w-none min-h-[150px] p-4',
    },
  },
})

onBeforeUnmount(() => {
  editor.value?.destroy()
})

const userInitial = computed(() => props.userName?.charAt(0).toUpperCase() || 'U')

const isEmpty = computed(() => editor.value?.isEmpty ?? true)

function handleSubmit() {
  if (!editor.value || isEmpty.value) return
  // Get plain text content instead of markdown
  const content = editor.value.getText()
  emit('submit', content)
  editor.value.commands.setContent('')
}
</script>

<template>
  <Card class="card-brand-accent">
    <CardHeader class="pb-3">
      <div class="flex items-center gap-3">
        <Plus class="h-5 w-5 text-brand" />
        <span class="font-semibold">Nova Anotação</span>
      </div>
    </CardHeader>
    
    <CardContent class="pt-0 pb-0">
      <!-- User Info -->
      <div class="flex items-center gap-3 mb-3 p-3 bg-muted/50 rounded-lg">
        <Avatar class="h-7 w-7">
          <AvatarFallback class="bg-brand-gradient text-white text-xs font-bold">
            {{ userInitial }}
          </AvatarFallback>
        </Avatar>
        <span class="text-sm text-muted-foreground">
          Postando como <strong class="text-foreground">{{ userName }}</strong>
        </span>
      </div>

      <!-- Editor -->
      <div class="border rounded-lg overflow-hidden">
        <EditorToolbar v-if="editor" :editor="editor" />
        <div 
          class="min-h-[150px] max-h-[300px] overflow-y-auto cursor-text"
          @click="editor?.commands.focus()"
        >
          <EditorContent :editor="editor" />
        </div>
      </div>
    </CardContent>

    <CardFooter class="pt-4 flex justify-between items-center">
      <span class="text-xs text-muted-foreground hidden sm:block">
        Use o editor acima para formatar sua nota.
      </span>
      <Button 
        @click="handleSubmit"
        :disabled="isSubmitting || isEmpty"
        class="bg-brand-gradient hover:opacity-90"
      >
        <Send class="h-4 w-4 mr-2" />
        Postar Nota
      </Button>
    </CardFooter>
  </Card>
</template>
