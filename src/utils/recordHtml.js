// Utilitários para exibir texto de prontuário na revisão da sugestão da Lia.
// O HTML é reconstruído a partir de uma lista de tags permitidas, sem atributos.
const ALLOWED = new Set(['p', 'br', 'strong', 'b', 'em', 'i', 'u', 's', 'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'blockquote', 'code', 'pre', 'hr'])
const WORD = /[\p{L}\p{N}]+/gu

function sanitizeInto(source, target) {
  for (const node of source.childNodes) {
    if (node.nodeType === Node.TEXT_NODE) target.appendChild(document.createTextNode(node.textContent))
    else if (node.nodeType === Node.ELEMENT_NODE) {
      const tag = node.tagName.toLowerCase()
      if (ALLOWED.has(tag)) {
        const element = document.createElement(tag)
        sanitizeInto(node, element)
        target.appendChild(element)
      } else if (!['script', 'style', 'iframe', 'object', 'embed'].includes(tag)) sanitizeInto(node, target)
    }
  }
}

function toSafeElement(html) {
  const parsed = new DOMParser().parseFromString(`<body>${html || ''}</body>`, 'text/html')
  const container = document.createElement('div')
  sanitizeInto(parsed.body, container)
  return container
}

export function sanitizeRecordHtml(html) {
  return toSafeElement(html).innerHTML
}

// Destaca com <mark> as palavras da sugestão que não existem no texto original.
export function markChangedWords(originalHtml, refinedHtml) {
  const known = new Set((toSafeElement(originalHtml).textContent.match(WORD) || []).map(word => word.toLowerCase()))
  const container = toSafeElement(refinedHtml)
  const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT)
  const texts = []
  while (walker.nextNode()) texts.push(walker.currentNode)
  let changed = 0
  for (const node of texts) {
    // Títulos de organização não contam como palavras ajustadas.
    if (node.parentElement?.closest('h1, h2, h3')) continue
    const text = node.textContent
    const fragment = document.createDocumentFragment()
    let last = 0
    for (const match of text.matchAll(WORD)) {
      if (known.has(match[0].toLowerCase())) continue
      fragment.appendChild(document.createTextNode(text.slice(last, match.index)))
      const mark = document.createElement('mark')
      mark.textContent = match[0]
      fragment.appendChild(mark)
      last = match.index + match[0].length
      changed += 1
    }
    if (!last) continue
    fragment.appendChild(document.createTextNode(text.slice(last)))
    node.replaceWith(fragment)
  }
  return { html: container.innerHTML, changed }
}
