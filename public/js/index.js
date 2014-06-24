var Peer = require('./peer')
var Socket = require('./socket')

var socket = new Socket()
var peer

socket.on('error', function (err) {
  console.error('socket error', err.stack || err.message || err)
})

socket.on('ready', function () {
  // TODO: ui changes
  socket.send({ type: 'hello' })
  next()
})

socket.on('peer', function (data) {
  if (peer) {
    peer.destroy()
  }

  peer = new Peer(data)

  peer.on('error', function (err) {
    console.error('peer error', err.stack || err.message || err)
  })
  peer.on('signal', function (data) {
    socket.send({ type: 'signal', data: data })
  })
  peer.on('chat', function (data) {
    addChat(data, false)
  })

  // useful for debugging
  peer.on('icechange', function (iceGatheringState, iceConnectionState) {
    console.log('[icechange] ', iceGatheringState, iceConnectionState)
  })
  peer.on('statechange', function (signalingState, readyState) {
    console.log('[statechange] ', signalingState, readyState)
  })

})

socket.on('signal', function (data) {
  peer.signal(data)
})

socket.on('end', function (data) {
  socket.send({ type: 'peer' })
})

var $next = document.querySelector('.next')
var $chat = document.querySelector('form.text')
var $send = document.querySelector('.send')
var $textInput = document.querySelector('.text input')
var $history = document.querySelector('.history')

document.querySelector('.next').addEventListener('click', function (event) {
  event.preventDefault()
  next()
})

function next () {
  if (peer) {
    socket.send({ type: 'end' })
  }
  socket.send({ type: 'peer' })
}

$chat.addEventListener('submit', send)
$send.addEventListener('click', send)

function send (event) {
  event.preventDefault()
  var text = $textInput.value
  addChat(text, true)
  peer.send({ type: 'chat', data: text })
  $textInput.value = ''
}

function addChat (text, local) {
  var node = document.createElement('div')
  node.className = local ? 'local' : 'remote'
  node.innerText = text
  $history.appendChild(node)
}
