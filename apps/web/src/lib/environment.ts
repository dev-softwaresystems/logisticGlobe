function publicUrl(name: string, value: unknown, fallback: string): string {
  const resolved = typeof value === 'string' && value ? value : fallback;
  try {
    if (resolved.startsWith('//')) throw new Error();
    const parsed = new URL(resolved, window.location.origin);
    if (
      !['http:', 'https:'].includes(parsed.protocol) ||
      parsed.username ||
      parsed.password
    )
      throw new Error();
    return parsed.href.replace(/\/$/, '');
  } catch {
    throw new Error('Invalid public configuration: ' + name);
  }
}
const tileUrl =
  typeof import.meta.env.VITE_MAP_TILE_URL === 'string'
    ? import.meta.env.VITE_MAP_TILE_URL
    : '';
const attribution =
  typeof import.meta.env.VITE_MAP_ATTRIBUTION === 'string'
    ? import.meta.env.VITE_MAP_ATTRIBUTION
    : '';
if (tileUrl) {
  try {
    const parsed = new URL(tileUrl);
    if (
      !['http:', 'https:'].includes(parsed.protocol) ||
      parsed.username ||
      parsed.password ||
      !['{x}', '{y}', '{z}'].every((part) => tileUrl.includes(part)) ||
      !attribution.trim()
    )
      throw new Error();
  } catch {
    throw new Error(
      'Invalid public configuration: VITE_MAP_TILE_URL / VITE_MAP_ATTRIBUTION',
    );
  }
}
export const environment = {
  apiUrl: publicUrl(
    'VITE_API_URL',
    import.meta.env.VITE_API_URL,
    import.meta.env.PROD ? '/api/v1' : 'http://localhost:3000/api/v1',
  ),
  wsUrl: publicUrl(
    'VITE_WS_URL',
    import.meta.env.VITE_WS_URL,
    import.meta.env.PROD ? '/' : 'http://localhost:3000',
  ),
  mapTileUrl: tileUrl,
  mapAttribution: attribution,
  mapProviderToken:
    typeof import.meta.env.VITE_MAP_PROVIDER_TOKEN === 'string'
      ? import.meta.env.VITE_MAP_PROVIDER_TOKEN
      : '',
};
