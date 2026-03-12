# CLAUDE.md — Talentus Dashboard

## Projeto
Dashboard RevOps para Talentus Digital (Mateus Cortez + CybNutri).
Integra dados do GHL CRM em tempo real com visao por marca, vendedor e produto.

## Status
- **Fase atual:** v1.1 — Build OK, API endpoints funcionando com dados reais GHL
- **Deploy:** Pendente Render + Cloudflare DNS (talentusdigital.triadeflow.ai)
- **Repo:** pendente criar triadeflow-ia/talentus-dashboard

## Stack
- **Frontend:** React 19 + Vite 6 + Tailwind v4 + Recharts + React Query + Lucide React
- **Backend:** Express.js (API proxy para GHL)
- **Theme:** Dark HUD (Space Grotesk font, neon glows, scanline effects)
- **Deploy:** Render (render.yaml)

## GHL Integration
- **Location:** mOJ0iKBfMFjFxWGdvyvA (Talentus Digital)
- **Token:** PIT token em .env (GHL_TOKEN)
- **Pipelines (6):** Comercial, Nutricao, Onboarding, Recuperacao, Sucesso, Suporte
- **Custom Fields usados:** Marca, Produto de Interesse, Vendedor Responsavel

## Funcionalidades
- **Filtro por Marca:** Mateus Cortez / CybNutri / Todas (global no topbar)
- **Overview:** 6 KPIs + Funil Comercial + TDI Progress + CRM Structure
- **Pipelines:** 6 pipelines expandiveis com stages e contagem
- **Vendedores:** Gamificacao (podium, badges gold/silver/bronze), ticket medio, ranking
- **Produtos:** Agrupados por marca, comparativo de receita
- **Projeto TDI:** 7 fases com checklist detalhado
- **Marketing:** Placeholder (Meta Ads, Google Ads — integracao futura)

## Endpoints API
```
GET /api/health           — Status do servidor
GET /api/overview?brand=  — KPIs agregados (totalLeads, wonOpps, revenue, funil, etc)
GET /api/pipelines?brand= — Pipelines com stages e contagem de opps
GET /api/sellers?brand=   — Vendedores com gamificacao (rank, badge, avgTicket)
GET /api/products?brand=  — Produtos agrupados por marca
GET /api/project-status   — Progresso TDI (7 fases)
GET /api/crm-structure    — Resumo da estrutura GHL (fields, pipelines, tags, users)
```

## Marcas e Produtos
- **Mateus Cortez** (slug: mateus, cor: #6366f1): Virada Digital, Escola de Negocios, Sala Secreta, Performance Day
- **CybNutri** (slug: cyb, cor: #10b981): Low Ticket CYB, Formacao Nutri Expert, Escola Nutri Expert, Profissional Mentory

## Equipe (Vendedores)
- Lucas Rodrigues, Gilcilene Lima, Kyonara Gomes (vendedores)
- Mateus Cortez (CEO), Davi (Sucesso do Cliente)

## Proximos Passos
1. [ ] Deploy Render + Cloudflare DNS
2. [ ] Criar repo GitHub triadeflow-ia/talentus-dashboard
3. [ ] Integrar GURU checkout (webhook → dados de pagamento)
4. [ ] Integrar Meta Ads API (campanhas, ROAS)
5. [ ] Integrar Google Ads API (CPC, conversoes)
6. [ ] Supabase para historico + futuro IA
7. [ ] Upload fotos dos vendedores
8. [ ] Metricas ROAS/ROI/CAC quando marketing conectado
