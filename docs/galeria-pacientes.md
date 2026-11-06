# Galeria dos pacientes

A aba Galeria do paciente permite enviar fotos sem atendimento, criar pastas personalizadas, renomear/excluir pastas e mover arquivos individualmente ou em lote. A navegação contém apenas Todas as fotos e Minhas pastas: Todas as fotos inclui também as imagens já organizadas em pastas. O nome da pasta aparece como título somente ao abrir uma pasta. O filtro de tipo mantém o acesso aos documentos existentes.

A busca por nome, descrição e tags é feita na API antes da paginação, junto com os filtros de período, tipo e pasta. O tipo usa `StyledSelect`, as tags usam `StyledMultiSelect` e o período usa `AppDateRangePicker`. O período considera o início/fim do dia no fuso do navegador e envia instantes ISO; o limite final é exclusivo. Trocar de paciente cancela a consulta anterior e limpa a seleção. A paginação só aparece com mais de uma página e usa uma única navegação, sem repetir o campo de salto de página.

O envio aceita PNG, JPG e WEBP, com preparação de descrição/tags e destino. É possível selecionar ou arrastar até 100 fotos por lote. Esse limite é por envio; não limita a quantidade total do paciente. Fotos maiores que 10 MB passam por compressão compartilhada com o atendimento. O progresso aguarda persistência no servidor; falhas parciais podem ser reenviadas sem repetir os sucessos. A API respeita a cota da clínica e gera miniaturas também para fotos enviadas sem atendimento.

Em Imagens e montagem, o atendimento mantém envio, arraste e montagens. O campo Pasta para novas fotos permite escolher/criar a pasta de destino. Escolher da galeria abre um seletor do mesmo paciente e anexa os IDs selecionados sem novo upload. As fotos já anexadas ficam desabilitadas; a quantidade selecionável considera as vagas restantes entre os 40 anexos. A API aplica esse limite atomicamente, inclusive em envios simultâneos.

O visualizador da galeria inclui zoom, movimento da imagem ampliada, anterior/próxima entre as imagens da página e navegação pelas setas. Quando o endereço preferido falha, ele percorre os demais endereços já devolvidos para o mesmo arquivo (original, legado, assinado e miniatura), renova a consulta e só então declara indisponibilidade. No visualizador aberto, se a resposta contém bytes JPEG, PNG, GIF ou WebP com um tipo declarado diferente, a imagem é reapresentada com o tipo reconhecido, sem enviar a sessão para o armazenamento. Conteúdo que não é imagem continua com erro. A data histórica já exibida não é substituída. As miniaturas percorrem os mesmos endereços e oferecem recarregamento após falha; a releitura dos bytes fica restrita à imagem aberta. O atendimento de origem aparece separado dos atendimentos que utilizam a foto.

## Preservação e exclusão

- Mover uma foto altera apenas sua pasta; mantém o arquivo e os vínculos clínicos.
- Excluir uma pasta preserva os arquivos em Todas as fotos, sem vínculo com a pasta excluída.
- Desvincular uma foto de um atendimento preserva o arquivo na galeria, mesmo após retirar o último vínculo.
- Excluir definitivamente é uma ação separada, bloqueada enquanto houver referências em prontuários. A API devolve os vínculos impeditivos.
- Excluir um atendimento preserva suas fotos e salva uma descrição da origem para consulta após a remoção do agendamento.
- Atendimentos cancelados, realizados e não comparecidos bloqueiam alterações de anexos no servidor. Reorganizar uma pasta não altera o prontuário.

O destino dos uploads usa `GalleryFolderSelect` com `StyledSelect`. No editor de fotos, o campo e o menu usam a aparência escura. A lista atualiza ao abrir sem desabilitar ou fechar o seletor durante a consulta. Menus compartilhados abrem dentro do diálogo quando usados em modais, para não ficarem atrás dele.

Os cartões de pastas usam o ícone original `folder-icon-macos.webp`. Renomear e Excluir pasta aparecem no menu de contexto ao clicar com o botão direito, também acessível por Shift+F10 ou pela tecla de menu. Escape ou clique fora fecha o menu. Busca e Selecionar seguem a altura de 40 px e o raio de 0,75 rem dos dropdowns da galeria.

Pastas têm um nível. Não há migração dos objetos S3: arquivos antigos sem pasta continuam acessíveis em Todas as fotos. Documentos e marcadores de montagem são preservados.

## Ativação e verificação

Publicar primeiro a API compatível, executar `npm run gallery:create-indexes` no projeto `api-agendadoutor` com o banco de destino configurado e depois publicar o frontend. O comando cria/verifica índices; não move nem exclui arquivos. Não executar contra um banco de produção apenas para conferir o desenvolvimento local.

Verificações automatizadas:

- API: `npm run test:gallery`.
- Armazenamento: `npm run storage:test`.
- Frontend: `npm run test:uploads` e `npm run build`.

Prévia isolada: iniciar o Vite e abrir `/tests/fixtures/gallery-preview.html`. A página usa dados fictícios e um adaptador em memória, oferecendo modos Galeria, Atendimento e Celular. Esse arquivo é uma fixture de desenvolvimento e não é incluído no build normal.

Conferir manualmente: galeria vazia, seleção e arraste, fotos grandes, falha parcial, pastas vazias, exclusão de pasta com conteúdo, busca fora da primeira página, escolha de fotos existentes, montagens, atendimento encerrado, documentos, URLs expiradas, nomes longos e largura de celular.

Nesta entrega, a conferência visual por automação foi interrompida pela ferramenta de computador porque ela não conseguiu confirmar a URL da janela. A prévia ficou disponível para revisão manual; os testes automatizados são registrados separadamente.
