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
  overview: (brand) => fetchAPI('/overview', { brand }),
  pipelines: (brand) => fetchAPI('/pipelines', { brand }),
  sellers: (brand) => fetchAPI('/sellers', { brand }),
  products: (brand) => fetchAPI('/products', { brand }),
  projectStatus: () => fetchAPI('/project-status'),
  crmStructure: () => fetchAPI('/crm-structure'),
  health: () => fetchAPI('/health'),
};
