<script setup lang="js">
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Mail, LifeBuoy } from 'lucide-vue-next'
</script>

<template>
  <div class="mt-20 max-w-2xl mx-auto text-center animate-fade-in-up">
    <Card class="bg-muted/50 border-none shadow-sm">
      <CardContent class="p-8 flex flex-col items-center">
        <div class="h-12 w-12 bg-background rounded-full flex items-center justify-center mb-4 shadow-sm border border-border/10">
           <LifeBuoy class="h-6 w-6 text-primary" />
        </div>
        <h3 class="text-xl font-bold mb-2">Não encontrou o que precisava?</h3>
        <p class="text-muted-foreground mb-6 max-w-md">
          Nossa equipe de suporte está pronta para te ajudar. Entre em contato conosco.
        </p>
        
        <a href="mailto:suporte@clinicacrm.com" class="w-full sm:w-auto">
          <Button size="lg" class="w-full sm:w-auto font-semibold shadow-md hover:shadow-lg transition-all">
            <Mail class="mr-2 h-4 w-4" />
            Falar com Suporte
          </Button>
        </a>
      </CardContent>
    </Card>
  </div>
</template>
