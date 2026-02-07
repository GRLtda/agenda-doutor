<script setup lang="ts">
import { LifeBuoy } from 'lucide-vue-next'
</script>

<template>
  <div class="flex flex-col items-center text-center space-y-4 mb-8">
    <div class="h-16 w-16 bg-primary/10 rounded-2xl flex items-center justify-center text-primary mb-2">
       <LifeBuoy :size="32" />
    </div>
    <div class="space-y-2">
      <h1 class="text-3xl font-bold tracking-tight">Central de Ajuda</h1>
      <p class="text-muted-foreground text-lg max-w-[600px]">
        Encontre respostas para as suas dúvidas mais comuns.
      </p>
    </div>
  </div>
</template>
