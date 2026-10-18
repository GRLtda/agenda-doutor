import { ref } from 'vue'
import { isTemporaryApiError } from '@/utils/apiErrors'

export const isApiUnavailable = ref(false)
let revision = 0
const reportedErrors = new WeakSet()

export const getApiAvailabilityRevision = () => revision

export function reportApiFailure(error) {
  if (!isTemporaryApiError(error) || reportedErrors.has(error)) return
  reportedErrors.add(error)
  revision++
  isApiUnavailable.value = true
}

export function reportApiSuccess(requestRevision) {
  // An older concurrent request succeeding does not prove recovery from a new failure.
  if (requestRevision >= revision) isApiUnavailable.value = false
}
