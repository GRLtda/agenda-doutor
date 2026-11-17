// Textos do design 2026-v1: 3 variações por kind (Textos.dc.html). Escolha por copyVariant do payload.
// Placeholders: {n} número formatado, {ano}, {proximoAno}, {mes}, {regiao1}.
export interface CopyEntry { p: string; c?: string; x?: string }

export const COPY: Record<string, CopyEntry[]> = {
  abertura: [{ p: 'Um ano inteiro de cuidado, contado em números. Bora relembrar?' }, { p: 'Preparamos um resumo do seu ano. Vem ver?' }, { p: 'Foi um ano e tanto. Bora ver em números?' }],
  total: [{ p: 'Em {ano}, a agenda não parou.', c: 'Foram {n} sorrisos. A agenda nem teve tempo de respirar.' }, { p: 'Que ano movimentado, hein?', c: '{n} vezes alguém saiu daí se sentindo melhor.' }, { p: 'A porta da clínica quase não fechou.', c: '{n} atendimentos. Dá orgulho só de olhar esse número.' }],
  'total-leve': [{ p: 'O começo de uma grande história.', c: 'Cada atendimento conta. E isso é só o começo.' }, { p: 'Todo grande ano começa assim.', c: 'Cada paciente que passou por aí já faz parte da história.' }, { p: 'Passo a passo, a agenda ganhou vida.', c: 'O que vem pela frente promete.' }],
  mes: [{ p: 'Teve mês que a agenda pegou fogo.', c: 'Foi o mês mais cheio do ano.' }, { p: 'E o mês mais disputado foi…', c: 'Conseguir horário nesse mês foi quase missão impossível.' }, { p: 'Um mês para entrar na história da clínica.', c: 'Café extra na recepção, com certeza.' }],
  procedimento: [{ p: 'O queridinho do ano foi ele:', c: 'Seus pacientes sabem o que querem.' }, { p: 'O procedimento que roubou a cena:', c: 'Campeão absoluto de pedidos.' }, { p: 'Se {ano} tivesse um favorito, seria:', c: 'Ninguém resistiu.' }],
  'proc-simples': [{ p: 'O procedimento estrela de {ano} foi…', c: 'Seus pacientes sabem o que é bom.' }, { p: 'O pedido número um do ano:', c: 'Foi só falar dele que a agenda enchia.' }, { p: 'Quem brilhou mais em {ano}?', c: 'Esse aqui, sem discussão.' }],
  financeiro: [{ p: 'Seu melhor mês ficou', c: '{mes} foi o mês de brilhar.' }, { p: 'No mês mais forte, vocês ficaram', c: 'Um mês para guardar na memória.' }, { p: 'O ponto alto do ano ficou', c: '{mes} mostrou do que a clínica é capaz.' }],
  pacientes: [{ p: 'Chegou gente nova por aí.', c: 'Sinal de que gostaram, né?' }, { p: 'A família da clínica cresceu.', c: 'Quem conhece, volta.' }, { p: 'Muita gente conheceu vocês este ano.', c: 'E muitos já marcaram a próxima.' }],
  rosto: [{ p: 'Onde a mágica mais aconteceu', c: 'Expressão leve, resultado natural.' }, { p: 'As regiões preferidas do ano', c: 'A {regiao1} ficou com o primeiro lugar.' }, { p: 'O mapa do cuidado em {ano}', c: 'Cada ponto, um paciente mais confiante.' }],
  mensagens: [{ p: 'Enquanto vocês atendiam, a gente conversava.', c: 'Lembretes e confirmações, sem ninguém digitar nada.', x: 'economizadas pela equipe. Dá quase um feriadão.' }, { p: 'A gente cuidou do papo por vocês.', c: 'Confirmações e lembretes no automático.', x: 'que a equipe usou para o que importa.' }, { p: 'Recado dado, paciente lembrado.', c: 'Ninguém precisou ficar no celular para isso.', x: 'de volta para a equipe. Tempo é ouro.' }],
  comparecimento: [{ p: 'Quase ninguém deu bolo.', c: 'A agenda agradece, e a recepção também.' }, { p: 'Compromisso é com vocês mesmo.', c: 'Cadeira vazia foi raridade.' }, { p: 'Marcou, apareceu.', c: 'Lembrete bom é assim.' }],
  // x = subtítulo logo abaixo do título (o nome da clínica já aparece no cabeçalho).
  resumo: [{ p: 'Que ano!', x: 'Os números que marcaram o seu {ano}.', c: 'Obrigado por deixar a gente fazer parte do seu ano.' }, { p: 'Que {ano}!', x: 'Tudo o que vocês construíram juntos.', c: 'Foi um prazer cuidar da agenda com vocês.' }, { p: 'Ano inesquecível!', x: 'Olha só tudo o que aconteceu por aqui.', c: 'Obrigado pela confiança. Que venha {proximoAno}.' }],
}

export type CopyVars = Record<string, string | number | undefined | null>

export function fill(template: string | undefined, vars: CopyVars): string {
  return (template || '').replace(/\{(\w+)\}/g, (match, key) => {
    const value = vars[key]
    return value === undefined || value === null || value === '' ? match : String(value)
  })
}

/** Texto do kind na variação 1..3 (fora do intervalo cai na 1), com placeholders preenchidos. */
export function pickCopy(kind: string, variant: number, vars: CopyVars) {
  const list = COPY[kind] || [{ p: '' }]
  const v = Number(variant)
  const index = v === 1 || v === 2 || v === 3 ? v - 1 : 0
  const entry = list[index] || list[0]
  return { p: fill(entry.p, vars), c: fill(entry.c, vars), x: fill(entry.x, vars) }
}
