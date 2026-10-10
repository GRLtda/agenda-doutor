# Armazenamento na interface

O componente compartilhado `src/components/global/StorageUsage.vue` apresenta o consumo no menu do usuário e os detalhes na aba do perfil (`?profile=1&profileTab=storage`). As cotas, isenções e operações de inventário estão documentadas em [Cotas de armazenamento](../../api-clinic/docs/STORAGE_QUOTAS.md).

## Carregamento e atualização

- O store `src/stores/clinic.js` guarda o resumo, os detalhes por tipo e os estados de requisição/erro em memória. Ao reabrir o menu ou a aba do perfil, os dados salvos aparecem imediatamente enquanto uma nova consulta atualiza o consumo. Não há persistência em localStorage nem após recarregar a página.
- A primeira consulta, sem resumo no store, mostra `AppSkeleton` para o consumo, a barra e o percentual. Na aba detalhada, também há skeleton para as linhas por tipo enquanto os detalhes ainda não foram consultados, mesmo quando já existe resumo salvo.
- Atualizações preservam o resumo e as linhas anteriores enquanto consultam a API. Cada resposta bem-sucedida atualiza seu recurso no store; falhas preservam o último resultado desse recurso. A barra permanece montada e anima mudanças de largura para cima e para baixo em 600 ms. O percentual pode ultrapassar 100%, mas a largura fica limitada a 100%.
- A preferência de acessibilidade `prefers-reduced-motion` desativa a animação da barra.
- Em caso de falha, os dados existentes permanecem visíveis com uma mensagem indicando que não foram atualizados. Sem dados, aparece a mensagem de falha da consulta.
- O botão de atualização da aba detalhada fica desabilitado durante a requisição. O componente consulta o resumo ao montar e, no modo detalhado, consulta também os tipos. Requisições simultâneas do mesmo recurso compartilham a promessa em andamento. Não há atualização periódica.
- Trocar a clínica ou limpar a clínica no logout descarta todo o cache de armazenamento. Respostas de requisições iniciadas no contexto anterior são ignoradas. Atualizar os dados cadastrais da mesma clínica preserva o cache. Os endpoints continuam usando o contexto autenticado da API.

## Navegação

O container inteiro do resumo no menu abre a aba de armazenamento do perfil, por clique, Enter ou Espaço, com foco visível. Não há botão separado de detalhes. Na aba detalhada, o container não é uma ação de navegação; o botão de atualização continua independente.

## Distribuição do consumo no perfil

A visualização detalhada usa `storage-details` e ocupa toda a largura disponível, sem limite de 640px. O conteúdo é organizado em cards com borda discreta, cantos arredondados e espaçamento uniforme: capacidade utilizada primeiro (consumo destacado, percentual, atualização, barra e espaço disponível); distribuição por categoria com legenda e barra segmentada; e aviso de estado, quando aplicável. Não há card de arquivos isentos. O título Armazenamento do modal não se repete no conteúdo. O menu mantém seu formato compacto.

O aviso de inventário em atualização usa um card próprio com ícone de atenção, fundo amarelo suave e borda clara, separando título e explicação. Bloqueio e alertas de capacidade usam o mesmo espaço, preservando a prioridade: bloqueio, inventário não pronto, cheio, crítico e próximo do limite. O aviso usa `role="status"` e não depende somente de cor. Skeletons ocupam os cards de capacidade e distribuição na primeira carga. Em celular, o padding diminui e o cabeçalho pode quebrar linha.

`GET /storage/details` retorna categorias de ativos ativos e contabilizados, com `_id`, `usedBytes` e `files`. Imagens, documentos e outros arquivos aparecem na legenda mesmo com consumo zero. Categorias adicionais retornadas pela API também são representadas; identidade visual (`branding`), fotos de perfil (`perfil`) e assinaturas (`assinaturas`) têm rótulos conhecidos, embora sejam isentas pela política atual. A interface não inventa volumes de categorias isentas nem os inclui artificialmente no gráfico.

Os percentuais da legenda são calculados sobre a capacidade total do plano (`usedBytes / quotaBytes × 100`), incluindo espaço livre. As categorias continuam ordenadas pelo consumo. Cada item mostra cor, tamanho, percentual e quantidade de arquivos; valores positivos menores que 0,1% aparecem como `< 0,1%`. A barra anima a largura dos segmentos e respeita redução de movimento. Em excesso de cota, a largura é normalizada pelo maior valor entre capacidade, consumo e soma dos detalhes; os percentuais continuam mostrando a relação real com a cota e espaço livre fica em zero. Sem capacidade ou consumo, não há divisão por zero.

Se o resumo chegar antes dos detalhes ou indicar mais bytes do que eles somam, a diferença aparece em cinza azulado como Em classificação; nenhum volume é atribuído artificialmente a uma categoria. A primeira carga de detalhes usa skeleton; dados já salvos continuam visíveis durante atualizações. As regras de isenção permanecem na política de armazenamento, sem card informativo na interface. Em celular, a legenda se distribui em duas colunas.

## Verificação

Execute `npm run build` em `crm-clinica`. Em desktop e celular, simule rede lenta e confira skeleton na primeira carga. Na aba detalhada, atualize após aumentar e reduzir o consumo: os valores anteriores devem permanecer durante a consulta e a barra deve animar para o novo percentual. Simule falha inicial e falha de atualização, conferindo a preservação dos dados no segundo caso. No menu, confira a navegação pelo container com mouse e teclado. Ative redução de movimento e confirme que a barra muda sem animação.

Feche e reabra o menu e a aba com rede lenta: o resumo salvo deve aparecer imediatamente. Abra os detalhes pela primeira vez com resumo salvo: somente as linhas ainda não consultadas devem usar skeleton. Confira deduplicação de chamadas simultâneas, preservação do cache em falhas e descarte no logout/troca de clínica, inclusive quando uma resposta anterior chega depois da troca.

Confira a barra com uma categoria, várias categorias, categoria adicional, participações pequenas, nenhum arquivo e consumo acima da cota. Valide espaço livre, diferença em classificação, ordem, cores, percentuais da capacidade e legenda em desktop e celular. Confirme largura total, capacidade no primeiro card, aviso amarelo suave com ícone somente quando aplicável, distribuição acima do aviso e ausência do card de arquivos isentos, sem título repetido.
