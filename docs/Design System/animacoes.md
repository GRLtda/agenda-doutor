# Animações

Demos interativas na seção Animações da [vitrine](vitrine.html#animacoes).
Classes em [motion.css](../../src/assets/css/motion.css) e tokens em
[tokens.css](../../src/assets/css/tokens.css), ambos importados por
[global.css](../../src/assets/css/global.css).

## Princípios

- No dia a dia, a interface é rápida (120–200ms), porque é usada o dia todo.
- A celebração é reservada para conclusões importantes.
- Tudo que entra na tela usa `--ds-ease-out`; o que sai é mais curto que o que entra.
- Animação nunca bloqueia a próxima ação nem esconde conteúdo à espera de scroll.

## Ritmo

| Token | Valor | Uso |
| --- | --- | --- |
| `--ds-duration-fast` | 120ms | Hover, press, troca de cor, saída de menu |
| `--ds-duration-base` | 200ms | Menu, tooltip, aba, switch, sobreposição |
| `--ds-duration-slow` | 320ms | Entrada de modal, drawer e itens de lista |
| `--ds-duration-step` | 480ms | Troca de etapa dentro de drawer ou formulário |
| `--ds-stagger` | 40ms | Atraso entre itens em cascata |
| `--ds-ease` | `cubic-bezier(0.4, 0, 0.2, 1)` | Mudanças de estado |
| `--ds-ease-out` | `cubic-bezier(0.16, 1, 0.3, 1)` | Entradas |
| `--ds-ease-spring` | `cubic-bezier(0.175, 0.885, 0.32, 1.275)` | Ícone que aparece (check, copiado) |

## Celebração de conclusão

Padrão extraído de [AssignAnamnesisModal](../../src/components/pages/pacientes/modals/AssignAnamnesisModal.vue)
e [AssignConsentTermModal](../../src/components/pages/pacientes/modals/AssignConsentTermModal.vue):

1. A ação principal mostra o carregamento do `AppButton`.
2. No sucesso, o cabeçalho recebe `.ds-celebrate`:
   - brilho, com o fundo verde e saturação de 0.75 → 1.18 → 1 em 1.45s;
   - faixa de luz diagonal que atravessa o cabeçalho em 1.75s;
   - círculo que se expande a partir do canto superior esquerdo em 1.85s.
3. O corpo troca de etapa com `<Transition name="ds-step" mode="out-in">`
   (480ms; entra subindo 8px, sai subindo 6px).
4. A etapa de sucesso mostra o Lottie `check.json` (154px; 136px no celular), um
   eyebrow verde ("Tudo pronto"), o título no particípio e a próxima ação.
5. O título do cabeçalho muda para o resultado ("Anamnese anexada").

| Variante | Classe | Quando |
| --- | --- | --- |
| Sucesso (verde) | `.ds-celebrate` | Algo foi concluído e registrado |
| Informação (azul) | `.ds-celebrate ds-celebrate--info` | Algo foi enviado ou agendado e aguarda o paciente (ex.: link enviado) |

Erro nunca celebra: mostra a mensagem no campo ou no formulário.

### Onde usar

| Usa celebração completa | Usa só toast |
| --- | --- |
| Anamnese ou termo anexado | Salvar edição |
| Paciente criado | Filtros e preferências |
| Atendimento agendado | Copiar, reordenar |
| Pagamento registrado | Ações em massa simples |
| Atendimento finalizado | |

### Uso em Vue

```vue
<div class="drawer-header" :class="{ 'ds-celebrate': done, 'ds-celebrate--info': done && sent }">
  <h2>{{ done ? 'Paciente criado' : 'Novo paciente' }}</h2>
</div>

<Transition name="ds-step" mode="out-in">
  <FormStep v-if="!done" />
  <SuccessStep v-else />
</Transition>
```

O conteúdo direto do elemento fica acima dos efeitos (`z-index: 1`). Para
repetir a animação, remova e adicione a classe em quadros diferentes.

## Camadas flutuantes

| Transição Vue | Entrada | Saída |
| --- | --- | --- |
| `ds-pop` (menu, popover, tooltip) | 200ms, opacidade + 4px + escala 0.98 | 120ms |
| `ds-modal` | 320ms, opacidade + 8px + escala 0.97 | 200ms |
| `ds-drawer` | 320ms, desliza 24px + opacidade | 200ms |
| `ds-fade` (sobreposição) | 200ms | 200ms |

## Entrada de listas e cards

Skeleton ([Carregamento](carregamento.md)) → conteúdo com `.ds-enter` e
`style="--i: índice"`: 320ms, 40ms entre itens, cascata limitada a 8 itens.
Use na primeira carga e ao trocar filtro; não reanime a lista a cada
atualização em tempo real.

## Feedback de ações

| Classe | Efeito | Uso |
| --- | --- | --- |
| `.ds-press` | Escala 0.97 em `:active`, 120ms | Botões e cards clicáveis |
| `.ds-pop-in` | Escala 0 → 1 com mola, 200ms | Ícone que troca (copiar → check) |
| `.ds-shake` | Tremor horizontal de 4px, 360ms | Campo inválido ao enviar; foca o campo e mostra a mensagem |

O switch anima o polegar em 200ms (`--ds-duration-base`).

## Movimento reduzido

Com `prefers-reduced-motion: reduce`, `motion.css` desliga celebração,
cascata, pop e shake, e troca as transições por fade de 120ms sem
deslocamento. A cor final da celebração continua visível.

## Estado da adoção

As classes estão disponíveis globalmente para fluxos novos. Por decisão do
produto, os drawers de anamnese e termo continuam com os keyframes locais
`success-*`, que têm o mesmo efeito. Se um dia forem trocados por
`.ds-celebrate` e `ds-step`, remova os keyframes locais e atualize esta seção.
