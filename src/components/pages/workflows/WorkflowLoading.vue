<script setup>
import AppSkeleton from '@/components/global/AppSkeleton.vue'
</script>
<template>
 <div class="workflow-loading" role="status" aria-live="polite" aria-busy="true">
  <div class="loading-copy"><h2>Carregando workflow</h2><p>Preparando as etapas e conexões…</p></div>
  <div class="loading-tree" aria-hidden="true"><div class="loading-node root-node"><AppSkeleton width="40%" height="13px" /><AppSkeleton width="80%" height="18px" /><AppSkeleton width="60%" height="12px" /></div><div class="loading-trunk"></div><div class="loading-branches"><div v-for="i in 2" :key="i" class="loading-node"><AppSkeleton width="40%" height="13px" /><AppSkeleton width="80%" height="18px" /><AppSkeleton width="60%" height="12px" /></div></div></div>
 </div>
</template>
<style scoped>
.workflow-loading{position:absolute;inset:0;z-index:20;display:flex;flex-direction:column;align-items:center;padding:48px 20px;background:#f8fafc;overflow:hidden;}.loading-copy{text-align:center;}.loading-copy h2{color:#111827;font-weight:600;font-size:1rem;}.loading-copy p{color:#64748b;font-size:.8rem;margin-top:8px;}.loading-tree{width:min(550px,100%);margin-top:40px;}.loading-node{display:flex;flex-direction:column;gap:12px;padding:18px;border:1px solid #e2e8f0;border-radius:12px;background:#fff;min-width:0;}.root-node{width:220px;margin:auto;}.loading-trunk{height:52px;width:1px;background:#dce2eb;margin:auto;}.loading-branches{position:relative;display:grid;grid-template-columns:1fr 1fr;gap:50px;}.loading-branches::before{content:'';position:absolute;top:0;left:25%;right:25%;height:1px;background:#dce2eb;}
@media(max-width:768px){.workflow-loading{padding-top:36px;}.loading-branches{gap:18px;}.loading-node{padding:14px;}.root-node{width:180px;}}
</style>
