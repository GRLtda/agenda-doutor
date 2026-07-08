<template>
  <div class="simple-page">
    <h1>Regras automáticas</h1>
    <section class="panel">
      <h2>Preparado para a próxima fase</h2>
      <p>
        Esta tela vai concentrar regras como quando chamar humano, quando sugerir reagendamento,
        horários de atuação, palavras sensíveis e bloqueios de orientação médica.
      </p>
      <ul>
        <li>Diagnóstico, receita e urgência sempre chamam humano.</li>
        <li>Reagendamento começa com aprovação humana.</li>
        <li>Cancelamento pode exigir motivo conforme regra da clínica.</li>
      </ul>
    </section>
  </div>
</template>

<style scoped>
.simple-page { display: flex; flex-direction: column; gap: 1rem; }
h1 { margin: 0; font-size: 2rem; color: #111827; }
.panel { background: #fff; border: 1px solid #e5e7eb; border-radius: 12px; padding: 1rem; color: #475569; line-height: 1.6; }
h2 { margin-top: 0; color: #111827; }
</style>

