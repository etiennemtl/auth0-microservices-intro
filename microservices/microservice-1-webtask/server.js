var webtask = require('webtask-tools');
var express = require('express');
var morgan = require('morgan');
var mongo = require('mongodb').MongoClient;
var winston = require('winston');

winston.emitErrs = true;
var logger = new winston.Logger({
  transports: [
    new winston.transports.Console({
      timestamp: true,
      level: 'debug',
      handleExceptions: true,
      json: false,
      colorize: true
    })
  ],
  exitOnError: false
});

logger.stream = {
  write: function(message, encoding) {
    logger.debug(message.replace(/\n$/, ''));
  }
};

var app = express();
app.use(
  morgan(':method :url :status :response-time ms - :res[content-length]', {
    stream: logger.stream
  })
);

var db;
if (process.env.MONGO_URL) {
  mongo.connect(process.env.MONGO_URL, null, function(err, db_) {
    if (err) {
      logger.error(err);
    } else {
      db = db_;
    }
  });
}

app.use(function(req, res, next) {
  if (!db) {
    mongo.connect(process.env.MONGO_URL || req.webtaskContext.data.MONGO_URL, null, function(err, db_) {
      if (err) {
        logger.error(err);
        res.sendStatus(500);
      } else {
        db = db_;
        next();
      }
    });
  } else {
    next();
  }
});

app.get('/tickets', function(req, res, next) {
  var collection = db.collection('tickets');
  collection.find().toArray(function(err, result) {
    if (err) {
      logger.error(err);
      res.sendStatus(500);
      return;
    }
    res.json(result);
  });
});

module.exports = require('webtask-tools').fromExpress(app);
