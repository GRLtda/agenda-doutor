<script setup>
import {
  Bold, Italic, Strikethrough, Code,
  List, ListOrdered, Minus, AlignLeft, AlignCenter, AlignRight,
  Quote, CodeSquare, Link, Unlink, Heading1, Heading2, Heading3,
  Undo, Redo, Eraser // Adicionados para um editor mais completo
} from 'lucide-vue-next';

defineProps({ editor: { type: Object, required: true } });

// Função auxiliar para aplicar estilos de alinhamento
const setTextAlign = (alignment) => {
  if (alignment === 'left') {
    editor.value.chain().focus().unsetTextAlign().run(); // Left é o padrão, então remove o alinhamento
  } else {
    editor.value.chain().focus().setTextAlign(alignment).run();
  }
};
</script>

<template>
  <div v-if="editor" class="editor-toolbar">
    <div class="toolbar-group">
      <button @click="editor.chain().focus().toggleBold().run()" :class="{ 'is-active': editor.isActive('bold') }" title="Negrito">
        <Bold :size="16" />
      </button>
      <button @click="editor.chain().focus().toggleItalic().run()" :class="{ 'is-active': editor.isActive('italic') }" title="Itálico">
        <Italic :size="16" />
      </button>
      <button @click="editor.chain().focus().toggleStrike().run()" :class="{ 'is-active': editor.isActive('strike') }" title="Tachado">
        <Strikethrough :size="16" />
      </button>
      <button @click="editor.chain().focus().toggleCode().run()" :class="{ 'is-active': editor.isActive('code') }" title="Código Inline">
        <Code :size="16" />
      </button>
    </div>

    <div class="toolbar-group">
      <button @click="editor.chain().focus().toggleHeading({ level: 1 }).run()" :class="{ 'is-active': editor.isActive('heading', { level: 1 }) }" title="Título 1">
        <Heading1 :size="16" />
      </button>
      <button @click="editor.chain().focus().toggleHeading({ level: 2 }).run()" :class="{ 'is-active': editor.isActive('heading', { level: 2 }) }" title="Título 2">
        <Heading2 :size="16" />
      </button>
      <button @click="editor.chain().focus().toggleHeading({ level: 3 }).run()" :class="{ 'is-active': editor.isActive('heading', { level: 3 }) }" title="Título 3">
        <Heading3 :size="16" />
      </button>
    </div>

    <div class="toolbar-group">
      <button @click="editor.chain().focus().toggleBulletList().run()" :class="{ 'is-active': editor.isActive('bulletList') }" title="Lista Pontilhada">
        <List :size="16" />
      </button>
      <button @click="editor.chain().focus().toggleOrderedList().run()" :class="{ 'is-active': editor.isActive('orderedList') }" title="Lista Numerada">
        <ListOrdered :size="16" />
      </button>
      <button @click="editor.chain().focus().toggleBlockquote().run()" :class="{ 'is-active': editor.isActive('blockquote') }" title="Citação">
        <Quote :size="16" />
      </button>
      <button @click="editor.chain().focus().toggleCodeBlock().run()" :class="{ 'is-active': editor.isActive('codeBlock') }" title="Bloco de Código">
        <CodeSquare :size="16" />
      </button>
    </div>

    <div class="toolbar-group">
      <button @click="editor.chain().focus().setHorizontalRule().run()" title="Linha Horizontal">
        <Minus :size="16" />
      </button>
      <button @click="editor.chain().focus().undo().run()" title="Desfazer">
        <Undo :size="16" />
      </button>
      <button @click="editor.chain().focus().redo().run()" title="Refazer">
        <Redo :size="16" />
      </button>
      <button @click="editor.chain().focus().clearNodes().unsetAllMarks().run()" title="Limpar Formatação">
        <Eraser :size="16" />
      </button>
    </div>
  </div>
</template>

<style scoped>
.editor-toolbar {
  display: flex;
  flex-wrap: nowrap; /* Impede que os grupos quebrem a linha */
  overflow-x: auto;  /* Permite o scroll horizontal quando necessário */
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  background-color: #f9fafb;
  border-bottom: 1px solid #e5e7eb;
  border-top-left-radius: 0.75rem;
  border-top-right-radius: 0.75rem;

  /* Estilização sutil da barra de scroll */
  scrollbar-width: thin;
  scrollbar-color: #d1d5db transparent;
}

.editor-toolbar::-webkit-scrollbar {
  height: 6px;
}

.editor-toolbar::-webkit-scrollbar-track {
  background: transparent;
}

.editor-toolbar::-webkit-scrollbar-thumb {
  background-color: #d1d5db;
  border-radius: 6px;
}
/* Fim da estilização da barra de scroll */

.toolbar-group {
  display: flex;
  gap: 0.25rem;
  border: 1px solid #e5e7eb;
  border-radius: 0.5rem;
  padding: 0.25rem;
  background-color: var(--branco);
}

.editor-toolbar button {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  background: none;
  border: none;
  border-radius: 0.375rem;
  cursor: pointer;
  color: var(--cinza-texto);
  transition: background-color 0.2s ease, color 0.2s ease;
  flex-shrink: 0; /* Impede que os botões sejam espremidos */
}

.editor-toolbar button:hover {
  background-color: #f3f4f6;
  color: var(--preto);
}

.editor-toolbar button.is-active {
  background-color: #3b82f6;
  color: white;
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2);
  transform: translateY(1px);
}
</style>
