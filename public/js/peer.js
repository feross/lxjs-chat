module.exports = Peer

var EventEmitter = require('events').EventEmitter
var inherits = require('inherits')

var RTCPeerConnection = window.mozRTCPeerConnection
  || window.RTCPeerConnection
  || window.webkitRTCPeerConnection

var RTCSessionDescription = window.mozRTCSessionDescription
  || window.RTCSessionDescription
  || window.webkitRTCSessionDescription

var RTCIceCandidate = window.mozRTCIceCandidate
  || window.RTCIceCandidate
  || window.webkitRTCIceCandidate

var CONFIG = {
  iceServers: [ { url: 'stun:23.21.150.121' } ]
}

var CONSTRAINTS = {}

var CHANNEL_NAME = 'instant.io'

inherits(Peer, EventEmitter)

function Peer (opts) {
  this._init(opts)
}

Peer.prototype.destroy = function () {
  // TODO: what methods actually kill the pc and channel?
  this._pc = null
  this._channel = null
  this.emit = function () {} // kill all future events
}

Peer.prototype._init = function (opts) {
  opts = opts || {}
  this._pc = new RTCPeerConnection(CONFIG, CONSTRAINTS)

  if (opts.initiator) {
    this._setupData()
  } else {
    this._pc.ondatachannel = this._setupData.bind(this)
  }

  var self = this
  this._pc.onnegotiationneeded = function (event) {
    console.log('negotationneeded')
    self._pc.createOffer(function (offer) {
      self._pc.setLocalDescription(offer)
      self.emit('signal', offer)
    }, self._onerror.bind(self))
  }

  this._pc.onicecandidate = function (event) {
    if (event.candidate) {
      self.emit('signal', { candidate: event.candidate })
    }
  }

  this._pc.onaddstream = function (event) {
    var stream = event.stream
    self.emit('stream', stream)
  }

  // Useful for debugging
  this._pc.onicechange = function (event) {
    self.emit('icechange', self._pc.iceGatheringState, self._pc.iceConnectionState)
  }
  this._pc.onstatechange = function (event) {
    self.emit('statechange', self._pc.signalingState, self._pc.readyState)
  }
}

Peer.prototype._setupData = function (event) {
  this._channel = event
    ? event.channel
    : this._pc.createDataChannel(CHANNEL_NAME)

  var self = this
  this._channel.onopen = function (event) {
    self.emit('ready')
  }
  this._channel.onmessage = function (event) {
    console.log('[datachannel] ' + event.data)
    self.emit('message', event.data)
    try {
      var message = JSON.parse(event.data)
    } catch (err) {
      return
    }
    self.emit(message.type, message.data)
  }

  if (window.mozRTCPeerConnection && this.initiator) {
    // Firefox does not trigger this event automatically
    // TODO: verify
    setTimeout(this._pc.onnegotiationneeded.bind(this._pc), 0)
  }
}

Peer.prototype.signal = function (data) {
  var self = this
  if (!this._pc) return
  if (typeof data === 'string') {
    try {
      data = JSON.parse(data)
    } catch (err) {
      data = {}
    }
  }
  if (data.sdp) {
    this._pc.setRemoteDescription(new RTCSessionDescription(data), function () {
      var needsAnswer = self._pc.remoteDescription.type === 'offer'
      if (needsAnswer) {
        self._pc.createAnswer(function (answer) {
          self._pc.setLocalDescription(answer)
          self.emit('signal', answer)
        }, self._onerror.bind(self))
      }
    }, self._onerror.bind(self))

  } else if (data.candidate) {
    try {
      this._pc.addIceCandidate(new RTCIceCandidate(data.candidate))
    } catch (err) {
      self.emit('error', new Error('error adding candidate, ' + err.message))
    }

  } else {
    self.emit('error', new Error('signal() called with invalid signal data'))
  }
}

Peer.prototype.addStream = function (stream) {
  if (!this._pc) return
  this._pc.addStream(stream)
}

Peer.prototype.send = function (data) {
  if (!this._pc || !this._channel || this._channel.readyState !== 'open') return
  if (typeof data === 'object') {
    this._channel.send(JSON.stringify(data))
  } else {
    this._channel.send(data)
  }
}

Peer.prototype._onerror = function (err) {
  this.emit('error', err)
}
