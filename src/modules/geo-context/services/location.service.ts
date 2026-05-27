import axios from 'axios';
import { CacheService, SET_CACHE_POLICY } from 'mvc-common-toolkit';

import { Inject, Injectable, Logger } from '@nestjs/common';

import { geocodeCacheKey } from '@shared/cache-key';
import { CACHE_TTL, INJECTION_TOKEN } from '@shared/constants';

@Injectable()
export class LocationService {
  private readonly logger = new Logger(LocationService.name);

  constructor(
    @Inject(INJECTION_TOKEN.REDIS_SERVICE)
    private cacheService: CacheService,
  ) {}

  public async reverseGeocode(lat: number, lng: number): Promise<string> {
    if (
      lat === undefined ||
      lng === undefined ||
      lat === null ||
      lng === null
    ) {
      return 'Không xác định';
    }

    // Lưới ~110m: Gộp tọa độ làm key
    const key = geocodeCacheKey(lat, lng);

    try {
      // 1. Kiểm tra cache trong Redis trước
      const cachedAddress = await this.cacheService.get(key);
      if (cachedAddress) {
        return cachedAddress;
      }

      // 2. Nếu Cache Miss, gọi API Nominatim
      const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&accept-language=vi`;
      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'LuaKhoeBackend/1.0 (support@greenflag.id.vn)',
        },
        timeout: 5000,
      });

      if (response.status === 200 && response.data?.display_name) {
        const rawParts = response.data.display_name
          .split(',')
          .map((p: string) => p.trim());

        const isCountry = (s: string) => {
          const normalized = s.toLowerCase();
          return ['việt nam', 'vietnam', 'viet nam', 'vn'].includes(normalized);
        };
        const isPostcode = (s: string) => /^\d+$/.test(s);

        const reversedParts = [...rawParts].reverse();
        const keptParts: string[] = [];

        for (const part of reversedParts) {
          if (part && !isCountry(part) && !isPostcode(part)) {
            keptParts.push(part);
          }
        }

        const top3 = keptParts.slice(0, 3);
        const addressStr = top3.reverse().join(', ');

        if (addressStr) {
          await this.cacheService.set(key, addressStr, {
            policy: SET_CACHE_POLICY.WITH_TTL,
            value: CACHE_TTL.THIRTY_DAYS,
          });

          return addressStr;
        }
      }
    } catch (error) {
      this.logger.error(
        `Reverse geocoding failed for ${lat},${lng}: ${error.message}`,
      );
    }

    return 'Không xác định';
  }
}
