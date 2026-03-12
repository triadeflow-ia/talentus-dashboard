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
  // Meta Ads
  metaStatus: () => fetchAPI('/meta/status'),
  metaInsights: (days) => fetchAPI('/meta/insights', { days }),
  metaCampaigns: (days) => fetchAPI('/meta/campaigns', { days }),
  metaTimeline: (days) => fetchAPI('/meta/timeline', { days }),
};
