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
    if (!error && response.statusCode == 200) {
      res.writeHead(200, { "Content-Type": "application/xml;charset=utf-8" });
      res.end(body);
    } else {
      res.status(response.statusCode).end();
      console.log("error = " + response.statusCode);
    }
  });
});

app.listen(3000, function () {
  console.log(
    "http://127.0.0.1:3000/weather?serviceKey=cPdGKAsUpOaVmBWNujf8zCL0q%2BXyzMSMGebwv4%2FLt%2BMJZCz8lOidIVcww3rhbqJ%2FyO8OLyRi0QJY%2FimdYx7zSg%3D%3D&numOfRows=10&pageNo=1&base_date=20241122&base_time=0600&nx=61&ny=125 app listening on port 3000!"
  );
});