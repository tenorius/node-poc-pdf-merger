var express = require('express');
var router = express.Router();
var fs = require('fs');
var base64 = require('base64-stream');
var stream = require('stream');
var hummus = require('hummus');
var memoryStreams = require('memory-streams');

/* GET users listing. */
router.get('/', function(req, res, next) {

  var base64strArray = getBase64s();
  var promises = base64ToStreamAsync(base64strArray);
  var results = Promise.all(promises);
  results.then(function (data) {
    var mergedPDF = createMergedPDF(data);
    // res.send(mergedPDF.toString('base64'));
    res.setHeader('Content-Type', 'application/pdf');
    res.send(mergedPDF);
  }).catch(function (e) {
    console.log(e);
  });
});

function getBase64s() {
  var base64strArray = [];

  base64strArray[0] = base64_encode( './public/files/fatura-agosto.pdf');
  base64strArray[1] = base64_encode( './public/files/fatura-agosto.pdf');
  base64strArray[2] = base64_encode( './public/files/fatura-agosto.pdf');
  base64strArray[3] = base64_encode( './public/files/fatura-agosto.pdf');
  base64strArray[4] = base64_encode( './public/files/fatura-agosto.pdf');

  return base64strArray;
}

function base64ToStreamAsync(base64strArray) {
  var decoder = base64.decode();
  var promises = [];
  //converta o array de base64 para um array de streams
  base64strArray.forEach(function (base64str) {
    var input = new stream.PassThrough();
    var output = new stream.PassThrough();
    input.pipe(decoder).pipe(output);
    promises.push(new Promise(function (resolve, reject) {
      output.on('data', function (data) {
        var pdfStream = new hummus.PDFRStreamForBuffer(data);
        resolve(pdfStream);
      });
      output.on('error', function () {
        console.log('Conversão falhou');
        reject(null);
      });
    }));
    input.write(base64str);
  });

  return promises;
}

function createMergedPDF(data){
  var outStream = new memoryStreams.WritableStream();
  try {
    var first = data.splice(0,1);
    var pdfWriter = hummus.createWriterToModify( first[0] ,new hummus.PDFStreamForResponse(outStream));
    data.forEach(function (pdfStream) {
      pdfWriter.appendPDFPagesFromPDF(pdfStream);
    });
    pdfWriter.end();
    var newBuffer = outStream.toBuffer();
    outStream.end();
    return newBuffer;
  }
  catch(e){
    outStream.end();
    throw new Error('Error during PDF combination: ' + e.message);
  }
}

// function to encode file data to base64 encoded string
function base64_encode(file) {
  // read binary data
  var bitmap = fs.readFileSync(file);
  // convert binary data to base64 encoded string
  return new Buffer(bitmap).toString('base64');
}

// function to create file from base64 encoded string
function base64_decode(base64str, file) {
  // create buffer object from base64 encoded string, it is important to tell the constructor that the string is base64 encoded
  var bitmap = new Buffer(base64str, 'base64');
  // write buffer to file
  fs.writeFileSync(file, bitmap);
  console.log('******** File created from base64 encoded string ********');
}

module.exports = router;
