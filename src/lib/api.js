const BASE = '/api';

async function fetchAPI(path, params = {}) {
  const url = new URL(`${window.location.origin}${BASE}${path}`);
  Object.entries(params).forEach(([k, v]) => {
    if (v && v !== 'all') url.searchParams.set(k, v);
  });
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

export const api = {
  overview: (brand, seller) => fetchAPI('/overview', { brand, seller }),
  pipelines: (brand, seller) => fetchAPI('/pipelines', { brand, seller }),
  sellers: (brand, seller) => fetchAPI('/sellers', { brand, seller }),
  products: (brand, seller) => fetchAPI('/products', { brand, seller }),
  projectStatus: () => fetchAPI('/project-status'),
  crmStructure: () => fetchAPI('/crm-structure'),
  health: () => fetchAPI('/health'),
  sellersList: () => fetchAPI('/sellers-list'),
  timeline: (brand, seller, days) => fetchAPI('/timeline', { brand, seller, days }),
  distribution: (brand, seller) => fetchAPI('/distribution', { brand, seller }),
  // Meta Ads (multi-account)
  metaStatus: () => fetchAPI('/meta/status'),
  metaAccounts: () => fetchAPI('/meta/accounts'),
  metaInsights: (days, accountId) => fetchAPI('/meta/insights', { days, account_id: accountId }),
  metaCampaigns: (days, accountId) => fetchAPI('/meta/campaigns', { days, account_id: accountId }),
  metaAdsets: (days, accountId, campaignId) => fetchAPI('/meta/adsets', { days, account_id: accountId, campaign_id: campaignId }),
  metaAds: (days, accountId, adsetId) => fetchAPI('/meta/ads', { days, account_id: accountId, adset_id: adsetId }),
  metaTimeline: (days, accountId, campaignId) => fetchAPI('/meta/timeline', { days, account_id: accountId, campaign_id: campaignId }),
};
