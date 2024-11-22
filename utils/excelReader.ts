import * as XLSX from 'xlsx';

interface Coordinate {
  level1: string;
  level2: string;
  level3: string;
  nx: number;
  ny: number;
}

export function readCoordinatesFromExcel(filePath: string): Coordinate[] {
  try {
    const workbook = XLSX.readFile(filePath);
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