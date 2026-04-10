import https from 'https';

const body = JSON.stringify({
  contents: [{ parts: [{ text: 'Hello' }] }],
  generationConfig: {
    responseMimeType: 'application/json'
  }
});

const req = https.request('https://generativelanguage.googleapis.com/v1beta/models/gemma-3-27b-it:generateContent?key=AIzaSyAtsWt9KCcC03xjKwhdH06tY1mkdt9xFn0', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(body)
  }
}, (res) => {
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  res.on('end', () => {
    console.log('Status JSON:', res.statusCode);
    console.log(data);
  });
});

req.on('error', (err) => {
  console.log('Error: ' + err.message);
});

req.write(body);
req.end();
