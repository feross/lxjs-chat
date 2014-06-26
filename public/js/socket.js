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
  this._ws.onerror = once(this._onerror.bind(this))
}

Socket.prototype._onopen = function () {
  this._ws.onmessage = this._onmessage.bind(this)
  this._ws.onclose = this._onclose.bind(this)
  this.emit('ready')
}

Socket.prototype._onerror = function (err) {
  this.emit('error', err)
  this.close()
}

Socket.prototype.close = function () {
  if (this._ws) {
    try {
      this._ws.close()
    } catch (err) {}

    this._ws.onopen = null
    this._ws.onerror = null
    this._ws.onmessage = null
    this._ws.onclose = null
  }

  this._ws = null
}

Socket.prototype._onmessage = function (event) {
  console.log('[websocket receive] ' + event.data)
  this.emit('message', event.data)
  try {
    var message = JSON.parse(event.data)
  } catch (err) {
    return
  }
  this.emit(message.type, message.data)
}

// Socket should never close, so if it does, automatically reconnect
Socket.prototype._onclose = function () {
  setTimeout(this._init.bind(this), RECONNECT_TIMEOUT)
}

Socket.prototype.send = function (message) {
  if (this._ws && this._ws.readyState === 1) { // TODO: use constant
    if (typeof message === 'object') {
      message = JSON.stringify(message)
    }
    console.log('[websocket send] ' + message)
    this._ws.send(message)
  }
}
