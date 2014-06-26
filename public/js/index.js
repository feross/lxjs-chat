var media = require('./media')
var Peer = require('./peer')
var Socket = require('./socket')

var socket = new Socket()
var peer
var stream

var $chat = document.querySelector('form.text')
var $count = document.querySelector('.count')
var $history = document.querySelector('.history')
var $next = document.querySelector('.next')
var $send = document.querySelector('.send')
var $textInput = document.querySelector('.text input')
var $videoLocal = document.querySelector('video.local')
var $videoRemote = document.querySelector('video.remote')

disableUI()

socket.on('error', function (err) {
  console.error('[socket error]', err.stack || err.message || err)
})

socket.on('ready', function () {
  socket.send({ type: 'hello' })

  media.getUserMedia(function (err, _stream) {
    if (err) {
      alert('Don\'t be shy! Show the world your smile!')
    } else {
      stream = _stream
      media.showStream($videoLocal, stream)
      next()
    }
  })
})

socket.on('peer', function (data) {
  data = data || {}


  peer = new Peer({
    initiator: !!data.initiator,
    stream: stream
  })

  peer.on('error', function (err) {
    console.error('peer error', err.stack || err.message || err)
  })
  peer.on('signal', function (data) {
    socket.send({ type: 'signal', data: data })
  })

  peer.on('chat', function (data) {
    addChat(data, 'remote')
  })
  peer.on('stream', function (stream) {
    media.showStream($videoRemote, stream)
  })

  peer.on('ready', function () {
    addChat('Connected!', 'status')
    enableUI()
  })
  peer.on('close', function () {
    next()
  })

  // useful for debugging
  peer.on('iceconnectionstatechange', function (iceGatheringState, iceConnectionState) {
    console.log('[iceconnectionstatechange] ', iceGatheringState, iceConnectionState)
  })
  peer.on('signalingstatechange', function (signalingState, readyState) {
    console.log('[signalingstatechange] ', signalingState, readyState)
  })

})

socket.on('signal', function (data) {
  peer.signal(data)
})

socket.on('end', function () {
  next()
})

socket.on('count', function (count) {
  $count.textContent = count
})

document.querySelector('.next').addEventListener('click', function (event) {
  event.preventDefault()
  next()
})

function next () {
  if (peer) {
    socket.send({ type: 'end' })
    peer.close()
  }
  socket.send({ type: 'peer' })

  disableUI()
  $history.innerHTML = ''
  addChat('Finding a peer...', 'status')
}

$chat.addEventListener('submit', send)
$send.addEventListener('click', send)

function send (event) {
  event.preventDefault()
  var text = $textInput.value
  addChat(text, 'local')
  peer.send({ type: 'chat', data: text })
  $textInput.value = ''
}

function addChat (text, className) {
  var node = document.createElement('div')
  node.className = className
  node.textContent = text
  $history.appendChild(node)
}

function disableUI () {
  $textInput.disabled = true
  $send.disabled = true
  $next.disabled = true
}

function enableUI () {
  $textInput.disabled = false
  $send.disabled = false
  $next.disabled = false
  $textInput.focus()
}
