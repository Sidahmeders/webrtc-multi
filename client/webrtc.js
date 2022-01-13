import { createUUID, makeLabel, updateLayout } from './utils.js'
import { errorHandler } from './handlers.js'

(async function start() {
  localUuid = createUUID()
  roomName = prompt('Enter the roomName', '')
  document.getElementById('localVideoContainer').appendChild(makeLabel(roomName))

  // set up local video stream
  const localMediaStream = await navigator.mediaDevices.getUserMedia(constraints)
  localStream = localMediaStream
  document.getElementById('localVideo').srcObject = localStream

  // set up websocket and message all existing clients
  serverConnection = new WebSocket(wssURL)
  serverConnection.onmessage = gotMessageFromServer
  serverConnection.onopen = () => serverConnection.send(JSON.stringify({ 'displayName': roomName, 'uuid': localUuid, 'dest': 'all' }))
})();

function gotMessageFromServer(message) {
  var signal = JSON.parse(message.data)
  var peerUuid = signal.uuid

  // Ignore messages that are not for us or from ourselves
  if (peerUuid == localUuid || (signal.dest != localUuid && signal.dest != 'all')) return

  if (signal.displayName && signal.dest == 'all') {
    // set up peer connection object for a newcomer peer
    setUpPeer(peerUuid, signal.displayName)
    serverConnection.send(JSON.stringify({ 'displayName': roomName, 'uuid': localUuid, 'dest': peerUuid }))

  } else if (signal.displayName && signal.dest == localUuid) {
    // initiate call if we are the newcomer peer
    setUpPeer(peerUuid, signal.displayName, true)

  } else if (signal.sdp) {
    peerConnections[peerUuid].pc.setRemoteDescription(new RTCSessionDescription(signal.sdp)).then(function () {
      // Only create answers in response to offers
      if (signal.sdp.type == 'offer') {
        peerConnections[peerUuid].pc.createAnswer().then(description => createdDescription(description, peerUuid)).catch(errorHandler)
      }
    }).catch(errorHandler)

  } else if (signal.ice) {
    peerConnections[peerUuid].pc.addIceCandidate(new RTCIceCandidate(signal.ice)).catch(errorHandler)
  }
}

function setUpPeer(peerUuid, displayName, initCall = false) {
  peerConnections[peerUuid] = { 'displayName': displayName, 'pc': new RTCPeerConnection(peerConnectionConfig) }
  peerConnections[peerUuid].pc.onicecandidate = event => gotIceCandidate(event, peerUuid)
  peerConnections[peerUuid].pc.ontrack = event => gotRemoteStream(event, peerUuid)
  peerConnections[peerUuid].pc.oniceconnectionstatechange = event => checkPeerDisconnect(event, peerUuid)
  peerConnections[peerUuid].pc.addStream(localStream)

  if (initCall) {
    peerConnections[peerUuid].pc.createOffer().then(description => createdDescription(description, peerUuid)).catch(errorHandler)
  }
}

function gotIceCandidate(event, peerUuid) {
  if (event.candidate != null) {
    serverConnection.send(JSON.stringify({ 'ice': event.candidate, 'uuid': localUuid, 'dest': peerUuid }))
  }
}

function createdDescription(description, peerUuid) {
  peerConnections[peerUuid].pc.setLocalDescription(description).then(() => {
    serverConnection.send(JSON.stringify({ 'sdp': peerConnections[peerUuid].pc.localDescription, 'uuid': localUuid, 'dest': peerUuid }))
  }).catch(errorHandler)
}

function gotRemoteStream(event, peerUuid) {
  //assign stream to new HTML video element
  var vidElement = document.createElement('video')
  vidElement.setAttribute('autoplay', '')
  vidElement.setAttribute('muted', '')
  vidElement.srcObject = event.streams[0]

  var vidContainer = document.createElement('div')
  vidContainer.setAttribute('id', 'remoteVideo_' + peerUuid)
  vidContainer.setAttribute('class', 'videoContainer')
  vidContainer.appendChild(vidElement)
  vidContainer.appendChild(makeLabel(peerConnections[peerUuid].displayName))

  document.getElementById('videos').appendChild(vidContainer)
  updateLayout()
}

function checkPeerDisconnect(event, peerUuid) {
  var state = peerConnections[peerUuid].pc.iceConnectionState
  if (state === "failed" || state === "closed" || state === "disconnected") {
    delete peerConnections[peerUuid]
    document.getElementById('videos').removeChild(document.getElementById('remoteVideo_' + peerUuid))
    updateLayout()
  }
}
