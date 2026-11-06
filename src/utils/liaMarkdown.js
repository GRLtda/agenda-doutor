import { marked } from 'marked'

const escapeHtml = value => String(value || '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char])
const renderer = new marked.Renderer()
renderer.html = () => ''
renderer.image = ({ text }) => escapeHtml(text)
renderer.link = function ({ tokens }) { return this.parser.parseInline(tokens) }

export const renderLiaMarkdown = content => marked.parse(content || '', { async: false, breaks: true, gfm: true, renderer })
