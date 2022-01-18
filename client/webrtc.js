import { sendMessage } from './utils.js'
import {
  localMediaStreamHandler,
  remoteMediaStreamHandler,
  onIceCandidateHandler,
  onPeerDisconnectHandler, 
} from './handlers.js'

(async function start() {
  await localMediaStreamHandler()
  
  // set up websocket and message all existing clients
  wss = new WebSocket(wssURL)
  wss.onmessage = handleServerMessages
})();

function handleServerMessages(message) {
  message = JSON.parse(message.data)
  const { wsId, peerName, peerUuid, peerICE, peerSDP, dest } = message
  
  if (!localUuid) {
    localUuid = wsId
    sendMessage({ peerName: displayName, peerUuid: localUuid, dest: 'all' })
  }

  if (peerName) {
    if (dest == 'all') {
      setUpPeer(peerUuid, peerName) // set up peer connection object for a newcomer peer
      sendMessage({ peerName: displayName, peerUuid: localUuid, dest: peerUuid })
    }
    else setUpPeer(peerUuid, peerName, true) // initiate call if we are the newcomer peer
  }
  if (peerSDP) {
    peersMap[peerUuid].pc.setRemoteDescription(new RTCSessionDescription(peerSDP))
    if (peerSDP.type == 'offer') peersMap[peerUuid].pc.createAnswer().then(description => createdDescription(description, peerUuid))
  }
  if (peerICE) peersMap[peerUuid].pc.addIceCandidate(new RTCIceCandidate(peerICE))
}

async function setUpPeer(peerUuid, displayName, initCall = false) {
  peersMap[peerUuid] = { id: peerUuid, displayName, pc: new RTCPeerConnection(peerConnectionConfig) }
  peersMap[peerUuid].pc.onicecandidate = event => onIceCandidateHandler(event, peerUuid)
  peersMap[peerUuid].pc.ontrack = event => remoteMediaStreamHandler(event, peerUuid)
  peersMap[peerUuid].pc.oniceconnectionstatechange = event => onPeerDisconnectHandler(event, peerUuid)
  localStream.getTracks().forEach(track => peersMap[peerUuid].pc.addTrack(track, localStream))
  
  if (initCall) {
    const description = await peersMap[peerUuid].pc.createOffer()
    await createdDescription(description, peerUuid)
  }
}

async function createdDescription(description, peerUuid) {
  await peersMap[peerUuid].pc.setLocalDescription(description)
  sendMessage({ peerSDP: description, peerUuid: localUuid, dest: peerUuid })
}
