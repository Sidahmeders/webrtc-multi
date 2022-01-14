var wssURL = `ws://${window.location.hostname}:8080`
var wss
var peerConnections = {} // key is uuid, values are peer connection object and user defined display name string
var localUuid
var displayName
var localStream

var constraints = {
  video: {
    width: {max: 320},
    height: {max: 240},
    frameRate: {max: 30},
  },
  audio: false,
}

var peerConnectionConfig = {
  'iceServers': [
    { 'urls': 'stun:stun.stunprotocol.org:3478' },
    { 'urls': 'stun:stun.l.google.com:19302' },
  ]
}
