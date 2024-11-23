import express, { RequestHandler } from 'express';
import cors from 'cors';
import axios from 'axios';
import path from 'path';
import XLSX from 'xlsx';
import * as dotenv from 'dotenv';
import { coordinateService } from '../utils/coordinateService';

// 개발 환경에서만 dotenv 설정 (production에서는 Vercel 환경 변수 사용)
if (process.env.NODE_ENV !== 'production') {
  dotenv.config({ path: path.resolve(__dirname, '../.env') });
}

// 환경 변수 검증
const REQUIRED_ENV_VARS = ['WEATHER_API_KEY'];
REQUIRED_ENV_VARS.forEach(envVar => {
  if (!process.env[envVar]) {
    throw new Error(`필수 환경 변수 ${envVar}가 설정되지 않았습니다.`);
  }
});

const serviceKey = process.env.WEATHER_API_KEY;

const app = express();
app.use(cors());
app.use(express.json());

// Express 라우터 생성
const router = express.Router();

// 현재 시간 기준으로 baseDate와 baseTime을 구하는 함수
function getCurrentDateTime() {
  const now = new Date();
  const baseDate = now.getFullYear() +
    String(now.getMonth() + 1).padStart(2, '0') +
    String(now.getDate()).padStart(2, '0');
    
  // 매시각 정시에 생성되고 10분 후에 데이터가 제공됨
  const currentMinute = now.getMinutes();
  let baseTime;
  
  if (currentMinute < 10) {
    // 이전 시각의 데이터 사용
    const previousHour = new Date(now.getTime() - 60 * 60 * 1000);
    baseTime = String(previousHour.getHours()).padStart(2, '0') + '00';
  } else {
    baseTime = String(now.getHours()).padStart(2, '0') + '00';
  }

  return { baseDate, baseTime };
}

// 날씨 데이터를 가져오는 함수
async function getWeatherData(nx: number, ny: number) {
  try {
    const { baseDate, baseTime } = getCurrentDateTime();
    const url = 'https://apis.data.go.kr/1360000/VilageFcstInfoService_2.0/getUltraSrtNcst';
    
    const params = {
      serviceKey: process.env.WEATHER_API_KEY,
      numOfRows: '10',
      pageNo: '1',
      base_date: baseDate,
      base_time: baseTime,
      nx: nx.toString(),
      ny: ny.toString(),
      dataType: 'JSON'
    };

    console.log('API 요청 파라미터:', params);  // 디버깅용 로그 추가

    const response = await axios.get(url, { 
      params,
      timeout: 10000  // 타임아웃 증가
    });

    console.log('API 응답:', response.data);  // 디버깅용 로그 추가

    if (!response.data?.response?.body?.items?.item) {
      throw new Error('유효하지 않은 응답 데이터 형식');
    }

    return {
      data: response.data.response.body.items.item,
      requestTime: { baseDate, baseTime }
    };
  } catch (error) {
    console.error('날씨 API 호출 실패:', error);  // 자세한 에러 로깅
    throw error;
  }
}

// API 에러 코드에 따른 메시지 반환
function getErrorMessage(code: string): string {
  const errorMessages: { [key: string]: string } = {
    '01': '어플리케이션 에러',
    '02': '데이터베이스 에러',
    '03': '데이터없음',
    '04': 'HTTP 에러',
    '30': '등록되지 않은 서비스키',
    '31': '기한만료된 서비스키',
    '32': '등록되 않은 IP',
    '33': '서명되지 않은 호출',
    '99': '기타에러'
  };
  
  return errorMessages[code] || '알 수 없는 에러';
}

// 타입 정의 추가
interface WeatherQuery {
  nx?: string;
  ny?: string;
}

interface RegionQuery {
  level1?: string;
  level2?: string;
  level3?: string;
}

// Weather Handler 정의
const weatherHandler: RequestHandler<{}, {}, {}, WeatherQuery> = async (req, res) => {
  try {
    const { nx, ny } = req.query;
    
    if (!nx || !ny) {
      res.status(400).json({
        error: 'nx와 ny 좌표값은 필수입니다.'
      });
      return;
    }

    const weatherData = await getWeatherData(Number(nx), Number(ny));
    
    res.json({
      coordinates: { nx, ny },
      weather: weatherData
    });
  } catch (error) {
    console.error('날씨 정보 조회 실패:', error);
    res.status(500).json({ 
      error: '날씨 정보 조회 실패',
      message: error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.'
    });
  }
};

// Region Handler 정의
const regionHandler: RequestHandler<{}, {}, {}, RegionQuery> = async (req, res, next) => {
  try {
    const { level1, level2, level3 } = req.query;
    const coordinate = coordinateService.findCoordinates({
      level1: level1 as string,
      level2: level2 as string,
      level3: level3 as string
    });
    
    if (!coordinate) {
      res.status(404).json({ error: '지역을 찾을 수 없습니다.' });
      return;
    }

    console.log('요청 파라미터:', req.query);
    console.log('검색된 좌표:', coordinate);
    console.log('날씨 데이터 요청 전');

    const weatherData = await getWeatherData(coordinate.nx, coordinate.ny);
    if (!weatherData) {
      throw new Error('날씨 데이터를 가져오는데 실패했습니다.');
    }
    res.json({
      region: {
        level1: coordinate.level1,
        level2: coordinate.level2,
        level3: coordinate.level3
      },
      coordinates: {
        nx: coordinate.nx,
        ny: coordinate.ny
      },
      weather: weatherData
    });
  } catch (error) {
    next(error);
  }
};

// 라우터에 핸들러 연결
router.get('/weather', weatherHandler);
router.get('/region', regionHandler);
router.get('/', (req, res) => {
  res.json({
    message: '날씨 API 서버가 정상적으로 실행 중입니다.',
    endpoints: {
      weather: '/api/weather?nx={nx}&ny={ny}',
      region: '/api/region?level1={시도}&level2={시군구}&level3={읍면동}'
    }
  });
});

// 라우터를 앱에 마운트
app.use('/api', router);

// 에러 핸들링 미들웨어
interface ApiError extends Error {
  statusCode?: number;
  code?: string;
}

app.use((error: ApiError, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('에러 발생:', {
    message: error.message,
    stack: error.stack,
    code: error.code
  });

  res.status(error.statusCode || 500).json({
    error: '서버 오류가 발생했습니다.',
    message: error.message,
    code: error.code
  });
});

// 서버 시작
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

export default app;