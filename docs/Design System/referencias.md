# Referências e decisões do

## Inspirações

| Referência | O que aproveitamos |
| --- | --- |
| [shadcn/ui](https://ui.shadcn.com/) | Borda fina + sombra mínima, raio por token, foco em anel. |
| [Untitled UI](https://www.untitledui.com/) | Escala de sombras em tom frio e estados de input. |
| [Radix Themes](https://www.radix-ui.com/themes) | Escalas de cinza e camadas de superfície. |
| Referências enviadas pelo produto | Botões macios com brilho interno; grade de estados de input (default, filled, hover, focus, disabled, error com ícone e mensagem). |
| Drawers de anexar anamnese e termo | Padrão de celebração de conclusão e troca de etapa ([Animações](animacoes.md)). |

## Decisões

Todas as decisões abaixo foram tomadas em 10/11/2026.

| Pergunta | Escolha |
| --- | --- |
| Elevação de cards | Borda + sombra leve (estilo shadcn). |
| Escala de raio | 6 / 8 / 10 / 14 / 18 / full. |
| Estados de input | Iguais à referência: hover escurece a borda, foco azul com halo de 3px, erro vermelho com halo, ícone e mensagem. |
| Fundo do conteúdo | Canvas cinza-azulado `#F6F8FB`; sidebar branca. |
| Preservados | Estrutura da sidebar, paleta da marca, variantes e cores dos botões. |
| Prioridades do DS | Grid, animações, espaçamento, tipografia, ícones, acessibilidade, microcopy e gráficos. |
| Largura do conteúdo | Contêiner por tipo: fluido para listas, agenda e dashboards; 960px para detalhes; 720px para formulários. |
| Espaçamento | Base 4px. |
| Breakpoints | 520 / 768 / 1024 / 1280. |
| Celebração | Só em conclusões importantes (anamnese/termo, paciente, agendamento, pagamento, atendimento finalizado). |
| Ritmo | Rápido: 120 / 200 / 320ms; 480ms para troca de etapa. |
| Momentos animados | Drawer, modal e menus; entrada de listas; feedback de ações. Contagem de números fica opcional. |
| Variantes da celebração | Sucesso verde + informação azul; erro nunca celebra. |
| Botões, campos e tabela | Mantidos exatamente como os componentes atuais e documentados; sem migração. |
| Campos de formulário | Sempre componentes existentes; nunca input nativo. Textarea cresce sozinha, sem redimensionamento manual. |
| Mudanças no Design System | Quando o produto pedir uma mudança ou disser que não gosta de algo coberto, o agente atualiza o Design System sozinho na mesma entrega. |
| Mensagens de erro | Sempre tratadas, amigáveis, com o motivo e o próximo passo; sem termos técnicos nem textos genéricos. |
| Nome | Documentação única "Design System", sem numeração de versão. |

Registre novas decisões nesta tabela sempre que o Design System mudar.
