// Tags geradas por generateAutoTags (uploads.controller.js) e pelo upload de procedimentos.
const automaticTags = new Set([
  'imagens', 'documentos', 'branding', 'perfil',
  'imagem', 'pdf', 'documento',
  'foto-paciente', 'logo-clinica',
  'atendimento', 'procedimento', 'laudo',
  'perfil-foto', 'comprimida',
  'migrado', 'cloudinary-legacy',
])

export function isAutomaticGalleryTag(tag) {
  return automaticTags.has(String(tag).trim().toLowerCase())
}

export function visibleGalleryTags(tags) {
  return (Array.isArray(tags) ? tags : []).filter(
    (tag) => !isAutomaticGalleryTag(tag),
  )
}
