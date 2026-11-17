// Confete FIXO do cartão do resumo (imagem 1080 × 1920 que vai para o Instagram).
// No story ele cai animado; no cartão cada peça fica exatamente onde está aqui, para nunca cobrir
// o texto, o logo ou o selo. Para ajustar, edite esta lista e confira em
// `npm run dev:retrospectiva` com `?view=cards` (o último cartão é o resumo).
//
// Coordenadas no quadro do cartão (390 × 694 px, depois ampliado para 1080 × 1920):
// - x/y: centro da peça; w/h: tamanho; rot: rotação em graus.
// - Áreas livres: faixa de cima (y < 85), laterais (x < 22 ou x > 368) e faixa de baixo (y > 580;
//   no resumo, entre x 140 e 250 só abaixo de y 610, por causa do logo do Agenda Doutor).
// - Conteúdo: logo e nome em y ≈ 92–130, números e textos em y ≈ 132–540, selo em y ≈ 538–570
//   (no resumo, "Retrospectiva <ano>" + logo completo em y ≈ 548–602).

export interface CardConfettiPiece {
  x: number
  y: number
  w: number
  h: number
  rot: number
  color: string
}

export const CARD_CONFETTI: CardConfettiPiece[] = [
  // faixa de cima
  { x: 18, y: 22, w: 6, h: 10, rot: 0, color: '#FFFFFF' },
  { x: 52, y: 58, w: 8, h: 12, rot: 47, color: '#A9C4FF' },
  { x: 84, y: 14, w: 10, h: 14, rot: 94, color: '#D6E4FF' },
  { x: 118, y: 46, w: 6, h: 16, rot: 141, color: '#7FA6FF' },
  { x: 150, y: 24, w: 8, h: 10, rot: 188, color: '#0A1230' },
  { x: 186, y: 62, w: 10, h: 12, rot: 235, color: '#FFFFFF' },
  { x: 214, y: 18, w: 6, h: 14, rot: 282, color: '#A9C4FF' },
  { x: 246, y: 50, w: 8, h: 16, rot: 329, color: '#D6E4FF' },
  { x: 280, y: 26, w: 10, h: 10, rot: 16, color: '#7FA6FF' },
  { x: 312, y: 64, w: 6, h: 12, rot: 63, color: '#0A1230' },
  { x: 340, y: 20, w: 8, h: 14, rot: 110, color: '#FFFFFF' },
  { x: 372, y: 48, w: 10, h: 16, rot: 157, color: '#A9C4FF' },
  // laterais
  { x: 10, y: 120, w: 6, h: 10, rot: 204, color: '#D6E4FF' },
  { x: 380, y: 150, w: 8, h: 12, rot: 251, color: '#7FA6FF' },
  { x: 14, y: 210, w: 10, h: 14, rot: 298, color: '#0A1230' },
  { x: 376, y: 250, w: 6, h: 16, rot: 345, color: '#FFFFFF' },
  { x: 8, y: 300, w: 8, h: 10, rot: 32, color: '#A9C4FF' },
  { x: 382, y: 340, w: 10, h: 12, rot: 79, color: '#D6E4FF' },
  { x: 12, y: 400, w: 6, h: 14, rot: 126, color: '#7FA6FF' },
  { x: 378, y: 440, w: 8, h: 16, rot: 173, color: '#0A1230' },
  { x: 10, y: 500, w: 10, h: 10, rot: 220, color: '#FFFFFF' },
  { x: 380, y: 530, w: 6, h: 12, rot: 267, color: '#A9C4FF' },
  // faixa de baixo
  { x: 20, y: 600, w: 8, h: 14, rot: 314, color: '#D6E4FF' },
  { x: 56, y: 640, w: 10, h: 16, rot: 1, color: '#7FA6FF' },
  { x: 92, y: 612, w: 6, h: 10, rot: 48, color: '#0A1230' },
  { x: 128, y: 668, w: 8, h: 12, rot: 95, color: '#FFFFFF' },
  { x: 108, y: 634, w: 10, h: 14, rot: 142, color: '#A9C4FF' },
  { x: 200, y: 650, w: 6, h: 16, rot: 189, color: '#D6E4FF' },
  { x: 236, y: 616, w: 8, h: 10, rot: 236, color: '#7FA6FF' },
  { x: 272, y: 676, w: 10, h: 12, rot: 283, color: '#0A1230' },
  { x: 306, y: 602, w: 6, h: 14, rot: 330, color: '#FFFFFF' },
  { x: 338, y: 646, w: 8, h: 16, rot: 17, color: '#A9C4FF' },
  { x: 370, y: 618, w: 10, h: 10, rot: 64, color: '#D6E4FF' },
  { x: 46, y: 680, w: 6, h: 12, rot: 111, color: '#7FA6FF' },
  { x: 352, y: 684, w: 8, h: 14, rot: 158, color: '#0A1230' },
]
