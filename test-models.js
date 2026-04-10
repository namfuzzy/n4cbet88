import https from 'https';

https.get('https://generativelanguage.googleapis.com/v1beta/models?key=AIzaSyAtsWt9KCcC03xjKwhdH06tY1mkdt9xFn0', (res) => {
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  res.on('end', () => {
    const models = JSON.parse(data).models;
    if (models) {
      models.forEach(m => console.log(m.name));
    } else {
      console.log(data);
    }
  });
}).on('error', (err) => {
  console.log('Error: ' + err.message);
});
