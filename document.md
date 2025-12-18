# Sistema de Gestão de Documentos - Documentação para Frontend

**Data:** 16/12/2024  
**Versão:** 1.0  
**API Base URL:** `/documents`

---

## Índice

1. [Visão Geral](#1-visão-geral)
2. [Fluxo de Assinatura Digital](#2-fluxo-de-assinatura-digital)
3. [Configuração do Web PKI](#3-configuração-do-web-pki)
4. [Endpoints da API](#4-endpoints-da-api)
5. [Modelos de Dados](#5-modelos-de-dados)
6. [Exemplos de Integração](#6-exemplos-de-integração)
7. [Tratamento de Erros](#7-tratamento-de-erros)

---

## 1. Visão Geral

O Sistema de Gestão de Documentos permite criar, editar, versionar e assinar digitalmente documentos médicos vinculados aos pacientes. Os tipos de documentos suportados são:

- **Receituários** (`prescription`)
- **Atestados** (`certificate`)
- **Contratos** (`contract`)

### Status do Documento

| Status | Descrição | Pode Editar? | Pode Assinar? |
|--------|-----------|--------------|---------------|
| `draft` | Rascunho | ✅ Sim | ✅ Sim |
| `awaiting_signature` | Aguardando assinatura | ❌ Não | ✅ Sim |
| `signed` | Assinado | ❌ Não | ❌ Não |
| `signature_failed` | Falha na assinatura | ✅ Sim | ✅ Sim |
| `cancelled` | Cancelado | ❌ Não | ❌ Não |

---

## 2. Fluxo de Assinatura Digital

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        FLUXO DE ASSINATURA DIGITAL                          │
└─────────────────────────────────────────────────────────────────────────────┘

  FRONTEND                                    BACKEND
  ────────                                    ───────
      │                                           │
      │  1. POST /documents                       │
      │  (Criar documento como rascunho)          │
      │ ────────────────────────────────────────► │
      │                                           │
      │  ◄──────────────────────────────────────  │
      │  { id, status: "draft" }                  │
      │                                           │
      │  2. PUT /documents/:id                    │
      │  (Editar conteúdo do documento)           │
      │ ────────────────────────────────────────► │
      │                                           │
      │  3. POST /documents/:id/request-signature │
      │ ────────────────────────────────────────► │
      │                                           │
      │  ◄──────────────────────────────────────  │
      │  { pdfBase64, pdfHash, signatureOptions } │
      │                                           │
      │                                           │
      ▼                                           │
  ┌────────────────────┐                          │
  │    WEB PKI         │                          │
  │  (Extensão do      │                          │
  │   Navegador)       │                          │
  │                    │                          │
  │  - Lista certs     │                          │
  │  - Usuário escolhe │                          │
  │  - Assina PDF      │                          │
  └────────────────────┘                          │
      │                                           │
      │  4. POST /documents/:id/signed            │
      │  { signedPdfBase64, certificateInfo }     │
      │ ────────────────────────────────────────► │
      │                                           │
      │  ◄──────────────────────────────────────  │
      │  { success: true, signedPdfUrl }          │
      │                                           │
      ▼                                           ▼
```

---

## 3. Configuração do Web PKI

### 3.1 Instalação

```bash
npm install web-pki
```

### 3.2 Inicialização

```javascript
import LacunaWebPKI from 'web-pki';

const pki = new LacunaWebPKI();

// Inicializar Web PKI
async function initWebPKI() {
  return new Promise((resolve, reject) => {
    pki.init({
      ready: () => resolve(true),
      notInstalled: (status, message) => {
        // Redirecionar usuário para instalar a extensão
        window.open(pki.installUrl);
        reject(new Error('Web PKI não instalado'));
      },
      defaultError: (message) => reject(new Error(message)),
    });
  });
}
```

### 3.3 Listar Certificados

```javascript
async function listCertificates() {
  return new Promise((resolve, reject) => {
    pki.listCertificates({
      success: (certs) => {
        // Filtra apenas certificados ICP-Brasil válidos
        const validCerts = certs.filter(cert => 
          cert.pkiBrazil && 
          new Date(cert.validityEnd) > new Date()
        );
        resolve(validCerts);
      },
      error: (error) => reject(error),
    });
  });
}
```

### 3.4 Assinar PDF

```javascript
async function signPdf(pdfBase64, thumbprint) {
  return new Promise((resolve, reject) => {
    pki.signData({
      thumbprint: thumbprint, // Thumbprint do certificado selecionado
      data: pdfBase64,
      digestAlgorithm: 'SHA-256',
      success: (signedData) => resolve(signedData),
      error: (error) => reject(error),
    });
  });
}
```

---

## 4. Endpoints da API

### 4.1 Documentos - CRUD

#### Criar Documento

```http
POST /documents
Content-Type: application/json
Authorization: Bearer {token}

{
  "patientId": "ObjectId",
  "documentTypeId": "ObjectId",
  "title": "Receituário - João Silva",
  "content": "<p>Uso contínuo...</p>"
}
```

**Response (201):**
```json
{
  "_id": "674...",
  "patient": "ObjectId",
  "clinic": "ObjectId",
  "documentType": "ObjectId",
  "status": "draft",
  "title": "Receituário - João Silva",
  "content": "<p>Uso contínuo...</p>",
  "currentVersion": 1,
  "createdBy": "ObjectId",
  "createdAt": "2024-12-16T20:00:00.000Z"
}
```

---

#### Listar Documentos

```http
GET /documents?patientId={id}&status={status}&page=1&limit=20
Authorization: Bearer {token}
```

**Query Parameters:**
| Param | Tipo | Descrição |
|-------|------|-----------|
| `patientId` | ObjectId | Filtrar por paciente |
| `status` | string | Filtrar por status |
| `documentTypeId` | ObjectId | Filtrar por tipo |
| `page` | number | Página (default: 1) |
| `limit` | number | Itens por página (default: 20) |

**Response (200):**
```json
{
  "documents": [
    {
      "_id": "674...",
      "title": "Receituário - João Silva",
      "status": "signed",
      "patient": { "_id": "...", "name": "João Silva", "cpf": "12345678901" },
      "documentType": { "_id": "...", "name": "Receituário", "code": "prescription" },
      "createdBy": { "_id": "...", "name": "Dr. Carlos" },
      "createdAt": "2024-12-16T20:00:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 1,
    "pages": 1
  }
}
```

---

#### Obter Documento

```http
GET /documents/:id
Authorization: Bearer {token}
```

**Response (200):**
```json
{
  "_id": "674...",
  "patient": { "_id": "...", "name": "João Silva", "cpf": "12345678901", "email": "...", "phone": "..." },
  "documentType": { "_id": "...", "name": "Receituário", "code": "prescription", "template": "..." },
  "status": "draft",
  "title": "Receituário - João Silva",
  "content": "<p>Uso contínuo...</p>",
  "currentVersion": 1,
  "createdBy": { "_id": "...", "name": "Dr. Carlos" },
  "createdAt": "2024-12-16T20:00:00.000Z"
}
```

---

#### Atualizar Documento

```http
PUT /documents/:id
Content-Type: application/json
Authorization: Bearer {token}

{
  "title": "Receituário Atualizado",
  "content": "<p>Novo conteúdo...</p>",
  "changeDescription": "Ajuste na dosagem"
}
```

> ⚠️ **Atenção:** Só funciona para documentos com status `draft` ou `signature_failed`.

**Response (200):**
```json
{
  "_id": "674...",
  "status": "draft",
  "currentVersion": 2,
  "lastModifiedBy": "ObjectId"
}
```

---

#### Cancelar Documento

```http
DELETE /documents/:id
Content-Type: application/json
Authorization: Bearer {token}

{
  "reason": "Documento emitido por engano"
}
```

**Response (200):**
```json
{
  "message": "Documento cancelado com sucesso",
  "document": {
    "_id": "674...",
    "status": "cancelled",
    "cancelledBy": "ObjectId",
    "cancelledAt": "2024-12-16T21:00:00.000Z",
    "cancellationReason": "Documento emitido por engano"
  }
}
```

---

### 4.2 PDF

#### Gerar PDF Preview

```http
POST /documents/:id/pdf
Authorization: Bearer {token}
```

**Response (200):**
```json
{
  "pdfUrl": "https://res.cloudinary.com/.../doc_674..._v1.pdf",
  "pdfHash": "abc123...sha256",
  "version": 1
}
```

---

### 4.3 Assinatura Digital

#### Solicitar Assinatura

```http
POST /documents/:id/request-signature
Content-Type: application/json
Authorization: Bearer {token}

{
  "signatureAppearance": "invisible"
}
```

**Body Parameters:**
| Param | Tipo | Descrição |
|-------|------|-----------|
| `signatureAppearance` | `"visible"` ou `"invisible"` | Aparência da assinatura no PDF |

**Response (200):**
```json
{
  "documentId": "674...",
  "version": 1,
  "adapter": "web_pki",
  "pdfBase64": "JVBERi0xLjQK...",
  "pdfHash": "abc123...sha256",
  "hashAlgorithm": "SHA-256",
  "signatureOptions": {
    "signatureStandard": "PAdES",
    "signaturePolicy": "ICP-Brasil",
    "certificateFilters": { "pkiBrazil": true },
    "appearance": "invisible"
  },
  "timestamp": "2024-12-16T20:30:00.000Z"
}
```

---

#### Enviar PDF Assinado

```http
POST /documents/:id/signed
Content-Type: application/json
Authorization: Bearer {token}

{
  "signedPdfBase64": "JVBERi0xLjQK...",
  "originalPdfHash": "abc123...sha256",
  "signatureAppearance": "invisible",
  "certificateInfo": {
    "subjectName": "JOAO CARLOS SILVA:12345678901",
    "pkiBrazil": {
      "cpf": "12345678901",
      "cpfFormatted": "123.456.789-01"
    },
    "issuerName": "AC CERTISIGN MULTIPLA G7",
    "serialNumber": "1234567890",
    "validityStart": "2024-01-01T00:00:00Z",
    "validityEnd": "2025-01-01T00:00:00Z",
    "thumbprint": "ABC123..."
  }
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Documento assinado com sucesso",
  "signedPdfUrl": "https://res.cloudinary.com/.../signed_674..._v1.pdf",
  "version": 1,
  "signer": "JOAO CARLOS SILVA:12345678901"
}
```

**Response (400) - Falha na assinatura:**
```json
{
  "message": "Certificado expirado"
}
```

---

#### Obter Info da Assinatura

```http
GET /documents/:id/signature
Authorization: Bearer {token}
```

**Response (200):**
```json
[
  {
    "_id": "675...",
    "document": "674...",
    "documentVersion": 1,
    "signer": { "_id": "...", "name": "Dr. Carlos" },
    "certificate": {
      "subjectName": "CARLOS SILVA:98765432100",
      "cpf": "98765432100",
      "issuer": "AC CERTISIGN",
      "validFrom": "2024-01-01T00:00:00Z",
      "validTo": "2025-01-01T00:00:00Z"
    },
    "signedAt": "2024-12-16T20:35:00.000Z",
    "signatureMethod": "web_pki",
    "signatureAppearance": "invisible",
    "signatureValid": true
  }
]
```

---

### 4.4 Download e Envio

#### Baixar PDF

```http
GET /documents/:id/download
Authorization: Bearer {token}
```

**Response (200):**
```json
{
  "pdfUrl": "https://res.cloudinary.com/.../signed_674..._v1.pdf"
}
```

---

#### Enviar ao Paciente

```http
POST /documents/:id/send
Content-Type: application/json
Authorization: Bearer {token}

{
  "method": "email",
  "email": "paciente@email.com"
}
```

ou

```json
{
  "method": "whatsapp",
  "phone": "5511999999999"
}
```

> ⚠️ **Atenção:** O documento deve estar assinado para ser enviado.

**Response (200):**
```json
{
  "success": true,
  "message": "Documento enviado com sucesso via email",
  "sentTo": "paciente@email.com"
}
```

---

### 4.5 Histórico e Versões

#### Histórico/Auditoria

```http
GET /documents/:id/history
Authorization: Bearer {token}
```

**Response (200):**
```json
[
  {
    "_id": "676...",
    "document": "674...",
    "user": { "_id": "...", "name": "Dr. Carlos" },
    "action": "DOCUMENT_SIGNED",
    "details": {
      "signatureMethod": "web_pki",
      "version": 1
    },
    "ipAddress": "192.168.1.1",
    "createdAt": "2024-12-16T20:35:00.000Z"
  },
  {
    "_id": "677...",
    "action": "DOCUMENT_CREATE",
    "createdAt": "2024-12-16T20:00:00.000Z"
  }
]
```

**Ações de auditoria:**
- `DOCUMENT_CREATE`
- `DOCUMENT_UPDATE`
- `DOCUMENT_VERSION_CREATE`
- `DOCUMENT_STATUS_CHANGE`
- `DOCUMENT_PDF_GENERATE`
- `DOCUMENT_SIGNATURE_REQUEST`
- `DOCUMENT_SIGNATURE_FAILED`
- `DOCUMENT_SIGNED`
- `DOCUMENT_CANCELLED`
- `DOCUMENT_DOWNLOAD`
- `DOCUMENT_SENT`

---

#### Listar Versões

```http
GET /documents/:id/versions
Authorization: Bearer {token}
```

**Response (200):**
```json
[
  {
    "_id": "678...",
    "document": "674...",
    "version": 2,
    "content": "<p>Conteúdo atualizado...</p>",
    "pdfUrl": "https://...",
    "pdfHash": "def456...",
    "createdBy": { "_id": "...", "name": "Dr. Carlos" },
    "changeDescription": "Ajuste na dosagem",
    "createdAt": "2024-12-16T20:15:00.000Z"
  },
  {
    "_id": "679...",
    "version": 1,
    "content": "<p>Conteúdo original...</p>",
    "createdAt": "2024-12-16T20:00:00.000Z"
  }
]
```

---

### 4.6 Tipos de Documento

#### Listar Tipos

```http
GET /documents/types
Authorization: Bearer {token}
```

**Query Parameters:**
| Param | Tipo | Descrição |
|-------|------|-----------|
| `includeInactive` | boolean | Incluir tipos inativos |

**Response (200):**
```json
[
  {
    "_id": "680...",
    "clinic": "ObjectId",
    "name": "Receituário",
    "code": "prescription",
    "description": "Prescrição de medicamentos",
    "template": "<p>{{paciente.nome}}</p>...",
    "requiresSignature": true,
    "fields": [
      { "name": "medicamento", "label": "Medicamento", "type": "text", "required": true },
      { "name": "dosagem", "label": "Dosagem", "type": "text", "required": true }
    ],
    "isActive": true
  },
  {
    "_id": "681...",
    "name": "Atestado",
    "code": "certificate"
  },
  {
    "_id": "682...",
    "name": "Contrato",
    "code": "contract"
  }
]
```

---

#### Criar Tipo de Documento

```http
POST /documents/types
Content-Type: application/json
Authorization: Bearer {token}

{
  "name": "Declaração de Comparecimento",
  "code": "other",
  "description": "Declaração de comparecimento à consulta",
  "template": "<h1>DECLARAÇÃO</h1><p>Declaramos que {{paciente.nome}}...</p>",
  "requiresSignature": true,
  "fields": [
    { "name": "data_consulta", "label": "Data da Consulta", "type": "date", "required": true }
  ]
}
```

**Códigos disponíveis:** `prescription`, `certificate`, `contract`, `other`

---

## 5. Modelos de Dados

### Document

```typescript
interface Document {
  _id: ObjectId;
  patient: ObjectId;
  clinic: ObjectId;
  documentType: ObjectId;
  status: 'draft' | 'awaiting_signature' | 'signed' | 'signature_failed' | 'cancelled';
  signatureFailReason?: string;
  title: string;
  content: string; // HTML
  currentVersion: number;
  signedVersionId?: number;
  signedPdfUrl?: string;
  signedPdfPublicId?: string;
  createdBy: ObjectId;
  lastModifiedBy?: ObjectId;
  cancelledBy?: ObjectId;
  cancelledAt?: Date;
  cancellationReason?: string;
  createdAt: Date;
  updatedAt: Date;
}
```

### DocumentSignature

```typescript
interface DocumentSignature {
  _id: ObjectId;
  document: ObjectId;
  documentVersion: number;
  signer: ObjectId;
  certificate: {
    subjectName: string;
    cpf: string;
    email?: string;
    issuer: string;
    issuerCN?: string;
    serialNumber?: string;
    validFrom: Date;
    validTo: Date;
    thumbprint?: string;
  };
  signedAt: Date;
  signatureMethod: 'web_pki' | 'safeid' | 'upload_pfx';
  signatureAppearance: 'visible' | 'invisible';
  ipAddress?: string;
  userAgent?: string;
  documentHash: string;
  signedPdfHash?: string;
  signatureValid: boolean;
}
```

---

## 6. Exemplos de Integração

### 6.1 Componente Vue.js - Fluxo Completo

```vue
<template>
  <div class="document-sign">
    <button @click="startSignature" :disabled="signing">
      {{ signing ? 'Assinando...' : 'Assinar Documento' }}
    </button>
    
    <!-- Modal de seleção de certificado -->
    <modal v-if="showCertModal">
      <h3>Selecione seu certificado</h3>
      <ul>
        <li v-for="cert in certificates" :key="cert.thumbprint" @click="selectCert(cert)">
          {{ cert.subjectName }}
          <small>Válido até: {{ formatDate(cert.validityEnd) }}</small>
        </li>
      </ul>
    </modal>
  </div>
</template>

<script>
import LacunaWebPKI from 'web-pki';
import api from '@/services/api';

export default {
  props: ['documentId'],
  
  data() {
    return {
      pki: null,
      certificates: [],
      showCertModal: false,
      signing: false,
      signatureData: null,
    };
  },
  
  async mounted() {
    this.pki = new LacunaWebPKI();
    await this.initPKI();
  },
  
  methods: {
    async initPKI() {
      return new Promise((resolve, reject) => {
        this.pki.init({
          ready: resolve,
          notInstalled: () => {
            this.$toast.error('Por favor, instale a extensão Web PKI');
            window.open(this.pki.installUrl);
            reject();
          },
        });
      });
    },
    
    async startSignature() {
      try {
        this.signing = true;
        
        // 1. Solicitar assinatura ao backend
        const { data } = await api.post(`/documents/${this.documentId}/request-signature`);
        this.signatureData = data;
        
        // 2. Listar certificados
        await this.loadCertificates();
        this.showCertModal = true;
        
      } catch (error) {
        this.$toast.error(error.response?.data?.message || 'Erro ao iniciar assinatura');
        this.signing = false;
      }
    },
    
    async loadCertificates() {
      return new Promise((resolve, reject) => {
        this.pki.listCertificates({
          success: (certs) => {
            this.certificates = certs.filter(c => 
              c.pkiBrazil && new Date(c.validityEnd) > new Date()
            );
            resolve();
          },
          error: reject,
        });
      });
    },
    
    async selectCert(cert) {
      this.showCertModal = false;
      
      try {
        // 3. Assinar com o certificado selecionado
        const signedPdf = await this.signWithCert(cert);
        
        // 4. Enviar PDF assinado ao backend
        const { data } = await api.post(`/documents/${this.documentId}/signed`, {
          signedPdfBase64: signedPdf,
          originalPdfHash: this.signatureData.pdfHash,
          certificateInfo: {
            subjectName: cert.subjectName,
            pkiBrazil: cert.pkiBrazil,
            issuerName: cert.issuerName,
            serialNumber: cert.serialNumber,
            validityStart: cert.validityStart,
            validityEnd: cert.validityEnd,
            thumbprint: cert.thumbprint,
          },
        });
        
        this.$toast.success('Documento assinado com sucesso!');
        this.$emit('signed', data);
        
      } catch (error) {
        this.$toast.error(error.response?.data?.message || 'Erro ao assinar documento');
      } finally {
        this.signing = false;
      }
    },
    
    signWithCert(cert) {
      return new Promise((resolve, reject) => {
        this.pki.signData({
          thumbprint: cert.thumbprint,
          data: this.signatureData.pdfBase64,
          digestAlgorithm: 'SHA-256',
          success: (signedData) => resolve(signedData),
          error: (error) => reject(new Error(error)),
        });
      });
    },
    
    formatDate(date) {
      return new Date(date).toLocaleDateString('pt-BR');
    },
  },
};
</script>
```

---

## 7. Tratamento de Erros

### Códigos de Status

| Código | Descrição |
|--------|-----------|
| `200` | Sucesso |
| `201` | Criado com sucesso |
| `400` | Erro de validação ou requisição inválida |
| `403` | Operação não permitida (ex: editar documento assinado) |
| `404` | Documento não encontrado |
| `500` | Erro interno do servidor |

### Erros Comuns

| Mensagem | Causa | Solução |
|----------|-------|---------|
| `"Documento não pode ser editado"` | Status não é `draft` | Documento já foi enviado para assinatura ou assinado |
| `"Documento não pode ser assinado"` | Status é `signed` ou `cancelled` | Documento já foi assinado ou cancelado |
| `"Certificado expirado"` | Certificado fora da validade | Usar certificado válido |
| `"PDF não encontrado"` | PDF ainda não foi gerado | Chamar POST `/pdf` antes de baixar |
| `"Documento deve estar assinado"` | Tentar enviar sem assinatura | Assinar documento antes de enviar |

---

## Checklist de Implementação Frontend

- [ ] Instalar `web-pki` via npm
- [ ] Criar serviço de inicialização do Web PKI
- [ ] Criar modal de seleção de certificados
- [ ] Criar componente de assinatura digital
- [ ] Criar tela de listagem de documentos do paciente
- [ ] Criar tela de criação/edição de documento
- [ ] Criar visualizador de PDF
- [ ] Criar tela de histórico/auditoria
- [ ] Implementar download de documento assinado
- [ ] Implementar envio via email/WhatsApp
- [ ] Adicionar tratamento de erros do Web PKI
- [ ] Testar com certificado e-CPF real

---

## Contato

Em caso de dúvidas sobre a API, consultar o código fonte:
- Controller: `src/api/documents/documents.controller.js`
- Routes: `src/api/documents/documents.routes.js`
- Models: `src/api/documents/*.model.js`
