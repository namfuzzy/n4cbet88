import https from 'https';

const key = 'AIzaSyAtsWt9KCcC03xjKwhdH06tY1mkdt9xFn0';
const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${key}`;

https.get(url, (res) => {
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  res.on('end', () => {
    const parsed = JSON.parse(data);
    if (parsed.models) {
      console.log(`Total models: ${parsed.models.length}`);
      parsed.models.forEach(m => {
        console.log(`${m.name} - ${m.displayName} - Supported: ${m.supportedGenerationMethods?.join(', ')}`);
      });
    } else {
      console.log(parsed);
    }
  });
}).on('error', (err) => {
  console.log('Error: ' + err.message);
});
