# CLAUDE.md — Talentus Dashboard

## Projeto
Dashboard RevOps para Talentus Digital (Mateus Cortez + CybNutri).
Integra dados de CRM (GHL), vendas e marketing em tempo real.
Foco: receita, vendas, performance comercial, marketing.

## Status
- **Fase atual:** v3.1 — Sync fix (marca via opp.contact.tags) + Meta Ads 2 contas
- **Deploy:** LIVE Railway — https://faithful-nature-production.up.railway.app
- **Portal TDI:** https://faithful-nature-production.up.railway.app/portal (Central de Acompanhamento)
- **Dominio customizado:** talentus.triadeflow.ai (CNAME pendente no Cloudflare)
- **Repo:** https://github.com/triadeflow-ia/talentus-dashboard
- **Railway Project:** https://railway.com/project/13bee088-681c-42f5-ae04-e9e1507fe453
- **GHL dados:** Base LIMPA — dados fake removidos, migracao Kommo PENDENTE
- **Sync status (2026-03-13):** Sync 35 RODANDO — 5,966 contatos OK, tag map 5,958, processando pipelines. Fix opp.contact.tags deployado.

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
- **Status sync (2026-03-13):** GHL 2,535 opps (313 Comercial + 2,222 Nutricao), 5,966 contatos, Meta Ads 0 daily (sync pendente)
- **Sync fix deployado:** opp.contact.tags como fonte primaria de marca (GHL API retorna contact.tags nas opps)
- **Marca preenchida:** 138 opps (sync anterior) + 100 opps sync 35 (todas com marca). Sync 35 ainda em andamento.
- **Meta Ads contas:** act_750590826052352 (Nutricao) + act_3335888230023865 (Infoprodutos) — filtradas no sync.js

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

## Migracao Kommo → GHL (PREPARADA — PENDENTE EXECUCAO)
- **6 planilhas Kommo:** kommo.xlsx a kommo6.xlsx
- **Total:** 8.568 leads (7.094 migraveis, 1.474 sem telefone/email)
- **Receita:** R$ 1.079.556 total (R$ 711.699 migravel)
- **Funis:** Mateus (5.489), CybNutri (852), SDR (113), Social IG (937), Mateus Novo (587), CybNutri Formacao (590)
- **Destino:** Pipeline Nutricao (entrada/reativacao) + Pipeline Comercial (etapas ativas + won)
- **23 tags** mapeadas, **4 custom fields**, **5 vendedores** com atribuicao preservada
- **Script:** `migrate-kommo.js` (dry-run validado, checkpoint/resume)
- **Relatorio:** `RELATORIO-MIGRACAO-KOMMO-GHL.md`
- **Comando:** `node migrate-kommo.js` (estimativa ~2.7h)
- **Dados fake GHL:** JA REMOVIDOS pelo cliente (2026-03-13)

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
6. [x] Migracao Kommo preparada — 6 planilhas analisadas, script pronto, relatorio gerado
7. [x] Supabase integrado — sync.js + filtro periodo em todos endpoints + Railway vars
8. [x] Portal TDI online — /portal corrigido (END, nao ENDI)
9. [x] Filtros Meta Ads funcionando — contas ordenadas por gasto, KPIs respondem a filtros
10. [x] Fix sync marca — opp.contact.tags como fonte primaria (deployado, sync 35 rodando)
11. [ ] **VERIFICAR sync 35 completou** — checar marca em TODOS pipelines + Meta Ads daily
12. [ ] **EXECUTAR migracao Kommo → GHL** (7.094 leads) ← PROXIMO
13. [ ] **Preservar datas Kommo** — script pos-migracao p/ atualizar created_at no Supabase com "Data Criada" original
14. [ ] Criar 13 workflows no GHL (W01-W13)
15. [ ] Integrar GURU checkout (webhook → dados de pagamento real)
16. [ ] Integrar Google Ads API (CPC, conversoes)
17. [ ] Metricas CAC, ROAS, ROI, LTV (requer dados de marketing + pagamentos)
18. [ ] Upload fotos dos vendedores

## Problemas Conhecidos (2026-03-13)
- **GHL rate limit 429:** Sync lento (~20-30min por run completo). Delay 2s + retry backoff.
- **Datas todas de hoje:** Leads no GHL criados hoje. Migracao Kommo trara datas historicas.
- **DNS talentus.triadeflow.ai:** CNAME nao configurado (token Cloudflare expirado)
- **175 opps Comercial sem marca:** Contatos sem tags marca_mateus/marca_cyb no GHL

## Decisao: Metricas CAC/ROAS/ROI/LTV
Essas metricas dependem de dados que AINDA NAO temos:
- **CAC** = Custo de Aquisicao = gasto marketing / clientes novos → precisa Meta Ads + Google Ads
- **ROAS** = Revenue / Ad Spend → precisa dados de custo de campanhas (Meta Ads JA conectado, ROAS parcial disponivel)
- **ROI** = (Receita - Custo) / Custo → precisa custos totais
- **LTV** = Lifetime Value → precisa historico de compras recorrentes (GURU/Hotmart)
Quando conectar plataforma de vendas, essas metricas serao calculadas automaticamente.
