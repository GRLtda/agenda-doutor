# Planejamento: galeria dos pacientes com upload e pastas

Data: 06/11/2026. Status: implementado localmente na API e no frontend. A conferência visual e a implantação no ambiente de destino permanecem pendentes. Uso e ativação em [Galeria dos pacientes](galeria-pacientes.md).

## Objetivo

Permitir adicionar fotos diretamente no perfil do paciente, criar e organizar pastas e trabalhar com as mesmas imagens dentro dos atendimentos. Uma imagem deve ser armazenada uma vez, mantendo sua origem e os vínculos clínicos.

## Diagnóstico do que existe

| Área | Comportamento encontrado | Consequência para a proposta |
| --- | --- | --- |
| Galeria do paciente | `PatientMediaGallery.vue` lista pastas e arquivos; a área de ações está vazia. | Adicionar envio, criação de pastas e ações de organização. |
| Pastas | `getPatientFolders` agrupa uploads pelo campo `appointment` e inclui “Todas as Mídias”. Não há entidade de pasta personalizada. | Separar pastas editáveis das visões automáticas por atendimento. |
| Arquivos gerais | A API aceita `general`, mas a listagem de pastas não inclui esse agrupamento. | Dar acesso explícito às fotos enviadas fora de atendimentos. |
| Busca do paciente | Texto e tags filtram os arquivos já carregados, com páginas de 20 itens. | Implementar filtros no servidor, antes da paginação. |
| Upload geral | `POST /uploads/image` aceita paciente sem atendimento. A otimização de imagens nessa rota está condicionada a branding ou atendimento. | Reaproveitar o armazenamento, padronizando miniaturas e tratamento de fotos do paciente. |
| Upload no atendimento | `RecordAttachments.vue` já tem seleção, arraste, descrição, tags, compressão, progresso e montagens. | Extrair o fluxo comum e preservar os recursos existentes. |
| Vínculos | `Upload.appointment` registra um atendimento; `MedicalRecordEntry.attachments` referencia os arquivos utilizados no prontuário. | Distinguir atendimento de origem e atendimentos que reutilizam a imagem. |
| Adicionar imagem existente | `POST /records/:recordId/attachments` já existe. | Criar seletor visual e completar validações de status, quantidade e repetição. |
| Remoção | Remover o último vínculo com prontuário pode excluir o upload e o objeto no S3. | Separar desvinculação de exclusão antes de permitir reutilização ampla. |
| Limites | Upload recebe até 10 MB por arquivo; o envio ao prontuário verifica até 40 anexos. O caminho de anexar existentes não aplica a mesma verificação. | Unificar regras no backend, inclusive em operações concorrentes. |
| Galeria da clínica | Usa os mesmos uploads e já possui busca e filtros no servidor. | Garantir que as novas fotos continuem aparecendo conforme categoria e filtros. |

Principais arquivos analisados:

- Frontend: `src/views/pages/pacientes/components/PatientMediaGallery.vue`, `MediaViewerModal.vue`, `src/stores/gallery.js`, `src/components/pages/appointments/RecordAttachments.vue`, `src/stores/records.js` e `src/api/uploads.js`.
- Backend, no projeto `api-agendadoutor`: `src/api/gallery/gallery.controller.js`, `gallery.routes.js`, `src/api/uploads/uploads.model.js`, `uploads.controller.js`, `uploads.routes.js`, `src/api/records/records.model.js`, `records.controller.js` e `records.routes.js`.

## Experiência proposta

### Perfil do paciente → Galeria

- Cabeçalho com **Adicionar fotos** e **Nova pasta**, disponíveis mesmo na galeria vazia.
- Navegação com **Todas as fotos**, **Sem pasta**, **Minhas pastas** e **Por atendimento**. A galeria atual também contém documentos; preservar o acesso aos demais arquivos com filtro de tipo e a visão Todas as mídias.
- Pastas personalizadas com nome, quantidade de imagens, capa e menu de renomear/excluir. Começar com um nível de pastas, deixando subpastas para uma evolução.
- Grade de miniaturas com seleção múltipla, descrição, tags e indicação do atendimento de origem quando houver.
- Busca por nome, descrição e tags; filtros de período, pasta, atendimento e tipo, aplicados no servidor.
- Ações individuais e em lote para mover para pasta e retirar da pasta. Excluir arquivo deve ser uma ação distinta e respeitar vínculos clínicos.
- Visualizador com imagem ampliada, anterior/próxima, zoom, descrição, tags e acesso aos atendimentos vinculados. Carregar o original ao abrir e renovar URLs expiradas quando necessário.
- No celular, seleção de imagens pelo dispositivo e controles adaptados à largura disponível. Captura pela câmera pode ser oferecida quando suportada; formatos aceitos devem estar claros.

### Enviar fotos pelo perfil

1. Clicar em Adicionar fotos ou arrastar arquivos para a galeria.
2. Exibir preparação com miniaturas, descrição/tags e pasta de destino. Dentro de uma pasta personalizada, preencher essa pasta por padrão; na visão geral, usar Sem pasta.
3. Enviar com progresso e resultado por arquivo. Em falha parcial, manter os sucessos e permitir reenviar apenas os que falharam.
4. Atualizar grade, contagens e pastas. O envio pelo perfil não cria atendimento ou prontuário.

### Dentro do atendimento → Imagens e montagem

- Manter **Adicionar fotos**, arraste e **Criar montagem**.
- Permitir escolher uma pasta do paciente durante o envio e criar uma pasta sem sair do fluxo.
- Acrescentar **Escolher da galeria**, abrindo um seletor das fotos do mesmo paciente, com busca, pastas e seleção múltipla.
- Uma foto existente é anexada por referência; não há novo upload, cópia no S3 ou cobrança duplicada de armazenamento.
- A foto enviada no atendimento aparece na galeria do paciente e na visão desse atendimento. Ao selecionar uma pasta personalizada, também aparece nela.
- Distinguir imagens originadas no atendimento de imagens anteriores reutilizadas como referência.
- Preservar somente leitura em atendimentos encerrados e aplicar essa restrição também no backend.

Exemplo: criar a pasta “Tratamento facial”, enviar fotos pelo perfil e depois selecionar duas delas em um atendimento. As duas aparecem no prontuário e continuam na mesma pasta. Mover uma delas para “Evolução” mantém seu vínculo com o prontuário.

## Regras de organização e exclusão

1. Cada arquivo pertence à clínica e ao paciente. Sua pasta deve pertencer à mesma clínica e ao mesmo paciente.
2. Cada arquivo fica em uma pasta personalizada por vez, ou em Sem pasta. Tags permitem classificações adicionais. As visões Todas as fotos e Por atendimento não são pastas físicas.
3. Mover entre pastas altera somente metadados no banco; não altera a chave S3, a autoria ou a origem da imagem.
4. Renomear uma pasta mantém os arquivos. Excluir uma pasta move seu conteúdo para Sem pasta, sem excluir fotos.
5. Retirar uma imagem de um atendimento remove apenas aquela referência. O arquivo continua na galeria, mesmo quando esse era seu último vínculo com prontuário.
6. Excluir um arquivo definitivamente é uma operação separada. Na primeira versão, bloquear enquanto houver vínculo com prontuário e indicar os vínculos impeditivos; não fazer exclusão em cascata de registros clínicos.
7. Fotos antigas mantêm o atendimento de origem. Ao reutilizar uma foto em outro atendimento, preservar essa origem e considerar também os vínculos de prontuário na visão Por atendimento.
8. Validar status e autorização antes de anexar ou desvincular, usando as mesmas regras para envio novo e seleção de existentes.
9. Aplicar o limite de 40 anexos por prontuário aos IDs distintos, incluindo envios e seleção de existentes; não impor esse limite ao total de fotos do paciente. Respeitar a cota de armazenamento da clínica.
10. Permissões de leitura, envio, organização e exclusão devem seguir o controle de acesso já usado pelo produto, com validação no servidor. Reorganizar pastas não concede permissão de alterar prontuários encerrados.

## Estrutura técnica sugerida

### Dados

- Nova coleção `GalleryFolder`: `clinic`, `patient`, `name`, `normalizedName`, `createdBy`, timestamps. Nome obrigatório, com tamanho limitado e unicidade normalizada por paciente/clínica.
- Campo opcional `galleryFolder` em `Upload`. Ausente ou nulo significa Sem pasta. Índice composto de clínica, paciente, pasta e data para listagem.
- Manter `Upload.appointment` como atendimento de origem. `MedicalRecordEntry.attachments` representa utilização no prontuário, inclusive em outro atendimento do mesmo paciente.
- Consultas por atendimento devem combinar origem e referências, deduplicando por ID do upload. O visualizador deve apresentar ambos com rótulos claros.
- Preservar as tags automáticas e o marcador de montagem. Edição de tags manuais não deve apagar classificações internas.

### API

Rotas propostas, a consolidar com os contratos atuais durante a implementação:

| Operação | Contrato sugerido |
| --- | --- |
| Listar/criar pastas personalizadas | `GET/POST /gallery/patient/:patientId/custom-folders` |
| Renomear/excluir pasta | `PATCH/DELETE /gallery/patient/:patientId/custom-folders/:folderId` |
| Listagem unificada de arquivos | `GET /gallery/patient/:patientId/files`, com filtros e paginação |
| Mover arquivos ou retirar da pasta | `PATCH /gallery/patient/:patientId/files/folder`, com IDs e destino ou null |
| Enviar foto pelo perfil | Evoluir `POST /uploads/image` com validação de paciente/pasta e pipeline comum de imagens |
| Enviar foto no atendimento | Evoluir `POST /records/:recordId/attachments/image` com pasta opcional |
| Selecionar existentes | Evoluir `POST /records/:recordId/attachments` com validações completas e deduplicação |
| Desvincular do atendimento | Ajustar rotas de remoção de anexo para preservar o arquivo |
| Excluir arquivo sem vínculo | Usar `DELETE /uploads/:uploadId`, mantendo a proteção de referências e o controle de armazenamento |

Manter as rotas atuais de pastas virtuais durante a transição. Um ID de pasta personalizada não deve ser interpretado como ID de atendimento. As operações em lote precisam devolver resultados claros e evitar alterações parciais silenciosas.

### Componentes e serviços compartilhados

- Extrair preparação, validação, compressão e fila de upload para composable/serviço compartilhado, sem carregar dependências do prontuário na galeria do perfil.
- Componentes reutilizáveis: barra de ações, grade de imagens, diálogo de pasta, seletor de destino e seletor de fotos existentes.
- Padronizar os contratos de descrição e tags: hoje o upload geral recebe tags separadas por vírgulas e o upload de prontuário recebe JSON.
- Centralizar no backend as regras de acesso, status, quantidade e manutenção de referências. Tornar o limite resistente a dois envios simultâneos.
- Usar o pipeline de miniaturas também em fotos enviadas sem atendimento. Preservar o comportamento próprio de PDFs e outros documentos.
- Separar estados de carregamento da galeria do paciente e da clínica. Limpar dados ao trocar de paciente e impedir que respostas atrasadas preencham a galeria errada.
- Reaproveitar o sistema existente de progresso/notificações e de contabilização de armazenamento; inclusão em pasta e criação de referências não aumentam bytes armazenados.

## Compatibilidade com arquivos existentes

- Não mover nem reenviar objetos no S3 para introduzir pastas.
- Arquivos antigos sem `galleryFolder` passam a aparecer em Sem pasta e continuam acessíveis por atendimento e na visão geral.
- Pastas personalizadas podem existir vazias; sua existência não depende de uploads.
- Levantar inconsistências entre `Upload.appointment` e referências de prontuário antes de ajustar as consultas. Corrigir apenas com relatório e critérios explícitos, sem inferir novo atendimento de origem.
- Verificar miniaturas ausentes em uploads antigos feitos fora de atendimento; manter fallback e planejar eventual geração pelo mecanismo existente.
- A galeria da clínica continua consultando os mesmos uploads, incluindo novas fotos do paciente.

## Sequência de entrega

| Etapa | Entrega | Condição de conclusão |
| --- | --- | --- |
| 1. Base e integridade | Modelo de pastas, listagem filtrada, regras compartilhadas de anexação/desvinculação e miniaturas no upload do paciente. | Pastas isoladas por paciente/clínica; desvincular preserva arquivo; busca encontra fotos em qualquer página. |
| 2. Galeria do perfil | Upload direto, criar/renomear/excluir pasta, mover fotos, Sem pasta e seleção múltipla. | Paciente sem atendimento consegue receber e organizar fotos; excluir pasta preserva todo o conteúdo. |
| 3. Integração com atendimento | Pasta no envio e seletor de fotos existentes; visões de origem e utilização. | Mesma foto aparece na galeria e nos atendimentos corretos sem criar cópias. |
| 4. Navegação e acabamento | Visualizador, estados vazios/erro, progresso, renovação de URLs e adaptação móvel. | Fluxos utilizáveis no desktop e celular, inclusive em rede lenta e com falhas parciais. |
| 5. Compatibilidade e liberação | Regressões, avaliação dos dados antigos, documentação e implantação coordenada de API/frontend. | Galerias e montagens existentes continuam funcionando com as novas regras. |

Primeiro marco utilizável: etapas 1 e 2. O escopo solicitado fica completo ao integrar também a etapa 3 e concluir a verificação das etapas 4 e 5. Subpastas, comparação antes/depois e compartilhamento externo ficam para evolução posterior.

## Validação planejada

- Testes de API com duas clínicas e dois pacientes: rejeitar referência cruzada de pasta, imagem e atendimento; validar IDs e paciente excluído/inexistente.
- Testar criação de pasta vazia, renomeação, colisão de nomes, movimentação em lote e exclusão de pasta preservando imagens.
- Testar envio sem atendimento, envio com pasta e miniaturas, cota esgotada, formato incompatível, falha parcial e limpeza de uploads incompletos.
- Testar seleção de foto existente sem duplicação de arquivo/bytes e sem repetir anexos; limite de 40 e envios simultâneos.
- Testar atendimento encerrado pelas rotas de envio, anexação e desvinculação. Mover uma pasta não pode alterar dados do prontuário.
- Testar reutilização em dois atendimentos, preservação de origem e manutenção da imagem após remover uma ou todas as referências.
- Testar exclusão definitiva bloqueada por vínculos e atualização correta da cota quando a exclusão for permitida.
- Testar busca por uma foto que estaria na segunda página, total de resultados, tags e contagens após filtros.
- Testar troca rápida entre pacientes e renovação de URL assinada expirada.
- Executar os testes pertinentes de uploads do frontend (`npm run test:uploads`), armazenamento da API (`npm run storage:test`), novos testes de galeria e build do frontend.
- Conferir visualmente desktop e celular, arquivos antigos, documentos, montagens e galeria da clínica.

O texto acima registra o planejamento original. A implementação local inclui testes de galeria, uploads e armazenamento. A automação visual foi interrompida pela ferramenta de computador por não conseguir confirmar a URL da janela; a fixture local permite revisar manualmente Galeria, Atendimento e Celular. Nenhum banco de produção ou objeto S3 existente foi alterado durante a implementação.
