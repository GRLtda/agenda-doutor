# Design System

Referência visual do frontend `crm-clinica`, baseada nos estilos e componentes
existentes. Consulte antes de criar ou ajustar interfaces.

| Fundação | Conteúdo |
| --- | --- |
| [Bordas](bordas.md) | Níveis de borda, estados de interação e arredondamento por situação. |
| [Cores](cores.md) | Paleta da marca, superfícies, textos e estados semânticos. |
| [Tipografia](tipografia.md) | Fontes, pesos e hierarquia de títulos, valores e descrições. |
| [Carregamento](carregamento.md) | Skeleton, uso do componente e transição para sucesso, vazio ou erro. |

Os valores globais vêm de [global.css](../../src/assets/css/global.css).
Reutilize os componentes compartilhados antes de escrever estilos locais.
As tabelas distinguem tokens globais de valores já usados em componentes:
documentar um valor não cria uma variável CSS nem altera o tema.

Este diretório é a referência das fundações visuais. As regras de composição
continuam em [Regras de layout](../regras-layout.md), os contratos em
[Componentes compartilhados](../componentes-compartilhados.md) e as ilustrações
e mensagens sem dados em [Estados vazios](../estados-vazios.md).

Ao alterar uma fundação ou componente, atualize a página correspondente na
mesma entrega. Confira o componente real em desktop e celular, incluindo
foco, carregamento, erro e textos longos.
