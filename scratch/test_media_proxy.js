const http = require('http');

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/gateway/media/b3fe8534-838d-491e-9ab8-36a4713effec',
  method: 'GET'
};

const req = http.request(options, (res) => {
  console.log(`STATUS: ${res.statusCode}`);
  res.setEncoding('utf8');
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  res.on('end', () => {
    console.log(`BODY: ${data}`);
  });
});

req.on('error', (e) => {
  console.error(`problem with request: ${e.message}`);
});
req.end();
