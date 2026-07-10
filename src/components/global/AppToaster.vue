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
