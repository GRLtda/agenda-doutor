<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { Check, Copy, ExternalLink, LoaderCircle, MessageCircle, Users } from 'lucide-vue-next'
import { getPatientReferrals } from '@/api/referrals'
import { useToast } from 'vue-toastification'

const props = defineProps({ patientId: { type: String, required: true }, clinicName: { type: String, default: 'nossa clínica' } })
const toast = useToast(); const loading = ref(true); const data = ref({ link: null, metrics: {}, leads: [] }); const copied = ref(false)
const url = computed(() => data.value.link ? `${window.location.origin}${data.value.link.path}` : '')
const status = { new: 'Novo', contacted: 'Em contato', interested: 'Interessado', scheduled: 'Agendado', converted: 'Convertido', lost: 'Perdido' }
const date = (value) => value ? new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short' }).format(new Date(value)) : '—'
async function load() { loading.value = true; try { const { data: response } = await getPatientReferrals(props.patientId); data.value = response } catch (error) { toast.error(error.response?.data?.message || 'Não foi possível carregar as indicações.') } finally { loading.value = false } }
async function copy() { try { await navigator.clipboard.writeText(url.value); copied.value = true; toast.success('Link copiado.'); setTimeout(() => copied.value = false, 1800) } catch { toast.error('Não foi possível copiar o link.') } }
function whatsapp() { const message = `Oi! Quero te indicar a ${props.clinicName}. Se quiser conhecer melhor e falar com a equipe, é só preencher seus dados aqui: ${url.value}`; window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank', 'noopener') }
onMounted(load); watch(() => props.patientId, load)
</script>

<template>
  <section class="referrals-tab">
    <div v-if="loading" class="loading"><LoaderCircle class="spin" :size="22" /> Carregando indicações...</div>
    <template v-else>
      <header><div><h3>Seu link de indicação</h3><p>Compartilhe para indicar pessoas à clínica.</p></div></header>
      <div class="link-actions"><output>{{ url }}</output><button @click="copy"><Check v-if="copied" :size="16" /><Copy v-else :size="16" />{{ copied ? 'Copiado' : 'Copiar link' }}</button><button class="whatsapp" @click="whatsapp"><MessageCircle :size="16" /> Enviar pelo WhatsApp</button></div>
      <div class="metrics"><article><Users :size="19" /><b>{{ data.metrics.total || 0 }}</b><span>Indicados</span></article><article><b>{{ data.metrics.scheduled || 0 }}</b><span>Agendados</span></article><article><b>{{ data.metrics.converted || 0 }}</b><span>Convertidos</span></article><article><b>{{ data.metrics.conversionRate || 0 }}%</b><span>Taxa de conversão</span></article></div>
      <div class="lead-list"><div class="list-heading"><h3>Indicações recebidas</h3><span>{{ data.total || 0 }} no total</span></div><div v-if="!data.leads?.length" class="empty">Ainda não há indicações por este link.</div><div v-else class="table-wrap"><table><thead><tr><th>Nome</th><th>Contato</th><th>Interesse</th><th>Status</th><th>Data</th></tr></thead><tbody><tr v-for="lead in data.leads" :key="lead._id"><td>{{ lead.fullName }}</td><td>{{ lead.phone }}</td><td>{{ lead.serviceInterestLabel || lead.objective || '—' }}</td><td><span class="status" :class="lead.status">{{ status[lead.status] }}</span></td><td>{{ date(lead.createdAt) }}</td></tr></tbody></table></div></div>
    </template>
  </section>
</template>

<style scoped>
.referrals-tab{display:grid;gap:20px}.referrals-tab header h3,.lead-list h3{margin:0;color:#27364a;font-size:17px}.referrals-tab header p{margin:5px 0 0;color:#7b8797;font-size:13px}.link-actions{display:flex;gap:10px;align-items:center}.link-actions output{flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;border:1px solid #dce4ed;border-radius:8px;padding:11px 12px;background:#f8fafc;color:#536174;font-size:13px}.link-actions button{display:inline-flex;align-items:center;gap:7px;white-space:nowrap;border:1px solid #cad8eb;border-radius:8px;padding:11px 13px;background:#fff;color:#246fe8;font:inherit;font-size:13px;font-weight:700;cursor:pointer}.link-actions .whatsapp{border-color:#9addb2;background:#16a34a;color:#fff}.metrics{display:grid;grid-template-columns:repeat(4,1fr);gap:12px}.metrics article{display:grid;grid-template-columns:auto 1fr;column-gap:9px;align-items:center;min-height:72px;padding:11px 14px;border:1px solid #e4eaf1;border-radius:10px;background:#fff}.metrics svg{grid-row:span 2;color:#2875ee}.metrics b{font-size:20px;color:#27364a}.metrics span{font-size:12px;color:#7b8797}.lead-list{padding-top:4px}.list-heading{display:flex;justify-content:space-between;align-items:center;margin-bottom:12px}.list-heading span{color:#94a3b8;font-size:12px}.table-wrap{overflow:auto;border:1px solid #e5eaf0;border-radius:10px}table{width:100%;border-collapse:collapse;text-align:left;font-size:13px}th,td{padding:12px 14px;border-bottom:1px solid #edf0f4;color:#536174}th{background:#f8fafc;color:#64748b;font-size:12px}tr:last-child td{border:0}.status{display:inline-block;border-radius:999px;padding:4px 8px;background:#eef2f7;color:#526174;font-size:11px;font-weight:700}.status.new{background:#eff6ff;color:#246fe8}.status.scheduled{background:#fef3c7;color:#a16207}.status.converted{background:#dcfce7;color:#15803d}.status.lost{background:#fee2e2;color:#b91c1c}.empty{padding:28px;border:1px dashed #d8e1eb;border-radius:10px;text-align:center;color:#94a3b8;font-size:13px}.loading{display:flex;justify-content:center;align-items:center;gap:9px;padding:38px;color:#64748b}.spin{animation:spin 1s linear infinite}@keyframes spin{to{transform:rotate(360deg)}}@media(max-width:760px){.link-actions{align-items:stretch;flex-direction:column}.metrics{grid-template-columns:1fr 1fr}}
</style>
