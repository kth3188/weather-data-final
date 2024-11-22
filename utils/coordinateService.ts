import * as XLSX from 'xlsx';
import path from 'path';

// 인터페이스 정의
interface Coordinate {
  level1: string;    // 1단계
  level2: string;    // 2단계
  level3: string;    // 3단계
  nx: number;
  ny: number;
}

interface RegionQuery {
  level1?: string;
  level2?: string;
  level3?: string;
}

class CoordinateService {
  private static instance: CoordinateService;
  private coordinatesCache: Coordinate[] | null = null;
  private readonly excelPath: string;

  private constructor() {
    this.excelPath = path.join(__dirname, '../data/coordinates.xlsx');
  }

  public static getInstance(): CoordinateService {
    if (!CoordinateService.instance) {
      CoordinateService.instance = new CoordinateService();
    }
    return CoordinateService.instance;
  }

  // 엑셀에서 좌표 데이터 읽기
  private readCoordinatesFromExcel(): Coordinate[] {
    try {
      const workbook = XLSX.readFile(this.excelPath);
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(sheet);

      return jsonData.map((row: any) => ({
        level1: row['1단계'] || '',
        level2: row['2단계'] || '',
        level3: row['3단계'] || '',
        nx: Number(row['nx']),
        ny: Number(row['ny'])
      }));
    } catch (error) {
      console.error('엑셀 파일 읽기 실패:', error);
      return [];
    }
  }

  // 캐시된 좌표 데이터 가져오기
  private getCoordinates(): Coordinate[] {
    if (!this.coordinatesCache) {
      this.coordinatesCache = this.readCoordinatesFromExcel();
    }
    return this.coordinatesCache;
  }

  // 지역 정보로 좌표 찾기
  public findCoordinates(query: RegionQuery): Coordinate | undefined {
    const coordinates = this.getCoordinates();
    
    return coordinates.find(coord => {
      // 1단계는 필수
      if (!query.level1 || !coord.level1.includes(query.level1)) {
        return false;
      }
      
      // 2단계가 제공된 경우
      if (query.level2) {
        if (!coord.level2.includes(query.level2)) {
          return false;
        }
        
        // 3단계가 제공된 경우
        if (query.level3) {
          if (!coord.level3.includes(query.level3)) {
            return false;
          }
        }
      }
      
      return true;
    });
  }

  // 캐시 초기화 (필요한 경우)
  public clearCache(): void {
    this.coordinatesCache = null;
  }

  // 모든 지역 목록 가져오기
  public getAllRegions(): Coordinate[] {
    return this.getCoordinates();
  }
}

export const coordinateService = CoordinateService.getInstance();
export type { Coordinate, RegionQuery }; 