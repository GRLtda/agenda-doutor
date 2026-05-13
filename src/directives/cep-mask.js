export function formatCEP(value) {
  if (!value) return ''
  const digits = value.replace(/\D/g, '')

  if (digits.length <= 5) {
    return digits
  }

  return digits
    .slice(0, 8)
    .replace(/^(\d{5})(\d{1,3})$/, '$1-$2')
}

export const cepMask = {
  mounted(el, binding) {
    if (binding.value) {
      const onInput = (event) => {
        const value = event.target.value
        const formatted = formatCEP(value)

        if (formatted !== value) {
          event.target.value = formatted
          el.dispatchEvent(new Event('input'))
        }
      }

      el.addEventListener('input', onInput)
      el._onInput = onInput

      // Initial formatting if value already exists
      setTimeout(() => {
        onInput({ target: el })
      }, 0)
    }
  },
  unmounted(el) {
    if (el._onInput) {
      el.removeEventListener('input', el._onInput)
    }
  },
}
