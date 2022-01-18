import { sendMessage } from './utils.js'
import {
  localMediaStreamHandler,
  remoteMediaStreamHandler,
  onIceCandidateHandler,
  handleSDPSignalling,
  onPeerDisconnectHandler, 
} from './handlers.js'

(async function start() {
  await localMediaStreamHandler()
  // set up websocket and message all existing clients
  wss = new WebSocket(wssURL)
  wss.onmessage = handleWssMessages
})();

async function handleWssMessages(message) {
  message = JSON.parse(message.data)
  const { wsId, peerName, peerUuid, peerICE, peerSDP, dest } = message
  
  if (!localUuid) {
    localUuid = wsId
    sendMessage({ peerName: displayName, peerUuid: localUuid, dest: 'all' })
  }

  if (peerName) {
    if (dest == 'all') {
      setUpPeer(peerUuid, peerName) // set up peer connection object
      sendMessage({ peerName: displayName, peerUuid: localUuid, dest: peerUuid })
    } else {
      setUpPeer(peerUuid, peerName) // initiate a call
      const offerDescription = await peersMap[peerUuid].pc.createOffer()
      await handleSDPSignalling(offerDescription, peerUuid)
    }
  }
  if (peerSDP) SDPHandler(peerSDP, peerUuid)
  if (peerICE) ICECandidatesHandler(peerICE, peerUuid)
}

async function SDPHandler(peerSDP, peerUuid) {
  peersMap[peerUuid].pc.setRemoteDescription(new RTCSessionDescription(peerSDP))
  if (peerSDP.type == 'offer') {
    const answerDescription = await peersMap[peerUuid].pc.createAnswer()
    await handleSDPSignalling(answerDescription, peerUuid)
  }
}

function ICECandidatesHandler(peerICE, peerUuid) {
  peersMap[peerUuid].pc.addIceCandidate(new RTCIceCandidate(peerICE))
}

async function setUpPeer(peerUuid, displayName) {
  peersMap[peerUuid] = { id: peerUuid, displayName, pc: new RTCPeerConnection(peerConnectionConfig) }
  peersMap[peerUuid].pc.onicecandidate = event => onIceCandidateHandler(event, peerUuid)
  peersMap[peerUuid].pc.ontrack = event => remoteMediaStreamHandler(event, peerUuid)
  peersMap[peerUuid].pc.oniceconnectionstatechange = event => onPeerDisconnectHandler(event, peerUuid)
  localStream.getTracks().forEach(track => peersMap[peerUuid].pc.addTrack(track, localStream))
}
