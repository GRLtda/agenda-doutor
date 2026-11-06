<script setup>
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useTimestamp } from '@vueuse/core'
import {
  Smartphone,
  QrCode,
  RefreshCw,
  LogOut,
  CheckCircle2,
  AlertCircle,
  Wifi,
  Info,
  BriefcaseBusiness,
  MessageSquare,
  MonitorOff,
} from 'lucide-vue-next'
import AppButton from '@/components/global/AppButton.vue'
import AppSkeleton from '@/components/global/AppSkeleton.vue'
import AppEmptyState from '@/components/global/AppEmptyState.vue'
import connectionIllustration from '@/assets/illustrations/whatsapp-connect-empty.svg?raw'
import { useCrmStore } from '@/stores/crm'

const crm = useCrmStore()
const checking = ref(true)
const busy = computed(() => checking.value || crm.isLoading)
const connected = computed(() => crm.status === 'connected')
const pairing = computed(() =>
  ['creating_qr', 'initializing', 'qrcode_pending', 'qrcode'].includes(crm.status),
)
const account = computed(() => crm.connections[0] || {})
const messagesPrivacyText = 'Esta tela não exibe suas conversas. A integração recebe e armazena mensagens e processa seu conteúdo para os envios e as automações da clínica.'
const now = useTimestamp({ interval: 60_000 })
const linkedDate = computed(() => {
  const value = account.value.linkedAt
  const date = value ? new Date(value) : null
  return date && Number.isFinite(date.getTime()) && date.getTime() <= now.value ? date : null
})
const linkedSince = computed(() => {
  if (!linkedDate.value) return 'Data não informada'
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'America/Sao_Paulo' }).format(linkedDate.value)
})
const linkedAge = computed(() => {
  if (!linkedDate.value) return ''
  const minutes = Math.floor((now.value - linkedDate.value.getTime()) / 60_000)
  if (minutes < 1) return 'Vinculado agora'
  if (minutes < 60) return `Há ${minutes} ${minutes === 1 ? 'minuto' : 'minutos'}`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `Há ${hours} ${hours === 1 ? 'hora' : 'horas'}`
  const days = Math.floor(hours / 24)
  return `Há ${days} ${days === 1 ? 'dia' : 'dias'}`
})
const failedPhoto = ref(false)
watch(() => account.value.profileImage, () => { failedPhoto.value = false })
const accountName = computed(() => account.value.username || account.value.name || 'Conta conectada')
const initials = computed(() => accountName.value.trim().split(/\s+/).slice(0, 2).map(name => Array.from(name)[0]).join('').toUpperCase())
const accountType = computed(() => {
  if (account.value.instance?.isBusiness === true) return 'Conta comercial'
  if (account.value.instance?.isBusiness === false) return 'Conta pessoal'
  return 'Não informado pelo WhatsApp'
})
const phone = computed(() => {
  const number = String(account.value.number || '').split('@')[0].split(':')[0]
  if (!/^\d{8,15}$/.test(number)) return 'Número não informado'
  if (/^55\d{10,11}$/.test(number))
    return `+55 (${number.slice(2, 4)}) ${number.slice(4, -4)}-${number.slice(-4)}`
  return `+${number}`
})
const stateLabel = computed(() => {
  if (checking.value) return 'Verificando conexão'
  if (connected.value) return 'Conectado'
  if (crm.status === 'api_error') return 'Verificação indisponível'
  if (crm.status === 'creating_qr') return 'Preparando QR Code'
  if (crm.status === 'initializing') return 'Conectando'
  if (pairing.value) return 'Aguardando leitura'
  return 'Não conectado'
})
async function refresh() {
  checking.value = true
  try {
    await crm.getInitialStatus({ showToast: false })
  } finally {
    checking.value = false
  }
}
onMounted(refresh)
onUnmounted(() => crm.stopPolling())
</script>

<template>
  <div class="whatsapp-connection">
    <header class="page-header">
      <div>
        <h1>Conexão WhatsApp</h1>
        <p>Conecte o número da clínica para usar os envios de mensagens do sistema.</p>
      </div>
      <AppButton variant="outline" :loading="checking" :disabled="busy" @click="refresh"
        ><RefreshCw :size="16" />Atualizar status</AppButton
      >
    </header>

    <div class="connection-layout">
      <section class="panel connection-panel" :aria-busy="busy">
        <div class="panel-heading">
          <div>
            <h2>{{ connected ? 'WhatsApp da clínica' : 'Conectar uma conta' }}</h2>
            <p>
              {{
                connected
                  ? 'Dados da conta retornados pelo WhatsApp.'
                  : 'Use o celular com o número que deseja vincular.'
              }}
            </p>
          </div>
          <span
            class="status-badge"
            :class="{ connected, error: crm.status === 'api_error' && !checking }"
            role="status"
            ><span class="status-dot" />{{ stateLabel }}</span
          >
        </div>

        <div
          v-if="checking"
          class="connection-state skeleton-state"
          aria-label="Verificando conexão com o WhatsApp"
        >
          <AppSkeleton width="104px" height="104px" border-radius="24px" />
          <AppSkeleton width="200px" height="22px" /><AppSkeleton
            width="min(320px, 100%)"
            height="16px"
          />
        </div>

        <div
          v-else-if="crm.status === 'api_error'"
          class="connection-state error-state"
          role="alert"
        >
          <span class="state-icon"><AlertCircle :size="28" /></span>
          <h3>Não foi possível verificar a conexão</h3>
          <p>
            {{ crm.connectionError || 'Tente novamente em instantes para consultar o WhatsApp.' }}
          </p>
          <AppButton variant="outline" :disabled="busy" @click="refresh"
            ><RefreshCw :size="16" />Tentar novamente</AppButton
          >
        </div>

        <div v-else-if="connected" class="connected-content">
          <div class="account-profile">
            <span class="avatar">
              <img v-if="account.profileImage && !failedPhoto" :src="account.profileImage" :alt="`Foto de ${accountName}`" referrerpolicy="no-referrer" @error="failedPhoto = true" />
              <span v-else class="avatar-initials" aria-label="Foto de perfil indisponível">{{ initials }}</span>
            </span>
            <div class="account-identity">
              <h3>{{ accountName }}</h3>
              <p class="phone">{{ phone }}</p>
            </div>
          </div>
          <dl class="account-details">
            <div class="account-detail">
              <dt>Tipo de conta</dt>
              <dd class="account-type" :class="{ 'is-business': account.instance?.isBusiness === true }">
                <BriefcaseBusiness v-if="account.instance?.isBusiness === true" :size="15" aria-hidden="true" />{{ accountType }}
              </dd>
            </div>
            <div class="account-detail">
              <dt>Vínculo com a clínica</dt>
              <dd class="linked-date">{{ linkedSince }}<span v-if="linkedAge" class="linked-age">{{ linkedAge }}</span></dd>
            </div>
            <div class="account-detail biography-detail">
              <dt>Biografia</dt>
              <dd class="account-bio" :class="{ 'not-provided': !account.bio }">{{ account.bio || 'Biografia não informada' }}</dd>
            </div>
          </dl>
          <div class="connected-note">
            <CheckCircle2 :size="20" />
            <div>
              <h3>Conexão estabelecida</h3>
              <p>
                Os envios usam esta conta. Lembretes e automações dependem das configurações da
                clínica.
              </p>
            </div>
          </div>
          <div class="disconnect-row">
            <p>
              Ao desconectar, será necessário ler um novo QR Code para vincular a conta novamente.
            </p>
            <AppButton variant="outline" :loading="crm.isLoading" @click="crm.logoutConnection"
              ><LogOut :size="16" />Desconectar</AppButton
            >
          </div>
        </div>

        <div v-else-if="pairing" class="connection-state pairing-state">
          <div class="qr-frame">
            <img
              v-if="crm.qrCode && !crm.isLoadingQrImage"
              :src="crm.qrCode"
              alt="QR Code para conectar o WhatsApp da clínica"
              width="224"
              height="224"
            />
            <AppSkeleton v-else width="224px" height="224px" border-radius="8px" />
          </div>
          <h3>{{ crm.qrCode ? 'Leia o QR Code com seu celular' : 'Preparando sua conexão' }}</h3>
          <p>
            {{
              crm.qrCode
                ? 'Em Aparelhos conectados, toque em Conectar aparelho e aponte a câmera para este código.'
                : 'O código aparecerá aqui assim que estiver disponível.'
            }}
          </p>
          <span class="qr-hint">{{
            crm.qrCode
              ? 'Se o código expirar, gere um novo para continuar.'
              : 'Aguarde a confirmação do WhatsApp.'
          }}</span>
        </div>

        <div v-else class="connection-state disconnected-state">
          <AppEmptyState
            title="Vincule o WhatsApp da clínica"
            text="Gere um QR Code e faça a leitura pelo aplicativo do WhatsApp no celular."
          >
            <template #illustration
              ><div
                class="connection-illustration"
                aria-hidden="true"
                v-html="connectionIllustration"
            /></template>
          </AppEmptyState>
          <AppButton
            variant="primary"
            :loading="crm.isLoading"
            @click="crm.initiateOrResetConnection"
            ><QrCode :size="18" />Gerar QR Code</AppButton
          >
          <span class="qr-hint">Não é necessário informar senha ou código recebido por SMS.</span>
        </div>
      </section>

      <aside class="guidance">
        <section v-if="connected" class="panel privacy-panel">
          <div class="compact-heading"><span class="section-icon"><MessageSquare :size="20" /></span><h2>Sobre suas mensagens</h2></div>
          <p class="section-description">{{ messagesPrivacyText }}</p>
        </section>
        <section v-if="connected" class="panel privacy-panel">
          <div class="compact-heading"><span class="section-icon"><MonitorOff :size="20" /></span><h2>Sem espelhamento do celular</h2></div>
          <p class="section-description">A conexão não mostra a tela do seu aparelho nem o que acontece em outros aplicativos. Você pode encerrar o vínculo em Aparelhos conectados no WhatsApp.</p>
        </section>
        <section class="panel instructions-panel">
          <div class="compact-heading"><span class="section-icon"><Smartphone :size="20" /></span>
          <h2>{{ connected ? 'Gerencie também pelo celular' : 'Como conectar' }}</h2>
          </div>
          <p class="section-description">
            {{
              connected
                ? 'No WhatsApp, acesse Aparelhos conectados para consultar os dispositivos vinculados.'
                : 'Tenha o celular da clínica por perto e siga os passos abaixo.'
            }}
          </p>
          <ol v-if="!connected" class="steps">
            <li>
              <span>1</span>
              <div>
                <h3>Abra o WhatsApp no celular</h3>
                <p>No Android, toque no menu de três pontos. No iPhone, abra Configurações.</p>
              </div>
            </li>
            <li>
              <span>2</span>
              <div>
                <h3>Acesse Aparelhos conectados</h3>
                <p>
                  {{
                    connected
                      ? 'Veja os aparelhos com acesso à conta.'
                      : 'Toque em Conectar aparelho e desbloqueie o celular, se solicitado.'
                  }}
                </p>
              </div>
            </li>
            <li v-if="!connected">
              <span>3</span>
              <div>
                <h3>Leia o QR Code desta tela</h3>
                <p>Aguarde a confirmação antes de sair desta página.</p>
              </div>
            </li>
          </ol>
        </section>
        <section class="panel help-panel">
          <div class="compact-heading"><span class="section-icon"><Wifi :size="20" /></span>
          <h2>{{ connected ? 'Mantenha a conexão disponível' : 'Não conseguiu conectar?' }}</h2>
          </div>
          <p>
            {{
              connected
                ? 'Mantenha o vínculo em Aparelhos conectados. Se houver falha, confira a internet e atualize o status.'
                : 'Confira a internet do celular e do computador. Use uma versão atualizada do WhatsApp e tente novamente se o QR Code expirar.'
            }}
          </p>
          <div class="help-note">
            <Info :size="16" />
            <p>
              A entrega de cada mensagem pode ser acompanhada no histórico de envios.
            </p>
          </div>
        </section>
        <section v-if="!connected" class="panel privacy-panel">
          <div class="compact-heading"><span class="section-icon"><MessageSquare :size="20" /></span><h2>Sobre suas mensagens</h2></div>
          <p class="section-description">{{ messagesPrivacyText }}</p>
        </section>
      </aside>
    </div>
  </div>
</template>

<style scoped>
.whatsapp-connection {
  font-family: var(--fonte-principal);
  color: var(--preto, #16243a);
  width: 100%;
  min-height: 100%;
  display: flex;
  flex-direction: column;
}
h1,
h2,
h3,
p {
  margin: 0;
}
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 20px;
  margin-bottom: 24px;
  flex-shrink: 0;
}
h1 {
  font-size: 28px;
  font-weight: 650;
  letter-spacing: -0.6px;
  line-height: 1.25;
}
.page-header p {
  margin-top: 6px;
  color: var(--cinza-texto, #64748b);
  font-size: 14px;
  line-height: 1.5;
}
.connection-layout {
  display: grid;
  grid-template-columns: minmax(0, 2.2fr) minmax(300px, 1fr);
  gap: 24px;
  align-items: stretch;
  flex: 1;
}
.connection-panel { display: flex; flex-direction: column; min-width: 0; }
.panel {
  border: 1px solid var(--borda, #e5e7eb);
  border-radius: 16px;
  background: var(--branco, #fff);
  overflow: hidden;
}
.panel-heading {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  padding: 24px;
  border-bottom: 1px solid #edf0f5;
}
h2 {
  font-size: 16px;
  font-weight: 600;
  line-height: 1.4;
}
.panel-heading p,
.section-description {
  font-size: 13px;
  line-height: 1.6;
  color: var(--cinza-texto, #64748b);
  margin-top: 5px;
}
.status-badge {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  background: #f1f5fb;
  color: #526580;
  border-radius: 99px;
  padding: 6px 10px;
  font-size: 12px;
  font-weight: 500;
  white-space: nowrap;
}
.status-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: currentColor;
}
.status-badge.connected {
  color: #11805a;
  background: #edf9f3;
}
.status-badge.error {
  color: #a14b1c;
  background: #fff5eb;
}
.connection-state {
  flex: 1;
  min-height: 405px;
  padding: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  gap: 16px;
  text-align: center;
}
.connection-state h3 {
  font-size: 18px;
  font-weight: 600;
  line-height: 1.4;
}
.connection-state > p {
  max-width: 380px;
  font-size: 14px;
  line-height: 1.7;
  color: var(--cinza-texto, #64748b);
}
.connection-illustration {
  width: 160px;
  max-width: 100%;
}
.connection-illustration :deep(svg) {
  display: block;
  width: 100%;
  height: auto;
}
.disconnected-state :deep(.state-cell) {
  padding: 0;
}
.disconnected-state :deep(.empty-state-title) {
  margin-top: 16px;
  font-size: 18px;
}
.disconnected-state :deep(.empty-state-text) {
  font-size: 14px;
  margin-bottom: 4px;
}
.qr-hint {
  font-size: 12px;
  color: var(--cinza-texto, #64748b);
  line-height: 1.6;
  max-width: 340px;
}
.qr-frame {
  padding: 16px;
  border: 1px solid #e5e7eb;
  border-radius: 16px;
  background: #fff;
  max-width: 100%;
}
.qr-frame img {
  display: block;
  max-width: 100%;
  height: auto;
}
.state-icon,
.section-icon,
.avatar {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: var(--azul-fraco, #edf4ff);
  color: var(--azul-principal, #0057ff);
  border-radius: 12px;
}
.state-icon {
  padding: 16px;
}
.guidance {
  display: grid;
  gap: 16px;
  align-content: start;
}
.instructions-panel,
.help-panel,
.privacy-panel {
  padding: 20px;
}
.section-icon {
  width: 36px;
  height: 36px;
  margin-bottom: 14px;
}
.steps {
  list-style: none;
  padding: 0;
  margin: 16px 0 0;
  display: grid;
  gap: 14px;
}
.steps li {
  display: flex;
  gap: 12px;
}
.steps li > span {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: 26px;
  height: 26px;
  border-radius: 50%;
  background: var(--azul-fraco, #edf4ff);
  color: var(--azul-principal, #0057ff);
  font-size: 12px;
  font-weight: 500;
}
.steps h3,
.connected-note h3 {
  font-size: 14px;
  font-weight: 500;
  line-height: 1.5;
}
.steps p,
.help-panel p,
.connected-note p,
.disconnect-row p {
  font-size: 13px;
  color: var(--cinza-texto, #64748b);
  line-height: 1.7;
  margin-top: 4px;
}
.help-panel > p {
  margin-top: 8px;
}
.help-note {
  display: flex;
  align-items: flex-start;
  gap: 9px;
  border-top: 1px solid #edf0f5;
  padding-top: 16px;
  margin-top: 16px;
}
.help-note svg {
  flex-shrink: 0;
  margin-top: 4px;
  color: var(--azul-principal, #0057ff);
}
.help-note p {
  margin: 0;
  font-size: 12px;
}
.connected-content {
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 24px;
  flex: 1;
}
.account-profile {
  display: flex;
  align-items: center;
  gap: 16px;
}
.avatar {
  width: 80px;
  height: 80px;
  flex-shrink: 0;
  border-radius: 50%;
  overflow: hidden;
}
.avatar img { width: 100%; height: 100%; object-fit: cover; }
.avatar-initials { font-size: 24px; font-weight: 600; }
.account-identity { min-width: 0; }
.account-profile h3 {
  font-size: 20px;
  font-weight: 600;
  overflow-wrap: anywhere;
}
.phone {
  margin-top: 6px;
  font-size: 15px;
  color: var(--cinza-texto, #64748b);
}
.account-type {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: var(--cinza-texto, #64748b);
}
.account-type.is-business { color: var(--azul-principal, #0057ff); }
.account-details { margin: 0; display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 24px; padding: 24px; border: 1px solid #edf0f5; border-radius: 12px; }
.biography-detail { grid-column: 1 / -1; }
.linked-date { font-size: 14px; }
.linked-age { display: block; margin-top: 4px; font-size: 12px; color: var(--cinza-texto, #64748b); }
.account-detail { min-width: 0; }
.account-detail dt { font-size: 12px; color: var(--cinza-texto, #64748b); margin-bottom: 6px; }
.account-detail dd { margin: 0; line-height: 1.6; }
.account-bio { font-size: 14px; white-space: pre-wrap; overflow-wrap: anywhere; }
.not-provided { color: var(--cinza-texto, #64748b); }
.connected-note {
  display: flex;
  gap: 12px;
  background: #f5fbf8;
  border-radius: 12px;
  padding: 18px;
  margin: 0;
}
.connected-note svg {
  color: #11805a;
  flex-shrink: 0;
  margin-top: 2px;
}
.disconnect-row {
  border-top: 1px solid #edf0f5;
  padding-top: 20px;
  display: flex;
  gap: 24px;
  align-items: center;
  margin-top: auto;
}
.disconnect-row p {
  margin: 0;
  flex: 1;
}
.compact-heading { display: flex; align-items: center; gap: 10px; }
.compact-heading .section-icon { margin: 0; flex-shrink: 0; }
@media (max-width: 1100px) {
  .connection-layout {
    grid-template-columns: minmax(0, 1.7fr) minmax(280px, 1fr);
    gap: 16px;
  }
  .panel-heading {
    flex-direction: column;
  }
}
@media (max-width: 760px) {
  .page-header {
    align-items: flex-start;
    flex-direction: column;
  }
  h1 {
    font-size: 24px;
  }
  .connection-layout {
    grid-template-columns: minmax(0, 1fr);
  }
  .panel-heading,
  .instructions-panel,
  .help-panel {
    padding: 20px;
  }
  .connection-state {
    min-height: 340px;
    padding: 24px 20px;
  }
  .disconnect-row {
    flex-direction: column;
    align-items: flex-start;
  }
  .avatar { width: 64px; height: 64px; }
  .account-profile h3 { font-size: 18px; }
  .connected-content {
    padding: 24px 20px;
  }
  .account-details { grid-template-columns: minmax(0, 1fr); padding: 20px; gap: 20px; }
}
</style>
