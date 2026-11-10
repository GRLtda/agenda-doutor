# Acessibilidade e microcopy

Exemplo visual na seção Acessibilidade da [vitrine](vitrine.html#acessibilidade).

## Acessibilidade

| Regra | Detalhe |
| --- | --- |
| Contraste AA | Texto ≥ 4.5:1. `--ds-text-muted` (#64748B) passa sobre branco e `--ds-canvas`; `--ds-text-subtle` só em placeholder e ícone auxiliar. |
| Alvos de toque | 40px no desktop e 44px no celular para botões, inputs e itens de menu. Botão de ícone de 32px precisa de área clicável de 40px no celular. |
| Foco | `--ds-ring` em todo controle; nunca `outline: none` sem substituto. |
| Cor não é a única pista | Status, variação e erro sempre têm texto ou ícone. |
| Leitor de tela | Toast com `role="status"`; erro de campo com `aria-invalid` e `aria-describedby`; ícone sozinho com `aria-label`; animação decorativa com `aria-hidden`. |
| Movimento reduzido | Com `prefers-reduced-motion`, a celebração mostra só a cor final e as transições viram fade de 120ms (já tratado em [motion.css](../../src/assets/css/motion.css)). |
| Teclado | Esc fecha menu, modal e drawer; o foco volta ao botão que abriu. |

## Como escrever

Português claro, voz ativa, sem jargão técnico, falando com quem opera a
clínica.

| Situação | Evite | Prefira |
| --- | --- | --- |
| Botão | OK, Enviar | Salvar paciente, Gerar link |
| Erro de campo | Erro: campo inválido | Informe um telefone com DDD e 9 dígitos. |
| Confirmação destrutiva | Tem certeza? | Cancelar atendimento? O paciente recebe um aviso pelo WhatsApp. |
| Sucesso | Operação realizada com sucesso! | Anamnese anexada |
| Falha geral | Algo deu errado | Não foi possível gerar o link porque o modelo de anamnese foi excluído. Escolha outro modelo. |

- O botão diz o que acontece; o título de sucesso usa o particípio ("Paciente criado").
- A mensagem de erro diz o que fazer para corrigir.
- A confirmação nomeia a consequência e repete o verbo na ação destrutiva.
- Nunca mostre IDs internos ao usuário.

## Mensagens de erro

Todo fluxo que chama a API ou valida dados precisa tratar o erro e mostrar
ao usuário uma mensagem amigável que diga **o que não aconteceu, por quê e o
que fazer**.

| Regra | Detalhe |
| --- | --- |
| Sempre trate o erro | Toda chamada tem estado de erro visível: campo, formulário, painel ou toast. Nunca falhe em silêncio nem deixe o botão carregando para sempre. |
| Explique o motivo | "Não foi possível agendar porque a Dra. Ana já tem um atendimento às 10:30." O motivo vem do código ou da mensagem da API, traduzido para o usuário. |
| Diga o próximo passo | "Escolha outro horário", "Confira o CPF", "Tente novamente em alguns minutos". |
| Sem termos técnicos | Nunca mostre status HTTP, `500`, `timeout`, `network error`, `token`, `payload`, `undefined`, stack trace, nome de campo do banco ou ID interno. |
| Sem mensagens genéricas | Proibido: "Erro ao processar", "Ocorreu um erro", "Algo deu errado", "Erro inesperado", "Falha na requisição". |
| Erro de campo fica no campo | Veja [Formulários](formularios.md); toast é só para falha geral sem campo correspondente. |
| Mantenha o que foi digitado | O erro nunca apaga o formulário; o usuário corrige e tenta de novo. |

Quando a causa realmente não for conhecida (queda de conexão, falha do
servidor), diga o que aconteceu em linguagem simples e o que a pessoa pode
fazer: "Não foi possível salvar o paciente porque a conexão caiu. Seus dados
continuam aqui; tente salvar novamente." Registre o detalhe técnico no log ou
no Sentry, nunca na tela.

| Situação | Evite | Prefira |
| --- | --- | --- |
| Conflito de horário | Erro ao processar | Não foi possível agendar porque já existe um atendimento às 10:30 com a Dra. Ana. Escolha outro horário. |
| Valor duplicado | Erro 409 | Este CPF já está cadastrado para Maria Souza. Abra o cadastro existente. |
| Sem permissão | Forbidden | Você não tem permissão para excluir pagamentos. Peça a um administrador. |
| Conexão | Network Error | Não foi possível salvar porque a conexão caiu. Seus dados continuam aqui; tente novamente. |
| Limite do plano | Request failed | Seu plano permite até 3 profissionais. Para adicionar mais, altere o plano em Assinatura. |
