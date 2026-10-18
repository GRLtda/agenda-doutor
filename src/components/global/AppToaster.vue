<script setup>
import 'vue-sonner/style.css'
import { Toaster } from '@/components/ui/sonner'
</script>

<template>
  <Toaster
    rich-colors
    close-button
    position="bottom-right"
    :duration="4000"
    :visible-toasts="4"
  />
</template>

<style>
/* Keep upload notifications inside Sonner's native sizing and animation frame. */
[data-sonner-toast].app-upload-toast[data-type='loading'] [data-icon] {
  align-self: flex-start;
  width: 20px;
  height: 20px;
  margin-top: 0;
  color: var(--azul-principal, #2563eb);
}
[data-sonner-toast].app-upload-toast[data-type='loading'] [data-icon] svg {
  width: 20px;
  height: 20px;
}
[data-sonner-toast].app-upload-toast [data-content] {
  flex: 1;
  min-width: 0;
}
[data-sonner-toast].app-upload-toast [data-title] {
  font-weight: 500;
}
[data-sonner-toast].app-upload-toast [data-description] {
  font-weight: 400;
}
</style>
