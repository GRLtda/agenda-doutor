# Changelog

Todas as mudanças notáveis para o projeto **Agenda Doutor** serão documentadas neste arquivo.

## [1.9.2] - 2026-02-21

### ✨ Adicionado
- **Calendário Responsivo:** Implementação de layout adaptativo para o calendário médico.
- **Painel de Filtros Reutilizável:** Novo componente `CalendarFilterPanel.vue` que centraliza a lógica de filtragem por médico e status.
- **Filtros Mobile:** Adicionado Drawer lateral (`SideDrawer`) para acesso rápido aos filtros em dispositivos móveis através de um botão flutuante (FAB).
- **Contador Mensal:** Exibição do número de agendamentos diários na visualização mensal, com design otimizado e centralizado para mobile.

### 🛠️ Corrigido/Melhorado
- **UX da Toolbar:** A barra de ferramentas flutuante agora trunca datas longas com reticências (`...`) para evitar quebra de layout em telas pequenas.
- **Navegação de Agendamentos:** Ajustes na lógica de navegação "Próximo/Anterior" dentro do modal de detalhes para maior consistência.
- **Visualização Mensal:** Ajuste na altura da grade mensal no mobile para evitar scrolls desnecessários no container.
- **Estilo:** Refinamento dos badges de status e cores do calendário seguindo o sistema de design (Glassmorphism e tons de azul).

---
