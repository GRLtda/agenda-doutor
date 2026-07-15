# Padrao de SideDrawer com Stepper

Use este modelo quando criar fluxos de cadastro ou edicao em sidebar modal, como "Novo Orcamento" e "Nova despesa".

## Estrutura visual

- Use `SideDrawer size="xl"` para formularios com mais de uma etapa.
- Header com icone, titulo e subtitulo curto.
- Body com `Stepper` no topo e apenas uma etapa visivel por vez.
- Footer com dois botoes:
  - Esquerda: `Cancelar` na primeira etapa, `Voltar` nas demais.
  - Direita: `Proximo` ate a ultima etapa, acao final na ultima.

## Estado do stepper

```js
const currentStep = ref(1)
const attemptedSteps = reactive({
  1: false,
  2: false,
  3: false,
})

const steps = [
  { name: 'Identificacao', icon: User, subtitle: 'Dados basicos' },
  { name: 'Valores', icon: DollarSign, subtitle: 'Datas e pagamento' },
  { name: 'Detalhes', icon: StickyNote, subtitle: 'Recorrencia e notas' },
]
```

## Validacao por etapa

Crie um `computed` de erros e mostre mensagens apenas depois que a etapa foi tentada.

```js
const fieldErrors = computed(() => ({
  name: attemptedSteps[1] && !form.name.trim() ? 'Informe o nome.' : '',
  amount: attemptedSteps[2] && Number(form.amount || 0) <= 0 ? 'Informe um valor maior que zero.' : '',
}))

function canAdvanceStep() {
  if (currentStep.value === 1) return !fieldErrors.value.name
  if (currentStep.value === 2) return !fieldErrors.value.amount
  return true
}

function nextStep() {
  attemptedSteps[currentStep.value] = true
  if (!canAdvanceStep()) return
  currentStep.value += 1
}
```

No submit final, marque todas as etapas e volte para a primeira etapa invalida.

```js
function submit() {
  attemptedSteps[1] = true
  attemptedSteps[2] = true
  attemptedSteps[3] = true

  if (fieldErrors.value.name) {
    currentStep.value = 1
    return
  }

  if (fieldErrors.value.amount) {
    currentStep.value = 2
    return
  }

  emit('save', payload)
}
```

## Template base

```vue
<SideDrawer size="xl" @close="$emit('close')">
  <template #header>
    <div class="drawer-header">
      <div class="header-content">
        <h2 class="drawer-title">
          <div class="header-icon">
            <FileSignature :size="22" />
          </div>
          Titulo do fluxo
        </h2>
        <p class="drawer-description">Subtitulo curto do fluxo.</p>
      </div>
    </div>
  </template>

  <div class="drawer-body-content">
    <div class="stepper-wrapper">
      <Stepper :steps="steps" :currentStep="currentStep" />
    </div>

    <div v-show="currentStep === 1" class="step-content">
      <!-- campos da etapa 1 -->
    </div>

    <div v-show="currentStep === 2" class="step-content">
      <!-- campos da etapa 2 -->
    </div>

    <div v-show="currentStep === 3" class="step-content">
      <!-- campos da etapa 3 -->
    </div>
  </div>

  <template #footer>
    <div class="drawer-footer space-between">
      <AppButton variant="default" @click="currentStep === 1 ? $emit('close') : prevStep()">
        <component :is="currentStep === 1 ? X : ArrowLeft" :size="17" />
        {{ currentStep === 1 ? 'Cancelar' : 'Voltar' }}
      </AppButton>

      <AppButton variant="primary" @click="currentStep === steps.length ? submit() : nextStep()">
        <component :is="currentStep === steps.length ? Save : ArrowRight" :size="17" />
        {{ currentStep === steps.length ? 'Salvar' : 'Proximo' }}
      </AppButton>
    </div>
  </template>
</SideDrawer>
```

## Erros de campo

```vue
<input
  v-model="form.name"
  class="form-input"
  :class="{ 'has-error': fieldErrors.name }"
/>
<span v-if="fieldErrors.name" class="field-error">{{ fieldErrors.name }}</span>
```

```css
.field-error {
  color: #dc2626;
  font-size: 0.78rem;
  font-weight: 600;
}

.form-input.has-error {
  border-color: #dc2626;
  box-shadow: 0 0 0 3px rgba(220, 38, 38, 0.08);
}
```

## Regras do padrao

- Nao separar cada etapa em cards ou containers decorativos.
- Deixe o stepper fazer a separacao mental do fluxo.
- Campos obrigatorios devem exibir erro no proprio campo ao tentar avancar.
- Evite texto explicativo longo dentro do modal.
- Use icones `lucide-vue-next` nos titulos e botoes.
- Se usar dropdown global, prefira `StyledSelect`.
