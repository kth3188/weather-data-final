declare function require(name: string): any;

import express from 'express';
import request from 'request';

var app = express();

app.get("/weather", function (req: any, res: any) {
  const { serviceKey, numOfRows, pageNo, base_date, base_time, nx, ny } =
    req.query;

  var api_url =
    "http://apis.data.go.kr/1360000/VilageFcstInfoService_2.0/getUltraSrtNcst?";
  var options = {
    url: api_url,
    qs: { serviceKey, numOfRows, pageNo, base_date, base_time, nx, ny },
  };

  request.get(options, function (error: any, response: any, body: any) {
    if (error) {
      console.error('Request error:', error);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
    
    if (response.statusCode !== 200) {
      console.error('API error:', body);
      return res.status(response.statusCode).send(body);
    }

    res.setHeader('Content-Type', 'application/xml;charset=utf-8');
    res.send(body);
  });
});

app.listen(3000, function () {
  console.log(
    "https://weather-data-final-cyan.vercel.app/weather?serviceKey=cPdGKAsUpOaVmBWNujf8zCL0q%2BXyzMSMGebwv4%2FLt%2BMJZCz8lOidIVcww3rhbqJ%2FyO8OLyRi0QJY%2FimdYx7zSg%3D%3D&numOfRows=10&pageNo=1&base_date=20241122&base_time=0600&nx=61&ny=125 app listening on port 3000!"
  );
});