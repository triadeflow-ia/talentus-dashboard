# Relatório Completo de Migração — Kommo CRM → GoHighLevel

**Data:** 13 de Março de 2026
**Cliente:** Talentus Digital (Mateus Cortez + CybNutri)
**Responsável técnico:** Alex Campos (Triadeflow)

---

## 1. VISÃO GERAL

### O que é esta migração?
Transferência de **toda a base de leads** do Kommo CRM para o GoHighLevel (GHL), incluindo contatos, oportunidades, tags, campos customizados e atribuições de vendedores.

### Números totais

| Métrica | Quantidade |
|---------|-----------|
| **Total de leads no Kommo** | **8.568** |
| **Leads migráveis** (com telefone ou email) | **7.094** (82,8%) |
| **Leads NÃO migráveis** (sem contato) | **1.474** (17,2%) |
| **Vendas registradas (Kommo)** | 507 leads — R$ 1.079.556 |
| **Vendas migráveis** | 470 leads — R$ 711.699 |
| **Tags Kommo distintas** | 27 |
| **Tags mapeadas para GHL** | 23 |
| **Campos customizados** | 4 (Marca, Produto de Interesse, Vendedor Responsável, Valor Fechado) |
| **Período dos dados** | Dez/2024 a Dez/2026 |

---

## 2. PLANILHAS IMPORTADAS (6 funis do Kommo)

### 2.1 Funil de Vendas Mateus (`kommo.xlsx`)

O funil principal e mais antigo. Contém a maioria dos leads do Mateus Cortez.

| Dado | Valor |
|------|-------|
| **Total de leads** | 5.489 |
| **Migráveis** | 4.981 (90,7%) |
| **Pulados** | 508 (9,3%) — sem telefone/email |
| **Vendas** | 146 leads — R$ 699.830 |
| **Vendas migráveis** | 135 leads — R$ 358.307 |
| **Período** | Dez/2024 — Dez/2026 |

**Etapas no Kommo → Destino no GHL:**

| Etapa Kommo | Qtd Total | Qtd Migrável | Destino GHL | Pipeline GHL | Status |
|-------------|-----------|-------------|-------------|-------------|--------|
| Etapa de leads de entrada | 4.914 | 4.452 | Entrada | Nutrição | open |
| BASE FRIA (sem venda) | ~358 | ~314 | Reativação Comercial | Nutrição | open |
| BASE FRIA (com venda) | ~142 | ~142 | Negociação | Comercial | won |
| Contato inicial | 26 | 26 | Atendimento Inicial | Comercial | open |
| Qualificação | 14 | 14 | Qualificação | Comercial | open |
| Diagnóstico | 9 | 8 | Call Diagnóstico | Comercial | open |
| Apresentação | 6 | 6 | Apresentação R2 | Comercial | open |
| Negociação | 20 | 19 | Negociação | Comercial | open/won |

**Responsáveis:**

| Usuário Kommo | Total | Migrável | Usuário GHL |
|---------------|-------|----------|-------------|
| (sem atribuição) | 4.913 | 4.451 | — (sem atribuição) |
| Gilcilene Lima | 291 | 249 | Gilcilene Lima |
| Lucas Rodrigues | 167 | 164 | Lucas Rodrigues |
| Mateus Cortez | 66 | 66 | Mateus Cortez |
| kyonaragomes@gmail.com | 52 | 51 | Karla Yonara |

**Tags encontradas:**

| Tag Kommo | Qtd | Mapeada para GHL |
|-----------|-----|------------------|
| VIRADA DIGITAL | 100 | produto_virada_digital |
| CONSULTOR: RODRIGUEZ | 58 | (atribuição → Lucas Rodrigues) |
| CONSULTORA: KARLA | 18 | (atribuição → Karla Yonara) |
| fb1170517264486252 | 22 | (descartada — ID interno Facebook) |
| fb28662768243308379 | 12 | (descartada — ID interno Facebook) |
| CONSULTORA: GILCILENE | 10 | (atribuição → Gilcilene Lima) |
| ESCOLA NE | 8 | produto_escola_negocios |
| ANUNCIO DE TRÁFEGO | 7 | trafego_pago |
| KARLA | 4 | (atribuição → Karla Yonara) |
| Virada Digital Ingresso Black | 3 | ingresso_black |
| FORMAÇÃO NE | 3 | produto_formacao_nutri |
| Social Selling | 3 | social_selling |
| MATEUS CORTEZ | 2 | marca_mateus |
| PARCELAMENTO | 2 | parcelamento |
| MENTORIA GPS | 2 | mentoria_gps |
| MENTORIA INDIVIDUAL | 2 | mentoria_individual |
| LAED QUENTE | 2 | score_quente |
| LEAD DO INSTA | 1 | organico |
| LINK DA BIO | 1 | organico |
| Virada Digital Ingresso Diamond | 1 | ingresso_diamond |
| PRODUTOS DE FRONT | 1 | produtos_front |
| renovação / RENOVAÇÃO | 2 | renovacao |
| GILCILENE | 1 | (atribuição → Gilcilene Lima) |

**Produtos Desejados:**

| Produto Kommo | Qtd | Campo GHL "Produto de Interesse" | Tag GHL |
|---------------|-----|----------------------------------|---------|
| Virada Digital | 79 | Virada Digital | produto_virada_digital |
| Escola Nutri Expert | 26 | Escola Nutri Expert | produto_escola_nutri |
| Mentoria Individual Mateus | 9 | Sala Secreta | mentoria_individual |
| Virada Digital Executivo | 6 | Virada Digital | produto_virada_digital |
| Cursos e Ebooks Nutrição | 4 | Escola Nutri Expert | produto_escola_nutri |
| Mentoria END | 2 | Sala Secreta | mentoria_individual |
| Formação Nutri Expert | 1 | Formacao Nutri Expert | produto_formacao_nutri |

**Origens:**

| Origem Kommo | Qtd | Tag GHL |
|-------------|-----|---------|
| Tráfego Pago Whatsapp | 161 | trafego_pago |
| Tráfego Pago | 115 | trafego_pago |
| Tráfego Pago Formulário | 53 | trafego_pago |
| Instagram Mateus | 31 | organico |
| Indicação | 14 | indicacao |
| Base de Clientes | 13 | — (sem tag) |
| Página de Captura (wordpress) | 13 | trafego_pago |
| Instagram Cybelle | 8 | organico |

---

### 2.2 Funil de Vendas CybNutri (`kommo2.xlsx`)

Funil exclusivo da marca CybNutri (Cybelle). Leads de nutricionistas.

| Dado | Valor |
|------|-------|
| **Total de leads** | 852 |
| **Migráveis** | 825 (96,8%) |
| **Pulados** | 27 (3,2%) |
| **Vendas** | 213 leads — R$ 254.593 |
| **Vendas migráveis** | 194 leads — R$ 231.238 |
| **Período** | Jan/2025 — Dez/2026 |

**Etapas no Kommo → Destino no GHL:**

| Etapa Kommo | Qtd Total | Qtd Migrável | Destino GHL | Pipeline GHL | Status |
|-------------|-----------|-------------|-------------|-------------|--------|
| Etapa de leads de entrada | 577 | 577 | Entrada | Nutrição | open |
| Primeiro Contato | 123 | 105 | Entrada | Nutrição | open |
| Recuperação/FollowUp | 61 | 55 | Reativação Comercial | Nutrição | open |
| Qualificação | 53 | 51 | Qualificação | Comercial | open |
| Negociação | 19 | 18 | Negociação | Comercial | open |
| Pagamento pendente/Agendado | 14 | 14 | Negociação | Comercial | open |
| Call de Diagnóstico | 5 | 5 | Call Diagnóstico | Comercial | open |

**Responsáveis:**

| Usuário Kommo | Total | Migrável | Usuário GHL |
|---------------|-------|----------|-------------|
| (sem atribuição) | 577 | 577 | — |
| Gilcilene Lima | 116 | 108 | Gilcilene Lima |
| kyonaragomes@gmail.com | 83 | 83 | Karla Yonara |
| Mateus Cortez | 59 | 47 | Mateus Cortez |
| Lucas Rodrigues | 17 | 10 | Lucas Rodrigues |

**Tags encontradas:**

| Tag Kommo | Qtd | Mapeada para GHL |
|-----------|-----|------------------|
| FORMAÇÃO NE | 80 | produto_formacao_nutri |
| CONSULTORA: GILCILENE | 110 | (atribuição → Gilcilene Lima) |
| CONSULTORA: KARLA | 83 | (atribuição → Karla Yonara) |
| ESCOLA NE | 54 | produto_escola_negocios |
| GILCILENE | 38 | (atribuição → Gilcilene Lima) |
| RENOVAÇÃO | 9 | renovacao |
| Social Selling | 5 | social_selling |
| FORTALEZA | 5 | (sem mapeamento — não criada) |
| SAO PAULO / SÃO PAULO | 3 | (sem mapeamento — não criada) |
| VIRADA DIGITAL | 2 | produto_virada_digital |
| PROFISSIONAL MENTORY | 2 | produto_profissional_mentory |
| 82 cardápios | 1 | produto_low_ticket_cyb |
| KARLA | 1 | (atribuição → Karla Yonara) |

**Produtos Desejados:**

| Produto Kommo | Qtd | Campo GHL | Tag GHL |
|---------------|-----|-----------|---------|
| Formação Nutri Expert | 131 | Formacao Nutri Expert | produto_formacao_nutri |
| Escola Nutri Expert | 85 | Escola Nutri Expert | produto_escola_nutri |
| Cursos e Ebooks Nutrição | 2 | Escola Nutri Expert | produto_escola_nutri |
| Profissionall Mentory | 2 | Profissional Mentory | produto_profissional_mentory |

---

### 2.3 SDR - Setor de Qualificação (`kommo3.xlsx`)

Funil de qualificação/pré-vendas. Leads trabalhados pelo Lucas Rodrigues.

| Dado | Valor |
|------|-------|
| **Total de leads** | 113 |
| **Migráveis** | 112 (99,1%) |
| **Pulados** | 1 |
| **Vendas** | 8 leads — R$ 66.446 |
| **Período** | Jan/2025 — Dez/2025 |

**Etapas no Kommo → Destino no GHL:**

| Etapa Kommo | Qtd | Destino GHL | Pipeline GHL |
|-------------|-----|-------------|-------------|
| Etapa de leads de entrada | 66 | Atendimento Inicial | Comercial |
| FollowUp - Recuperação | 44 | Atendimento Inicial | Comercial |
| Diagnóstico Agendado | 1 | Call Diagnóstico | Comercial |
| Apresentação Agendada | 1 | Apresentação R2 | Comercial |
| Apresentação Realizada | 1 | Negociação | Comercial |

**Responsáveis:**

| Usuário | Total | Usuário GHL |
|---------|-------|-------------|
| Lucas Rodrigues | 45 | Lucas Rodrigues |
| (sem atribuição) | 66 | — |
| Gilcilene Lima | 1 | Gilcilene Lima |
| kyonaragomes@gmail.com | 1 | Karla Yonara |

**Observação:** Nenhuma tag no Kommo. Todos recebem tag `kommo_sdr` no GHL para rastreabilidade.

---

### 2.4 Social Selling - IG Mateus (`kommo4.xlsx`)

Leads vindos de conversas no Instagram Direct do Mateus. **Quase totalmente NÃO migráveis** por falta de telefone/email.

| Dado | Valor |
|------|-------|
| **Total de leads** | 937 |
| **Migráveis** | **5** (0,5%) |
| **Pulados** | **932** (99,5%) |
| **Vendas** | 1 lead — R$ 197 |
| **Período** | Jan/2025 — Dez/2026 |

**Por que 932 foram pulados?**
São conversas de Instagram Direct — o Kommo registra apenas o nome/username do Instagram, sem telefone nem email. O GHL exige pelo menos um dos dois para criar um contato. Esses leads **não são perdidos** — eles ficam no Kommo como referência e podem ser migrados manualmente no futuro se os telefones forem coletados.

**Etapas no Kommo:**

| Etapa | Total | Migrável |
|-------|-------|----------|
| Conversas IG Direct | 929 | 2 |
| Lead Conectado | 5 | 2 |
| Primeiro contato | 2 | 1 |
| Reativação | 1 | 0 |

**Responsáveis:** 921 atribuídos a Karla Yonara (kyonaragomes@gmail.com), 13 a Lucas Rodrigues.

---

### 2.5 NOVO - Funil de Vendas Mateus (`kommo5.xlsx`)

Funil novo com leads recentes do Mateus. **100% migráveis** — todos têm telefone.

| Dado | Valor |
|------|-------|
| **Total de leads** | 587 |
| **Migráveis** | **587** (100%) |
| **Pulados** | 0 |
| **Vendas** | 0 |
| **Período** | Jan/2025 — Jul/2026 |

**Etapas:** Todos em "Etapa de leads de entrada" → GHL: Nutrição / Entrada.

**Responsáveis:** 586 sem atribuição, 1 Karla Yonara.

**Observação:** Leads frios sem tags, sem produto, sem origem. Entram como leads novos na nutrição.

---

### 2.6 NOVO - Funil de Vendas Formação (`kommo6.xlsx`)

Funil de Formação da CybNutri. Leads de nutricionistas interessados em formação profissional.

| Dado | Valor |
|------|-------|
| **Total de leads** | 590 |
| **Migráveis** | 584 (98,9%) |
| **Pulados** | 6 |
| **Vendas** | 139 leads — R$ 58.490 |
| **Vendas migráveis** | 133 leads — R$ 55.708 |
| **Período** | Jan/2025 — Dez/2026 |

**Etapas no Kommo → Destino no GHL:**

| Etapa Kommo | Qtd Total | Qtd Migrável | Destino GHL | Pipeline GHL |
|-------------|-----------|-------------|-------------|-------------|
| Etapa de leads de entrada | 432 | 432 | Entrada | Nutrição |
| Nutrição/Breakup | 44 | 43 | Reativação Comercial | Nutrição |
| Qualificação | 38 | 37 | Qualificação | Comercial |
| Contato inicial | 32 | 28 | Atendimento Inicial | Comercial |
| Proposta enviada | 19 | 19 | Negociação | Comercial |
| Recuperação/Followup | 19 | 19 | Reativação Comercial | Nutrição |
| Pagamento Pendente | 6 | 6 | Negociação | Comercial |

**Responsáveis:**

| Usuário | Total | Migrável | Usuário GHL |
|---------|-------|----------|-------------|
| (sem atribuição) | 432 | 432 | — |
| Mateus Cortez | 107 | 102 | Mateus Cortez |
| Gilcilene Lima | 31 | 31 | Gilcilene Lima |
| Lucas Rodrigues | 18 | 17 | Lucas Rodrigues |
| kyonaragomes@gmail.com | 2 | 2 | Karla Yonara |

**Tags:** GILCILENE (52), FORMAÇÃO NE (41), ESCOLA NE (11), RENOVAÇÃO (2), DIAGNÓSTICO (1)

**Produtos:** Formação Nutri Expert (15), Escola Nutri Expert (9), Cursos e Ebooks Nutrição (1), Virada Digital Executivo (1)

---

## 3. MAPEAMENTO DE DESTINO NO GHL

### 3.1 Pipelines e Etapas

Os 6 funis do Kommo são consolidados em **2 pipelines** no GHL:

```
KOMMO (6 funis)                    GHL (2 pipelines)
─────────────────                  ──────────────────
Mateus (5.489)  ──────────┐
CybNutri (852)  ──────────┤
SDR (113)       ──────────┤───►  COMERCIAL (leads qualificados/ativos)
Social IG (937) ──────────┤      - Atendimento Inicial
Mateus Novo (587)─────────┤      - Qualificação
CybNutri Formação (590)───┘      - Call Diagnóstico
                                  - Apresentação R2
                                  - Negociação

                           ───►  NUTRIÇÃO (leads frios/entrada/reativação)
                                  - Entrada
                                  - Reativação Comercial
```

**Lógica de roteamento:**
- Leads de **entrada fria** (sem atividade comercial) → **Nutrição / Entrada**
- Leads de **base fria sem venda** → **Nutrição / Reativação Comercial**
- Leads em **etapas ativas** (Contato, Qualificação, Diagnóstico, etc.) → **Comercial** (etapa correspondente)
- Leads com **venda registrada** → **Comercial / Negociação** com status `won`

### 3.2 Distribuição final no GHL

| Pipeline GHL | Etapa GHL | Qtd Leads | Status |
|-------------|-----------|-----------|--------|
| Nutrição | Entrada | 7.484 | open |
| Nutrição | Reativação Comercial | 737 | open (exceto won) |
| Comercial | Atendimento Inicial | ~120 | open |
| Comercial | Qualificação | ~102 | open |
| Comercial | Call Diagnóstico | ~14 | open |
| Comercial | Apresentação R2 | ~8 | open |
| Comercial | Negociação | ~103 | open/won |
| **TOTAL** | | **8.568** | |

### 3.3 Status das oportunidades

| Status | Qtd | Receita |
|--------|-----|---------|
| **open** | 8.061 | — |
| **won** | 507 | R$ 1.079.556 |

---

## 4. MAPEAMENTO DE USUÁRIOS (VENDEDORES)

| Usuário no Kommo | ID Email Kommo | Total Leads | Migrável | Usuário no GHL | ID GHL |
|-------------------|---------------|-------------|----------|----------------|--------|
| (sem atribuição) | — | 6.574 | 6.046 | — (fica sem dono) | — |
| Karla Yonara | kyonaragomes@gmail.com | 1.060 | 137 | Karla Yonara | CfeKqpQX6eWKCVVwyRsQ |
| Gilcilene Lima | GIlcilene Lima | 441 | 391 | Gilcilene Lima | 2Z0eH6IjgWDqUw5b4fqS |
| Lucas Rodrigues | Lucas Rodrigues | 260 | 239 | Lucas Rodrigues | 9AXuakmsPmncaaojIyGw |
| Mateus Cortez | Mateus Cortez | 233 | 215 | Mateus Cortez | 77uDX774vmKxyMxEhfCR |

**Nota:** Karla Yonara tinha 1.060 leads no Kommo mas 921 são do Social IG (sem telefone) — ficam apenas 137 migráveis.

**Regra aplicada:** Leads sem `Lead usuário responsável` no Kommo ficam **sem atribuição** no GHL. Tags como `GILCILENE`, `CONSULTORA: KARLA`, `CONSULTOR: RODRIGUEZ` também são usadas para atribuir quando o campo de responsável está vazio.

O vendedor é salvo em **dois lugares**: campo `assignedTo` (atribuição nativa GHL) + campo customizado `Vendedor Responsável` (para filtros no dashboard).

---

## 5. MAPEAMENTO DE TAGS

### 5.1 Tags que JÁ EXISTEM no GHL

| Tag GHL | ID | Qtd leads que receberão |
|---------|----|-----------------------|
| produto_virada_digital | dkd1aUHPDnaYs9lkRFOQ | ~102 |
| produto_escola_negocios | m14LeqRKjqjI0owONqIy | ~73 |
| produto_escola_nutri | MeYLrDQJUboxJBgZwng9 | ~120 |
| produto_formacao_nutri | 3HdfQfKFHSG8lqezJqcn | ~124 |
| produto_low_ticket_cyb | hk3cRZpKhrcDLw0fTwXV | ~1 |
| social_selling | MyEWx7Rn0OpOodDcWkFc | ~8 |
| trafego_pago | IBhdkpBDz8ekSDpbVo8d | ~497 |
| score_quente | qLnvelRoLLdHA5DnlwSS | ~2 |
| organico | s0wWtBsrxmXBkwRk7ND9 | ~150+ |
| indicacao | HVPSHoEdDJZixpsJxS70 | ~25 |
| marca_mateus | i7Hp8yqF8fODBkCduZNA | ~7.090 |
| marca_cyb | 0aJwjZpqmSvLBR8L11pq | ~1.478 |
| lead_novo | 8bGkBhahkfWPXrToQfpy | — |
| venda_ganha | pZFi44Z8WfWQWhgRKCSX | ~507 |

### 5.2 Tags que serão CRIADAS no GHL

| Tag GHL | Vem de qual tag Kommo | Qtd |
|---------|----------------------|-----|
| mentoria_gps | MENTORIA GPS | 2 |
| mentoria_individual | MENTORIA INDIVIDUAL | 2 |
| parcelamento | PARCELAMENTO | 2 |
| renovacao | renovação / RENOVAÇÃO | 13 |
| ingresso_black | Virada Digital Ingresso Black | 3 |
| ingresso_diamond | Virada Digital Ingresso Diamond | 1 |
| produtos_front | PRODUTOS DE FRONT | 1 |
| kommo_base_fria | (tag de rastreabilidade) | — |
| kommo_sdr | (tag de rastreabilidade) | 113 |
| kommo_social_selling | (tag de rastreabilidade) | 937 |
| kommo_cyb | (tag de rastreabilidade) | 852 |
| produto_profissional_mentory | PROFISSIONAL MENTORY | 2 |

### 5.3 Tags Kommo que NÃO viram tags (viram atribuição)

| Tag Kommo | Qtd | Ação no GHL |
|-----------|-----|-------------|
| CONSULTORA: KARLA | 103 | assignedTo → Karla Yonara |
| CONSULTORA: GILCILENE | 121 | assignedTo → Gilcilene Lima |
| CONSULTOR: RODRIGUEZ | 58 | assignedTo → Lucas Rodrigues |
| GILCILENE | 93 | assignedTo → Gilcilene Lima |
| KARLA | 5 | assignedTo → Karla Yonara |

### 5.4 Tags Kommo DESCARTADAS (não migradas)

| Tag Kommo | Qtd | Motivo |
|-----------|-----|--------|
| fb1170517264486252 | 22 | ID interno Facebook Ads — sem valor semântico |
| fb28662768243308379 | 12 | ID interno Facebook Ads — sem valor semântico |
| DIAGNÓSTICO | 1 | Redundante — já refletido na etapa do funil |
| FORTALEZA | 5 | Localização — não há campo equivalente no GHL |
| SAO PAULO / SÃO PAULO | 3 | Localização — não há campo equivalente no GHL |
| MATEUS CORTEZ | 2 | Redundante com tag `marca_mateus` |

### 5.5 Tags automáticas (sem equivalente no Kommo)

Todo lead recebe automaticamente:
- **`marca_mateus`** ou **`marca_cyb`** — baseado em detecção automática (produto, origem, tags)
- **`venda_ganha`** — se o lead tem valor de venda > 0
- **`organico`** — se veio do Instagram
- **`kommo_sdr`**, **`kommo_social_selling`**, **`kommo_cyb`** — tags de rastreabilidade por funil de origem

---

## 6. CAMPOS CUSTOMIZADOS

| Campo GHL | Tipo | ID | De onde vem o valor |
|-----------|------|----|---------------------|
| **Marca** | Dropdown | 2KaHcDNMZDwsozLFB1lL | Detecção automática: "Mateus Cortez" ou "CybNutri" |
| **Produto de Interesse** | Dropdown | qpiSM6URmXbv28u0aFUH | Campo "Produto Desejado" do Kommo (379 leads preenchidos) |
| **Vendedor Responsável** | Dropdown | BckPK8Tk8yZvGWeGIBIZ | Campo "Lead usuário responsável" do Kommo |
| **Valor Fechado** | Monetário | LOY9OJpiGa5WfIgQE02G | Campo "Venda" do Kommo |

### Detecção automática de marca CybNutri

Um lead é classificado como CybNutri se qualquer uma das condições for verdadeira:
- Veio do funil CybNutri ou CybNutri Formação (kommo2.xlsx ou kommo6.xlsx)
- "Produto Desejado" contém "nutri", "cyb", "cardápio"
- "Origem" contém "cybelle" ou "cyb"
- Tags contêm "ESCOLA NE" (sem "VIRADA")
- Tags contêm "82 card"

---

## 7. ORIGENS DE TRÁFEGO

| Origem no Kommo | Qtd | Tag GHL | % do total preenchido |
|-----------------|-----|---------|-----------------------|
| Tráfego Pago | 280 | trafego_pago | 38,7% |
| Tráfego Pago Whatsapp | 164 | trafego_pago | 22,7% |
| Instagram Cybelle | 92 | organico | 12,7% |
| Base de Clientes | 54 | — | 7,5% |
| Tráfego Pago Formulário | 53 | trafego_pago | 7,3% |
| Instagram Mateus | 36 | organico | 5,0% |
| Indicação | 25 | indicacao | 3,5% |
| Página de Captura | 13 | trafego_pago | 1,8% |
| Instagram Escola NE | 4 | organico | 0,6% |
| Eventos e MasterClass Cyb | 1 | — | 0,1% |

**Nota:** Apenas 722 de 8.568 leads (8,4%) têm origem preenchida no Kommo.

---

## 8. PRODUTOS

| Produto Kommo | Qtd | Marca | Campo GHL | Tag GHL |
|---------------|-----|-------|-----------|---------|
| Formação Nutri Expert | 147 | CybNutri | Formacao Nutri Expert | produto_formacao_nutri |
| Escola Nutri Expert | 120 | CybNutri | Escola Nutri Expert | produto_escola_nutri |
| Virada Digital | 81 | Mateus | Virada Digital | produto_virada_digital |
| Mentoria Individual Mateus | 9 | Mateus | Sala Secreta | mentoria_individual |
| Virada Digital Executivo | 9 | Mateus | Virada Digital | produto_virada_digital |
| Cursos e Ebooks Nutrição | 7 | CybNutri | Escola Nutri Expert | produto_escola_nutri |
| Mentoria END | 4 | Mateus | Sala Secreta | mentoria_individual |
| Profissionall Mentory | 2 | CybNutri | Profissional Mentory | produto_profissional_mentory |

**Nota:** Produto vai em DOIS lugares: campo customizado "Produto de Interesse" + tag de produto. Apenas 379 de 8.568 leads (4,4%) têm produto preenchido.

---

## 9. O QUE FICOU PARA TRÁS (NÃO MIGRADO)

### 9.1 Leads sem telefone e sem email — 1.474 leads (17,2%)

| Fonte | Qtd Pulados | % do Funil | Motivo |
|-------|------------|------------|--------|
| **Social IG Mateus** | **932** | 99,5% | Conversas Instagram Direct — só username |
| **Mateus** | **508** | 9,3% | Leads de entrada sem dados de contato |
| **CybNutri** | **27** | 3,2% | Leads sem telefone/email |
| **CybNutri Formação** | **6** | 1,0% | Leads sem telefone/email |
| **SDR** | **1** | 0,9% | 1 lead sem telefone/email |
| **Mateus Novo** | **0** | 0% | Todos têm telefone |

**Por que não migram?** O GoHighLevel exige pelo menos **telefone OU email** para criar um contato. Leads com apenas nome não são aceitos pela API.

**Esses leads são perdidos?** Não. Eles continuam no Kommo CRM como referência. Se no futuro os telefones forem coletados (ex: pedir via Instagram DM), podem ser migrados manualmente.

### 9.2 Vendas não migráveis — R$ 367.857

De R$ 1.079.556 em vendas registradas, R$ 711.699 (65,9%) serão migradas. Os R$ 367.857 restantes pertencem a leads sem telefone/email (principalmente BASE FRIA com vendas históricas que não têm mais dados de contato).

### 9.3 Tags não mapeadas

| Tag | Qtd | Motivo |
|-----|-----|--------|
| fb1170517264486252 | 22 | ID interno Facebook — sem valor |
| fb28662768243308379 | 12 | ID interno Facebook — sem valor |
| FORTALEZA | 5 | Localização geográfica — sem campo no GHL |
| SÃO PAULO / SAO PAULO | 3 | Localização geográfica — sem campo no GHL |
| DIAGNÓSTICO | 1 | Etapa do funil, não tag |

### 9.4 Campos do Kommo não migrados

| Campo Kommo | Preenchimento | Motivo |
|-------------|---------------|--------|
| Faturamento Mês | 0% | Nenhum dado |
| utm_source/medium/campaign/term/content | 0% | Nenhum dado |
| Método de Pagamento | 0% | Nenhum dado |
| CPF/CNPJ | 0% | Nenhum dado |
| Instagram (contato) | ~2% | Não prioritário |
| Tipo / Status | 0% | Campos vazios |
| Nome do Afiliado | 0% | Nenhum dado |
| Cod do Produto / Cod Venda / Cod da Oferta | 0% | Nenhum dado |
| Link Pagamento | 0% | Nenhum dado |

Esses campos estavam **100% vazios** no Kommo, então não há perda de dados.

---

## 10. RESUMO TÉCNICO DA MIGRAÇÃO

### Como funciona

1. **Carregamento:** 6 planilhas XLSX são lidas e combinadas (8.568 leads)
2. **Roteamento:** Cada lead é classificado por fonte, etapa, venda e marca → pipeline + stage + status + tags + campos
3. **Dedup:** Antes de criar um contato, busca por telefone e email no GHL para evitar duplicatas
4. **Criação:** Contato criado → Oportunidade criada na pipeline/etapa correta → Tags adicionadas ao contato
5. **Rate limiting:** 700ms entre cada chamada à API (evita bloqueio)
6. **Checkpoint:** A cada 100 leads processados, salva progresso em `migration-checkpoint.json`
7. **Resume:** Se interromper, rode `node migrate-kommo.js --resume` para continuar de onde parou

### Comandos

```bash
# Ver plano sem executar
node migrate-kommo.js --dry-run

# Executar migração
node migrate-kommo.js

# Retomar migração interrompida
node migrate-kommo.js --resume
```

### Tempo estimado

~14.000 chamadas API × 700ms = ~2,7 horas

### Arquivos do projeto

| Arquivo | Descrição |
|---------|-----------|
| migrate-kommo.js | Script principal de migração |
| kommo.xlsx | Funil Mateus (5.489 leads) |
| kommo2.xlsx | Funil CybNutri (852 leads) |
| kommo3.xlsx | SDR Qualificação (113 leads) |
| kommo4.xlsx | Social Selling IG (937 leads) |
| kommo5.xlsx | Funil Novo Mateus (587 leads) |
| kommo6.xlsx | Funil Formação CybNutri (590 leads) |
| migration-checkpoint.json | Checkpoint de progresso (criado durante migração) |
| analyze-kommo*.js | Scripts de análise por planilha |

---

## 11. ESTRUTURA NO GHL APÓS MIGRAÇÃO

```
GoHighLevel — Talentus Digital
│
├── Pipeline: NUTRIÇÃO
│   ├── Entrada ────────── ~7.484 leads (frios, entrada, IG, novos)
│   └── Reativação ─────── ~737 leads (base fria, followup, breakup)
│
├── Pipeline: COMERCIAL
│   ├── Atendimento Inicial ── ~120 leads
│   ├── Qualificação ────────── ~102 leads
│   ├── Call Diagnóstico ────── ~14 leads
│   ├── Apresentação R2 ─────── ~8 leads
│   └── Negociação ─────────── ~103 leads (incluindo 507 won)
│
├── Tags: 23 tags (14 existentes + 9 criadas)
│
├── Custom Fields:
│   ├── Marca: Mateus Cortez / CybNutri
│   ├── Produto de Interesse: 8 opções
│   ├── Vendedor Responsável: 5 opções
│   └── Valor Fechado: R$
│
└── Usuários: 5 vendedores mapeados
    ├── Gilcilene Lima
    ├── Lucas Rodrigues
    ├── Karla Yonara
    ├── Mateus Cortez
    └── Jessica Monteiro
```

---

*Relatório gerado automaticamente em 13/03/2026 — Triadeflow*
