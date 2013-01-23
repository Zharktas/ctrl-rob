var $question = $('#question')


function submitCurrentQuery() {
  var question = $question.val()
  if(!question) return

  $.getJSON('/ask/' + question, function(data) {
    console.log(data)
  })
  return false // lol
}

$('[type=submit]').on('click', submitCurrentQuery)
