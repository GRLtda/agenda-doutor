import test from 'node:test'
import assert from 'node:assert/strict'
import { consentSignatureError } from '../src/utils/consent-signature-error.js'

test('preserva mensagens nos dois contratos e não mostra detalhes internos', () => {
  for (const data of [{ message: 'Link expirado' }, { error: { message: 'Link expirado' } }]) {
    assert.equal(consentSignatureError({ response: { status: 403, data } }), 'Link expirado')
  }
  assert.match(consentSignatureError({ message: 'secret database address' }), /conexão/)
  assert.match(consentSignatureError({ response: { status: 413, data: '<html>proxy</html>' } }), /muito grande/)
  assert.match(consentSignatureError({ response: { status: 503 } }), /503/)
})
