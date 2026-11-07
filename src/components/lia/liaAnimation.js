import { createLia } from './liaEngine'

export function createLiaAnimation(stage, { intro = false, reducedMotion = false, state = 'attentive', pointerTarget = stage.closest('.lia-window') || stage } = {}) {
  return createLia(stage, undefined, reducedMotion, { intro, state, pointerTarget })
}
