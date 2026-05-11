export async function fetchTab(apiUrl, name) {
  if (!apiUrl) throw new Error('No API URL configured');
  const r = await fetch(`${apiUrl}?sheet=${encodeURIComponent(name)}`, { redirect: 'follow' });
  if (!r.ok) throw new Error(`Failed to fetch "${name}" (HTTP ${r.status})`);
  return r.json();
}

export async function fetchTabsList(apiUrl) {
  if (!apiUrl) throw new Error('No API URL configured');
  const r = await fetch(`${apiUrl}?list=tabs`, { redirect: 'follow' });
  if (!r.ok) throw new Error(`Tabs list failed (HTTP ${r.status})`);
  const data = await r.json();
  if (!data.tabs) throw new Error('That URL did not return a tabs list. Make sure it is the Apps Script web-app URL, not the spreadsheet URL.');
  return data;
}
