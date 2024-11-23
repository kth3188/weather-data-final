import * as XLSX from 'xlsx';
import path from 'path';

export interface Coordinate {
  level1: string;    // 1단계
  level2: string;    // 2단계
  level3: string;    // 3단계
  nx: number;
  ny: number;
}

export interface RegionQuery {
  level1?: string;
  level2?: string;
  level3?: string;
}

class CoordinateService {
  private static instance: CoordinateService;
  private coordinatesCache: Coordinate[] | null = null;
  private lastCacheUpdate: number = 0;
  private readonly CACHE_TTL = 1000 * 60 * 60; // 1시간

  private constructor() {}

  public static getInstance(): CoordinateService {
    if (!CoordinateService.instance) {
      CoordinateService.instance = new CoordinateService();
    }
    return CoordinateService.instance;
  }

  private isCacheValid(): boolean {
    return (
      this.coordinatesCache !== null &&
      Date.now() - this.lastCacheUpdate < this.CACHE_TTL
    );
  }

  private getCoordinates(): Coordinate[] {
    if (this.isCacheValid()) {
      return this.coordinatesCache!;
    }

    try {
      const filePath = path.join(__dirname, '../data/coordinates.xlsx');
      const workbook = XLSX.readFile(filePath);
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      this.coordinatesCache = XLSX.utils.sheet_to_json(sheet) as Coordinate[];
      this.lastCacheUpdate = Date.now();
      return this.coordinatesCache;
    } catch (error) {
      console.error('좌표 데이터 로딩 실패:', error);
      return [];
    }
  }

  public findCoordinates(query: RegionQuery): Coordinate | null {
    const coordinates = this.getCoordinates();
    return coordinates.find(coord => {
      if (query.level1 && coord.level1 !== query.level1) return false;
      if (query.level2 && coord.level2 !== query.level2) return false;
      if (query.level3 && query.level3 !== '' && coord.level3 !== query.level3) return false;
      return true;
    }) || null;
  }

  public getAllRegions(): Coordinate[] {
    return this.getCoordinates();
  }

  public clearCache(): void {
    this.coordinatesCache = null;
  }
}

export const coordinateService = CoordinateService.getInstance(); 