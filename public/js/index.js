var media = require('./media')
var Peer = require('simple-peer')
var Socket = require('simple-websocket')

var $chat = document.querySelector('form.text')
var $count = document.querySelector('.count')
var $history = document.querySelector('.history')
var $next = document.querySelector('.next')
var $send = document.querySelector('.send')
var $textInput = document.querySelector('.text input')
var $videoLocal = document.querySelector('video.local')
var $videoRemote = document.querySelector('video.remote')

function disableUI () {
  $textInput.disabled = true
  $send.disabled = true
  // $next.disabled = true
}

function enableUI () {
  $textInput.disabled = false
  $send.disabled = false
  $next.disabled = false
  $textInput.focus()
}

disableUI()

function addChat (text, className) {
  var node = document.createElement('div')
  node.textContent = text
  node.className = className
  $history.appendChild(node)
}

function clearChat () {
  $history.innerHTML = ''
}

var peer, stream
var socket = new Socket({ url: 'ws://' + window.location.host })

socket.on('error', function (err) {
  console.error('[socket error]', err.stack || err.message || err)
})

socket.once('connect', function () {
  addChat('Please grant access to your webcam. Remember to smile!', 'status')
  media.getUserMedia(function (err, s) {
    if (err) {
      window.alert('You must share your webcam to use this app!')
    } else {
      stream = s
      media.showStream($videoLocal, stream)
      next()
    }
  })
})

function next (event) {
  if (event && event.preventDefault) {
    event.preventDefault()
  }
  if (peer) {
    socket.send(JSON.stringify({ type: 'end' }))
    peer.close()
  }
  socket.send(JSON.stringify({ type: 'peer' }))

  disableUI()
  clearChat()
  addChat('Finding a peer...', 'status')
}

$next.addEventListener('click', next)

function handlePeer (data) {
  data = data || {}

  peer = new Peer({
    initiator: !!data.initiator,
    stream: stream
  })

  peer.on('error', function (err) {
    console.error('peer error', err.stack || err.message || err)
  })

  peer.on('connect', function () {
    clearChat()
    addChat('Connected, say hello!', 'status')
    enableUI()
  })

  peer.on('signal', function (data) {
    socket.send(JSON.stringify({ type: 'signal', data: data }))
  })

  peer.on('stream', function (stream) {
    media.showStream($videoRemote, stream)
  })

  peer.on('data', function (message) {
    addChat(message, 'remote')
  })

  // Takes ~3 seconds before this event fires when peerconnection is dead (timeout)
  peer.on('close', next)
}

function handleSignal (data) {
  peer.signal(data)
}

function handleCount (data) {
  $count.textContent = data
}

socket.on('data', function (message) {
  console.log('got socket message: ' + message)
  try {
    message = JSON.parse(message)
  } catch (err) {
    console.error('[socket error]', err.stack || err.message || err)
  }

  if (message.type === 'signal') {
    handleSignal(message.data)
  } else if (message.type === 'count') {
    handleCount(message.data)
  } else if (message.type === 'end') {
    next()
  } else if (message.type === 'peer') {
    handlePeer(message.data)
  }
})

$chat.addEventListener('submit', send)
$send.addEventListener('click', send)

function send (event) {
  event.preventDefault()
  var text = $textInput.value
  addChat(text, 'local')
  peer.send(text)
  $textInput.value = ''
}
