// run render image:  node imagesJson.js
// need node js server

const dirFolder = './uploads/';
const dirImages = './images.json';
const fs = require('fs');
var folder = [];
var tempSource = [];
var json = {};

const setJson = (array, value, tempJson = {}) => {
  let property = array.shift();
  if (array.length > 0) {
    tempJson[property] = {};
    setJson(array, value, tempJson);
  } else {
    tempJson[property] = value;
  }
};

const writeImages = () => {
  fs.writeFile(dirImages, JSON.stringify(json), function (err) {
    console.log('Saved!');
    return true;
  });
};

const readDir = (dir) => {
  try {
    fs.readdir(dir, (err, files) => {
      if (err) throw err;
      files.forEach((file) => {
        if (!file.includes('.') && !folder.includes(file)) {
          folder.push(file);
        } else {
          temDir = dir + file;
          tempSource.push(temDir.toString());
        }
      });

      // set json to value
      let sourceSplit = dir.split('/');
      sourceSplit.pop();
      sourceSplit.shift();
      for (let i = 0; i < sourceSplit.length; i++) {
        if (sourceSplit[i] === 'uploads') {
          sourceSplit.splice(i, 1);
        }
      }

      let property = sourceSplit.pop();
      if (property !== undefined) {
        json[property] = tempSource.toString();
        tempSource = [];
      }
      writeImages();

      // setJson(sourceSplit, tempSource.toString(), json);
      // end set json

      // console.log('folder: ', folder);
      while (folder.length > 0) {
        let tempFolder = dir + folder.pop() + '/';
        readDir(tempFolder);
      }
    });
  } catch (error) {
    console.log('get file name error ', error);
  }
};

readDir(dirFolder);
