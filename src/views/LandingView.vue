<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import AppHeader from '@/components/global/AppHeader.vue'
import { RouterLink } from 'vue-router'
import { DotLottieVue } from '@lottiefiles/dotlottie-vue'
// 💡 Importei os ícones necessários
import {
  Building,
  Check,
  Zap,
  Clock,
  LifeBuoy,
  X,
  KeyRound,
  Monitor,
  ChevronRight,
  AlertCircle,
  CheckCircle,
  MessageCircle,
  Play,
  ArrowRight,
  Plus,
  FileQuestion,
  Minus,
} from 'lucide-vue-next'

// 🎯 Foco apenas no plano Empresarial
const planos = ref([
  {
    name: 'Empresarial',
    icon: Building,
    price: 'Sob Consulta', // Trocado de 'Contato' para 'Sob Consulta'
    period: '',
    description: 'Para clínicas com múltiplas unidades e necessidades complexas.',
    featured: true, // Deixei como 'featured' para dar mais destaque
    buttonText: 'Fale conosco',
    benefits: [
      'Gestão Completa de Pacientes',
      'Agenda Online Avançada',
      'Prontuário Eletrônico Personalizável',
      'Usuários Ilimitados',
    ],
    limitations: [], // Sem limitações
  },
])



const faqItems = ref([
  {
    question: 'Posso acessar de qualquer lugar?',
    answer:
      'Sim! O Agenda Doutor é 100% em nuvem. Você pode acessar pelo computador, tablet ou celular, de onde estiver.',
    open: false,
  },
  {
    question: 'É seguro armazenar os dados dos pacientes?',
    answer:
      'Segurança é nossa prioridade. Utilizamos criptografia de ponta a ponta e backups diários automáticos para garantir a proteção total dos seus dados.',
    open: false,
  },
  {
    question: 'O sistema envia lembretes automáticos?',
    answer:
      'Com certeza! O sistema envia confirmações via WhatsApp e E-mail automaticamente, reduzindo drasticamente as faltas.',
    open: false,
  },
  {
    question: 'Posso personalizar os modelos de prontuário?',
    answer:
      'Sim, você tem total liberdade para criar e editar modelos de anamnese, evolução e receitas conforme a sua especialidade.',
    open: false,
  },
  {
    question: 'Há limite de armazenamento de arquivos?',
    answer:
      'Não! O armazenamento de prontuários, exames e anexos é ilimitado e seguro na nuvem.',
    open: false,
  },
  {
    question: 'Como funciona o suporte em caso de dúvidas?',
    answer:
      'Oferecemos suporte humanizado e prioritário via WhatsApp e E-mail. Nossa equipe está pronta para te ajudar a extrair o máximo do sistema.',
    open: false,
  },
  {
    question: 'Existe fidelidade ou multa de cancelamento?',
    answer:
      'Não acreditamos em prender clientes por contrato. Você pode cancelar sua assinatura a qualquer momento, sem multas ou taxas surpresas.',
    open: false,
  },
])

function toggleFaq(index) {
  faqItems.value.forEach((item, i) => {
    if (i !== index) item.open = false
  })
  faqItems.value[index].open = !faqItems.value[index].open
}


const companyLogos = ref([
  { id: 1, src: 'https://placehold.co/150x50/e5e7eb/1f2937?text=Clínica+Vida', alt: 'Clínica Vida' },
  { id: 2, src: 'https://placehold.co/150x50/e5e7eb/1f2937?text=Saúde+Mais', alt: 'Saúde Mais' },
  { id: 3, src: 'https://placehold.co/150x50/e5e7eb/1f2937?text=Odonto+Prime', alt: 'Odonto Prime' },
  { id: 4, src: 'https://placehold.co/150x50/e5e7eb/1f2937?text=Derma+Care', alt: 'Derma Care' },
  { id: 5, src: 'https://placehold.co/150x50/e5e7eb/1f2937?text=Cardio+Center', alt: 'Cardio Center' },
  { id: 6, src: 'https://placehold.co/150x50/e5e7eb/1f2937?text=Orto+Fisio', alt: 'Orto Fisio' },
  { id: 7, src: 'https://placehold.co/150x50/e5e7eb/1f2937?text=Neuro+Lab', alt: 'Neuro Lab' },
  { id: 8, src: 'https://placehold.co/150x50/e5e7eb/1f2937?text=Pediatria+Kids', alt: 'Pediatria Kids' },
])

onMounted(() => {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible')
        }
      })
    },
    { threshold: 0.1 },
  )

  document.querySelectorAll('.animate-on-scroll').forEach((el) => {
    observer.observe(el)
  })
})

</script>

<template>
  <AppHeader class="header-slide-down" />
  <main>
    <section class="hero">
      <div class="container hero-container">
        <div class="hero-content">
          <h1 class="hero-title animate-slide-up">Sua clínica no piloto automático</h1>
          <p class="hero-subtitle animate-slide-up">
            Impulsione o sucesso da sua clínica com uma solução que elimina tarefas manuais e acelera
            o seu faturamento.
          </p>
          <div class="hero-actions animate-slide-up">
            <router-link to="/app" class="btn-primary"> Entrar <KeyRound :size="20" /> </router-link>
          </div>
        </div>
        <div class="hero-visual animate-slide-up">
          <!-- Substitua o src pela URL do seu arquivo .lottie -->
            <DotLottieVue
            style="height: 500px; width: 500px"
            autoplay
            loop
            src="https://lottie.host/b97ec318-9530-4c49-997d-fb14b7481de2/K56IuKLrQ2.json"
          />

        </div>
      </div>
    </section>

    <Carousel
      :images="carouselImages"
      :auto-play="true"
      :interval="4000"
    />

    <section class="trusted-section" v-if="false">
      <div class="container">
        <p class="trusted-title">Mais de 500 clínicas confiam no Agenda Doutor</p>
        <div class="marquee-wrapper">
          <div class="marquee-content">
            <!-- Duplicado para efeito infinito -->
            <div v-for="i in 2" :key="i" class="marquee-group">
              <div v-for="logo in companyLogos" :key="logo.id" class="company-logo">
                <img :src="logo.src" :alt="logo.alt" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <section class="comparison-section">
      <div class="container">
        <div class="section-header animate-on-scroll">
          <h2 class="section-title">Transforme a realidade da sua clínica</h2>
          <p class="section-subtitle">
            Veja como o Agenda Doutor organiza sua rotina e potencializa seus resultados.
          </p>
        </div>

        <div class="comparison-grid">
          <!-- CARD ANTES (VERMELHO) -->
          <div class="comparison-card before animate-on-scroll">
            <div class="card-header">
              <div class="icon-wrapper">
                <AlertCircle :size="32" />
              </div>
              <h3>Antes do Agenda Doutor</h3>
            </div>
            <ul class="comparison-list">
              <li>
                <FileQuestion :size="20" />
                <span>Agenda desorganizada e horários conflituosos</span>
              </li>
              <li>
                <X :size="20" />
                <span>Equipe perdida com tarefas manuais</span>
              </li>
              <li>
                <X :size="20" />
                <span>Falta de confirmação e alto índice de faltas</span>
              </li>
              <li>
                <X :size="20" />
                <span>Prontuários de papel difíceis de encontrar</span>
              </li>
            </ul>
          </div>

          <!-- CARD DEPOIS (VERDE/BRAND) -->
          <div class="comparison-card after animate-on-scroll">
            <div class="card-header">
              <div class="icon-wrapper">
                <CheckCircle :size="32" />
              </div>
              <h3>Depois do Agenda Doutor</h3>
            </div>
            <ul class="comparison-list">
              <li>
                <Clock :size="20" />
                <span>Sua equipe entende e otimiza seu tempo</span>
              </li>
              <li>
                <MessageCircle :size="20" />
                <span>Integração total com WhatsApp para confirmações</span>
              </li>
              <li>
                <Zap :size="20" />
                <span>Processos automatizados e eficientes</span>
              </li>
              <li>
                <Monitor :size="20" />
                <span>Prontuário digital acessível de qualquer lugar</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </section>




    <!-- 🌟 SEÇÃO DE TUTORIAIS / RECURSOS 🌟 -->
    <section class="tutorials-section" v-if="false">
      <div class="container">
        <div class="section-header animate-on-scroll">
          <h2 class="section-title">Veja o sistema em ação</h2>
          <p class="section-subtitle">
            Interface intuitiva projetada para facilitar o dia a dia de médicos e secretárias.
          </p>
        </div>

        <div class="tutorials-grid">
          <div class="tutorial-item animate-on-scroll">
            <div class="tutorial-content">
              <h3>Agendamento Inteligente</h3>
              <p>Visualize sua agenda por dia, semana ou mês com facilidade.</p>
              <a href="#" class="tutorial-link">Ver detalhes <ArrowRight :size="16" /></a>
            </div>
            <div class="tutorial-visual">
              <div class="placeholder-overlay">
                <Play :size="48" />
                <span>Ver Demonstração</span>
              </div>
              <img src="https://placehold.co/600x400/f1f5f9/94a3b8?text=Agenda+View" alt="Tutorial Agenda" />
            </div>
          </div>

          <div class="tutorial-item reverse animate-on-scroll">
            <div class="tutorial-content">
              <h3>Prontuário Eletrônico</h3>
              <p>Histórico completo do paciente a um clique de distância.</p>
              <a href="#" class="tutorial-link">Ver detalhes <ArrowRight :size="16" /></a>
            </div>
            <div class="tutorial-visual">
              <div class="placeholder-overlay">
                <Play :size="48" />
                <span>Ver Demonstração</span>
              </div>
              <img src="https://placehold.co/600x400/f1f5f9/94a3b8?text=Prontuario+View" alt="Tutorial Prontuário" />
            </div>
          </div>

          <div class="tutorial-item animate-on-scroll">
            <div class="tutorial-content">
              <h3>Financeiro Integrado</h3>
              <p>Controle total do fluxo de caixa e faturamento da clínica.</p>
              <a href="#" class="tutorial-link">Ver detalhes <ArrowRight :size="16" /></a>
            </div>
            <div class="tutorial-visual">
              <div class="placeholder-overlay">
                <Play :size="48" />
                <span>Ver Demonstração</span>
              </div>
              <img src="https://placehold.co/600x400/f1f5f9/94a3b8?text=Financeiro+View" alt="Tutorial Financeiro" />
            </div>
          </div>
        </div>
      </div>
    </section>

    <section class="plans-section">
      <div class="container-plans">
        <h2 class="section-title">Uma solução sob medida para sua clínica</h2>
        <p class="section-subtitle">
          Para clínicas que exigem o máximo de performance, personalização e um suporte dedicado.
        </p>

        <div class="plans-grid">
          <div
            v-for="plano in planos"
            :key="plano.name"
            class="plan-card"
            :class="{ featured: plano.featured }"
          >
            <h3 class="plan-name">
              <component :is="plano.icon" :size="20" />
              <span>{{ plano.name }}</span>
            </h3>
            <p class="plan-price">
              {{ plano.price }}<span class="plan-period">{{ plano.period }}</span>
            </p>
            <p class="plan-description">{{ plano.description }}</p>

            <ul class="plan-features">
              <li v-for="benefit in plano.benefits" :key="benefit" class="benefit">
                <Check :size="16" /> {{ benefit }}
              </li>
            </ul>

            <ul v-if="plano.limitations.length > 0" class="plan-features">
              <li v-for="limitation in plano.limitations" :key="limitation" class="limitation">
                <X :size="16" /> {{ limitation }}
              </li>
            </ul>

            <a
              href="https://wa.me/5511921923978"
              target="_blank"
              :class="plano.featured ? 'btn-primary-featured' : 'btn-outline'"
            >
              {{ plano.buttonText }}
            </a>

            <div class="plan-footer-support">
              <h4 class="footer-support-title">Um Atendimento que Realmente Funciona</h4>
              <div class="footer-features-grid">
                <div class="footer-feature-item">
                  <Zap :size="20" class="feature-icon" />
                  <div class="feature-text">
                    <h5>Suporte Rápido</h5>
                    <p>Respostas ágeis via chat e vídeo.</p>
                  </div>
                </div>
                <div class="footer-feature-item">
                  <Clock :size="20" class="feature-icon" />
                  <div class="feature-text">
                    <h5>24/7 Disponível</h5>
                    <p>Plataforma e suporte sempre prontos.</p>
                  </div>
                </div>
                <div class="footer-feature-item">
                  <LifeBuoy :size="20" class="feature-icon" />
                  <div class="feature-text">
                    <h5>Atendimento Humano</h5>
                    <p>Especialistas que entendem sua clínica.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
    <section class="faq-section">
      <div class="container faq-container">
        <div class="faq-header animate-on-scroll">
          <h2 class="section-title">
            Dúvidas Frequentes
            <img src="@/assets/imgs/pensativo.png" alt="Emoji Pensativo" class="faq-emoji" />
          </h2>
          <p class="section-subtitle">
            Tire suas dúvidas sobre como o Agenda Doutor pode ajudar sua clínica.
          </p>
          <a href="https://wa.me/5511921923978" target="_blank" class="btn-whatsapp-contact">
            <MessageCircle :size="20" />
            Entrar em contato pelo WhatsApp
          </a>
        </div>

        <div class="faq-list-wrapper">
          <div class="fade-overlay top"></div>
          <div class="faq-scroll-area">
            <div class="faq-grid">
              <div
                v-for="(item, index) in faqItems"
                :key="index"
                class="faq-item"
                :class="{ active: item.open }"
                @click="toggleFaq(index)"
              >
                <div class="faq-question">
                  <h3>{{ item.question }}</h3>
                  <div class="faq-icon">
                    <component :is="item.open ? Minus : Plus" :size="20" />
                  </div>
                </div>
                <div class="faq-answer-wrapper" :class="{ open: item.open }">
                  <div class="faq-answer">
                    <p>{{ item.answer }}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div class="fade-overlay bottom"></div>
        </div>
      </div>
    </section>
  </main>

  <footer class="app-footer">
    <div class="footer-container">
      <div class="footer-copyright">
        © {{ new Date().getFullYear() }}. Todos os direitos reservados.
      </div>

      <nav class="footer-links">
        <RouterLink to="/termos">Termos de Uso</RouterLink>
        <RouterLink to="/privacidade">Privacidade</RouterLink>
      </nav>

      <div class="footer-produced-by">
        <span>Produzido por</span>
        <a href="https://grltda.vercel.app" target="_blank" rel="noopener noreferrer" class="gr-logo">
          <img src="@/assets/imgs/gr.svg" alt="Logo GR" class="gr-logo-svg" />
        </a>
      </div>
    </div>
  </footer>
</template>

<style scoped>
/* ANIMAÇÕES DE ENTRADA */
@keyframes slideDown {
  from {
    transform: translateY(-100%);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}
@keyframes slideUp {
  from {
    transform: translateY(30px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

:global(.header-slide-down) {
  animation: slideDown 0.8s cubic-bezier(0.23, 1, 0.32, 1) forwards;
}

.animate-slide-up {
  opacity: 0;
  animation: slideUp 0.8s cubic-bezier(0.23, 1, 0.32, 1) forwards;
}
.hero-title {
  animation-delay: 0.2s;
}
.hero-subtitle {
  animation-delay: 0.4s;
}
.hero-actions {
  animation-delay: 0.6s;
}
.hero-visual {
  animation-delay: 0.8s;
}

/* ESTILOS GERAIS */
main {
  position: relative;
  overflow: hidden;
  /* 💡 Fundo quadriculado com pontos de luz 💡 */
  background-color: #ffffff;
  background-image:
    /* Pontos de luz (Radial Gradients) */
    radial-gradient(circle at 15% 50%, rgba(59, 130, 246, 0.08) 0%, transparent 25%),
    radial-gradient(circle at 85% 30%, rgba(147, 51, 234, 0.08) 0%, transparent 25%),
    /* Grid (Linear Gradients) */
    linear-gradient(to right, rgba(229, 231, 235, 0.5) 1px, transparent 1px),
    linear-gradient(to bottom, rgba(229, 231, 235, 0.5) 1px, transparent 1px);
  background-size: 100% 100%, 100% 100%, 40px 40px, 40px 40px;
  min-height: calc(100vh - 100px);
}
.hero,
.plans-section,
.platform-section {
  position: relative;
  z-index: 2;
}
.hero {
  padding: 8rem 0 6rem;
  display: flex;
  align-items: center;
  min-height: 80vh; /* Garante altura mínima para centralizar verticalmente */
}
.hero-container {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 4rem;
  max-width: 1280px; /* Aumentei um pouco para telas maiores */
  margin: 0 auto;
  padding: 0 2rem;
  width: 100%;
}
.hero-content {
  flex: 1;
  text-align: left;
  max-width: 640px;
}
.hero-visual {
  flex: 1;
  display: flex;
  justify-content: center;
  align-items: center;
  position: relative;
}

/* Adiciona um brilho sutil atrás do Lottie */
.hero-visual::before {
  content: '';
  position: absolute;
  width: 80%;
  height: 80%;
  background: radial-gradient(circle, rgba(59, 130, 246, 0.15) 0%, transparent 70%);
  z-index: -1;
  border-radius: 50%;
  filter: blur(40px);
}

.hero-title {
  font-family: var(--fonte-titulo);
  font-size: clamp(2rem, 4vw, 3.5rem); /* Tipografia responsiva reduzida */
  font-weight: 700;
  line-height: 1.1;
  margin-bottom: 1.5rem;
  letter-spacing: -0.03em;
  color: var(--preto);
}
.hero-subtitle {
  font-family: var(--fonte-principal);
  font-size: 1.25rem;
  color: var(--cinza-texto);
  margin-bottom: 3rem;
  line-height: 1.6;
  max-width: 90%;
}
.hero-actions {
  display: flex;
  gap: 1.5rem; /* Mais espaço entre os botões */
}
.hero-actions .btn-primary,
.hero-actions .btn-secondary {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  padding: 1rem 2.5rem; /* Botões mais largos */
  font-size: 1.125rem;
  font-weight: 600;
  border-radius: 9999px; /* Pill shape completo */
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  text-decoration: none;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
}
.btn-primary {
  background-color: var(--azul-principal);
  color: var(--branco);
  border: 2px solid transparent;
}
.btn-primary:hover {
  background-color: var(--azul-escuro);
  transform: translateY(-2px);
  box-shadow: 0 10px 15px -3px rgba(59, 130, 246, 0.3);
}
.btn-secondary {
  background-color: var(--cinza-claro);
  color: var(--preto);
  border: 2px solid transparent;
}
.btn-secondary:hover {
  background-color: #e5e7eb;
  transform: translateY(-2px);
}

@media (max-width: 900px) {
  .hero {
    padding: 6rem 0 4rem;
    min-height: auto;
    text-align: center;
  }
  .hero-container {
    flex-direction: column;
    gap: 3rem;
  }
  .hero-content {
    text-align: center;
    max-width: 100%;
  }
  .hero-actions {
    justify-content: center;
    flex-wrap: wrap;
  }
  .hero-visual {
    width: 100%;
    max-width: 400px;
  }
}

/* SEÇÃO DE EMPRESAS (CARROSSEL) */
.trusted-section {
  padding: 4rem 0;
  background-color: transparent;
  border-bottom: 1px solid #f3f4f6;
  overflow: hidden;
}
.trusted-title {
  text-align: center;
  font-size: 1rem;
  font-weight: 500;
  color: var(--cinza-texto);
  margin-bottom: 2.5rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}
.marquee-wrapper {
  position: relative;
  width: 100%;
  overflow: hidden;
  mask-image: linear-gradient(to right, transparent, black 10%, black 90%, transparent);
}
.marquee-content {
  display: flex;
  width: max-content;
  animation: scroll 40s linear infinite;
}
.marquee-group {
  display: flex;
  align-items: center;
  gap: 4rem;
  padding-right: 4rem; /* Espaço para conectar com o próximo grupo */
}
.company-logo img {
  height: 40px;
  width: auto;
  opacity: 0.5;
  transition: opacity 0.3s ease;
  filter: grayscale(100%);
}
.company-logo img:hover {
  opacity: 1;
  filter: grayscale(0%);
}

@keyframes scroll {
  from {
    transform: translateX(0);
  }
  to {
    transform: translateX(-50%);
  }
}

/* SEÇÃO PLATAFORMA (NOVO DESIGN) */


/* SEÇÃO DE PLANOS */
.plans-section {
  padding: 8rem 0;
  position: relative;
}

/* Fundo decorativo para a seção de planos */
.plans-section::before {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 100%;
  height: 100%;
  background: radial-gradient(circle at center, rgba(59, 130, 246, 0.05) 0%, transparent 70%);
  z-index: -1;
  pointer-events: none;
}

.container-plans {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 1rem;
  text-align: center;
}
.section-title {
  font-family: var(--fonte-titulo);
  font-size: 2.5rem;
  font-weight: 700;
  margin-bottom: 1rem;
  color: var(--preto);
}
.section-subtitle {
  font-family: var(--fonte-principal);
  font-size: 1.125rem;
  color: var(--cinza-texto);
  margin-bottom: 4rem;
  max-width: 600px;
  margin-left: auto;
  margin-right: auto;
  line-height: 1.6;
}
.plans-grid {
  display: flex;
  justify-content: center;
  gap: 2rem;
  text-align: left;
  flex-wrap: wrap; /* Permite quebrar linha se necessário */
}

@media (max-width: 768px) {
  .plans-grid {
    flex-direction: column;
    align-items: center;
  }
}

/* Card Moderno */
.plan-card {
  border: 1px solid rgba(0, 0, 0, 0.1);
  border-radius: 1.5rem; /* Bordas mais arredondadas */
  padding: 3rem;
  display: flex;
  flex-direction: column;
  background-color: #ffffff;
  width: 100%;
  max-width: 500px; /* Limite de largura para ficar elegante */
  position: relative;
  overflow: hidden;
  transition: transform 0.3s ease, box-shadow 0.3s ease;
}

.plan-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 20px 40px -10px rgba(0, 0, 0, 0.1);
}

/* Estilo Featured (Dark Premium) */
.plan-card.featured {
  background-color: #0f172a; /* Azul muito escuro/Preto */
  color: #ffffff;
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
}

/* Efeito de brilho no topo do card featured */
.plan-card.featured::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(59, 130, 246, 0.5), transparent);
}

.plan-name {
  font-family: var(--fonte-titulo);
  font-size: 1.5rem;
  font-weight: 600;
  margin-bottom: 1.5rem;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  color: inherit;
}

.plan-price {
  font-family: var(--fonte-titulo);
  font-size: 3.5rem;
  font-weight: 700;
  margin-bottom: 0.5rem;
  line-height: 1;
  letter-spacing: -0.02em;
}

.plan-period {
  font-family: var(--fonte-principal);
  font-size: 1rem;
  font-weight: 500;
  color: var(--cinza-texto);
  margin-left: 0.5rem;
}
.featured .plan-period {
  color: #94a3b8;
}

.plan-description {
  font-size: 1rem;
  line-height: 1.6;
  margin-bottom: 2.5rem;
  color: var(--cinza-texto);
}
.featured .plan-description {
  color: #cbd5e1;
}

.plan-features {
  list-style: none;
  margin-bottom: 2.5rem;
  padding: 0;
  flex-grow: 1;
}
.plan-features li {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1rem;
  font-size: 1rem;
}

.benefit svg {
  color: var(--azul-principal);
  flex-shrink: 0;
}
.featured .benefit svg {
  color: #60a5fa; /* Azul mais claro no escuro */
}

.limitation svg {
  color: #ef4444;
  flex-shrink: 0;
}
.featured .limitation {
  color: #94a3b8;
}
.btn-outline {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid var(--preto);
  color: var(--preto);
  background-color: transparent;
  font-weight: 600;
  border-radius: 2rem;
  cursor: pointer;
  display: block;
  text-align: center;
  transition: all 0.3s ease;
}
.btn-outline:hover {
  background-color: var(--preto);
  color: var(--branco);
}
.btn-primary-featured {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid var(--azul-principal);
  background-color: var(--azul-principal);
  color: var(--branco);
  font-weight: 600;
  border-radius: 2rem;
  cursor: pointer;
  display: block;
  text-align: center;
  transition: all 0.3s ease;
}
.btn-primary-featured:hover {
  background-color: var(--azul-escuro);
}

.carousel-dots {
  display: none;
}

/* RODAPÉ DENTRO DO CARD */
.plan-footer-support {
  margin-top: 2rem;
  padding-top: 2rem;
  border-top: 1px solid #e5e7eb;
}
.featured .plan-footer-support {
  border-top-color: rgba(255, 255, 255, 0.1);
}
.footer-support-title {
  font-size: 0.875rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--cinza-texto);
  margin-bottom: 1.5rem;
}
.featured .footer-support-title {
  color: #94a3b8;
}
.footer-features-grid {
  display: grid;
  gap: 1.5rem;
}
.footer-feature-item {
  display: flex;
  gap: 1rem;
  align-items: flex-start;
}
.feature-icon {
  color: var(--azul-principal);
  margin-top: 0.125rem;
}
.featured .feature-icon {
  color: #60a5fa;
}
.feature-text h5 {
  font-size: 0.95rem;
  font-weight: 600;
  margin-bottom: 0.25rem;
  color: var(--preto);
}
.featured .feature-text h5 {
  color: #fff;
}
.feature-text p {
  font-size: 0.875rem;
  color: var(--cinza-texto);
  line-height: 1.4;
}
.featured .feature-text p {
  color: #cbd5e1;
}

/* 💡 --- NOVOS ESTILOS PARA SEÇÕES E ANIMAÇÕES --- 💡 */

/* Animação ao Scroll */
.animate-on-scroll {
  opacity: 0;
  transform: translateY(30px);
  transition: opacity 0.8s ease-out, transform 0.8s ease-out;
}
.animate-on-scroll.is-visible {
  opacity: 1;
  transform: translateY(0);
}

/* Seção de Comparação */
.comparison-section {
  padding: 6rem 0;
  background-color: #fff;
}
.section-header {
  text-align: center;
  margin-bottom: 4rem;
  max-width: 800px;
  margin-left: auto;
  margin-right: auto;
}
.comparison-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 2rem;
  max-width: 1000px;
  margin: 0 auto;
}

@media (max-width: 768px) {
  .comparison-grid {
    grid-template-columns: 1fr;
    gap: 1.5rem;
  }
  .comparison-card {
    padding: 2rem; /* Reduz padding no mobile */
  }
  .card-header {
    flex-direction: column;
    text-align: center;
    gap: 1rem;
  }
  .comparison-card h3 {
    font-size: 1.25rem;
  }
}
.comparison-card {
  padding: 3rem;
  border-radius: 1.5rem;
  border: 1px solid transparent;
  transition: transform 0.3s ease;
}
.comparison-card:hover {
  transform: translateY(-5px);
}

/* Card Antes */
.comparison-card.before {
  background-color: #fef2f2; /* Vermelho bem claro */
  border-color: #fee2e2;
}
.comparison-card.before .icon-wrapper {
  background-color: #fee2e2;
  color: #ef4444;
}
.comparison-card.before h3 {
  color: #991b1b;
}
.comparison-card.before .comparison-list li svg {
  color: #ef4444;
}

/* Card Depois */
.comparison-card.after {
  background-color: #f0fdf4; /* Verde bem claro (ou azul brand se preferir) */
  border-color: #dcfce7;
  box-shadow: 0 10px 30px -10px rgba(22, 163, 74, 0.1);
}
.comparison-card.after .icon-wrapper {
  background-color: #dcfce7;
  color: #16a34a;
}
.comparison-card.after h3 {
  color: #166534;
}
.comparison-card.after .comparison-list li svg {
  color: #16a34a;
}

.card-header {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 2rem;
}
.icon-wrapper {
  width: 60px;
  height: 60px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}
.comparison-card h3 {
  font-family: var(--fonte-titulo);
  font-size: 1.5rem;
  font-weight: 700;
  margin: 0;
}
.comparison-list {
  list-style: none;
  padding: 0;
  margin: 0;
}
.comparison-list li {
  display: flex;
  align-items: flex-start;
  gap: 1rem;
  margin-bottom: 1rem;
  font-size: 1.05rem;
  color: #4b5563;
  line-height: 1.5;
}
.comparison-list li svg {
  flex-shrink: 0;
  margin-top: 0.2rem;
}

/* Seção de Tutoriais */
.tutorials-section {
  padding: 6rem 0;
  background-color: #f8fafc;
}
.tutorials-grid {
  display: flex;
  flex-direction: column;
  gap: 6rem;
  max-width: 1000px;
  margin: 0 auto;
}
.tutorial-item {
  display: flex;
  align-items: center;
  gap: 4rem;
}
.tutorial-item.reverse {
  flex-direction: row-reverse;
}
.tutorial-content {
  flex: 1;
}
.tutorial-content h3 {
  font-family: var(--fonte-titulo);
  font-size: 2rem;
  font-weight: 700;
  color: var(--preto);
  margin-bottom: 1rem;
}
.tutorial-content p {
  font-size: 1.125rem;
  color: var(--cinza-texto);
  margin-bottom: 2rem;
  line-height: 1.6;
}

/* SEÇÃO FAQ */
.faq-section {
  padding: 6rem 0;
  background-color: #fff;
}
.faq-grid {
  max-width: 800px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}
.faq-item {
  border: 1px solid #e5e7eb;
  border-radius: 1rem;
  overflow: hidden;
  transition: all 0.3s ease;
  cursor: pointer;
  background-color: #fff;
}
.faq-item:hover {
  border-color: var(--azul-principal);
}
.faq-item.active {
  border-color: var(--azul-principal);
  background-color: #eff6ff;
}
.faq-question {
  padding: 1.5rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.faq-question h3 {
  font-size: 1.125rem;
  font-weight: 600;
  color: var(--preto);
  margin: 0;
}
.faq-icon {
  color: var(--azul-principal);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.3s ease;
}
.faq-item.active .faq-icon {
  transform: rotate(180deg);
}
.faq-answer {
  padding: 0 1.5rem;
  overflow: hidden;
  transition: max-height 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}
.faq-answer p {
  padding-bottom: 1.5rem;
  color: var(--cinza-texto);
  line-height: 1.6;
  margin: 0;
}

.tutorial-link {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  font-weight: 600;
  color: var(--azul-principal);
  text-decoration: none;
  transition: gap 0.3s ease;
}
.tutorial-link:hover {
  gap: 0.75rem;
}

.tutorial-visual {
  flex: 1;
  position: relative;
  border-radius: 1rem;
  overflow: hidden;
  box-shadow: 0 20px 40px -10px rgba(0, 0, 0, 0.1);
  cursor: pointer;

}
.tutorial-visual img {
  width: 100%;
  display: block;
  transition: transform 0.5s ease;
}
.tutorial-visual:hover img {
  transform: scale(1.05);
}
.placeholder-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.3);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #fff;
  opacity: 0;
  transition: opacity 0.3s ease;
  z-index: 2;
}
.tutorial-visual:hover .placeholder-overlay {
  opacity: 1;
}
.placeholder-overlay span {
  margin-top: 1rem;
  font-weight: 600;
  letter-spacing: 0.05em;
}

/* SEÇÃO FAQ */
.faq-section {
  padding: 6rem 0;
  background-color: #f9fafb; /* Fundo levemente cinza para contraste */
}

.faq-container {
  display: grid;
  grid-template-columns: 1fr 1.5fr; /* Esquerda menor, Direita maior */
  gap: 4rem;
  align-items: start;
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 2rem;
}

@media (max-width: 900px) {
  .faq-container {
    grid-template-columns: 1fr;
    gap: 2rem;
  }
  .faq-header {
    position: static;
    text-align: center;
    margin-bottom: 2rem;
  }
  .faq-header .section-title {
    justify-content: center;
  }
  .faq-list-wrapper {
    height: auto; /* Remove altura fixa no mobile se desejar, ou mantém */
    max-height: 500px;
  }
}

.faq-header {
  text-align: left;
  position: sticky;
  top: 2rem; /* Mantém o título visível ao rolar */
}

.faq-header .section-title {
  font-size: 3rem;
  line-height: 1.1;
  margin-bottom: 1.5rem;
  position: relative; /* Para posicionar o emoji */
  display: inline-block; /* Para o tamanho ajustar ao texto */
}

.faq-emoji {
  width: 48px;
  height: 48px;
  object-fit: contain;
  position: absolute;
  top: -25px;
  left: -25px;
  transform: rotate(-15deg);
}

.faq-header .section-subtitle {
  margin-left: 0;
  max-width: 100%;
  font-size: 1.125rem;
  margin-bottom: 2rem;
}

.btn-whatsapp-contact {
  display: inline-flex;
  align-items: center;
  gap: 0.75rem;
  background-color: #25D366; /* WhatsApp Green */
  color: #fff;
  padding: 1rem 2rem;
  border-radius: 9999px;
  font-weight: 600;
  text-decoration: none;
  transition: all 0.3s ease;
  box-shadow: 0 4px 6px -1px rgba(37, 211, 102, 0.2);
}

.btn-whatsapp-contact:hover {
  background-color: #128C7E;
  transform: translateY(-2px);
  box-shadow: 0 10px 15px -3px rgba(37, 211, 102, 0.3);
}



/* Wrapper da lista para posicionar os degrades */
.faq-list-wrapper {
  position: relative;
  height: 600px; /* Altura fixa para permitir o scroll */
  display: flex;
  flex-direction: column;
}

/* Área de scroll */
.faq-scroll-area {
  height: 100%;
  overflow-y: auto;
  padding-right: 1rem; /* Espaço para a barra de rolagem não colar */
  padding-top: 1rem;
  padding-bottom: 1rem;
  /* Estilização da barra de rolagem (opcional, mas elegante) */
  scrollbar-width: thin;
  scrollbar-color: #cbd5e1 transparent;
}

.faq-scroll-area::-webkit-scrollbar {
  width: 6px;
}
.faq-scroll-area::-webkit-scrollbar-track {
  background: transparent;
}
.faq-scroll-area::-webkit-scrollbar-thumb {
  background-color: #cbd5e1;
  border-radius: 20px;
}

/* Overlays de Degrade */
.fade-overlay {
  position: absolute;
  left: 0;
  right: 0;
  height: 60px;
  pointer-events: none;
  z-index: 10;
}

.fade-overlay.top {
  top: 0;
  background: linear-gradient(to bottom, #f9fafb 0%, rgba(249, 250, 251, 0) 100%);
}

.fade-overlay.bottom {
  bottom: 0;
  background: linear-gradient(to top, #f9fafb 0%, rgba(249, 250, 251, 0) 100%);
}

.faq-grid {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.faq-item {
  border-bottom: 1px solid #e5e7eb; /* Apenas borda inferior para visual clean */
  background-color: transparent;
  transition: all 0.3s ease;
  cursor: pointer;
}

.faq-item:last-child {
  border-bottom: none;
}

.faq-item:hover {
  background-color: rgba(0, 0, 0, 0.02);
  border-radius: 0.5rem;
}

.faq-item.active {
  background-color: transparent;
}

.faq-question {
  padding: 1.5rem 1rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.faq-question h3 {
  font-size: 1.125rem;
  font-weight: 500;
  color: var(--preto);
  margin: 0;
}

.faq-icon {
  color: var(--preto); /* Ícone preto para contraste */
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.3s ease;
}

.faq-item.active .faq-icon {
  transform: rotate(45deg); /* Vira um X ou apenas rotaciona */
}

.faq-answer-wrapper {
  display: grid;
  grid-template-rows: 0fr;
  transition: grid-template-rows 0.3s ease-out;
}

.faq-answer-wrapper.open {
  grid-template-rows: 1fr;
}

.faq-answer {
  overflow: hidden;
}

.faq-answer p {
  padding: 0 1rem 1.5rem 1rem;
  color: var(--cinza-texto);
  line-height: 1.6;
  margin: 0;
}

/* Responsividade */
@media (max-width: 900px) {
  .faq-container {
    grid-template-columns: 1fr;
    gap: 3rem;
  }
  .faq-header {
    text-align: center;
    position: static;
  }
  .faq-header .section-title {
    justify-content: center;
    font-size: 2.5rem;
  }
  .faq-header .section-subtitle {
    margin: 0 auto;
    text-align: center;
  }
}

/* Responsividade */
@media (max-width: 768px) {
  .comparison-grid {
    grid-template-columns: 1fr;
  }
  .tutorial-item,
  .tutorial-item.reverse {
    flex-direction: column;
    gap: 2rem;
    text-align: center;
  }
  .tutorial-content {
    order: 1; /* Texto primeiro no mobile */
  }
  .tutorial-visual {
    order: 2;
  }
  .tutorial-link {
    justify-content: center;
  }
}

.footer-support-title {
  font-size: 1.125rem;
  font-weight: 600;
  margin-bottom: 1.5rem;
  text-align: center;
}
.featured .footer-support-title {
  color: var(--branco);
}
.footer-features-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1.5rem;
}
.footer-feature-item {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  text-align: left;
}
.footer-feature-item .feature-icon {
  color: var(--azul-principal);
  margin-top: 2px;
  flex-shrink: 0;
}
.featured .footer-feature-item .feature-icon {
  color: var(--azul-principal);
}
.footer-feature-item h5 {
  font-size: 1rem;
  font-weight: 600;
  margin: 0 0 0.25rem 0;
}
.featured .footer-feature-item h5 {
  color: var(--branco);
}
.footer-feature-item p {
  font-size: 0.875rem;
  color: var(--cinza-texto);
  line-height: 1.5;
  margin: 0;
}
.featured .footer-feature-item p {
  color: #a1a1aa;
}

/* --- AJUSTES DE RESPONSIVIDADE --- */

/* CELULARES (até 768px) */
@media (max-width: 768px) {
  .hero {
    padding: 8rem 0 5rem 0;
    text-align: center;
  }
  .hero-container {
    flex-direction: column;
    gap: 3rem;
  }
  .hero-content {
    text-align: center;
    max-width: 100%;
  }
  .hero-title {
    font-size: 2.5rem;
  }
  .hero-subtitle {
    font-size: 1.125rem;
  }
  .hero-actions {
    flex-direction: column;
    align-items: center;
  }
  .hero-actions .btn-primary,
  .hero-actions .btn-secondary {
    width: 100%;
    max-width: 300px;
    justify-content: center;
  }
  .hero-visual {
    width: 100%;
    overflow: hidden;
  }
  .hero-visual > * {
    max-width: 100%;
    height: auto !important;
  }

  .platform-section {
    padding: 4rem 0;
  }
  .platform-container {
    flex-direction: column;
    text-align: center;
  }
  .platform-content {
    display: flex;
    flex-direction: column;
    align-items: center;
  }

  .plans-section {
    padding: 4rem 0;
  }
  .section-title {
    font-size: 2rem;
  }

  /* Ajuste de responsividade para o novo grid do footer */
  .footer-features-grid {
    grid-template-columns: 1fr; /* Stacks na vertical */
    gap: 1.5rem;
  }
  .footer-feature-item {
    gap: 1rem; /* Um pouco mais de espaço no mobile */
  }

  .plans-grid {
    display: flex;
    justify-content: center;
    padding-bottom: 0;
    margin: 0;
    max-width: none;
    grid-template-columns: none;
  }
  .plan-card {
    width: 100%;
    max-width: 400px;
  }
}

/* 🌟 ESTILOS DO FOOTER 🌟 */
.app-footer {
  width: 100%;
  padding: 2rem 1.5rem;
  background-color: #f9fafb;
  border-top: 1px solid #e5e7eb;
  position: relative;
  z-index: 10;
}

.footer-container {
  max-width: 1200px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1.5rem;
  text-align: center;
}

.footer-copyright {
  font-size: 0.875rem;
  color: var(--cinza-texto);
}

.footer-links {
  display: flex;
  gap: 1.5rem;
}

.footer-links a {
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--cinza-texto);
  text-decoration: none;
  transition: color 0.3s ease;
}

.footer-links a:hover {
  color: var(--azul-principal);
}

/* 💡 ESTILO ATUALIZADO (MAIS VISÍVEL) 💡 */
.footer-produced-by {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: var(--cinza-texto); /* 🎨 Cor mais visível */
  font-size: 0.875rem;
  /* 🎨 Opacidade removida */
}

.gr-logo {
  display: inline-flex;
  align-items: center;
  color: inherit;
  text-decoration: none;
}

/* Estilo para o seu SVG/IMG */
.gr-logo .gr-logo-svg {
  height: 20px; /* Ajuste a altura conforme necessário */
  width: auto;
  margin-left: 0.25rem;
}

/* Responsividade do Novo Footer */
@media (min-width: 768px) {
  .footer-container {
    flex-direction: row;
    justify-content: space-between;
  }

  .footer-copyright {
    order: 2; /* Copyright no meio */
  }

  .footer-links {
    order: 1; /* Links na esquerda */
  }

  .footer-produced-by {
    order: 3; /* Logo na direita */
  }
}
</style>
