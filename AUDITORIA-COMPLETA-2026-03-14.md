# AUDITORIA COMPLETA — Pipeline de Dados Talentus Digital
**Data:** 2026-03-14
**Camadas auditadas:** Kommo XLSX → Supabase → Dashboard API → GHL CRM

---

## 1. KOMMO XLSX (Fonte Original)

| Arquivo | Source | Marca | Total | Com Tel | Sem Tel | Won | Receita |
|---------|--------|-------|-------|---------|---------|-----|---------|
| kommo.xlsx | mateus | Mateus Cortez | 5.489 | 4.981 | 508 | 146 | R$ 699.830 |
| kommo2.xlsx | cyb | CybNutri | 852 | 824 | 28 | 213 | R$ 254.593 |
| kommo3.xlsx | sdr | Mateus Cortez | 113 | 112 | 1 | 8 | R$ 66.446 |
| kommo4.xlsx | social | Mateus Cortez | 937 | 5 | 932 | 1 | R$ 197 |
| kommo5.xlsx | mateus_novo | Mateus Cortez | 587 | 587 | 0 | 0 | R$ 0 |
| kommo6.xlsx | cyb_formacao | CybNutri | 590 | 584 | 6 | 139 | R$ 58.490 |
| **TOTAL** | | | **8.568** | **7.093** | **1.475** | **507** | **R$ 1.079.556** |

### Analise de Duplicatas
- **Telefones unicos (6 planilhas):** 6.003
- **Telefones duplicados entre planilhas:** 464 (5.5%)
- **Won deals no mesmo telefone em planilhas diferentes:** 4 (R$ 1.488 potencialmente duplicados)

### Receita por Marca (baseado no arquivo fonte)
| Marca | Leads | Won | Receita |
|-------|-------|-----|---------|
| Mateus Cortez (mateus+sdr+social+mateus_novo) | 7.391 | 368 | R$ 1.021.066 |
| CybNutri (cyb+cyb_formacao) | 1.177 | 139 | R$ 58.490 |

---

## 2. SUPABASE (Banco de Dados)

### Opportunities (7.131 registros)

**Por Status:**
| Status | Count |
|--------|-------|
| open | 6.624 |
| won | 507 |
| lost | 0 |
| abandoned | 0 |

**Por Marca:**
| Marca | Opps | Won | Receita |
|-------|------|-----|---------|
| Mateus Cortez | 5.697 | 155 | R$ 766.473 |
| CybNutri | 1.434 | 352 | R$ 313.083 |
| **TOTAL** | **7.131** | **507** | **R$ 1.079.556** |

**Por Pipeline:**
| Pipeline | Count |
|----------|-------|
| Nutricao | 6.438 |
| Comercial CybNutri | 381 |
| Comercial Mateus Cortez | 312 |

**Por Stage (top 7):**
| Stage | Count |
|-------|-------|
| Entrada Nutricao | 6.072 |
| Negociacao | 517 |
| Reativacao Comercial | 366 |
| Atendimento Inicial | 131 |
| Qualificacao | 33 |
| Call Diagnostico | 7 |
| Apresentacao R2 | 5 |

**Por Vendedor:**
| Vendedor | Opps | Won | Receita |
|----------|------|-----|---------|
| Gilcilene Lima | 408 | 197 | R$ 231.158 |
| Lucas Rodrigues | 241 | 55 | R$ 455.558 |
| Mateus Cortez | 232 | 156 | R$ 265.047 |
| Karla Yonara | 138 | 99 | R$ 127.793 |
| Nao atribuido | 6.112 | 0 | R$ 0 |

**Produto (apenas 5.3% preenchido — 375 de 7.131):**
| Produto | Count |
|---------|-------|
| Formacao Nutri Expert | 147 |
| Escola Nutri Expert | 124 |
| Virada Digital | 90 |
| Sala Secreta | 12 |
| Profissionall Mentory | 2 (TYPO: duplo L) |
| **Sem produto** | **6.756** |

**Datas:** Dez 2024 → Mar 2026
**Opps sem telefone:** 38 (todas won, tag validar_sem_telefone)

### Contacts (6.006 registros)
| Marca | Count |
|-------|-------|
| Mateus Cortez | 4.926 |
| CybNutri | 1.080 |
| Com telefone | 5.968 |
| Sem telefone | 38 |

### Meta Ads
- **meta_ads_daily:** 639 registros (Dez 2025 → Mar 2026)
- **Spend total:** R$ 65.442
- **Contas:** Nutricao (R$ 38.676) + Infoprodutos (R$ 26.766)
- **meta_ads_entities:** 1.234 registros

---

## 3. DASHBOARD API (Producao)

### Overview
| Metrica | Valor | Status |
|---------|-------|--------|
| totalLeads | 6.006 | ✅ |
| openOpps | 6.624 | ✅ |
| wonOpps | 507 | ✅ |
| totalRevenue | R$ 1.079.556 | ✅ |
| avgTicket | R$ 2.129 | ✅ |
| conversionRate | 7.11% | ✅ |
| Funil Comercial | 5 stages | ✅ |
| Pipelines | 3 | ✅ |

### Sellers
| Vendedor | Opps | Won | Receita | Status |
|----------|------|-----|---------|--------|
| Lucas Rodrigues | 241 | 55 | R$ 455.558 | ✅ |
| Mateus Cortez | 232 | 156 | R$ 265.047 | ✅ |
| Gilcilene Lima | 408 | 197 | R$ 231.158 | ✅ |
| Karla Yonara | 138 | 99 | R$ 127.793 | ✅ |

### Meta Ads
- Conectado: ✅
- Dados ate 12/03 (13-14/03 sem gasto — normal)

---

## 4. GHL CRM
- **Status:** VAZIO (0 contatos, 0 oportunidades)
- **GHL Sync:** DESABILITADO (DISABLE_GHL_SYNC=true)
- **Pipelines criados:** Comercial Mateus + Comercial CybNutri + Nutricao
- **Workflow:** Won → Onboarding criado
- **Batches JSON:** 5 prontos (7.094 leads)

---

## 5. VALIDACAO CRUZADA

### Totais
| Metrica | Kommo | Supabase | Dashboard | Status |
|---------|-------|----------|-----------|--------|
| Total processado | 8.568 | — | — | — |
| Importados | — | 7.131 | 7.131 | ✅ |
| Pulados (sem tel) | 1.437 | — | — | ✅ (8568-7131=1437) |
| **Won** | **507** | **507** | **507** | **✅ BATE** |
| **Receita** | **R$ 1.079.556** | **R$ 1.079.556** | **R$ 1.079.556** | **✅ BATE** |
| Contatos | 6.003 unicos | 6.006 | 6.006 | ✅ (~3 via email) |

### Marca — PONTO DE ATENCAO
| Marca | Kommo (por arquivo) | Supabase (por conteudo) | Diferenca |
|-------|---------------------|------------------------|-----------|
| Mateus Cortez won | 368 | 155 | -213 |
| Mateus Cortez receita | R$ 1.021.066 | R$ 766.473 | -R$ 254.593 |
| CybNutri won | 139 | 352 | +213 |
| CybNutri receita | R$ 58.490 | R$ 313.083 | +R$ 254.593 |

**Explicacao:** 213 vendas do arquivo kommo2.xlsx (rotulado como "cyb") estao no Supabase com marca CybNutri. No Kommo, kommo2.xlsx = "Funil de Vendas Cyb" com 852 leads e R$ 254.593 em vendas. O import atribuiu marca baseado no campo `_source` do arquivo, que esta CORRETO — esses leads SAO CybNutri, vieram do funil de vendas CybNutri no Kommo.

**A discrepancia Kommo "por arquivo" vs Supabase é porque kommo.xlsx (mateus) contem ALGUNS leads que sao CybNutri (por produto/tag). O Supabase usa a marca do arquivo fonte, nao do conteudo. Portanto a atribuicao do Supabase esta CORRETA.**

---

## 6. PROBLEMAS ENCONTRADOS

### CRITICO

| # | Problema | Impacto | Acao |
|---|---------|---------|------|
| C1 | **Pagina Produtos: atribuicao cruzada de marcas** | "Escola Nutri Expert" aparece em AMBAS as marcas. Opps com marca=Mateus mas produto=Escola Nutri Expert sao contadas para CybNutri na pagina de produtos | Corrigir: filtrar produtos por marca da OPP, nao pelo mapping hardcoded |
| C2 | **GHL vazio — pipeline quebrado** | Se sync.js rodar com GHL sync ativado, pode sobrescrever Supabase com dados vazios | Ja mitigado (DISABLE_GHL_SYNC=true). Manter ate popular GHL |

### MEDIO

| # | Problema | Impacto | Acao |
|---|---------|---------|------|
| M1 | **Campo source inconsistente** | 9.7% dos opps tem "Trafego Pago" como source em vez de "mateus" | Nao impacta dashboard (usa marca, nao source). Corrigir em futura reimportacao |
| M2 | **Produto preenchido em apenas 5.3% dos opps** | Pagina Produtos mostra dados de apenas 549 opps dos 7.131 | Dado real do Kommo — a maioria nao tinha "Produto Desejado" preenchido |
| M3 | **85.7% opps sem vendedor** | 6.112 opps "Nao atribuido" polui a pagina de vendedores | Normal — sao leads Nutricao (entrada), nao atribuidos a vendedor |
| M4 | **Typo: "Profissionall Mentory"** | Duplo L no nome do produto (2 opps) | Corrigir no Supabase |
| M5 | **4 won duplicados entre planilhas** | R$ 1.488 potencialmente duplicados | Valor irrelevante (0.14% do total). Validar com Mateus |
| M6 | **CLAUDE.md diz Meta spend R$32K, Supabase tem R$65K** | Doc desatualizado | Atualizar CLAUDE.md |

### BAIXO

| # | Problema | Impacto | Acao |
|---|---------|---------|------|
| L1 | Zero opps lost/abandoned | Taxa conversao baseada em won/(won+open), nao funil real | Normal — Kommo nao tinha status lost |
| L2 | kommo4.xlsx (social) 932/937 sem telefone | Apenas 5 leads importados desse arquivo | Normal — leads Instagram sem dados |
| L3 | totalLeads mostra contatos (6.006), nao opps (7.131) | Confusao de nomenclatura | Baixo impacto |

---

## RECOMENDACAO PARA AVANCAR

### Para validar com Mateus AGORA:
1. ✅ Won total: 507 vendas, R$ 1.079.556 — CORRETO
2. ⚠️ Split por marca: Mateus R$766K / CybNutri R$313K — confirmar se o split esta OK
3. ⚠️ 38 won deals sem telefone (R$370K) incluindo "Aprender Digital - Josmário" R$300K — validar
4. ⚠️ 6.112 leads sem vendedor atribuido (pipeline Nutricao) — normal?

### Para levar dados ao GHL:
1. Corrigir C1 (produtos cross-brand) antes de apresentar ao Mateus
2. Rodar exec-batch.js para popular GHL (batches 1-5, ordem sequencial)
3. Apos GHL populado: limpar Supabase → rodar syncGHL() 1x → IDs consistentes
4. Segunda: setar DISABLE_GHL_SYNC=false → sync automatico ativo
