$(function() {
  var $question = $('#question')
    , $form = $('form')
    , $submit = $form.find('[type=submit]')
    , $results = $('#results')
    , $code = $results.find('code')
    , $source = $results.find('a')
    , $resultsheader = $results.find('h2')
    , $askagain = $('#ask-again')
    , $vieworiginal = $('#view-original')
    , current_result = null

  function allowAskQuestion() {
    $results.fadeOut("slow", function() {
      $form.fadeIn("slow")
    })
    console.log('gom')
    $question.val('')
    $question.focus()
  }

  function submitCurrentQuery() {
    var question = $question.val()
    if(!question) return
    updateUrlForQuestion(question)
    fetchResultsForQuestion(question)
    return false // lol
  }

  function updateUrlForQuestion(question) {
    if(!window.history) return
    if(!window.history.pushState) return
    window.history.pushState(question, null, '/' + question)
  }

  function fetchResultsForQuestion(question) {
    $form.fadeOut("slow", function() {
      $results.fadeIn("slow")
    })

    $.getJSON('/ask/' + question, function(data) {
       current_result = data
       $resultsheader.text(question)
       $code.text(data.teh_codes)
    })
  }

  function viewOriginal() {
    if(current_result)
      document.location = current_result.original_link
  }

  function askagain() {
    window.history.pushState(null, null, '/')
    allowAskQuestion()
  }

  $submit.on('click', submitCurrentQuery)
  $vieworiginal.on('click', viewOriginal)
  $askagain.on('click', askagain)

  $(window).on('popstate', function() {
    if(window.history.state) 
      fetchResultsForQuestion(window.history.state)
    else if(document.location.pathname.length > 1)
      fetchResultsForQuestion(document.location.pathname.substr(1))
    else
      allowAskQuestion()
  })

})
