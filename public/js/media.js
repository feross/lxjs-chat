var getUserMedia = window.navigator.getUserMedia
  || window.navigator.webkitGetUserMedia
  || window.navigator.mozGetUserMedia
  || window.navigator.msGetUserMedia

var DEFAULT_CONSTRAINTS = { video: true, audio: true }

exports.getUserMedia = function (constraints, cb) {
  if (typeof constraints === 'function') {
    cb = constraints
    constraints = DEFAULT_CONSTRAINTS
  }

  function success (stream) {
    cb(null, stream)
  }

  function fail (err) {
    // TODO: test in Firefox
    // see: https://github.com/HenrikJoreteg/getUserMedia/blob/master/index-browser.js
    cb(err)
  }

  getUserMedia.call(window.navigator, constraints, success, fail)
}

exports.showStream = function ($video, stream) {
  $video.src = window.URL.createObjectURL(stream)
  $video.play()
}
