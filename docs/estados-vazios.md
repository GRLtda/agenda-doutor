# Estados vazios das telas

Padrão canônico do CRM para novos estados vazios e migração gradual dos existentes. Referência aprovada: [Imagens e anexos do atendimento](atendimento.md#imagens-e-anexos-sem-fotos) e [SVG de anexos](../src/assets/illustrations/attachments-empty.svg). A fila abaixo é um levantamento do código; não significa que as telas já foram convertidas.

## Layout e conteúdo

- Reutilize `AppEmptyState` com o slot `illustration`.
- Centralize o conjunto de ilustração, título e descrição horizontal e verticalmente na área útil disponível, descontando cabeçalhos, filtros e ações. Use flex/grid; não centralize em relação à janela inteira nem use posicionamento absoluto.
- Em cards, tabelas e modais, centralize dentro do próprio contêiner e use uma versão compacta. Preserve a estrutura e o colspan de tabelas.
- Mantenha margens e rolagem natural no celular, sem alturas fixas ou mínimos que cortem ações.
- Use título curto e contextual e descrição breve. Inclua no máximo uma ação principal quando fizer sentido, sem duplicar o botão de criação já visível.
- Em somente leitura, não sugira nem exiba ações proibidas.

## Como criar o SVG

1. Crie um arquivo em `src/assets/illustrations/<contexto>-empty.svg`, com `xmlns="http://www.w3.org/2000/svg"` e `viewBox="0 0 240 180"`. Use apenas vetores, sem raster, scripts, fontes ou recursos externos.
2. Construa formas simples, geometria limpa e cantos arredondados. Centralize a composição, com margens internas generosas. Preserve proporções e nível de detalhe da referência de anexos.
3. Use branco, azuis muito claros e pequenos detalhes em azul da marca. Evite verde acinzentado, cores vibrantes, contornos escuros e excesso de detalhes.
4. Use as variáveis CSS da família com fallback: `--empty-paper: #fff`, `--empty-backdrop: #f0f4fc`, `--empty-layer: #dce6fa`, `--empty-shadow: #d5e0f5` e `--empty-accent: #6b95ed`. Exemplo: `fill="var(--empty-accent, #6b95ed)"`.
5. Crie profundidade por sobreposição, diferenças suaves de tonalidade e transparências. Use sombras discretas. Varie os objetos conforme o contexto, mantendo o tratamento visual.
6. Use largura máxima de referência de 240px, `max-width: 100%` e altura automática; reduza proporcionalmente em cards compactos. Importe o SVG local confiável com `?raw` para herdar variáveis do tema. Variáveis da página não atravessam um `img src`.
7. Marque a arte decorativa com `aria-hidden="true"` e `focusable="false"`. O significado fica no título e descrição em HTML. Nunca injete SVG recebido de usuários.

## Comportamento

Mostre o vazio somente após consulta bem-sucedida sem dados. Carregamento usa skeleton; falha mostra erro e nova tentativa. Durante envio/compressão, não mostre ausência de anexos. Diferencie falta de cadastro de filtros sem resultado: explique os filtros e ofereça limpar quando apropriado, sem induzir criação desnecessária. Preserve permissões e fluxos existentes. Ausências esperadas em cards podem usar texto compacto sem ilustração grande.

## Fila sugerida

Imagens e anexos do atendimento já é a referência implementada. As demais telas estão pendentes de adoção deste padrão, mesmo quando já possuem um vazio anterior. Cada grupo pode ser tratado em entregas independentes. Atualize o status e a documentação da tela ao concluir.

| Ordem | Telas | Ilustração sugerida | Situação |
| --- | --- | --- | --- |
| 1 | Galeria da clínica; galeria do paciente | Pasta e fotografias; reutilizar SVG de anexos | Pendente |
| 1 | Atendimento: procedimentos; termos | Ficha clínica; documento e assinatura | Pendente |
| 1 | Paciente: orçamentos; termos | Folha de orçamento; documento e assinatura | Pendente |
| 2 | Pacientes | Fichas de pacientes (`patients-empty.svg`) | Implementado; [contrato](listagem-pacientes.md) |
| 2 | Atendimentos | Calendário e ficha | Pendente |
| 2 | Procedimentos | Ficha clínica e instrumentos | Pendente |
| 2 | Anamneses; termos | Prancheta e formulário; documento e assinatura | Pendente |
| 2 | Workflows | Blocos conectados (`workflows-empty.svg`) | Implementado; [contrato](listagem-workflows.md) |
| 3 | Financeiro: contas a receber/pagar; caixa | Documentos financeiros; extrato e moedas discretas | Pendente |
| 3 | Financeiro: resumo | Gráfico e extrato; versão compacta nos cards | Pendente |
| 3 | Estoque: produtos; kits; lotes; movimentações; painel | Caixas, etiquetas e setas suaves | Pendente |
| 4 | Configurações: equipe; unidades | Cartões de pessoas; endereço e localização | Pendente |
| 4 | Configurações: modelos de anamnese e termos | Prancheta; documento e assinatura | Pendente |
| 4 | Marketing: modelos; mensagens automáticas; logs | Balões, relógio e histórico | Pendente |
| 4 | Resumo: aniversariantes; anamneses pendentes | Calendário e presente; formulário e relógio | Pendente |
| 4 | Paciente: cards de detalhes | Ficha, formulário e histórico; versão compacta | Pendente |
| 4 | Perfil: sessões ativas | Dispositivos | Pendente |

## Verificação por entrega

Confira desktop e celular, vazio inicial, filtros sem resultado, carregamento, erro e somente leitura. Verifique primeira criação/upload, exclusão do último item, textos extensos, centralização, contraste e variáveis de tema. Execute `npm run build` após mudanças de código; build não substitui revisão visual. Atualize documentação, confira links Markdown e remova referências obsoletas.
