import { sendMessage, createUUID, makeLabel, updateLayout } from './utils.js'
import { errorHandler } from './handlers.js'

(async function start() {
  localUuid = createUUID()
  displayName = prompt('Enter your name', '')
  document.getElementById('localVideoContainer').appendChild(makeLabel(displayName))

  // set up local video stream
  const localMediaStream = await navigator.mediaDevices.getUserMedia(constraints)
  localStream = localMediaStream
  document.getElementById('localVideo').srcObject = localStream

  // set up websocket and message all existing clients
  wss = new WebSocket(wssURL)
  wss.onmessage = handleServerMessages
  wss.onopen = () => sendMessage({ peerName: displayName, peerUuid: localUuid, dest: 'all' })
})();

function handleServerMessages(message) {
  message = JSON.parse(message.data)
  const { peerName, peerUuid, peerICE, peerSDP, dest } = message

  // Ignore messages that are not for us or from ourselves NOTE: this should be handled on the server
  if (peerUuid == localUuid || (dest != localUuid && dest != 'all')) return

  if (peerName && dest == 'all') {
    // set up peer connection object for a newcomer peer
    setUpPeer(peerUuid, peerName)
    sendMessage({ peerName: displayName, peerUuid: localUuid, dest: peerUuid })
  } else if (peerName && dest == localUuid) {
    // initiate call if we are the newcomer peer
    setUpPeer(peerUuid, peerName, true)
  } else if (peerSDP) {
    peerConnections[peerUuid].pc.setRemoteDescription(new RTCSessionDescription(peerSDP)).then(function () {
      // Only create answers in response to offers
      if (peerSDP.type == 'offer') {
        peerConnections[peerUuid].pc.createAnswer().then(description => createdDescription(description, peerUuid)).catch(errorHandler)
      }
    }).catch(errorHandler)
  } else if (peerICE) {
    peerConnections[peerUuid].pc.addIceCandidate(new RTCIceCandidate(peerICE)).catch(errorHandler)
  }
}

function setUpPeer(peerUuid, displayName, initCall = false) {
  peerConnections[peerUuid] = { displayName, pc: new RTCPeerConnection(peerConnectionConfig) }
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
    sendMessage({ peerICE: event.candidate, peerUuid: localUuid, dest: peerUuid })
  }
}

function createdDescription(description, peerUuid) {
  peerConnections[peerUuid].pc.setLocalDescription(description).then(() => {
    sendMessage({ peerSDP: peerConnections[peerUuid].pc.localDescription, peerUuid: localUuid, dest: peerUuid })
  }).catch(errorHandler)
}

function gotRemoteStream(event, peerUuid) {
  //assign stream to new HTML video element
  let vidElement = document.createElement('video')
  vidElement.setAttribute('autoplay', '')
  vidElement.setAttribute('muted', '')
  vidElement.srcObject = event.streams[0]

  let vidContainer = document.createElement('div')
  vidContainer.setAttribute('id', 'remoteVideo_' + peerUuid)
  vidContainer.setAttribute('class', 'videoContainer')
  vidContainer.appendChild(vidElement)
  vidContainer.appendChild(makeLabel(peerConnections[peerUuid].displayName))

  document.getElementById('videos').appendChild(vidContainer)
  updateLayout()
}

function checkPeerDisconnect(event, peerUuid) {
  let state = peerConnections[peerUuid].pc.iceConnectionState
  if (state === "failed" || state === "closed" || state === "disconnected") {
    delete peerConnections[peerUuid]
    document.getElementById('videos').removeChild(document.getElementById('remoteVideo_' + peerUuid))
    updateLayout()
  }
}
