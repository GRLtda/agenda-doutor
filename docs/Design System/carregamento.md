# Carregamento com skeleton

Skeleton é o padrão para carregar conteúdo de páginas, listas, formulários e
painéis. Reutilize [AppSkeleton](../../src/components/global/AppSkeleton.vue)
e preserve a disposição que o conteúdo terá ao concluir a consulta.

## Quando usar

| Situação | Apresentação |
| --- | --- |
| Lista ou tabela | Linhas com blocos nas posições de texto, avatar e ações; preserve cabeçalho e paginação quando aplicável. |
| Cards de resumo | Estrutura do card preservada, com skeleton no valor. `FinanceSummaryCard` já oferece `loading`. |
| Gráfico ou painel | Placeholder com dimensões próximas à área ocupada pelo gráfico ou dados finais. |
| Formulário que consulta dados | Skeleton apenas nos campos dependentes da consulta, mantendo rótulos e campos independentes. |
| Ação de salvar ou atualizar | Estado `loading` do `AppButton`, bloqueando repetição e preservando suas dimensões. Se o conteúdo recarregar, use skeleton na área afetada. |
| Upload de arquivo | Toast de progresso real, não skeleton. Veja o contrato em [Componentes compartilhados](../componentes-compartilhados.md). |

Não substitua listas por um texto isolado “Carregando…”. Não mostre zeros,
indicadores saudáveis ou mensagens de vazio enquanto a consulta está pendente.
Mantenha visíveis os controles de navegação que não dependem dos dados.

## Contrato do componente

| Prop | Padrão atual | Uso |
| --- | --- | --- |
| `width` | `'100%'` | Largura como string CSS. |
| `height` | `'1rem'` | Altura como string CSS. |
| `borderRadius` | `'0.5rem'` | Raio compatível com o conteúdo. |
| `bg` | `'#e2e8f0'` | Cor de base. |
| `shimmer` | `'#f8fafc'` | Cor do brilho. |

```vue
<script setup>
import AppSkeleton from '@/components/global/AppSkeleton.vue'
</script>

<template>
  <section :aria-busy="isLoading">
    <div v-if="isLoading" class="loading-lines">
      <AppSkeleton width="45%" height="1rem" />
      <AppSkeleton height="2.5rem" border-radius="0.75rem" />
      <AppSkeleton width="70%" height="0.8rem" />
    </div>
    <div v-else-if="loadError" role="alert">{{ loadError }}</div>
    <div v-else>…conteúdo carregado…</div>
  </section>
</template>
```

O exemplo supõe que `isLoading` e `loadError` sejam os estados da tela.
O layout e o espaçamento dos blocos pertencem ao componente consumidor.
O skeleton atual usa shimmer CSS de 1.5s, com background em gradiente e
`display: inline-block`; não gerencia consulta, erro ou acessibilidade da região.
Declare `aria-busy` na região correspondente. O componente ainda não declara
um tratamento próprio de `prefers-reduced-motion`; não assuma que já existe.

## Ao concluir

- Sucesso com dados: substituir os placeholders pelo conteúdo real.
- Sucesso sem dados: usar o [padrão de estados vazios](../estados-vazios.md).
- Falha: mostrar mensagem e ação de tentar novamente na área afetada.
- Nova tentativa: voltar ao carregamento sem duplicar requisições.

Confira desktop e celular com rede lenta, erro e ausência de dados. Skeletons
devem representar a quantidade e distribuição úteis do conteúdo, sem causar
grandes saltos de altura ao desaparecer. Referência de aplicação:
[Resumo do estoque](../estoque.md).
