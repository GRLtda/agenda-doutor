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
  stores/retrospective.store.ts # Pinia: summary (do /me), available, status, bannerDismissed, trackView, trackShare
  designs/index.ts              # registry designKey -> { Player, Banner, StatusScreen }
  designs/2026-v1/              # TODO o visual de 2026 (stories, copy, temas, cartão, overlays)
  components/RetrospectiveBanner.vue   # shell do banner (A1); delega ao design
  components/RetrospectiveShortcut.vue # atalho na barra superior, ao lado das notificações
  components/RetrospectiveOverlay.vue  # camada sobre a página (A2 carregando, A3 erro, player)
  composables/useRetrospectiveOpener.ts # abre/fecha pela query ?retrospectiva=1
  composables/useShareCard.ts   # PNG via html-to-image, Web Share API, download
```

**Regra de ouro:** fora de `designs/<designKey>/` nada conhece o visual. Se o `designKey` do payload
não estiver no registry, o banner e o atalho não aparecem e a camada se fecha (nunca quebra a tela).

**Nomes de classe:** o app usa Tailwind v4, que gera um utilitário para qualquer classe com nome de
utilitário encontrada no código. Classes como `ring` e `outline` desenham borda (era o quadrado preto
em volta do gráfico de pacientes), `grid` e `blur` mudam display e filtro. Use nomes próprios
(`donut`, `gauge`, `stats`, `glow-blob`…). O teste `tests/retrospective-overlay.spec.js` barra os nomes proibidos.

### Próximo ano

1. Crie `designs/2027-v1/` exportando `{ key, Player, Banner, StatusScreen }` (veja `designs/2026-v1/index.ts`).
2. Registre em `designs/index.ts` e atualize `LATEST_DESIGN_KEY` (usado nas telas de carregando/erro).
3. Quando quiser, apague `designs/2026-v1/` e a linha do registry.

## Fluxo

- **Banner (A1)** em `ResumoView.vue`, só para o dono, se o `/auth/me` trouxer `user.retrospective` (publicada). Mostra ano, nome e logo da clínica. As duas telas ao lado são o design real dos stories ("mês" e "total") com **dados fictícios fixos** (`PREVIEW_STORIES` em `Banner.vue`), só para ilustrar; os stories verdadeiros só são pedidos em "Ver agora".
  Selo "NOVIDADE" enquanto `viewed = false`. "Agora não" esconde o banner na sessão do navegador
  (`sessionStorage`, por id da retrospectiva) e passa o acesso para o atalho da barra superior.
  Ver os stories também tira o banner (`bannerHidden` = "Agora não" ou `viewed`), inclusive depois de
  recarregar, porque `viewed` vem do back-end. "Ver agora" tem um contorno branco com respiro e um
  brilho que percorre o contorno (parado com `prefers-reduced-motion`).
- **Atalho na barra superior** (`RetrospectiveShortcut` no `TopBar`, ao lado do sino): só para o dono,
  quando o banner sai ("Agora não" ou stories já vistos). Celular (≤ 768 px): só o ícone (calendário com anel de story);
  computador: ícone + "Retrospectiva <ano>". Abre a retrospectiva na página em que a pessoa está.
- **Abrir = camada, não página**: "Ver agora" e o atalho adicionam `?retrospectiva=1` à rota atual e o
  `DefaultLayout` passa `open` para `RetrospectiveOverlay` (mesmo padrão de `?settings=1`). A camada é
  teleportada para o `body` com `z-index: 2147483000`: fica acima de tudo, inclusive do botão da Lia
  (só o aviso de instabilidade da API fica por cima). Fundo azul-escuro com opacidade baixa
  (`rgba(7, 12, 34, 0.35)` + desfoque leve), então no computador a página da clínica aparece atrás;
  no celular o story ocupa a tela toda. Abre e fecha com fade (0,32 s). Fechar remove a query.
  O link antigo `/retrospectiva` redireciona para o painel com `?retrospectiva=1`.
  Usuário que não é dono tem a camada fechada na hora.
- **Carregando (A2) sempre aparece**: as quatro etapas (Atendimentos, Procedimentos, Pacientes e
  retornos, Mensagens automáticas) ganham o check uma a uma. Enquanto a API responde, no ritmo normal
  (a última espera os dados); quando os dados chegam, inclusive se já estavam prontos, as que faltam
  são marcadas a cada 170 ms e, ~320 ms depois do último check, a A2 dá lugar ao player com fade
  cruzado (~1 s no total com dados prontos). Prop `ready` e evento `finished` do `StatusScreen`.
  Erro (A3) com "Tentar de novo" e "Fechar".
- **Player**: um story por item de `stories[]` (kinds desconhecidos são ignorados). ~6 s por story.
  Toque à direita avança, à esquerda volta, segurar pausa (E1), dica na primeira vez (E2,
  `localStorage`). Desktop (≥ 768 px): quadro 9:16 centralizado, setas laterais, `← →`, `Espaço`, `Esc` (E3).
  Mobile: tela cheia (E4). Temas: alterna escuro/claro por posição; o resumo é sempre azul com confete.
- **Textos**: `designs/2026-v1/copy.ts`, 3 variações por kind, escolhidas por `copyVariant` do payload.
  Placeholders `{n}`, `{ano}`, `{proximoAno}`, `{mes}`, `{regiao1}`.
- **Marca do Agenda Doutor**: stories escuros e claros usam só o símbolo (`designs/2026-v1/brand.svg`,
  sem a escrita). O resumo (tema azul) usa o logo completo todo branco e sem fundo (`logo-white.svg`).
- **Resumo (último story)**: cabeçalho com a foto da clínica, o nome e "Retrospectiva <ano>" embaixo;
  título ("Que ano!") com subtítulo próprio (`x` em `copy.ts`, nunca o nome da clínica de novo);
  painel com blocos de ícone (Atendimentos, Mês campeão, Voltaram, Procedimento nº 1) e, por último,
  "Lembretes e confirmações" em destaque leve, com o subtítulo "Otimizamos o seu tempo". No cartão, o
  rodapé mostra "Retrospectiva <ano>" e, embaixo, o logo completo.
- **Rodapé de todo cartão PNG**: "Retrospectiva <ano>" e, embaixo, a marca do Agenda Doutor (símbolo nos
  temas escuro/claro, logo completo branco no resumo).
- **Abertura**: o subtítulo entra logo depois do nome da clínica (~0,5 s), para a tela não parecer vazia.
- **Confete do cartão**: no story o confete cai animado; no cartão do resumo cada peça tem posição fixa
  em `designs/2026-v1/confetti-card.ts` (só nas faixas de cima e de baixo e nas laterais), para nunca
  cobrir texto, logo ou selo. Para ajustar, edite a lista e confira com `?view=cards` na prévia.
- **Exportação PNG e larguras**: o `html-to-image` copia a largura calculada de cada elemento e o
  arredondamento pode quebrar a linha de um texto que cabia. Títulos e nomes do cartão usam
  `width: 100%` ou `white-space: nowrap`; nomes de clínica com mais de 28 caracteres são encurtados.
- **Movimento reduzido**: com `prefers-reduced-motion`, os stories mostram o quadro final e o confete fica estático.
- **Rastreio**: `POST /view` uma vez por abertura (com `viewId` aleatório; o backend deduplica);
  `POST /share` ao concluir o compartilhamento ou salvar/baixar a imagem. Falhas são engolidas, sem toast.

## Compartilhar (cartão 9:16)

- O cartão é o mesmo componente em `mode="card"` (`card/ShareCard.vue`): sem barras e botões,
  logo e nome no topo (a abertura não tem cabeçalho), selo no rodapé, animação no quadro final.
- Canvas 390 × 694 exportado em **PNG 1080 × 1920** (`html-to-image`), respeitando as zonas
  seguras do Instagram (≈ 250 px no topo, 340 px embaixo). As fontes DM Sans/DM Mono vêm de
  `@fontsource` e são embutidas no PNG; a dimensão final é conferida e corrigida se preciso.
  O logo da clínica é convertido em data URL antes, **em segundo plano ao abrir o player** (só se a clínica tem logo), para o cartão já sair pronto: primeiro por `GET /retrospectives/current/logo`
  (bytes servidos pela API, porque o CloudFront não envia CORS e o canvas não pode ler a URL assinada), depois pela
  URL do `/auth/me`; se tudo falhar, o cartão usa a inicial (aviso `[Retrospectiva] Logo da clínica indisponível` no console).
  Com a `api-clinic` em `npm run dev` sem recarga automática, reinicie a API para a rota existir.
- **Logo preenche o círculo**: a imagem ocupa 100% do círculo com `object-fit: cover` (recorte central),
  sem borda branca em volta. Vale para o cabeçalho, a abertura e o cartão PNG.
- **Logo na tela**: `ClinicMark` usa a URL assinada do payload num `<img>` **sem** `crossorigin`, como a
  sidebar. Com `crossorigin="anonymous"` o navegador exige CORS e o CloudFront não envia esses
  cabeçalhos, então a imagem era bloqueada ("erro de CORS" no console) mesmo com a assinatura válida.
- **Celular ou tablet** (`isMobileDevice()`: user agent, iPadOS com toque ou ponteiro só de
  toque; ou tela < 768 px): sempre o menu D2. Com `navigator.canShare({ files })` ele mostra
  "Compartilhar no Instagram Stories", "Salvar imagem" e "Cancelar". Sem suporte (página em HTTP,
  Firefox, navegador interno de apps) mostra só "Salvar imagem" com o passo a passo do Instagram;
  nunca o aviso de "postar pelo celular". A imagem é gerada ao abrir o menu, para a folha do
  sistema abrir logo no toque. Cancelar a folha não conta como compartilhamento.
- **Botão de compartilhar**: no celular, botão grande no rodapé do story; no computador, botão redondo
  com o ícone do Instagram no cabeçalho, ao lado do X (prop `shareInHeader` do `Story`).
- **Computador**: modal D3 "Baixar imagem" com a prévia e o passo a passo para postar pelo celular.
- **Testar no celular**: o Web Share com arquivos só existe em HTTPS (ou `localhost`). Abrindo o
  dev server pelo IP da rede (`http://192.168…`) o menu aparece sem a opção do Instagram.
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

## Só aparece publicada

O `GET /auth/me` traz `user.retrospective` (`{ id, year, designKey, viewed }`) só para o dono e só se houver retrospectiva **publicada**. Banner e atalho da barra usam esse resumo, o nome e a logo de `user.clinic`: **nenhuma requisição extra ao entrar**. Os stories (`GET /retrospectives/current`) só são pedidos quando a pessoa clica em "Ver"; o logo do cartão PNG é baixado em segundo plano ao abrir o player, por `GET /retrospectives/current/logo`. Rascunho/agendada não aparecem no `/me`. Quem gera e publica, clínica a clínica, é o admin: [Retrospectiva no detalhe da clínica](../../crm-clinica-admin/docs/RETROSPECTIVA.md).