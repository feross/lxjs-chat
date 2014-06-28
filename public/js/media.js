var customError = require('custom-error')

var NavigatorUserMediaError = customError('NavigatorUserMediaError')

var getUserMedia = navigator.getUserMedia
  || navigator.webkitGetUserMedia
  || navigator.mozGetUserMedia
  || navigator.msGetUserMedia

exports.getUserMedia = function (constraints, cb) {
  if (typeof constraints === 'function') {
    cb = constraints
    constraints = { video: true, audio: true }
  }

  function success (stream) {
    cb(null, stream)
  }

  function fail (err) {
    // Firefox returns strings instead of error objects.
    if (err === 'PERMISSION_DENIED') {
      err = new NavigatorUserMediaError()
      err.name = 'PermissionDeniedError'
    } else if (err === 'CONSTRAINT_NOT_SATISFIED') {
      err = new NavigatorUserMediaError()
      err.name = 'ConstraintNotSatisfiedError'
    }

    cb(err)
  }

  getUserMedia.call(window.navigator, constraints, success, fail)
}

exports.showStream = function ($video, stream) {
  $video.src = window.URL.createObjectURL(stream)
  $video.play()
}
