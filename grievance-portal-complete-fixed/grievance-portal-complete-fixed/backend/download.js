const https = require('https');
const fs = require('fs');

const urls = [
  { name: 'pothole.jpg', url: 'https://raw.githubusercontent.com/AlexOceja/Pothole_Detection/master/dataset/normal/10.jpg' },
  { name: 'garbage.jpg', url: 'https://raw.githubusercontent.com/OlafenwaMoses/Garbage-Classification/master/dataset/trash/trash1.jpg' },
  { name: 'streetlight.jpg', url: 'https://raw.githubusercontent.com/ultralytics/yolov5/master/data/images/bus.jpg' },
  { name: 'water.jpg', url: 'https://raw.githubusercontent.com/ultralytics/yolov5/master/data/images/zidane.jpg' }
];

urls.forEach(({name, url}) => {
  https.get(url, (res) => {
    const file = fs.createWriteStream(name);
    res.pipe(file);
    file.on('finish', () => file.close());
  });
});
