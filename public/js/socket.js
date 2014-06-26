module.exports = Socket

var EventEmitter = require('events').EventEmitter
var inherits = require('inherits')
var once = require('once')

var HOST = 'ws://' + window.location.host
var RECONNECT_TIMEOUT = 5000

inherits(Socket, EventEmitter)

function Socket () {
  this._init()
}

Socket.prototype._init = function () {
  this._ws = new WebSocket(HOST)
  this._ws.onopen = this._onopen.bind(this)
  this._ws.onmessage = this._onmessage.bind(this)
  this._ws.onclose = this._onclose.bind(this)
  this._ws.onerror = once(this._onerror.bind(this))
}

Socket.prototype._onopen = function () {
  this.emit('ready')
}

Socket.prototype._onerror = function (err) {
  this.emit('error', err)

  // On error, close socket...
  this.close()

  // ...and try to reconnect after a timeout
  setTimeout(this._init.bind(this), RECONNECT_TIMEOUT)
}

Socket.prototype.close = function () {
  try {
    this._ws.close()
  } catch (err) {
    this._onclose()
  }
}

Socket.prototype._onmessage = function (event) {
  console.log('[websocket receive] ' + event.data)
  this.emit('message', event.data)
  try {
    var message = JSON.parse(event.data)
  } catch (err) {
    return
  }
  this.emit('message:' + message.type, message.data)
}

Socket.prototype._onclose = function () {
  if (this._ws) {
    this._ws.onopen = null
    this._ws.onerror = null
    this._ws.onmessage = null
    this._ws.onclose = null
  }
  this._ws = null
}

Socket.prototype.send = function (message) {
  if (this._ws && this._ws.readyState === WebSocket.OPEN) {
    if (typeof message === 'object') {
      message = JSON.stringify(message)
    }
    console.log('[websocket send] ' + message)
    this._ws.send(message)
  }
}
