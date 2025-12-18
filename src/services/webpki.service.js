// services/webpki.service.js
// Serviço de abstração para o Lacuna Web PKI

import LacunaWebPKI from 'web-pki'

let pki = null
let isInitialized = false

/**
 * Inicializa o Web PKI
 * @returns {Promise<boolean>} - true se inicializado com sucesso
 */
export async function init() {
    if (isInitialized) {
        return true
    }

    pki = new LacunaWebPKI()

    return new Promise((resolve, reject) => {
        pki.init({
            ready: () => {
                isInitialized = true
                resolve(true)
            },
            notInstalled: (status, message) => {
                reject({
                    type: 'NOT_INSTALLED',
                    message: 'Web PKI não está instalado',
                    installUrl: pki.installUrl,
                })
            },
            defaultError: (message) => {
                reject({
                    type: 'ERROR',
                    message: message || 'Erro ao inicializar Web PKI',
                })
            },
        })
    })
}

/**
 * Verifica se a extensão Web PKI está instalada
 */
export function isInstalled() {
    return isInitialized
}

/**
 * Obtém a URL de instalação da extensão
 */
export function getInstallUrl() {
    if (pki) {
        return pki.installUrl
    }
    return 'https://get.webpkiplugin.com/'
}

/**
 * Lista certificados digitais disponíveis
 * @param {object} filters - Filtros opcionais
 * @param {boolean} filters.pkiBrazil - Filtrar apenas ICP-Brasil (default: true)
 * @param {boolean} filters.validOnly - Filtrar apenas válidos (default: true)
 * @returns {Promise<Array>} - Lista de certificados
 */
export async function listCertificates(filters = {}) {
    const { pkiBrazil = true, validOnly = true } = filters

    if (!isInitialized) {
        await init()
    }

    return new Promise((resolve, reject) => {
        pki.listCertificates({
            success: (certs) => {
                let filteredCerts = certs

                // Filtrar ICP-Brasil
                if (pkiBrazil) {
                    filteredCerts = filteredCerts.filter(cert => cert.pkiBrazil)
                }

                // Filtrar válidos
                if (validOnly) {
                    const now = new Date()
                    filteredCerts = filteredCerts.filter(cert => {
                        const validityEnd = new Date(cert.validityEnd)
                        return validityEnd > now
                    })
                }

                // Mapear para formato mais útil
                const mappedCerts = filteredCerts.map(cert => ({
                    thumbprint: cert.thumbprint,
                    subjectName: cert.subjectName,
                    issuerName: cert.issuerName,
                    validityStart: cert.validityStart,
                    validityEnd: cert.validityEnd,
                    serialNumber: cert.serialNumber,
                    pkiBrazil: cert.pkiBrazil,
                    // Dados específicos ICP-Brasil
                    cpf: cert.pkiBrazil?.cpf,
                    cpfFormatted: cert.pkiBrazil?.cpfFormatted,
                    name: cert.pkiBrazil?.responsavel || cert.subjectName?.split(':')[0] || cert.subjectName,
                }))

                resolve(mappedCerts)
            },
            error: (error) => {
                reject({
                    type: 'LIST_ERROR',
                    message: error || 'Erro ao listar certificados',
                })
            },
        })
    })
}
/**
 * Assina um PDF usando o certificado especificado
 * Assina um PDF
 * @param {string} base64 - PDF em base64
 * @param {string} thumbprint - Thumbprint do certificado
 * @param {object} options - Opções (digestAlgorithm, signaturePolicy)
 * @param {object} certificate - Objeto completo do certificado (opcional, para detecção de teste)
 */
export async function signPdf(base64, thumbprint, options = {}, certificate = null) {
    if (!isInitialized) {
        await init()
    }

    // Limpa o base64 se necessário
    const cleanBase64 = base64.replace(/^data:application\/pdf;base64,/, '')

    console.log('[WebPKI] ========== INICIANDO ASSINATURA ==========')
    console.log('[WebPKI] Thumbprint:', thumbprint)
    console.log('[WebPKI] Base64 length:', cleanBase64.length)
    console.log('[WebPKI] PKI object methods:', Object.keys(pki).filter(k => typeof pki[k] === 'function'))

    // Mapeamento de políticas (Backend -> Web PKI Constants)
    const POLICY_MAP = {
        'Basic': 'basic',
        'ICP-Brasil': 'brazilAdrBasica',
        'ADRB': 'brazilAdrBasica',
        'T': 'brazilAdrBasica'
    }

    const policyKey = options.signaturePolicy || 'Basic'
    let policyName = POLICY_MAP[policyKey] || 'basic'

    // DETECÇÃO DE CERTIFICADO DE TESTE
    // Se for certificado de teste, forçamos política 'basic' pois ICP-Brasil vai rejeitar
    const isTestCert = certificate && (
        (certificate.issuerName && certificate.issuerName.includes('Lacuna Test')) ||
        (certificate.subjectName && certificate.subjectName.includes('Pierre de Fermat')) ||
        (certificate.issuerName && certificate.issuerName.includes('Test CA'))
    );

    if (isTestCert && policyName === 'brazilAdrBasica') {
        console.log('[WebPKI] 🧪 Certificado de teste detectado. Forçando política "basic" para garantir sucesso no desenvolvimento.')
        policyName = 'basic'
    }

    // Tenta obter do objeto de políticas da biblioteca (padesPolicies ou signaturePolicies)
    const policies = pki.padesPolicies || pki.signaturePolicies || {}
    const signaturePolicy = policies[policyName] || policyName

    console.log('[WebPKI] Política selecionada:', policyKey, '->', policyName, `(${signaturePolicy})`)

    // Parâmetros para enviar ao signPdf
    const signParams = {
        certificateThumbprint: thumbprint,
        content: cleanBase64,
        output: {
            mode: 'returnContent'
        },
        // A documentação indica 'policy', mas mantemos 'signaturePolicy' como fallback
        policy: signaturePolicy,
        signaturePolicy: signaturePolicy,
        digestAlgorithm: options.digestAlgorithm || 'SHA-256',
        // Adiciona arbitradores de confiança para reconhecer certificados locais/de teste
        trustArbitrators: [
            { type: 'standard', standardArbitrator: 'pkiBrazil' }, // Padrão ICP-Brasil
            { type: 'standard', standardArbitrator: 'windows' }     // Confia no que o Windows confia (útil para testes)
        ]
    }

    console.log('[WebPKI] Parâmetros sendo enviados:', Object.keys(signParams))
    console.log('[WebPKI] Chamando pki.signPdf()...')

    return new Promise((resolve, reject) => {
        try {
            // Callback wrapper para logar
            const successCallback = (result) => {
                console.log('[WebPKI] ✅ SUCCESS callback chamado!')
                console.log('[WebPKI] Tipo do resultado:', typeof result)
                console.log('[WebPKI] Resultado:', result)

                if (typeof result === 'object' && result !== null) {
                    console.log('[WebPKI] Chaves do resultado:', Object.keys(result))

                    // Verifica se a assinatura é válida segundo a política
                    if (result.isValid === false) {
                        const errorMsg = result.signingCertificateValidationResults?.errors?.[0]?.message ||
                            'O certificado utilizado não é confiável para a política selecionada.'

                        console.error('[WebPKI] ❌ Assinatura inválida pela política:', errorMsg)

                        let finalMsg = `Falha na validação do certificado: ${errorMsg}`
                        if (errorMsg.includes('emissor') || errorMsg.includes('confiável')) {
                            finalMsg += '\n\nDica: Se estiver usando um certificado de teste, certifique-se de que a política no documento seja "Basic" ou que a CA de teste esteja instalada no seu computador.'
                        }

                        reject(new Error(finalMsg))
                        return
                    }

                    if (result.signatureInfo) {
                        console.log('[WebPKI] Chaves do signatureInfo:', Object.keys(result.signatureInfo))
                    }
                }

                // Tenta extrair o conteúdo assinado de vários lugares possíveis
                let signedContent = null
                if (typeof result === 'object' && result !== null) {
                    // Ordem de preferência baseada na documentação e tipos
                    signedContent = result.content ||
                        result.signatureInfo?.content ||
                        result.file?.content ||
                        result.signedPdf ||
                        result.fileContent ||
                        result.pdfContent
                } else {
                    signedContent = result
                }

                if (!signedContent) {
                    console.error('[WebPKI] ❌ Erro: Não foi possível encontrar o conteúdo assinado no resultado.')
                    console.log('[WebPKI] Verifique se a extensão do Web PKI está atualizada e se as permissões foram concedidas.')
                    reject(new Error('Falha ao obter conteúdo do PDF assinado após processamento.'))
                } else {
                    console.log('[WebPKI] Conteúdo extraído com sucesso. Tamanho:', typeof signedContent === 'string' ? signedContent.length : 'N/A (Object)')
                    resolve(signedContent)
                }
            }

            const errorCallback = (error, errorCode) => {
                console.error('[WebPKI] ❌ ERROR callback chamado!')
                console.error('[WebPKI] Erro:', error)
                console.error('[WebPKI] Código:', errorCode)
                reject({
                    type: 'SIGN_ERROR',
                    message: error || `Erro ao assinar PDF (código: ${errorCode})`,
                    code: errorCode
                })
            }

            pki.signPdf({
                ...signParams,
                success: successCallback,
                error: errorCallback
            })

            console.log('[WebPKI] pki.signPdf() chamado - aguardando callback...')

        } catch (err) {
            console.error('[WebPKI] ❌ EXCEPTION ao chamar signPdf:', err)
            reject({
                type: 'SIGN_ERROR',
                message: err.message || 'Erro desconhecido ao assinar PDF',
            })
        }
    })
}

/**
 * Assina dados usando o certificado especificado (fallback para signData)
 * @param {string} data - Dados em base64
 * @param {string} thumbprint - Thumbprint do certificado
 * @returns {Promise<string>} - Dados assinados
 */
export async function signData(data, thumbprint) {
    if (!isInitialized) {
        await init()
    }

    return new Promise((resolve, reject) => {
        pki.signData({
            thumbprint: thumbprint,
            data: data,
            digestAlgorithm: 'SHA-256',
            success: (signedData) => resolve(signedData),
            error: (error) => {
                reject({
                    type: 'SIGN_ERROR',
                    message: error || 'Erro ao assinar dados',
                })
            },
        })
    })
}

/**
 * Obtém informações detalhadas de um certificado
 * @param {string} thumbprint - Thumbprint do certificado
 * @returns {Promise<object>} - Informações do certificado
 */
export async function getCertificateInfo(thumbprint) {
    if (!isInitialized) {
        await init()
    }

    return new Promise((resolve, reject) => {
        pki.readCertificate({
            thumbprint: thumbprint,
            success: (cert) => {
                resolve({
                    thumbprint: cert.thumbprint,
                    subjectName: cert.subjectName,
                    issuerName: cert.issuerName,
                    validityStart: cert.validityStart,
                    validityEnd: cert.validityEnd,
                    serialNumber: cert.serialNumber,
                    pkiBrazil: cert.pkiBrazil,
                    cpf: cert.pkiBrazil?.cpf,
                    cpfFormatted: cert.pkiBrazil?.cpfFormatted,
                    email: cert.email,
                })
            },
            error: (error) => {
                reject({
                    type: 'READ_ERROR',
                    message: error || 'Erro ao ler certificado',
                })
            },
        })
    })
}

/**
 * Reseta o estado de inicialização (útil para testes)
 */
export function reset() {
    pki = null
    isInitialized = false
}

// Export default como objeto para facilitar uso
export default {
    init,
    isInstalled,
    getInstallUrl,
    listCertificates,
    signPdf,
    signData,
    getCertificateInfo,
    reset,
}
