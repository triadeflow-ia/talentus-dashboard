# CLAUDE.md — Talentus Dashboard

## Projeto
Dashboard RevOps para Talentus Digital (Mateus Cortez + CybNutri).
Integra dados de CRM (GHL), vendas e marketing em tempo real.
Foco: receita, vendas, performance comercial, marketing.

## Status
- **Fase atual:** v3.2 — Dados reais completos (Kommo migrado, datas historicas, marca 99.9%, Meta Ads 2 contas)
- **Deploy:** LIVE Railway — https://faithful-nature-production.up.railway.app
- **Portal TDI:** https://faithful-nature-production.up.railway.app/portal (Central de Acompanhamento)
- **Dominio customizado:** talentus.triadeflow.ai (CNAME pendente no Cloudflare)
- **Repo:** https://github.com/triadeflow-ia/talentus-dashboard
- **Railway Project:** https://railway.com/project/13bee088-681c-42f5-ae04-e9e1507fe453
- **GHL dados:** Base REAL — Kommo migrado (530 leads), datas historicas aplicadas, marca preenchida
- **Sync status (2026-03-13):** 2,535 opps (99.9% com marca), 5,966 contatos, 636 Meta Ads daily, R$409K receita

## Stack
- **Frontend:** React 19 + Vite 6 + Tailwind v4 + Recharts + React Query + Lucide React
- **Backend:** Express.js v3.0.0 + Supabase sync
- **Database:** Supabase PostgreSQL (5 tabelas: opportunities, contacts, meta_ads_daily, meta_ads_entities, sync_log)
- **Sync:** GHL cada 15min, Meta Ads cada 30min (sync.js)
- **Theme:** Dark HUD (Space Grotesk font, neon glows, scanline effects)
- **Deploy:** Railway (faithful-nature)

## Supabase Integration (v3.0)
- **Project ID:** lhjtqgyosjhbfzipbikq
- **URL:** https://lhjtqgyosjhbfzipbikq.supabase.co
- **Credenciais:** Em .env (SUPABASE_URL, SUPABASE_SERVICE_KEY)
- **Railway vars:** SUPABASE_URL + SUPABASE_SERVICE_KEY configuradas
- **Sync module:** `sync.js` — importado pelo server.js, roda no boot
- **Tabelas:**
  - `opportunities` — oportunidades GHL com marca, produto, vendedor, pipeline
  - `contacts` — contatos GHL
  - `meta_ads_daily` — insights diarios Meta Ads (campaign + account level)
  - `meta_ads_entities` — campanhas, adsets, ads (metadata)
  - `sync_log` — historico de sincronizacoes
- **Status sync (2026-03-13):** 2,535 opps (2,533 com marca = 99.9%), 5,966 contatos, 636 Meta Ads daily, 1,234 entities
- **Sync fix deployado:** opp.contact.tags como fonte primaria de marca (GHL API retorna contact.tags nas opps)
- **Marca preenchida:** 2,533/2,535 opps com marca (99.9%) — atualizado diretamente via Supabase (contact.tags → opp.marca)
- **Datas historicas:** Kommo "Data Criada" aplicada a 2,535 opps + 5,966 contatos (range: Dez 2024 → Mar 2026)
- **Meta Ads contas:** act_750590826052352 (Nutricao) + act_3335888230023865 (Infoprodutos) — 636 daily records, R$32,721 spend
- **Meta Ads entities:** 1,234 entidades (campanhas, adsets, ads) sincronizadas

## GHL Integration
- **Location:** mOJ0iKBfMFjFxWGdvyvA (Talentus Digital)
- **Token:** PIT token em .env (GHL_TOKEN)
- **Pipelines (6):** Comercial, Nutricao, Onboarding, Recuperacao, Sucesso, Suporte
- **Custom Fields usados:** Marca, Produto de Interesse, Vendedor Responsavel, Valor Fechado
- **Usuarios GHL (5):** Gilcilene Lima, Lucas Rodrigues, Karla Yonara, Mateus Cortez, Jessica Monteiro

## Funcionalidades (v3.0)
- **Filtros globais:** Marca (Mateus/CybNutri/Todas) + Vendedor + Periodo (7/15/30/60/90 dias)
- **Filtro Periodo:** Funciona em TODOS os endpoints CRM (overview, pipelines, sellers, products, distribution, timeline)
- **Dashboard:** 6 KPIs + Grafico de Linha (diario/acumulado) + Funil Piramide + 3 Donuts + Taxa Conversao + Tabela Pipeline
- **Pipelines:** 6 pipelines expandiveis com stages e contagem
- **Vendedores:** Gamificacao (podium, badges), ticket medio, ranking, tabela completa
- **Produtos:** Agrupados por marca, comparativo de receita
- **Trafego:** Meta Ads conectado — CPL, CTR, ROAS real, funil de conversao
- **Marketing:** Meta Ads LIVE (TrafegoPage + MarketingPage)
- **Supabase Sync:** Background sync GHL (15min) + Meta (30min)
- **Cache:** In-memory com TTL 5min e protecao thundering herd
- **staleTime:** React Query 5min em todos os hooks

## Endpoints API
```
GET /api/health                                — Status do servidor
GET /api/overview?brand=&seller=&days=         — KPIs agregados + funil + pipeline summary
GET /api/pipelines?brand=&seller=&days=        — Pipelines com stages e contagem
GET /api/sellers?brand=&seller=&days=          — Vendedores com gamificacao
GET /api/products?brand=&seller=&days=         — Produtos agrupados por marca
GET /api/sellers-list                          — Lista de vendedores (p/ dropdown)
GET /api/timeline?brand=&seller=&days=         — Serie temporal (opps/won/lost/revenue por dia)
GET /api/distribution?brand=&seller=&days=     — Distribuicao (status, produto, marca, vendedor)
POST /api/cache/clear                          — Limpar cache in-memory
GET /api/meta/status                           — Conexao Meta Ads
GET /api/meta/accounts                         — Lista contas de anuncio
GET /api/meta/insights?days=&account_id=       — KPIs conta Meta
GET /api/meta/campaigns?days=&account_id=      — Campanhas com insights
GET /api/meta/adsets?days=&account_id=&campaign_id= — Conjuntos com insights
GET /api/meta/ads?days=&account_id=&adset_id=  — Anuncios com insights
GET /api/meta/timeline?days=&account_id=       — Timeline diaria Meta
```

## Marcas e Produtos
- **Mateus Cortez** (slug: mateus, cor: #6366f1): Virada Digital, Escola de Negocios, Sala Secreta, Performance Day
- **CybNutri** (slug: cyb, cor: #10b981): Low Ticket CYB, Formacao Nutri Expert, Escola Nutri Expert, Profissional Mentory

## Equipe (Vendedores)
- Lucas Rodrigues, Gilcilene Lima, Karla Yonara (vendedores)
- Mateus Cortez (CEO), Jessica Monteiro, Davi (Sucesso do Cliente)

## Migracao Kommo → GHL (CONCLUIDA)
- **6 planilhas Kommo:** kommo.xlsx a kommo6.xlsx
- **Total:** 8.568 leads processados → 530 criados, 6.475 duplicados, 1.553 skipped, 10 erros
- **Receita total:** R$ 409.115 (138 won deals)
- **Script:** `migrate-kommo.js` (checkpoint completo)
- **Datas historicas:** `fix-kommo-dates.js` — 7.092/7.093 matched, 2.535 opps + 5.966 contatos atualizados
- **Marca:** Atualizada diretamente no Supabase via contact.tags (2.533/2.535 = 99.9%)
- **Meta Ads:** `run-meta-sync.js` — 636 daily records + 1.234 entities de 2 contas (90 dias)
- **Issue pendente:** CybNutri com apenas 52 opps (esperado ~1000+) — tags sobrescritas durante migracao sequencial

## Portal TDI — Status das Fases
| Fase | Status | % |
|------|--------|---|
| 1. Diagnostico | COMPLETA | 100% |
| 2. Blueprint | COMPLETA | 100% |
| 3. Implantacao | COMPLETA | 100% |
| 4. Automacao | EM ANDAMENTO | 50% |
| 5. Treinamento | EM ANDAMENTO | 50% |
| 6. Auditoria | AGUARDANDO | 0% |
| 7. Escala | EM ANDAMENTO | 30% |
- **Progresso geral:** 62%
- **Implementado:** 6 pipelines, 22 campos, 38 tags, 8 produtos, 5 ranges score, 2 calendarios
- **Pendente:** 13 workflows (todos planejados, nenhum criado ainda)

## Proximos Passos
1. [x] Deploy Railway — LIVE faithful-nature-production.up.railway.app
2. [x] Criar repo GitHub triadeflow-ia/talentus-dashboard
3. [ ] Configurar DNS Cloudflare — CNAME talentus → ruiw0bdj.up.railway.app (token CF expirado)
4. [x] Conectar Meta Ads API — LIVE, token configurado, TrafegoPage + MarketingPage funcionando
5. [x] Dados fake GHL removidos pelo cliente (2026-03-13)
6. [x] Migracao Kommo executada — 530 criados, 6.475 duplicados, checkpoint completo
7. [x] Supabase integrado — sync.js + filtro periodo em todos endpoints + Railway vars
8. [x] Portal TDI online — /portal corrigido (END, nao ENDI)
9. [x] Filtros Meta Ads funcionando — contas ordenadas por gasto, KPIs respondem a filtros
10. [x] Fix sync marca — 99.9% opps com marca (atualizado direto no Supabase)
11. [x] Datas historicas Kommo — fix-kommo-dates.js aplicou "Data Criada" em 2,535 opps + 5,966 contatos
12. [x] Meta Ads sincronizado — 636 daily records + 1,234 entities (90 dias, 2 contas, R$32K spend)
13. [x] Auditoria completa Kommo vs Supabase — AUDITORIA-KOMMO-SUPABASE.md
14. [x] **DECISAO MATEUS: Separar funis por marca** — Pipelines criados no GHL
15. [x] **Fix sync.js** — rate limit (15s backoff), nao sobrescrever created_at
16. [x] **Pipelines novos criados** — Comercial Mateus (`kR7dX3quCskPn8y1hUR5`) + Comercial CybNutri (`l0xKJIaG2JOWnpriXGlS`)
17. [x] **server.js + sync.js atualizados** — env vars PIPELINE_COMERCIAL_MATEUS + PIPELINE_COMERCIAL_CYB
18. [x] **Workflow "Won → Onboarding"** criado no GHL
19. [x] **Scripts de migracao v2** — exec-batch.js, JSONs por batch prontos
20. [ ] **REIMPORTACAO LIMPA** — GHL + Supabase zerados, rodar batches 1-5 ← PROXIMO
21. [ ] Aplicar datas historicas (fix-kommo-dates.js) apos migracao
22. [ ] Sync Supabase apos migracao
23. [ ] Atualizar env vars no Railway (PIPELINE_COMERCIAL_MATEUS, PIPELINE_COMERCIAL_CYB)
24. [ ] Criar 13 workflows no GHL (W01-W13)
25. [ ] Integrar GURU checkout (webhook → dados de pagamento real)
26. [ ] Integrar Google Ads API (CPC, conversoes)
27. [ ] Metricas CAC, ROAS, ROI, LTV (requer dados de marketing + pagamentos)
28. [ ] Upload fotos dos vendedores

## Auditoria Completa (2026-03-13)
- **Relatorio:** `AUDITORIA-KOMMO-SUPABASE.md` — cruzamento dos 6 xlsx Kommo vs Supabase
- **Matching:** 7.092/7.093 leads Kommo encontrados no Supabase (99.99%)
- **Datas historicas:** 2.435/2.535 opps (96%) com datas Kommo originais
- **Deduplicacao:** 6.475 duplicados tratados corretamente
- **Script auditoria:** `audit-kommo-vs-supabase.js` (reexecutavel)

## Problemas Conhecidos (2026-03-14)
- **[RESOLVIDO] CybNutri subcontagem:** Corrigido — routing por source (arquivo=marca)
- **[RESOLVIDO] Tags sobrescritas:** Reset total + reimportacao limpa em andamento
- **[RESOLVIDO] sync.js rate limit + created_at:** Fix aplicado (15s backoff, preserva created_at)
- **[PENDENTE] Reimportacao:** GHL zerado, 5 batches JSON prontos, rodar na proxima sessao
- **[PENDENTE] DNS talentus.triadeflow.ai:** CNAME nao configurado (token Cloudflare expirado)

## Migracao v2 — Estado (2026-03-14)
- **GHL:** ZERADO (0 contatos, 0 opps)
- **Supabase:** ZERADO (0 opportunities, 0 contacts)
- **Pipelines prontos:** Comercial Mateus + Comercial CybNutri + Nutricao (inalterado)
- **Workflow:** Won → Onboarding criado no GHL
- **Regra won:** TODA venda ganha → Comercial da marca / Negociacao / won (depois mover pra Onboarding Concluido)
- **Batches JSON prontos:**
  - batch1-won.json: 470 leads (R$1.079K)
  - batch2-comercial-mateus.json: 157 leads
  - batch3-comercial-cyb.json: 29 leads
  - batch4-nutricao-reativacao.json: 366 leads
  - batch5-nutricao-entrada.json: 6,072 leads
- **Script:** `node exec-batch.js <arquivo.json> [start] [max]`
- **IMPORTANTE:** Rodar foreground, NAO background (Node no Windows trava fetch em background)
- **IMPORTANTE:** Verificar `tasklist //FI "IMAGENAME eq node.exe"` antes de rodar pra garantir zero processos
- **Datas:** GHL API nao aceita dateAdded — aplicar depois via fix-kommo-dates.js no Supabase

## Decisao: Metricas CAC/ROAS/ROI/LTV
Essas metricas dependem de dados que AINDA NAO temos:
- **CAC** = Custo de Aquisicao = gasto marketing / clientes novos → precisa Meta Ads + Google Ads
- **ROAS** = Revenue / Ad Spend → precisa dados de custo de campanhas (Meta Ads JA conectado, ROAS parcial disponivel)
- **ROI** = (Receita - Custo) / Custo → precisa custos totais
- **LTV** = Lifetime Value → precisa historico de compras recorrentes (GURU/Hotmart)
Quando conectar plataforma de vendas, essas metricas serao calculadas automaticamente.
