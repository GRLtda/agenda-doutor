<script setup>
import PatientGalleryWorkspace from './PatientGalleryWorkspace.vue'
defineProps({ patientId: { type: String, required: true } })
</script>
<template><PatientGalleryWorkspace :patient-id="patientId" /></template>
