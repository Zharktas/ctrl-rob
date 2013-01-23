var http = require('http');
var send = require('send');
var url = require('url');
var path = require('path')
var app = require('express')()
var _ = require('underscore')
var request = require('request')
var zlib = require('zlib')
var $ = require('cheerio')

var server = http.createServer(app).listen(process.env.PORT || 8080)

app.get('/search/:question', function(req, res) {

  getQuestionAdvanced(req.params.question, function(err, question) {
    if(err) return handleError(res, err)
    fetchQuestionAnswer(question, function(err, codes) {
      if(err) return handleError(res, err)
      res.send({
        original_link: question.link,
        teh_codes: codes
      })
      res.end()
    })
  })
})

app.get('/ask/:question', function(req, res) {

  getQuestionAdvanced(req.params.question, function(err, question) {
    if(err) return handleError(res, err)
    fetchQuestionAnswer(question, function(err, codes) {
      if(err) return handleError(res, err)
      res.send({
        original_link: question.link,
        teh_codes: codes
      })
      res.end()
    })
  })

})

function handleError(res, err) {
  res.statusCode = err.status || 500
  res.end(err.message)
}

app.get('/:question', function(req, res) {
    send(req, '/')
      .root(path.join(__dirname, 'site'))
      .pipe(res)
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

function makeApiRequest(url, cb) {
  console.log('Requesting: ', url)
  http.get({
      hostname: 'api.stackexchange.com',
      path: '/2.1' + url,
      headers: {
        "accept-encoding": "gzip"
      }
    }, function(res) {
      var total = ''
      var gzip = zlib.createGunzip()
      res.pipe(gzip)

      gzip.on('data', function(data) {
        total += data.toString('utf8')
      })
      gzip.on('end', function() {
        cb(null, JSON.parse(total))
      })
  }).on('error', cb)
}

function getQuestionBasic(question, cb) {
  makeApiRequest('/search?order=desc&sort=activity&intitle='
    + encodeURIComponent(question)
    + '&site=stackoverflow&filter=withbody', 
    function(err, data) {
      if(err) return cb(err)
      parseQuestionDetails(data, cb)
    })
}

function getQuestionAdvanced(question, cb) {
  makeApiRequest('/search/advanced?order=desc&sort=activity&q='
    + encodeURIComponent(question)
    + '&site=stackoverflow&filter=withbody', 
    function(err, data) {
      if(err) return cb(err)
      parseQuestionDetails(data, cb)
    })
}

function parseQuestionDetails(details, cb) {
  if(details.items && details.items.length > 0) {
    cb(null, details.items[0])
  }
  else
    cb(new Error("No matching criteria"), null)
}

function fetchQuestionAnswer(question, cb) {
  if(question.answer_count > 0) {
    makeApiRequest('/questions/' + question.question_id
      + '/answers/?filter=withbody&site=stackoverflow',
    function(err, answers) {
      if(err) return cb(err)
      if(answers.items && answers.items.length > 0)
        findGoodAnswerInCollection(question, answers.items, cb)
      else
        return new Error("Nobody else knows how to do that")
    })
  } else {
    cb(new Error("Nobody else knows how to do that"), null)
  }
}

function findGoodAnswerInCollection(question, answers, cb) {
  var bestAnswer = _.sortBy(answers, function(answer) {
                       var score = 0
                       if(answer.answer_id === question.accepted_answer_id)
                         score -= 10
                       score -= answer.score
                       if(answer.body.indexOf('<code>') >= 0)
                         score -= 10
                       else 
                         score += 1000
                       return score
                     })[0]

   if(bestAnswer.body.indexOf('<code>') >= 0) {
     parseCodeOutOfAnswer(bestAnswer.body, cb)
   } else {
    cb(new Error("Nobody else knows how to do that"), null)
   }
} 

function parseCodeOutOfAnswer(answer, cb) {
  var tehcodes = []
  try {
    var $answer = $('<div>' + answer + '</div>')
    var $tehcodes = $answer.find('code')

    for(var i =0 ; i < $tehcodes.length; i++)
      tehcodes.push($tehcodes.eq(i).html())
  } catch(ex) {
    return cb(ex, null)
  }
  cb(null, tehcodes)
}



