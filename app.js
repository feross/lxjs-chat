var express = require('express')
var hat = require('hat')
var http = require('http')
var ws = require('ws')

var PORT = process.argv[2] || 3000

var app = express()
var httpServer = http.createServer(app)
var wsServer = new ws.Server({ server: httpServer })
var peers = {}
var waitingId = null

// setup express
app.set('views', __dirname + '/views')
app.set('view engine', 'jade')
app.use(express.logger('dev'))
app.use(express.static(__dirname + '/public'))
app.use(express.errorHandler())

// setup routes
app.get('/', function (req, res) {
  res.render('index', { title: 'Instant.io - Talk with strangers!' })
})

wsServer.on('connection', onconnection)

function onconnection (peer) {
  peer.id = hat()
  peers[peer.id] = peer
  peer.on('close', onclose.bind(peer))
  peer.on('error', onclose.bind(peer))
  peer.on('message', onmessage.bind(peer))
}

function onclose () {
  peers[this.id] = null
  if (this.id === waitingId) {
    waitingId = null
  }
  if (this.peerId) {
    var peer = peers[this.peerId]
    peer.peerId = null
    peer.send(JSON.stringify({ type: 'end' }), onsend)
  }
}

function onmessage (data) {
  console.log('[' + this.id + '] ' + data)
  try {
    var message = JSON.parse(data)
  } catch (e) {
    console.error('Discarding non-JSON message')
    return
  }

  if (message.type === 'hello') {
    this.send(JSON.stringify({ type: 'hello' }))

  } else if (message.type === 'peer') {
    if (waitingId && waitingId !== this.id) {
      var peer = peers[waitingId]

      this.peerId = peer.id
      peer.peerId = this.id

      this.send(JSON.stringify({
        type: 'peer',
        data: {
          initiator: true
        }
      }), onsend)

      peer.send(JSON.stringify({
        type: 'peer'
      }), onsend)

      waitingId = null
    } else {
      waitingId = this.id
    }

  } else if (message.type === 'signal') {
    if (!this.peerId) return console.error('unexpected `signal` message')
    var peer = peers[this.peerId]
    peer.send(JSON.stringify({ type: 'signal', data: message.data }))

  } else if (message.type === 'end') {
    if (!this.peerId) return console.error('unexpected `end` message')
    var peer = peers[this.peerId]
    peer.peerId = null
    this.peerId = null
    peer.send(JSON.stringify({ type: 'end' }), onsend)

  } else {
    console.error('unknown message `type` ' + message.type)
  }
}

function onsend (err) {
  if (err) console.error(err.stack || err.message || err)
}

httpServer.listen(PORT, function () {
  console.log('Listening on port ' + PORT)
})
