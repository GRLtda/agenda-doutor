# Contexto de Design e Padrões - Agenda Doutor

Este documento define a estética, padrões visuais e diretrizes de desenvolvimento para a plataforma **Agenda Doutor**. Deve ser utilizado como referência principal para garantir consistência em todas as interfaces e comunicações da aplicação.

---

## 1. Identidade e Estilo.

### Estilo da Clínica
*   **Moderno & Limpo:** Design minimalista, com amplo uso de espaço em branco (whitespace) para evitar poluição visual.
*   **Organizado:** Layouts estruturados em grids claros, facilitando a leitura e navegação.
*   **Profissional & Acolhedor:** Transmite confiança técnica sem ser frio; uso de cores e micro-interações que tornam a experiência agradável.

### Tom de Comunicação
*   **Direto:** Informações claras e objetivas.
*   **Profissional:** Linguagem técnica adequada, mas acessível.
*   **Humano:** Foco na experiência do usuário (médico/recepcionista) e do paciente.
*   **Simples:** Evitar jargões desnecessários; priorizar a facilidade de uso.

### Branding
*   **Nome:** "Agenda Doutor" é a marca principal. Deve ser sempre escrita com iniciais maiúsculas.
*   **Logotipo:** Deve manter espaçamento mínimo de segurança (padding) e nunca ser distorcido.

---

## 2. Diretrizes Visuais (Global CSS)

O uso das variáveis definidas em `src/assets/css/global.css` é **obrigatório**.

### Paleta de Cores

| Variável | Cor (Hex) | Uso Principal |
| :--- | :--- | :--- |
| `--azul-principal` | `#3b82f6` | Ações primárias, destaques, botões principais. |
| `--azul-escuro` | `#1e40af` | Estados ativos, hover de primários, elementos de alto contraste. |
| `--branco` | `#ffffff` | Fundos de cards, modais e página. |
| `--preto` | `#0d0d0d` | Textos principais (títulos). |
| `--cinza-claro` | `#f3f4f6` | Fundos de seção, backgrounds secundários, bordas sutis. |
| `--cinza-texto` | `#6b7281` | Textos secundários, legendas, ícones inativos. |
| `--dp-hover-color` | `#eef2ff` | Hover em itens de lista e botões secundários. |

**Lógica de Uso:**
*   **Primária (`--azul-principal`):** Para o que precisa chamar atenção (botão "Salvar", "Novo Agendamento").
*   **Secundária (`--cinza-claro` / `--cinza-texto`):** Para elementos de apoio, divisórias e textos menos urgentes.
*   **Feedback:** Verde (`#10b981`) para sucesso, Vermelho/Laranja para erros ou ações destrutivas.

### Tipografia

*   **Fonte Principal:** `'Montserrat', sans-serif` (Corpo de texto, interface geral).
*   **Fonte de Títulos:** `'Montserrat', sans-serif` (Títulos e cabeçalhos).
*   **Fonte Display:** `'Funnel Display', sans-serif` (Números grandes, destaques específicos).

**Hierarquia:**
*   **H1/H2:** `font-weight: 700`, cor `--preto` ou `#111827`. Tamanho `1.125rem` (18px) a `1.5rem` (24px) em cards/modais.
*   **H3/H4:** `font-weight: 600`, cor `--preto`. Tamanho `1rem` (16px).
*   **Corpo:** `font-weight: 400/500`, cor `#374151`. Tamanho `0.875rem` (14px).
*   **Legendas/Labels:** `font-weight: 500/600`, cor `--cinza-texto`. Tamanho `0.75rem` (12px).

### Espaçamentos e Grid

*   **Border Radius:** `--dp-border-radius: 0.75rem` (12px) para cards, modais e inputs.
*   **Padding Padrão:**
    *   Cards/Modais: `1.5rem` (24px).
    *   Inputs: `0.75rem 1rem`.
    *   Gaps: `0.5rem` (8px), `1rem` (16px), `1.5rem` (24px), `2rem` (32px).

---

## 3. Padrões de Componentes

### Botões (`AppButton`)
*   **Formato:** Cantos arredondados (`8px` ou `0.75rem`), altura confortável.
*   **Variantes:**
    *   *Primary:* Fundo `--azul-principal`, texto branco.
    *   *Secondary:* Fundo transparente ou `--cinza-claro`, texto cinza escuro/azul.
    *   *Icon Only:* Circular (`36x36px`), borda sutil `#e5e7eb`.
*   **Estados:** Hover deve ter transição suave (`0.2s`), leve escala (`scale(1.05)` ou `1.1` para ícones) ou mudança de cor.

### Cards e Containers
*   **Bordas:** `1px solid #e5e7eb` (cinza muito claro).
*   **Sombra:**
    *   Cards: Sutil ou nenhuma (flat).
    *   Modais/Drawers: `box-shadow: -4px 0 20px rgba(0, 0, 0, 0.1)`.
*   **Fundo:** `--branco`.
*   **Cantos:** `0.75rem` (12px).

### Inputs e Formulários
*   **Borda:** `1px solid #d1d5db`. Focus: border-color `--azul-principal`.
*   **Padding:** Confortável (`0.75rem 1rem`).
*   **Labels:** Acima do input, tamanho `0.75rem`, cor `--cinza-texto`.

### Modais e Side Drawers
*   **Overlay:** `rgba(0, 0, 0, 0.3)` com `backdrop-filter: blur(2px)`.
*   **Animação:** `slide-in` (0.3s cubic-bezier).
*   **Estrutura:** Header (Título + Ações), Body (Scrollável), Footer (Ações fixas).

---

## 4. Responsividade

*   **Desktop:** Layouts em grid, sidebars visíveis, modais centralizados ou laterais (drawers).
*   **Tablet:** Ajuste de grids (2 colunas para 1), menus podem colapsar.
*   **Mobile:**
    *   Elementos ocupam 100% da largura.
    *   Fontes legíveis (mínimo 14px para corpo).
    *   Áreas de toque (touch targets) de no mínimo 44px.
    *   Botões de fechar modais acessíveis e visíveis.

---

## 5. Acessibilidade Visual

*   **Contraste:** Garantir contraste suficiente entre texto e fundo (ex: texto cinza escuro sobre fundo branco).
*   **Tamanho:** Evitar fontes menores que `12px` (0.75rem).
*   **Feedback:** Sempre fornecer feedback visual para ações (hover, active, loading).

---

## 6. Exemplos de Código (Snippets)

### Estrutura de Card Padrão
```vue
<div class="card-padrao">
  <div class="card-header">
    <h3>Título do Card</h3>
    <span class="badge">Status</span>
  </div>
  <div class="card-body">
    <p>Conteúdo principal...</p>
  </div>
</div>

<style scoped>
.card-padrao {
  background: var(--branco);
  border: 1px solid #e5e7eb;
  border-radius: var(--dp-border-radius);
  padding: 1.5rem;
}
</style>
```

### Tipografia de Título e Subtítulo
```css
.titulo {
  font-family: var(--fonte-titulo);
  font-weight: 700;
  color: var(--preto);
  font-size: 1.125rem;
}

.subtitulo {
  font-family: var(--fonte-principal);
  font-weight: 500;
  color: var(--cinza-texto);
  font-size: 0.875rem;
}
```
