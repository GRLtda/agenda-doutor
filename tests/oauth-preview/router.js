import { useScenario } from './scenario'
export const useRoute = () => ({ query: useScenario().query || {}, fullPath: '/perfil' })
export const useRouter = () => ({ replace: () => Promise.resolve(), push: () => Promise.resolve() })
