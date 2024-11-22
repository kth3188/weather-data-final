import * as XLSX from 'xlsx';
import path from 'path';

export interface Coordinate {
    level1: string;
    level2: string;
    level3: string;
    nx: number;
    ny: number;
}

export function readCoordinatesFromExcel(): Coordinate[] {
    try {
        const filePath = path.join(__dirname, '../data/coordinates.xlsx');
        const workbook = XLSX.readFile(filePath);
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const data = XLSX.utils.sheet_to_json(sheet);
        
        return data as Coordinate[];
    } catch (error) {
        console.error('엑셀 파일 읽기 실패:', error);
        return [];
    }
} 