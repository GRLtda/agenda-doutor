# Regras de UI - Modal "Novo Procedimento"

Este documento registra o padrão visual e estrutural que o modal **Novo Procedimento** deve seguir para ficar consistente com o modal do **Financeiro**.

## Objetivo

- Manter a mesma linguagem visual do financeiro.
- Padronizar a hierarquia de ações.
- Evitar variações soltas de layout, espaçamento e ícones.

## Regras obrigatórias

1. O modal deve usar `stepper` no topo, no mesmo estilo do financeiro.
2. O `stepper` deve indicar claramente a etapa atual e as etapas seguintes.
3. O footer deve seguir o mesmo padrão do financeiro.
4. Os botões do footer devem ter o mesmo posicionamento, proporção e comportamento do financeiro.
5. Os ícones dos botões devem ser pretos.
6. O ícone deve aparecer antes do texto do botão.
7. O texto do botão deve vir imediatamente depois do ícone, sem inversão de ordem.
8. A composição visual dos botões deve permanecer uniforme entre estados normal, hover, focus e disabled.
9. O modal não deve introduzir estilos diferentes de borda, sombra, raio ou espaçamento sem necessidade de produto.
10. O conteúdo interno deve seguir a mesma densidade visual do financeiro.

## Diretrizes de consistência

- Reaproveitar componentes e tokens já usados no financeiro sempre que possível.
- Evitar botões com ícones coloridos se o padrão do financeiro usar ícones pretos.
- Não trocar a ordem visual de ícone e texto.
- Não criar um footer novo com alinhamento próprio se o financeiro já define esse padrão.
- Se houver múltiplas etapas, o comportamento do `stepper` deve ser o mesmo do fluxo financeiro.

## Checklist de validação

- O `stepper` aparece no topo.
- O footer tem o mesmo padrão do financeiro.
- Os botões exibem ícone preto antes do texto.
- O espaçamento entre ícone e texto está consistente.
- O modal mantém aparência coerente com o financeiro.

## Observação

Este repositório contém a API e a documentação de suporte. A implementação visual do modal deve ser aplicada no frontend correspondente usando estas regras como referência.
