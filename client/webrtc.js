import { sendMessage } from './utils.js'
import {
  errorHandler, 
  createlocalMediaStream, 
  onIceCandidateHandler, 
  onOpenWssHandler, 
  onPeerDisconnectHandler, 
  remoteStreamHandler 
} from './handlers.js'

(async function start() {
  await createlocalMediaStream()
  
  // set up websocket and message all existing clients
  wss = new WebSocket(wssURL)
  wss.onopen = onOpenWssHandler
  wss.onmessage = handleServerMessages
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
  peerConnections[peerUuid].pc.onicecandidate = event => onIceCandidateHandler(event, peerUuid)
  peerConnections[peerUuid].pc.ontrack = event => remoteStreamHandler(event, peerUuid)
  peerConnections[peerUuid].pc.oniceconnectionstatechange = event => onPeerDisconnectHandler(event, peerUuid)
  localStream.getTracks().forEach(track => peerConnections[peerUuid].pc.addTrack(track, localStream))
  
  if (initCall) {
    peerConnections[peerUuid].pc.createOffer().then(description => createdDescription(description, peerUuid)).catch(errorHandler)
  }
}

function createdDescription(description, peerUuid) {
  peerConnections[peerUuid].pc.setLocalDescription(description).then(() => {
    sendMessage({ peerSDP: peerConnections[peerUuid].pc.localDescription, peerUuid: localUuid, dest: peerUuid })
  }).catch(errorHandler)
}
