import { inject, provide } from 'vue'
// Cada cartão da prévia define seu próprio cenário; os módulos substituídos leem daqui (inject em setup).
export const provideScenario = (value) => provide('oauth-preview-scenario', value)
export const useScenario = () => inject('oauth-preview-scenario', {})
