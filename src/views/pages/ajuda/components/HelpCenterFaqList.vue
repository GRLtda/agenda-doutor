<script setup lang="js">
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { Card, CardContent } from '@/components/ui/card'
import { SearchX } from 'lucide-vue-next'

const props = defineProps({
  categories: Array,
  searchQuery: String
})
</script>

<template>
  <div class="space-y-12 max-w-3xl mx-auto">
    <!-- Empty State -->
    <div v-if="categories.length === 0" class="flex flex-col items-center justify-center py-12 text-center animate-fade-in">
       <div class="h-16 w-16 bg-muted rounded-full flex items-center justify-center mb-4">
         <SearchX class="h-8 w-8 text-muted-foreground" />
       </div>
       <h3 class="text-lg font-semibold mb-1">Nenhum resultado encontrado</h3>
       <p class="text-muted-foreground">
         Não encontramos nada para "{{ searchQuery }}". Tente usar outras palavras-chave.
       </p>
    </div>

    <!-- FAQ Categories -->
    <div v-else class="animate-fade-in">
      <div v-for="category in categories" :key="category.category" class="mb-10 last:mb-0">
        <h2 class="text-xl font-semibold mb-4 pb-2 border-b border-border/60">
          {{ category.category }}
        </h2>
        <Accordion type="single" collapsible class="w-full">
           <AccordionItem v-for="item in category.items" :key="item.id" :value="item.id">
             <AccordionTrigger class="text-left text-base text-foreground/90 hover:text-primary transition-colors hover:no-underline">
               {{ item.question }}
             </AccordionTrigger>
             <AccordionContent class="text-muted-foreground text-[15px] leading-relaxed">
               {{ item.answer }}
             </AccordionContent>
           </AccordionItem>
        </Accordion>
      </div>
    </div>
  </div>
</template>
