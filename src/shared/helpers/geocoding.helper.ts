import axios from 'axios';

const locationCache = new Map<string, { address: string; timestamp: number }>();
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

export async function reverseGeocode(
  lat: number,
  lng: number,
): Promise<string> {
  if (lat === undefined || lng === undefined || lat === null || lng === null) {
    return 'Không xác định';
  }

  // Round coordinates to 3 decimal places (approx. 110m grid) for grouping cache keys
  const key = `${lat.toFixed(3)},${lng.toFixed(3)}`;
  const cached = locationCache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.address;
  }

  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&accept-language=vi`;
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'LuaKhoeBackend/1.0 (support@greenflag.id.vn)',
      },
      timeout: 5000,
    });

    if (response.status === 200 && response.data) {
      const displayName = response.data.display_name;
      if (displayName) {
        const rawParts = displayName.split(',').map((p: string) => p.trim());

        // Filter out country and postcode fields to keep only local administration names
        const isCountry = (s: string) => {
          const normalized = s.toLowerCase();
          return (
            normalized === 'việt nam' ||
            normalized === 'vietnam' ||
            normalized === 'viet nam' ||
            normalized === 'vn'
          );
        };
        const isPostcode = (s: string) => /^\d+$/.test(s);

        const reversedParts = [...rawParts].reverse();
        const keptParts: string[] = [];
        for (const part of reversedParts) {
          if (part && !isCountry(part) && !isPostcode(part)) {
            keptParts.push(part);
          }
        }

        // Take the 3 most general levels (e.g. Ward, District, City/Province)
        const top3 = keptParts.slice(0, 3);
        // Reverse back to standard Vietnamese address format (most specific first)
        const addressStr = top3.reverse().join(', ');

        if (addressStr) {
          locationCache.set(key, {
            address: addressStr,
            timestamp: Date.now(),
          });
          return addressStr;
        }
      }
    }
  } catch (error) {
    console.error(`Reverse geocoding failed for ${lat},${lng}:`, error.message);
  }

  return 'Không xác định';
}
