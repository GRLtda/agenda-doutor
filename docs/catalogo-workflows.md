# Catálogo de workflows

A listagem abre SideDrawer com busca e modelos carregados de templates em
GET /v2/workflows/catalog. Não há dados/grafos duplicados no frontend; fonte e
contrato: [backend](../../api-clinic/docs/WORKFLOW_CATALOG.md). Exibe carregamento,
erro com nova tentativa e resultado vazio.

A miniatura usa fundo cinza, início centralizado no topo, duas conexões para nós
inferiores e continuação parcialmente cortada com fade. É ilustrativa, de até
três etapas, sem indicar execução paralela; as ligações reais ficam no editor.
Quando só há início/mensagem, Encerrar completa a composição.

## Modelos

| Modelo | Evento | Espera | Mensagem |
| --- | --- | --- | --- |
| Retorno após procedimento | procedure.completed | 6 meses | Convite para retornar |
| Retorno após consulta | appointment.completed | 6 meses | Convite para retornar |
| Contato após procedimento | procedure.completed | 1 dia | Canal para dúvidas |
| Acompanhamento após consulta | appointment.completed | 7 dias | Contato de acompanhamento |
| Boas-vindas ao agendar | appointment.created | Imediata | Informações da clínica |
| Convite para remarcar | appointment.canceled | 1 dia | Ajuda para nova data |
| Informações após remarcação | appointment.rescheduled | Imediata | Informações atualizadas |
| Recebimento da anamnese | anamnesis.completed | Imediata | Confirmação e próximos passos |
| Recebimento do termo | consent.signed | Imediata | Confirmação e orientações |
| Agradecimento após consulta | appointment.completed | 1 hora | Agradecimento e opinião |

Os prazos são configurações iniciais editáveis, não protocolos clínicos. Esperas
contam a partir da chegada ao bloco; não representam “antes do horário da consulta”.
Meses usam a unidade months já suportada pelo motor. Procedimentos começam sem
restrição, e a clínica pode escolher os procedimentos no editor antes de publicar.

## Criação e segurança

Escolher modelo e template da clínica envia somente templateId para
POST /v2/workflows/catalog/:templateKey/instantiate. O backend monta o grafo e
valida que o template pertence à clínica autenticada. O frontend não envia grafo,
identidade nem política. Abre o editor após sucesso, sem publicar nem enviar mensagem.
Erro field=templateId aparece no select; falha geral no painel. O botão impede
submissão dupla. Fechar durante criação não cancela escrita iniciada nem navega
ao concluir após desmontagem. Sem templates, orienta Marketing → Modelos.
Backend atualizado é necessário; não há fallback de geração local.

O seletor oferece “Criar novo modelo” no rodapé, com o mesmo estilo do cadastro
de paciente no novo agendamento, e menu de pelo menos 400 px limitado à janela.
Escolher mensagem exibe aviso de variáveis sem preenchimento garantido, usando
`eventType` do modelo inicial e `messageVariableSupport` da resposta do catálogo.
O aviso não bloqueia criar rascunho; informa substituição por vazio quando faltarem
dados. A mesma regra é aplicada no [editor](editor-workflows.md).

## Referências das ideias

Inspiração de comunicação administrativa e continuidade do cuidado:
[AHRQ: acompanhamento de pacientes](https://www.ahrq.gov/health-literacy/improve/precautions/tool6.html),
[AHRQ: sistemas de lembrete e retorno](https://www.ahrq.gov/cahps/quality-improvement/improvement-guide/6-strategies-for-improving/health-promotion-education/strategy6r-reminder-systems.html) e
[ONC: participação do paciente](https://healthit.gov/health-it-basics/increase-patient-participation-their-care/).
Os modelos e intervalos acima são escolhas do produto; essas fontes não prescrevem
retorno de seis meses para todo procedimento.

## Verificação

Testes canônicos: no backend, npx tsx --test tests/workflow-starters.test.ts.
No frontend, build e revisão desktop/celular: carregar/falhar/repetir catálogo,
busca, árvore cinza, erro de campo e instanciação sem envio de grafo.
Ver [Editor](editor-workflows.md) e [Listagem](listagem-workflows.md).

Revisão isolada com dados exportados do catálogo real do backend e HTTP simulado:
10 modelos, três nós por miniatura, fundo/recorte, criação apenas com chave e
ID de mensagem, sem grafo local, e layout em 1440×900 e 390×844.

## Mensagem e aparência da prévia

O componente compartilhado MessageTemplateSelect mostra ícone de mensagem também no placeholder Selecione.
O rodapé fixo do dropdown oferece Criar novo modelo, seguindo a ação de cadastro
no seletor de pacientes. Leva à rota marketing-modelos com novo=1, fecha o catálogo
e abre o editor de criação em Marketing → Modelos. A página consome e remove esse
parâmetro da URL para não reabrir acidentalmente o editor ao navegar.

A miniatura usa cards com cabeçalho colorido por família, ícone, reticências,
título e conectores semelhantes aos nós do editor. Fundo cinza pontilhado,
árvore centralizada e base recortada continuam presentes. A legenda “Prévia das
etapas” foi removida; o nome acessível da miniatura permanece.

Verificação isolada: ícone no placeholder, ação fixa visível com 30 mensagens,
navegação real para a página Novo modelo e consumo de novo=1; miniatura com três
cabeçalhos coloridos, fundo pontilhado e sem legenda. Layout sem overflow no celular.

A miniatura usa #f8fafc, igual ao canvas, pontos escuros de 1 px de diâmetro
com espaçamento proporcional de 12 px. ResizeObserver mede superfície e início
para posicionar as linhas exatamente nos centros dos conectores em qualquer largura;
conectores usam translateX(-50%). Observers são removidos ao desmontar.
