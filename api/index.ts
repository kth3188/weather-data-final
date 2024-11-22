import express from 'express';
import cors from 'cors';
import axios from 'axios';
import { coordinateService, type Coordinate, type RegionQuery } from '../utils/coordinateService';

const app = express();
app.use(cors());
app.use(express.json());

// 현재 시간 기준으로 baseDate와 baseTime을 구하는 함수
function getCurrentDateTime() {
  const now = new Date();
  const currentHour = now.getHours();
  
  const baseDate = now.getFullYear() +
    String(now.getMonth() + 1).padStart(2, '0') +
    String(now.getDate()).padStart(2, '0');

  let baseTime;
  if (currentHour < 2) {
    const yesterday = new Date(now.setDate(now.getDate() - 1));
    return {
      baseDate: yesterday.getFullYear() +
        String(yesterday.getMonth() + 1).padStart(2, '0') +
        String(yesterday.getDate()).padStart(2, '0'),
      baseTime: '2300'
    };
  }
  
  // 시간대별 baseTime 설정
  const timeMap: { [key: number]: string } = {
    2: '0200', 5: '0500', 8: '0800', 11: '1100',
    14: '1400', 17: '1700', 20: '2000', 23: '2300'
  };
  
  const hours = Object.keys(timeMap).map(Number);
  for (let i = 0; i < hours.length; i++) {
    if (currentHour < hours[i]) {
      baseTime = timeMap[hours[i - 1]];
      break;
    }
  }
  
  return { baseDate, baseTime };
}

// 날씨 데이터를 가져오는 함수
async function getWeatherData(nx: number, ny: number) {
  try {
    const serviceKey = process.env.WEATHER_API_KEY || 'YOUR_API_KEY';
    const { baseDate, baseTime } = getCurrentDateTime();
    
    const url = `http://apis.data.go.kr/1360000/VilageFcstInfoService_2.0/getVilageFcst`;
    const params = {
      serviceKey,
      numOfRows: '10',
      pageNo: '1',
      base_date: baseDate,
      base_time: baseTime,
      nx: nx.toString(),
      ny: ny.toString(),
      dataType: 'JSON'
    };

    const response = await axios.get(url, { params });
    return {
      data: response.data,
      requestTime: { baseDate, baseTime }
    };
  } catch (error) {
    console.error('날씨 API 호출 실패:', error);
    throw new Error('날씨 정보를 가져오는데 실패했습니다.');
  }
}

// 메인 날씨 API 엔드포인트
app.get('/weather/:level1?/:level2?/:level3?', 
  (req: express.Request, res: express.Response) => {
    (async () => {
      try {
        const { level1, level2, level3 } = req.params;
        
        if (!level1) {
          return res.status(400).json({
            error: '최소한 1단계 지역명은 입력해야 합니다.'
          });
        }

        const coordinates = coordinateService.findCoordinates({ level1, level2, level3 });

        if (!coordinates) {
          return res.status(404).json({ 
            error: '지역을 찾을 수 없습니다.',
            providedLocation: { level1, level2, level3 }
          });
        }

        const { nx, ny } = coordinates;
        const weatherData = await getWeatherData(nx, ny);
        
        res.json({
          location: {
            level1: coordinates.level1,
            level2: coordinates.level2,
            level3: coordinates.level3,
          },
          coordinates: { nx, ny },
          weather: weatherData
        });

      } catch (error) {
        console.error('날씨 정보 조회 실패:', error);
        res.status(500).json({ 
          error: '날씨 정보를 가져오는데 실패했습니다.',
          message: error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.'
        });
      }
    })();
  }
);

// 지역 목록 조회 API
app.get('/regions', (req, res) => {
  try {
    const regions = coordinateService.getAllRegions();
    res.json(regions);
  } catch (error) {
    res.status(500).json({ 
      error: '지역 목록을 가져오는데 실패했습니다.' 
    });
  }
});

// 에러 핸들링 미들웨어
app.use((error: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(error);
  res.status(500).json({
    error: '서버 오류가 발생했습니다.',
    message: error.message
  });
});

// 서버 시작
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

export default app;