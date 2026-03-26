<script setup>
import { computed } from 'vue'
import { Marked } from 'marked'

const marked = new Marked({
  gfm: true,
  breaks: true,
})

marked.use({
  renderer: {
    link({ href, title, tokens }) {
      const text = this.parser.parseInline(tokens)
      const safeHref = href || '#'
      const titleAttr = title ? ` title="${title}"` : ''
      const isExternal = /^https?:\/\//i.test(safeHref)
      const targetAttrs = isExternal ? ' target="_blank" rel="noopener noreferrer"' : ''
      return `<a href="${safeHref}"${titleAttr}${targetAttrs}>${text}</a>`
    },
    image({ href, title, text }) {
      const alt = text || 'imagem'
      const safeSrc = href || ''
      const titleAttr = title ? ` title="${title}"` : ''
      return `<img src="${safeSrc}" alt="${alt}" loading="lazy"${titleAttr} />`
    },
  },
})

const props = defineProps({
  content: {
    type: String,
    default: '',
  },
})

const htmlContent = computed(() => {
  if (!props.content) return ''

  try {
    return marked.parse(props.content)
  } catch (error) {
    console.error('[MarkdownRenderer] erro ao renderizar markdown:', error)
    return '<p>Não foi possível renderizar este conteúdo.</p>'
  }
})
</script>

<template>
  <article class="markdown-body" v-html="htmlContent"></article>
</template>

<style scoped>
.markdown-body {
  color: #111827;
  line-height: 1.75;
  font-size: 0.97rem;
}

.markdown-body :deep(h1),
.markdown-body :deep(h2),
.markdown-body :deep(h3),
.markdown-body :deep(h4) {
  color: #0f172a;
  line-height: 1.25;
  margin-top: 1.6rem;
  margin-bottom: 0.8rem;
}

.markdown-body :deep(h1) {
  font-size: 1.85rem;
}

.markdown-body :deep(h2) {
  font-size: 1.45rem;
}

.markdown-body :deep(h3) {
  font-size: 1.2rem;
}

.markdown-body :deep(p) {
  margin: 0.7rem 0;
}

.markdown-body :deep(ul),
.markdown-body :deep(ol) {
  padding-left: 1.35rem;
  margin: 0.8rem 0;
}

.markdown-body :deep(li) {
  margin-bottom: 0.32rem;
}

.markdown-body :deep(blockquote) {
  margin: 1rem 0;
  border-left: 4px solid #bfdbfe;
  padding: 0.5rem 0.9rem;
  color: #475569;
  background-color: #eff6ff;
  border-radius: 0 0.4rem 0.4rem 0;
}

.markdown-body :deep(code) {
  background-color: #f3f4f6;
  padding: 0.15rem 0.35rem;
  border-radius: 0.35rem;
  font-size: 0.9em;
}

.markdown-body :deep(pre) {
  background-color: #0f172a;
  color: #e2e8f0;
  padding: 0.95rem;
  border-radius: 0.7rem;
  overflow-x: auto;
}

.markdown-body :deep(pre code) {
  background-color: transparent;
  padding: 0;
}

.markdown-body :deep(a) {
  color: #2563eb;
  text-decoration: none;
  font-weight: 500;
}

.markdown-body :deep(a:hover) {
  text-decoration: underline;
}

.markdown-body :deep(img) {
  max-width: 100%;
  border-radius: 0.8rem;
  margin: 1rem 0;
  border: 1px solid #e5e7eb;
}

.markdown-body :deep(table) {
  width: 100%;
  border-collapse: collapse;
  margin: 1rem 0;
}

.markdown-body :deep(th),
.markdown-body :deep(td) {
  border: 1px solid #e5e7eb;
  padding: 0.55rem 0.7rem;
  text-align: left;
}

.markdown-body :deep(th) {
  background-color: #f8fafc;
}
</style>
