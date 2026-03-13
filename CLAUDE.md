# CLAUDE.md — Talentus Dashboard

## Projeto
Dashboard RevOps para Talentus Digital (Mateus Cortez + CybNutri).
Integra dados de CRM (GHL), vendas e marketing em tempo real.
Foco: receita, vendas, performance comercial, marketing.

## Status
- **Fase atual:** v2.1 — Cache in-memory, ROAS real (Meta Ads action_values), migracao Kommo preparada
- **Deploy:** LIVE Railway — https://faithful-nature-production.up.railway.app
- **Portal TDI:** https://talentusdigital.triadeflow.ai (Central de Acompanhamento do Projeto)
- **Dominio customizado:** talentus.triadeflow.ai (CNAME pendente no Cloudflare)
- **Repo:** https://github.com/triadeflow-ia/talentus-dashboard
- **Railway Project:** https://railway.com/project/13bee088-681c-42f5-ae04-e9e1507fe453
- **GHL dados:** Dados fake REMOVIDOS pelo cliente. Base limpa pronta para migracao real.

## Stack
- **Frontend:** React 19 + Vite 6 + Tailwind v4 + Recharts + React Query + Lucide React
- **Backend:** Express.js (API proxy para GHL) v2.1.0
- **Theme:** Dark HUD (Space Grotesk font, neon glows, scanline effects)
- **Deploy:** Railway (faithful-nature)

## GHL Integration
- **Location:** mOJ0iKBfMFjFxWGdvyvA (Talentus Digital)
- **Token:** PIT token em .env (GHL_TOKEN)
- **Pipelines (6):** Comercial, Nutricao, Onboarding, Recuperacao, Sucesso, Suporte
- **Custom Fields usados:** Marca, Produto de Interesse, Vendedor Responsavel, Valor Fechado
- **Usuarios GHL (5):** Gilcilene Lima, Lucas Rodrigues, Karla Yonara, Mateus Cortez, Jessica Monteiro

## Funcionalidades (v2.1)
- **Filtros globais:** Marca (Mateus/CybNutri/Todas) + Vendedor + Periodo (7/15/30/60/90 dias)
- **Dashboard:** 6 KPIs + Grafico de Linha (diario/acumulado) + Funil Piramide + 3 Donuts + Taxa Conversao + Tabela Pipeline
- **Pipelines:** 6 pipelines expandiveis com stages e contagem
- **Vendedores:** Gamificacao (podium, badges), ticket medio, ranking, tabela completa
- **Produtos:** Agrupados por marca, comparativo de receita
- **Trafego:** Meta Ads conectado — CPL, CTR, ROAS real, funil de conversao
- **Marketing:** Meta Ads LIVE (TrafegoPage + MarketingPage)
- **Cache:** In-memory com TTL 5min e protecao thundering herd
- **staleTime:** React Query 5min em todos os hooks

## Novos Componentes (v2.0+)
- `TimelineChart.jsx` — Grafico de area/linha com Recharts (diario + acumulado)
- `DonutChart.jsx` — Grafico de rosca com Recharts (status, produto, vendedor)
- `FunnelChart.jsx` — Refatorado: variante "pyramid" (topo/meio/fim) + variante "bars"
- `FilterContext.jsx` — Context global para filtro vendedor + periodo
- Layout com header duplo (info + filtros)

## Endpoints API
```
GET /api/health                        — Status do servidor
GET /api/overview?brand=&seller=       — KPIs agregados + funil + pipeline summary
GET /api/pipelines?brand=&seller=      — Pipelines com stages e contagem
GET /api/sellers?brand=&seller=        — Vendedores com gamificacao
GET /api/products?brand=&seller=       — Produtos agrupados por marca
GET /api/sellers-list                  — Lista de vendedores (p/ dropdown)
GET /api/timeline?brand=&seller=&days= — Serie temporal (opps/won/lost/revenue por dia)
GET /api/distribution?brand=&seller=   — Distribuicao (status, produto, marca, vendedor)
POST /api/cache/clear                  — Limpar cache in-memory
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

## Portal TDI — Status das Fases (talentusdigital.triadeflow.ai)
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
7. [ ] **EXECUTAR migracao Kommo → GHL** (7.094 leads) ← PROXIMO
8. [ ] Criar 13 workflows no GHL (W01-W13)
9. [ ] Integrar GURU checkout (webhook → dados de pagamento real)
10. [ ] Integrar Google Ads API (CPC, conversoes)
11. [ ] Metricas CAC, ROAS, ROI, LTV (requer dados de marketing + pagamentos)
12. [ ] Supabase para historico + futuro IA
13. [ ] Upload fotos dos vendedores

## Decisao: Metricas CAC/ROAS/ROI/LTV
Essas metricas dependem de dados que AINDA NAO temos:
- **CAC** = Custo de Aquisicao = gasto marketing / clientes novos → precisa Meta Ads + Google Ads
- **ROAS** = Revenue / Ad Spend → precisa dados de custo de campanhas (Meta Ads JA conectado, ROAS parcial disponivel)
- **ROI** = (Receita - Custo) / Custo → precisa custos totais
- **LTV** = Lifetime Value → precisa historico de compras recorrentes (GURU/Hotmart)
Quando conectar plataforma de vendas, essas metricas serao calculadas automaticamente.
