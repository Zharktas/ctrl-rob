var http = require('http');
var send = require('send');
var url = require('url');
var path = require('path')
var app = require('express')()
var _ = require('underscore')
var request = require('request')
var zlib = require('zlib')

var server = http.createServer(app).listen(process.env.PORT || 8080)

app.get('/ask/:question', function(req, res) {
  getAnswer(req.params.question, function(err, answer) {
    if(err) throw err
    res.send(answer)
    res.end()
  })
})

app.use(function(req, res) {
  function error(err) {
    res.statusCode = err.status || 500;
    res.end(err.message);
  }
  function redirect() {
    res.statusCode = 301;
    res.setHeader('Location', req.url + '/');
    res.end('Redirecting to ' + req.url + '/');
  }
  send(req, url.parse(req.url).pathname)
    .root(path.join(__dirname, 'site'))
    .on('error', error)
    .on('directory', redirect)
    .pipe(res);
})


function getAnswer(question, cb) {
  makeApiRequest('http://api.stackexchange.com/2.1/search?order=desc&sort=activity&intitle='
    + question 
    + '&site=stackoverflow&filter=withbody', 
    function(err, data) {
      if(err) return cb(err)
      parseQuestionDetails(data, cb)
    })
}

function makeApiRequest(url, cb) {
  request({
      url: url
    }, function(err, res, body) {
      zlib.Gunzip(body, function(err, unzipped) {
        if(err) return cb(err)
        cb(null, JSON.parse(unzipped.toString()))
      })
  }).on('error', cb)
}

function parseQuestionDetails(details, cb) {
  var parsed = JSON.parse(details)
  if(parsed.items && parsed.items.length > 0) {
    fetchQuestionAnswer(parsed.items[0], cb)
  }
  else
    cb(new Error("No matching criteria"), null)
}

function fetchQuestionAnswer(question, cb) {
  if(question.answer_count > 0) {
    makeApiRequest('http://api.stackexchange.com/2.1/questions/' + question.question_id
      + '/answers/?filter=withbody&site=stackoverflow',
    function(err, answers) {
      if(err) return cb(err)
      findGoodAnswerInCollection(question, answers, cb)
    })
  } else {
    cb(new Error("Nobody else knows how to do that"), null)
  }
}

function findGoodAnswerInCollection(question, answers, cb) {
  var bestAnswer = _.chain(answers)
   .sort(function(answer) {
     var score = 0
     if(answer.answer_id === question.accepted_answer_id)
       score += 10
     score += answer.score
     if(answer.body.indexOf('<code>') >= 0)
       score += 10
     else 
       score -= 1000
   })
   .first()

   if(bestAnswer.body.indexOf('<code>') >= 0) {
     cb(null, bestAnswer.body)
   } else {
    cb(new Error("Nobody else knows how to do that"), null)
   }
   
} 
