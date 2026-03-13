# CLAUDE.md — Talentus Dashboard

## Projeto
Dashboard RevOps para Talentus Digital (Mateus Cortez + CybNutri).
Integra dados de CRM (GHL), vendas e marketing em tempo real.
Foco: receita, vendas, performance comercial, marketing.

## Status
- **Fase atual:** v2.0 — Graficos de linha, funil piramide, donuts, filtro vendedor/periodo
- **Deploy:** LIVE Railway — https://faithful-nature-production.up.railway.app
- **Dominio customizado:** talentus.triadeflow.ai (CNAME pendente no Cloudflare)
- **Repo:** https://github.com/triadeflow-ia/talentus-dashboard
- **Railway Project:** https://railway.com/project/13bee088-681c-42f5-ae04-e9e1507fe453

## Stack
- **Frontend:** React 19 + Vite 6 + Tailwind v4 + Recharts + React Query + Lucide React
- **Backend:** Express.js (API proxy para GHL)
- **Theme:** Dark HUD (Space Grotesk font, neon glows, scanline effects)
- **Deploy:** Railway (faithful-nature)

## GHL Integration
- **Location:** mOJ0iKBfMFjFxWGdvyvA (Talentus Digital)
- **Token:** PIT token em .env (GHL_TOKEN)
- **Pipelines (6):** Comercial, Nutricao, Onboarding, Recuperacao, Sucesso, Suporte
- **Custom Fields usados:** Marca, Produto de Interesse, Vendedor Responsavel

## Funcionalidades (v2.0)
- **Filtros globais:** Marca (Mateus/CybNutri/Todas) + Vendedor + Periodo (7/15/30/60/90 dias)
- **Dashboard:** 6 KPIs + Grafico de Linha (diario/acumulado) + Funil Piramide + 3 Donuts + Taxa Conversao + Tabela Pipeline
- **Pipelines:** 6 pipelines expandiveis com stages e contagem
- **Vendedores:** Gamificacao (podium, badges), ticket medio, ranking, tabela completa
- **Produtos:** Agrupados por marca, comparativo de receita
- **Marketing:** Placeholder (Meta Ads, Google Ads — integracao futura)

## Novos Componentes (v2.0)
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
```

## Marcas e Produtos
- **Mateus Cortez** (slug: mateus, cor: #6366f1): Virada Digital, Escola de Negocios, Sala Secreta, Performance Day
- **CybNutri** (slug: cyb, cor: #10b981): Low Ticket CYB, Formacao Nutri Expert, Escola Nutri Expert, Profissional Mentory

## Equipe (Vendedores)
- Lucas Rodrigues, Gilcilene Lima, Karla Yonara (vendedores)
- Mateus Cortez (CEO), Davi (Sucesso do Cliente)

## Proximos Passos
1. [x] Deploy Railway — LIVE faithful-nature-production.up.railway.app
2. [x] Criar repo GitHub triadeflow-ia/talentus-dashboard
3. [ ] Configurar DNS Cloudflare — CNAME talentus → ruiw0bdj.up.railway.app (token CF expirado)
4. [x] Conectar Meta Ads API — LIVE, token configurado, TrafegoPage + MarketingPage funcionando
5. [ ] Integrar GURU checkout (webhook → dados de pagamento real)
6. [ ] Integrar Google Ads API (CPC, conversoes)
7. [ ] Metricas CAC, ROAS, ROI, LTV (requer dados de marketing + pagamentos)
8. [ ] Supabase para historico + futuro IA
9. [ ] Upload fotos dos vendedores
10. [ ] Migrar leads Kommo → GHL (MigraFlow pronto, falta exportar CSV do Kommo)

## Decisao: Metricas CAC/ROAS/ROI/LTV
Essas metricas dependem de dados que AINDA NAO temos:
- **CAC** = Custo de Aquisicao = gasto marketing / clientes novos → precisa Meta Ads + Google Ads
- **ROAS** = Revenue / Ad Spend → precisa dados de custo de campanhas
- **ROI** = (Receita - Custo) / Custo → precisa custos totais
- **LTV** = Lifetime Value → precisa historico de compras recorrentes (GURU/Hotmart)
Quando conectar Meta Ads e plataforma de vendas, essas metricas serao calculadas automaticamente.
