<script setup>
import { ref, onMounted } from 'vue'
import { RouterLink } from 'vue-router'
import {
  Check,
  Zap,
  Clock,
  ShieldCheck,
  TrendingUp,
  MessageCircle,
  Calendar,
  FileText,
  DollarSign,
  Workflow,
  Smartphone,
  ChevronRight,
  UserCheck,
  LayoutDashboard,
  Star,
  Instagram,
  Minus,
  Plus
} from 'lucide-vue-next'
import AppHeader from '@/components/global/AppHeader.vue'
import AppFooter from '@/components/global/AppFooter.vue'
import fotoMilena from '@/assets/imgs/foto_milena.webp'
import fotoManu from '@/assets/imgs/foto_manu.webp'
import fotoMedica from '@/assets/imgs/foto_medica.webp'
import imageAgenda from '@/assets/imgs/dashboard.png'
import imageProntuario from '@/assets/imgs/Pronturario.png'

onMounted(() => {
  
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible')
        }
      })
    },
    { threshold: 0.1 }
  )

  document.querySelectorAll('.animate-on-scroll').forEach((el) => {
    observer.observe(el)
  })
})

const features = [
  {
    title: 'Agenda Inteligente',
    description: 'Visualização clara de dia, semana e mês. Arraste e solte para reagendar com facilidade.',
    icon: Calendar,
    span: 'span-2',
    visual: 'image-agenda'
  },
  {
    title: 'Prontuário Digital',
    description: 'Histórico completo e acessível em um clique.',
    icon: FileText,
    span: 'span-1',
    visual: 'image-prontuario'
  },
  {
    title: 'Financeiro',
    description: 'Controle total de fluxo de caixa e repasses médicos.',
    icon: DollarSign,
    span: 'span-1',
    visual: 'chart'
  },
  {
    title: 'Confirmação via WhatsApp',
    description: 'Reduza faltas em até 40% com lembretes automáticos e confirmação direta.',
    icon: MessageCircle,
    span: 'span-2',
    visual: 'chat'
  },
  {
    title: 'Anamnese Online',
    description: 'O paciente preenche em casa, você recebe pronto.',
    icon: UserCheck,
    span: 'span-1',
    visual: 'list'
  },
  {
    title: 'Automação de Marketing',
    description: 'Fidelize pacientes com mensagens de aniversário e retorno.',
    icon: Workflow,
    span: 'span-2',
    visual: 'marketing'
  }
]

const stats = [
  { value: '+40%', label: 'Menos faltas com lembretes' },
  { value: '+60%', label: 'Mais organização na rotina' },
  { value: '2h', label: 'Horas economizadas por dia' },
  { value: '+100', label: 'Profissionais Ativos' }
]

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
      'Com certeza! O sistema envia confirmações via WhatsApp automaticamente, reduzindo drasticamente as faltas.',
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
      'Oferecemos suporte humanizado e prioritário via WhatsApp. Nossa equipe está pronta para te ajudar a extrair o máximo do sistema.',
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

</script>

<template>
  <div class="landing-page">
    <AppHeader />

    <main>
      <!-- Hero Section -->
      <section class="hero-section">
        <div class="hero-bg-blobs"></div>
        <div class="container hero-container">
          <div class="hero-content">
            
            <!-- Top Trust Badge -->
            <div class="trust-badge-top animate-slide-up">
                <div class="avatars-sm">
                  <img :src="fotoMilena" alt="Milena" class="avatar-sm"/>
                  <img :src="fotoManu" alt="Manu" class="avatar-sm"/>
                  <img :src="fotoMedica" alt="Manu" class="avatar-sm"/>
                </div>
                <span>Mais de <strong>100 Profissionais</strong> confiam</span>
            </div>

            <h1 class="hero-title animate-slide-up delay-100">
              Organize sua agenda e <span class="text-highlight" style="white-space: nowrap;">Reduza&nbsp;Faltas</span> em um só lugar.
            </h1>
            <p class="hero-subtitle animate-slide-up delay-200">
              O sistema completo para modernizar seu atendimento. Agenda inteligente, prontuário digital e confirmação automática para você focar no que importa: o paciente.
            </p>
            
            <div class="cta-group-centered animate-slide-up delay-300">
              <router-link to="/login" class="btn-primary btn-lg">
                Entrar na Conta
              </router-link>
              <a href="https://wa.me/5511921923978" target="_blank" class="btn-secondary btn-lg">
                 Fale com nossa equipe
              </a>
            </div>
          </div>
          

        </div>
      </section>

      <!-- Prova de Valor / Stats
      <section class="stats-section">
        <div class="container animate-on-scroll">
          <div class="stats-grid">
            <div v-for="(stat, index) in stats" :key="index" class="stat-card glass-panel">
               <h3 class="stat-value">{{ stat.value }}</h3>
               <p class="stat-label">{{ stat.label }}</p>
            </div>
          </div>
        </div>
      </section> -->

      <!-- Funcionalidades Bento Grid -->
      <section id="funcionalidades" class="features-section">
        <div class="container">
          <div class="section-header center animate-on-scroll">
            <h2 class="section-title">Tudo o que sua agenda precisa</h2>
            <p class="section-subtitle">Poderoso, simples e visual. Do agendamento ao financeiro.</p>
          </div>
          
          <div class="bento-grid">
            <div 
              v-for="(feature, idx) in features" 
              :key="idx" 
              class="bento-card glass-panel animate-on-scroll"
              :class="feature.span"
            >
              <div class="bento-content">
                <div class="bento-header">
                  <div class="icon-box">
                    <component :is="feature.icon" :size="20" />
                  </div>
                  <h3>{{ feature.title }}</h3>
                </div>
                <p>{{ feature.description }}</p>
              </div>

              <!-- Abstract Visuals based on feature.visual -->
              <div class="bento-visual" :class="{'no-bg': feature.visual.startsWith('image')}">
                 <!-- Image Agenda Visual -->
                 <div v-if="feature.visual === 'image-agenda'" class="visual-image-container">
                    <img :src="imageAgenda" alt="Agenda UI" class="bleeding-image agenda-img" />
                 </div>

                 <!-- Image Prontuário Visual -->
                 <div v-if="feature.visual === 'image-prontuario'" class="visual-image-container">
                    <img :src="imageProntuario" alt="Prontuário UI" class="bleeding-image prontuario-img" />
                 </div>

                 <!-- Chat Visual -->
                 <div v-if="feature.visual === 'chat'" class="visual-chat">
                    <div class="chat-bubble left">Olá, confirma sua consulta?</div>
                    <div class="chat-bubble right">Sim, confirmo! 👍</div>
                 </div>

                 <!-- Chart Visual -->
                 <div v-if="feature.visual === 'chart'" class="visual-chart">
                    <div class="chart-bar" style="height: 40%"></div>
                    <div class="chart-bar" style="height: 60%"></div>
                    <div class="chart-bar active" style="height: 80%"></div>
                    <div class="chart-bar" style="height: 100%"></div>
                 </div>

                 <!-- List Visual -->
                 <div v-if="feature.visual === 'list'" class="visual-list">
                    <div class="list-row"><div class="list-check"></div><div class="list-line w-80"></div></div>
                    <div class="list-row"><div class="list-check"></div><div class="list-line w-60"></div></div>
                    <div class="list-row"><div class="list-check"></div><div class="list-line w-40"></div></div>
                 </div>
                 
                 <!-- Marketing Visual -->
                 <div v-if="feature.visual === 'marketing'" class="visual-marketing">
                    <div class="mail-card card-1">
                       <div class="mail-icon"><Star size="12" fill="currentColor"/></div>
                       <span>Feliz Aniversário! 🎉</span>
                    </div>
                    <div class="mail-card card-2">
                       <div class="mail-icon"><Clock size="12" /></div>
                       <span>Retorno em 6 meses</span>
                    </div>
                    <div class="mail-card card-3">
                       <div class="mail-icon"><Check size="12" /></div>
                       <span>Confirmação enviada</span>
                    </div>
                     <div class="mail-card card-4">
                       <div class="mail-icon"><MessageCircle size="12" /></div>
                       <span>Olá, tudo bem?</span>
                    </div>
                     <div class="mail-card card-5">
                       <div class="mail-icon"><TrendingUp size="12" /></div>
                       <span>Campanha Ativa</span>
                    </div>
                 </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="beneficios" class="benefits-section">

        <div class="container">
           <div class="benefits-layout">
              <div class="benefits-text animate-on-scroll">
                 <h2 class="section-title">Por que escolher o Agenda Doutor?</h2>
                 <p class="benefit-description">
                   Mais do que um software, somos parceiros no seu crescimento.
                 </p>
                 <ul class="benefits-list">
                    <li>
                       <Check class="check-icon" />
                       <span><strong>Mais Tempo:</strong> Automatize tarefas repetitivas.</span>
                    </li>
                    <li>
                       <Check class="check-icon" />
                       <span><strong>Menos Faltas:</strong> Lembretes automáticos via WhatsApp.</span>
                    </li>
                    <li>
                       <Check class="check-icon" />
                       <span><strong>Controle Total:</strong> Faturamento e gestão na palma da mão.</span>
                    </li>
                    <li>
                       <Check class="check-icon" />
                       <span><strong>Segurança:</strong> Dados criptografados e backup diário.</span>
                    </li>
                 </ul>
                 <a href="https://wa.me/5511921923978" target="_blank" class="btn-secondary mt-6">
                    Quero modernizar minha agenda <ChevronRight size="18"/>
                 </a>
              </div>
              <div class="benefits-visual animate-on-scroll delay-200">
                  <div class="visual-card-stack">
                     <div class="card-layer confirm-card">
                        <div class="card-icon"><Smartphone size="20"/></div>
                        <div class="card-text">
                           <strong>Olá!</strong> Lembra da sua consulta amanhã às 14h?
                           <span class="status">Enviada via WhatsApp</span>
                        </div>
                     </div>
                     <div class="card-layer revenue-card">
                        <div class="card-icon"><TrendingUp size="20"/></div>
                        <div class="card-text">
                           <strong>Receita Mensal</strong>
                           <span class="value">R$ 45.280,00</span>
                           <span class="growth text-highlight">+12% vs mês anterior</span>
                        </div>
                     </div>
                  </div>
              </div>
           </div>
        </div>
      </section>

      <!-- FAQ -->
    <section class="faq-section" id="faq">
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
        </div>
      </div>
    </section>

      <!-- CTA Final -->
      <!-- <section class="final-cta-section">
         <div class="container">
            <div class="cta-box glass-panel animate-on-scroll">
               <div class="cta-content-left">
                  <div class="cta-badge-sm">
                     ⚡ SEJA AGENDA DOUTOR
                  </div>
                  <h2 class="cta-title">A segurança que você precisa para crescer mais.</h2>
               </div>
               <div class="cta-content-right">
                  <p class="cta-text">
                     Transações rápidas, seguras e sem surpresas. 
                     Aqui você aprova mais consultas, recebe rápido e tem total transparência.
                  </p>
                  <router-link to="/register" class="btn-primary-inverse btn-lg">
                     Criar minha conta >
                  </router-link>
               </div>
            </div>
         </div>
      </section> -->
    </main>



    <AppFooter />
  </div>
</template>

<style scoped>
@font-face {
  font-family: 'Oakes';
  src: url('@/assets/fonts/OakesLight.ttf') format('ttf');
  font-weight: 300;
  font-style: normal;
  font-display: swap;
}
@font-face {
  font-family: 'Oakes';
  src: url('@/assets/fonts/OakesRegular.woff2') format('woff2');
  font-weight: 400;
  font-style: normal;
  font-display: swap;
}

@font-face {
  font-family: 'Oakes';
  src: url('@/assets/fonts/OakesMedium.woff2') format('woff2');
  font-weight: 500;
  font-style: normal;
  font-display: swap;
}
@font-face {
  font-family: 'Oakes';
  src: url('@/assets/fonts/OakesSemiBold.woff2') format('woff2');
  font-weight: 600;
  font-style: normal;
  font-display: swap;
}

/* Variáveis de Cores e Fontes */
.landing-page {
  font-family: 'Oakes', sans-serif;
  color: #1e293b;
  background-color: #f8fafc;
  overflow-x: hidden;
  --primary: #2563eb;
  --primary-dark: #1e40af;
  --secondary: #3b82f6;
  --text-main: #1e293b;
  --text-muted: #64748b;
  --glass-bg: rgba(255, 255, 255, 0.7);
  width: 100%;
}

ul { list-style: none; padding: 0; margin: 0; }
a { text-decoration: none; color: inherit; transition: 0.3s; }

/* Utilitários */
.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 1.5rem;
}

.section-title {
  font-size: 2rem;
  font-weight: 700;
  margin-bottom: 1rem;
  letter-spacing: -0.02em;
  color: #0f172a;
}

.section-subtitle {
  font-size: 1.125rem;
  color: var(--text-muted);
  max-width: 600px;
  margin: auto;
  line-height: 1.6;
}

.center { text-align: center; margin-left: auto; margin-right: auto; }

.btn-primary, .btn-primary-sm, .btn-secondary, .btn-login {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  border-radius: 99px;
  transition: all 0.3s ease;
  cursor: pointer;
}

.btn-primary {
  background: var(--primary);
  color: white;
  padding: 0.875rem 2rem;
  box-shadow: 0 4px 14px 0 rgba(37, 99, 235, 0.3);
}
.btn-primary:hover { background: var(--primary-dark); transform: translateY(-2px); }

.btn-primary-sm {
  background: var(--primary);
  color: white;
  padding: 0.6rem 1.25rem;
  font-size: 0.9rem;
}
.btn-primary-sm:hover { background: var(--primary-dark); }

.btn-secondary {
  background: white;
  color: var(--primary);
  border: 1px solid var(--primary);
  padding: 0.875rem 2rem;
}
.btn-secondary:hover { background: #eff6ff; }

.btn-login {
  color: var(--text-main);
  padding: 0.6rem 1.25rem;
  font-weight: 500;
}
.btn-login:hover { color: var(--primary); }

.text-highlight {
  color: var(--primary);
  background: rgba(37, 99, 235, 0.1);
  padding: 0 0.2em;
  border-radius: 4px;
}

/* Glassmorphism Panel */
.glass-panel {
  background: var(--glass-bg);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.6);
  box-shadow: 0 8px 32px 0 rgba(31, 38, 135, 0.05);
  border-radius: 1.5rem;
}

/* Header styles moved to AppHeader.vue */

/* Hero Section */
/* Hero Section */
.hero-section {
  padding-top: 140px;
  padding-bottom: 6rem;
  position: relative;
  overflow: visible;
  text-align: center;
}
.hero-bg-blobs {
  position: absolute; top: -10%; left: 50%; transform: translateX(-50%);
  width: 800px; height: 800px;
  background: radial-gradient(circle, rgba(59,130,246,0.1) 0%, rgba(255,255,255,0) 60%);
  border-radius: 50%; z-index: -1; pointer-events: none;
}
.hero-container {
  display: flex; flex-direction: column; align-items: center; gap: 3rem;
}
.hero-content {
  max-width: 1000px;
  display: flex; flex-direction: column; align-items: center;
}

/* Updated Trust Badge Top */
.trust-badge-top {
  display: inline-flex;
  align-items: center;
  gap: 0.75rem;
  background: #f0fdf4; /* Light green/mint tint like reference */
  padding: 0.4rem 1rem 0.4rem 0.5rem;
  border-radius: 99px;
  border: 1px solid #dcfce7;
  color: #166534;
  font-size: 0.9rem;
  margin-bottom: 1.5rem;
  font-weight: 500;
}
.avatars-sm { display: flex; }
.avatar-sm {
  width: 24px; height: 24px; border-radius: 50%; border: 2px solid white; margin-left: -8px;
}
.avatar-sm:first-child { margin-left: 0; }

.hero-title {
  font-family: 'Oakes', sans-serif;
  font-size: clamp(3rem, 6vw, 4rem); /* Larger */
  line-height: 1.1;
  font-weight: 300;
  color: #0f172a;
  margin-bottom: 1.5rem;
  letter-spacing: -0.03em;
}
.hero-subtitle {
  font-size: 1.25rem;
  color: #475569;
  margin-bottom: 1.5rem;
  max-width: 800px;
}

.cta-group-centered {
  display: flex;
  gap: 1rem;
  justify-content: center;
  align-items: center;
}

/* Visual - Centered */
.hero-visual {
  width: 100%;
  max-width: 1000px;
  margin-top: 1rem;
  position: relative;
}
.dashboard-mockup {
  width: 100%; aspect-ratio: 16/9; /* Wider for centered view */
  background: white; border-radius: 16px; overflow: hidden;
  box-shadow: 0 25px 50px -12px rgba(0,0,0,0.15); /* Stronger shadow */
  border: 1px solid rgba(0,0,0,0.08);
  display: flex; flex-direction: column;
}
.mockup-header {
  height: 48px; background: #fff; border-bottom: 1px solid #f1f5f9;
  display: flex; align-items: center; padding: 0 1.5rem; gap: 1rem;
}
.dots { display: flex; gap: 8px; }
.dot { width: 10px; height: 10px; border-radius: 50%; }
.red { background: #ef4444; } .yellow { background: #eab308; } .green { background: #22c55e; }
.browser-bar {
  font-size: 0.8rem; color: #94a3b8; background: #f8fafc;
  padding: 6px 16px; border-radius: 6px; flex: 1; text-align: center; max-width: 400px; margin: 0 auto;
}
.mockup-content { flex: 1; padding: 2rem; background: #f8fafc; position: relative; }

/* Abstract Dashboard */
.dash-grid { display: flex; gap: 1.5rem; height: 100%; }
.dash-sidebar { width: 60px; background: white; border-radius: 10px; height: 80%; }
.dash-main { flex: 1; display: flex; flex-direction: column; gap: 1.5rem; }
.dash-top-card { height: 50px; background: white; border-radius: 10px; width: 100%; opacity: 0.8; }
.dash-row { display: flex; gap: 1.5rem; flex: 1; }
.dash-card-lg { flex: 2; background: white; border-radius: 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.02); }
.dash-card-sm { flex: 1; background: #e0f2fe; border-radius: 10px; }

.floating-badge {
  position: absolute; bottom: 8%; right: -2%;
  background: white; padding: 0.75rem 1.5rem; border-radius: 16px;
  box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1);
  display: flex; align-items: center; gap: 0.75rem;
  font-weight: 600; color: #0f172a; font-size: 0.95rem;
  animation: float 4s ease-in-out infinite; z-index: 10;
}
.badge-icon { color: #22c55e; }

.beta-tag {
  background: white;
  color: var(--primary);
  font-size: 0.7rem;
  padding: 0.1rem 0.4rem;
  border-radius: 4px;
  margin-left: 0.5rem;
  vertical-align: middle;
}

@keyframes float { 0% { transform: translateY(0); } 50% { transform: translateY(-10px); } 100% { transform: translateY(0); } }

@media(max-width: 900px) {
  .hero-container { gap: 2rem; }
  .cta-group-centered { flex-direction: column; width: 100%; }
  .btn-lg { width: 100%; }
  .floating-badge { right: 0; bottom: -10%; }
}


/* Stats Section */
.stats-section { padding: 4rem 0; }
.stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1.5rem; }
.stat-card { padding: 2rem; text-align: center; transition: transform 0.3s; }
.stat-card:hover { transform: translateY(-5px); }
.stat-value { font-size: 2.5rem; font-weight: 800; color: var(--primary); margin-bottom: 0.5rem; }
.stat-label { font-size: 1rem; color: #64748b; }

/* Features Section (Bento Grid) */
.features-section { padding: 6rem 0; background: #f8fafc; } /* Light gray bg */
.bento-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1.5rem;
  margin-top: 4rem;
}
.bento-card {
  background: white;
  border-radius: 24px;
  padding: 2rem;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  border: 1px solid #e2e8f0;
  transition: all 0.3s ease;
  overflow: hidden;
  position: relative;
  min-height: 280px;
}
.bento-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 10px 30px -5px rgba(0, 0, 0, 0.05);
  border-color: #cbd5e1;
}
.bento-card.span-2 { grid-column: span 2; }

.bento-content { position: relative; z-index: 2; margin-bottom: 2rem; }
.bento-header { display: flex; align-items: center; gap: 1rem; margin-bottom: 0.75rem; }
.icon-box {
  width: 40px; height: 40px;
  background: #eff6ff;
  color: var(--primary);
  border-radius: 10px;
  display: flex; align-items: center; justify-content: center;
}
.bento-card h3 { font-size: 1.2rem; font-weight: 700; color: #0f172a; margin: 0; }
.bento-card p { font-size: 0.95rem; color: #64748b; line-height: 1.5; }

/* Visual Abstractions */
.bento-visual {
  flex-grow: 1;
  background: #f1f5f9;
  border-radius: 16px;
  position: relative;
  overflow: hidden;
  min-height: 120px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.bento-visual.no-bg { background: transparent; }

/* Bleeding Images */
.visual-image-container {
  width: 100%;
  height: 100%;
  position: relative;
  /* padding removed to allow full bleed */
}
.bleeding-image {
  width: 100%;
  height: auto;
  border-radius: 12px 12px 0 0; /* Radius on top only if cropped at bottom */
  box-shadow: 0 4px 20px rgba(0,0,0,0.08); /* Softer shadow */
  border: 1px solid rgba(0,0,0,0.05);
  
  /* Absolute position to not affect card height */
  position: absolute;
  top: 0;
  left: 0;
  
  /* Aligned (no rotation) */
  transform: none;
}
.agenda-img {
  /* Agenda image fits perfectly at 100% */
  width: 100%;
}
.prontuario-img {
  /* Make prontuario image larger to crop distinctively */
  width: 230%;
  max-width: none; /* Override absolute max-width if necessary */
}

/* Chat Visual */
/* Chat Visual */
.visual-chat {
  width: 100%;
  height: 100%; /* Fill parent */
  padding: 0 20px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  position: relative;
  overflow: hidden;
  z-index: 0;
  justify-content: center; 
}

/* Background "Zap" Style */
.visual-chat::before {
  content: "";
  position: absolute;
  inset: 0;
  background-image: url('@/assets/imgs/whatsapp_bg.jpg');
  background-size: 280px; /* Adjust scale of pattern */
  background-repeat: repeat;
  opacity: 0.5; /* Subtle transparency */
  z-index: -1;
}

.chat-bubble {
  padding: 8px 12px;
  border-radius: 12px;
  font-size: 0.75rem;
  max-width: 80%;
  position: relative;
  z-index: 1;
  box-shadow: 0 1px 2px rgba(0,0,0,0.1); /* Add shadow to pop against bg */
}
.chat-bubble.left { background: white; align-self: flex-start; border-bottom-left-radius: 2px; color: #475569; }
.chat-bubble.right { background: #dcf8c6; color: #0f172a; align-self: flex-end; border-bottom-right-radius: 2px; } /* Updated color to match Zap light green */

/* Chart Visual */
.visual-chart { display: flex; align-items: flex-end; gap: 8px; height: 60px; }
.chart-bar {
  width: 12px;
  background: #cbd5e1;
  border-radius: 4px;
  transform-origin: bottom;
  transform: scaleY(0); /* Start hidden */
  transition: transform 0.3s ease;
}
.chart-bar.active { background: var(--primary); }

/* Animation when parent is visible */
.is-visible .chart-bar {
  animation: chartRise 1s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
}

@keyframes chartRise {
  from { transform: scaleY(0); }
  to { transform: scaleY(1); }
}

.chart-bar:nth-child(1) { animation-delay: 0.2s; }
.chart-bar:nth-child(2) { animation-delay: 0.3s; }
.chart-bar:nth-child(3) { animation-delay: 0.4s; }
.chart-bar:nth-child(4) { animation-delay: 0.5s; }

/* List Visual */
.visual-list { width: 80%; display: flex; flex-direction: column; gap: 8px; }
.list-row { display: flex; align-items: center; gap: 8px; background: white; padding: 6px; border-radius: 6px; }
.list-check { width: 12px; height: 12px; border-radius: 50%; border: 2px solid #cbd5e1; }
.list-line { height: 4px; background: #f1f5f9; border-radius: 2px; }
.w-80 { width: 80%; } .w-60 { width: 60%; } .w-40 { width: 40%; }

/* Marketing Visual */
.visual-marketing { width: 100%; height: 100%; position: relative; background: #eff6ff; overflow: hidden; }
.mail-card {
  position: absolute;
  background: white;
  padding: 8px 14px; /* Slightly smaller padding for density */
  border-radius: 12px;
  box-shadow: 0 10px 20px rgba(37, 99, 235, 0.1);
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.75rem; /* Slightly smaller font */
  font-weight: 600;
  color: #1e293b;
  border: 1px solid rgba(255,255,255,0.8);
  white-space: nowrap;
  transition: transform 0.3s ease;
}

.card-1 {
  top: 50%; left: 50%;
  transform: translate(-50%, -50%) rotate(-3deg);
  z-index: 3;
  color: var(--primary);
  box-shadow: 0 15px 30px rgba(37, 99, 235, 0.15);
}
.card-2 {
  top: 15%; left: 80%;
  transform: translate(-50%, -50%) rotate(6deg) scale(0.9);
  z-index: 2;
  opacity: 0.9;
}
.card-3 {
  top: 80%; left: 30%;
  transform: translate(-50%, -50%) rotate(-6deg) scale(0.9);
  z-index: 2;
  opacity: 0.9;
}
.card-4 {
  top: 20%; left: 20%;
  transform: translate(-50%, -50%) rotate(-12deg) scale(0.85);
  z-index: 1;
  opacity: 0.7;
}
.card-5 {
  top: 75%; left: 75%;
  transform: translate(-50%, -50%) rotate(8deg) scale(0.85);
  z-index: 1;
  opacity: 0.7;
}

.mail-icon { width: 22px; height: 22px; background: #dbeafe; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: var(--primary); flex-shrink: 0; }

@media(max-width: 900px) {
  .bento-grid { grid-template-columns: 1fr; }
  .bento-card.span-2 { grid-column: span 1; }
  
  /* Fix Dashboard Image */
  .agenda-img {
    bottom: -30px; /* Pull up to be visible */
    width: 200%; /* Ensure full width */
    right: -10px;
  }
}

/* Benefits Section */
.benefits-section { padding: 6rem 0; }
.benefits-layout {
  display: grid; grid-template-columns: 1fr 1fr; gap: 5rem; align-items: center;
}
.benefit-description { font-size: 1.2rem; color: #475569; margin: 1.5rem 0 2.5rem; }
.benefits-list li {
  display: flex; align-items: flex-start; gap: 1rem; margin-bottom: 1.5rem; color: #334155; font-size: 1.1rem;
}
.check-icon { color: var(--primary); flex-shrink: 0; }
.benefits-visual { position: relative; display: flex; justify-content: center; }
.visual-card-stack { position: relative; width: 100%; max-width: 400px; height: 300px; }
.card-layer {
  position: absolute; width: 100%; background: white;
  padding: 1.5rem; border-radius: 16px;
  box-shadow: 0 20px 40px rgba(0,0,0,0.08);
  display: flex; gap: 1rem; align-items: center;
  border: 1px solid rgba(255,255,255,0.8);
  backdrop-filter: blur(4px);
}
.confirm-card { top: 0; left: 0; z-index: 1; transform: rotate(-3deg); }
.revenue-card { bottom: 0; right: 0; z-index: 2; transform: rotate(3deg); }
.card-icon { width: 40px; height: 40px; border-radius: 50%; background: #f0fdf4; color: #16a34a; display: flex; align-items: center; justify-content: center; }
.revenue-card .card-icon { background: #eff6ff; color: var(--primary); }
.card-text { font-size: 0.95rem; display: flex; flex-direction: column; gap: 4px; }
.status { font-size: 0.8rem; color: #94a3b8; }
.value { font-size: 1.2rem; font-weight: 800; color: #0f172a; }
.growth { font-size: 0.8rem; font-weight: 600; }

@media(max-width: 900px) {
  .benefits-layout { grid-template-columns: 1fr; }
  .visual-card-stack { margin: 0 auto; }
}

/* FAQ Section */
.faq-section {
  padding: 6rem 0;
  background-color: #eff6ff; /* Light Blue for differentiation */
}

.faq-container {
  display: grid;
  grid-template-columns: 1fr 1.5fr;
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
    height: auto;
    max-height: 500px;
  }
}

.faq-header {
  text-align: left;
  position: sticky;
  top: 2rem;
}

.faq-header .section-title {
  font-size: 3rem;
  line-height: 1.1;
  margin-bottom: 1.5rem;
  position: relative;
  display: inline-block;
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
  background-color: #25D366;
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

.faq-list-wrapper {
  position: relative;
  height: 600px;
  display: flex;
  flex-direction: column;
}

.faq-scroll-area {
  height: 100%;
  overflow-y: auto;
  padding-right: 1rem;
  padding-top: 1rem;
  padding-bottom: 1rem;
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
  border-bottom: 1px solid #e5e7eb;
  background-color: transparent;
  transition: all 0.3s ease;
  cursor: pointer;
  border-radius: 0;
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
  box-shadow: none;
  border: none;
  border-bottom: 1px solid #e5e7eb;
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
  color: #0f172a;
  margin: 0;
}

.faq-icon {
  color: #0f172a;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.3s ease;
}

.faq-item.active .faq-icon {
  transform: rotate(45deg);
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
  border-top: none;
  padding-top: 0;
  margin-top: 0;
}

.faq-answer p {
  padding: 0 1rem 1.5rem 1rem;
  color: #64748b;
  line-height: 1.6;
  margin: 0;
}

/* Final CTA */
.final-cta-section {
  padding: 0;
  position: relative;
  z-index: 50; /* Above everything */
  margin-top: -5rem; /* Pull up to overlap FAQ */
  margin-bottom: -5rem; /* Visual Overlap onto Footer */
}

.cta-box {
  background: #0f172a; /* Dark Slate / Deep Blue */
  padding: 4rem 3rem;
  border-radius: 32px;
  box-shadow: 0 25px 50px -12px rgba(15, 23, 42, 0.4);
  display: grid;
  grid-template-columns: 1.2fr 0.8fr;
  gap: 3rem;
  align-items: center;
  overflow: hidden;
  position: relative;
  border: 1px solid #1e293b;
}

/* Add a subtle glow/blob */
.cta-box::before {
  content: ''; position: absolute; top: -50%; left: -20%; width: 600px; height: 600px;
  background: radial-gradient(circle, rgba(37,99,235,0.15) 0%, rgba(15,23,42,0) 70%);
  pointer-events: none;
}

.cta-content-left {
  position: relative; z-index: 2;
  display: flex; flex-direction: column; align-items: flex-start; gap: 1rem;
}

.cta-badge-sm {
  background: #1e293b;
  color: #fbbf24; /* Amber/Yellow for 'Lightning' contrast */
  font-size: 0.75rem;
  font-weight: 700;
  padding: 0.3rem 0.8rem;
  border-radius: 99px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  display: inline-flex; align-items: center; gap: 0.4rem;
  border: 1px solid #334155;
}

.cta-title {
  font-size: 2.5rem;
  font-weight: 800;
  color: white;
  line-height: 1.1;
  margin: 0;
  text-align: left;
  letter-spacing: -0.02em;
}

.cta-content-right {
  position: relative; z-index: 2;
  display: flex; flex-direction: column; align-items: flex-start; gap: 2rem;
}

.cta-text {
  font-size: 1.1rem;
  color: #94a3b8; /* Light gray text */
  margin: 0;
  text-align: left;
  line-height: 1.6;
}

.btn-primary-inverse {
  background: #ffffff; /* White button */
  color: var(--primary); /* Blue text */
  padding: 1rem 2.5rem;
  border-radius: 99px;
  font-weight: 700;
  font-size: 1rem;
  display: inline-flex; align-items: center; justify-content: center;
  transition: all 0.3s ease;
  box-shadow: 0 4px 15px rgba(255, 255, 255, 0.1);
}
.btn-primary-inverse:hover {
  background: #f1f5f9;
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(255, 255, 255, 0.2);
}

@media(max-width: 900px) {
  .cta-box {
    grid-template-columns: 1fr;
    text-align: center;
    padding: 3rem 1.5rem;
    gap: 2rem;
  }
  .cta-content-left, .cta-content-right { align-items: center; }
  .cta-title, .cta-text { text-align: center; }
  .btn-primary-inverse { width: 100%; }
}

/* FooterStyles moved to AppFooter.vue */

/* Animations Helper */
.animate-slide-up { animation: slideUp 0.8s ease forwards; opacity: 0; transform: translateY(20px); }
.delay-100 { animation-delay: 0.1s; }
.delay-200 { animation-delay: 0.2s; }
.delay-300 { animation-delay: 0.3s; }
.delay-400 { animation-delay: 0.4s; }
.delay-500 { animation-delay: 0.5s; }
@keyframes slideUp { to { opacity: 1; transform: translateY(0); } }

.is-visible { animation: fadeIn 0.8s ease forwards; }
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}
.animate-on-scroll { opacity: 0; }
</style>
