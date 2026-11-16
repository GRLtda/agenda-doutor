# Retrospectiva anual (frontend)

Stories animados com os números do ano da clínica, só para o **dono** (`role: owner`).
O backend entrega um snapshot congelado com dados neutros; todo o visual do ano fica em
`src/features/retrospective/designs/<designKey>/`. Contrato e geração no backend:
[api-clinic/docs/RETROSPECTIVA.md](../../api-clinic/docs/RETROSPECTIVA.md).

## Estrutura

```
src/features/retrospective/
  types.ts                      # contrato do payload
  api/retrospective.api.ts      # GET current (404 -> null), POST view, POST share
  stores/retrospective.store.ts # Pinia: status, available, trackView, trackShare
  designs/index.ts              # registry designKey -> { Player, Banner, StatusScreen }
  designs/2026-v1/              # TODO o visual de 2026 (stories, copy, temas, cartão, overlays)
  components/RetrospectiveBanner.vue  # shell do banner (A1); delega ao design
  composables/useShareCard.ts   # PNG via html-to-image, Web Share API, download
  views/RetrospectiveView.vue   # rota /retrospectiva (A2 carregando, A3 erro, player)
```

**Regra de ouro:** fora de `designs/<designKey>/` nada conhece o visual. Se o `designKey` do payload
não estiver no registry, o banner não aparece e a rota volta ao painel (nunca quebra a tela).

### Próximo ano

1. Crie `designs/2027-v1/` exportando `{ key, Player, Banner, StatusScreen }` (veja `designs/2026-v1/index.ts`).
2. Registre em `designs/index.ts` e atualize `LATEST_DESIGN_KEY` (usado nas telas de carregando/erro).
3. Quando quiser, apague `designs/2026-v1/` e a linha do registry.

## Fluxo

- **Banner (A1)** em `ResumoView.vue`, só para o dono, se `GET /retrospectives/current` devolver dados.
  Selo "NOVIDADE" enquanto `viewed = false`. "Agora não" esconde o banner na sessão do navegador.
- **Rota `/retrospectiva`** (`meta.requiresAuth`): A2 enquanto busca, A3 com "Tentar de novo" se falhar.
  Usuário que não é dono volta ao painel.
- **Player**: um story por item de `stories[]` (kinds desconhecidos são ignorados). ~6 s por story.
  Toque à direita avança, à esquerda volta, segurar pausa (E1), dica na primeira vez (E2,
  `localStorage`). Desktop (≥ 768 px): quadro 9:16 centralizado, setas laterais, `← →`, `Espaço`, `Esc` (E3).
  Mobile: tela cheia (E4). Temas: alterna escuro/claro por posição; o resumo é sempre azul com confete.
- **Textos**: `designs/2026-v1/copy.ts`, 3 variações por kind, escolhidas por `copyVariant` do payload.
  Placeholders `{n}`, `{ano}`, `{proximoAno}`, `{mes}`, `{regiao1}`.
- **Movimento reduzido**: com `prefers-reduced-motion`, os stories mostram o quadro final e o confete fica estático.
- **Rastreio**: `POST /view` uma vez por abertura (com `viewId` aleatório; o backend deduplica);
  `POST /share` ao concluir o compartilhamento ou salvar/baixar a imagem. Falhas são engolidas, sem toast.

## Compartilhar (cartão 9:16)

- O cartão é o mesmo componente em `mode="card"` (`card/ShareCard.vue`): sem barras e botões,
  logo e nome no topo (a abertura não tem cabeçalho), selo no rodapé, animação no quadro final.
- Canvas 390 × 694 exportado em **PNG 1080 × 1920** (`html-to-image`), respeitando as zonas
  seguras do Instagram (≈ 250 px no topo, 340 px embaixo). As fontes DM Sans/DM Mono vêm de
  `@fontsource` e são embutidas no PNG; a dimensão final é conferida e corrigida se preciso.
  O logo da clínica é convertido em data URL antes; se o CDN bloquear (CORS), o cartão usa a inicial.
- **Mobile com `navigator.canShare({ files })`**: menu D2 ("Compartilhar no Instagram Stories",
  "Salvar imagem", "Cancelar"). A imagem é gerada ao abrir o menu, para a folha do sistema abrir
  logo no toque. Cancelar a folha não conta como compartilhamento.
- **Desktop ou sem suporte**: modal D3 "Baixar imagem" com a prévia e o passo a passo para postar pelo celular.
- **Feedback** (D4): toast de sucesso; erro com "Tentar".
- **Limitação real**: o Instagram não abre o editor de Stories com imagem pronta a partir de uma
  página web. Não há link `instagram://` mágico: o caminho é a folha de compartilhamento ou o download.
- Fora de escopo por enquanto: "Baixar todos os cartões (.zip)" que aparece no D3 do design.

## Testes e prévia

```bash
npm run test:retrospective     # store, registry, textos, cada kind, cartão, compartilhar, navegação
npm run dev:retrospectiva      # prévia isolada (API e auth simuladas) em http://127.0.0.1:5183
```

Parâmetros da prévia: `?view=banner|player|loading|error|cards`, `&seq=full|reduced`, `&copy=1..3`,
`&logo=<url>`. `view=cards` renderiza todos os cartões e exporta os PNGs (mostra as dimensões).
