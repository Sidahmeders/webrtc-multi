import { sendMessage, updateLayout, makeLabel } from './utils.js'

export function onIceCandidateHandler(event, peerUuid) {
  if (event.candidate) {
    sendMessage({ peerICE: event.candidate, peerUuid: localUuid, dest: peerUuid })
  }
}

export function onPeerDisconnectHandler(event, peerUuid) {
  let state = peersMap[peerUuid].pc.iceConnectionState
  if (state === "failed" || state === "closed" || state === "disconnected") {
    delete peersMap[peerUuid]
    document.getElementById('videos').removeChild(document.getElementById('remoteVideo_' + peerUuid))
    updateLayout()
  }
}

export async function createlocalMediaStream() {
  displayName = prompt('Enter your name', '')
  document.getElementById('localVideoContainer').appendChild(makeLabel(displayName))

  // set up local video stream
  const localMediaStream = await navigator.mediaDevices.getUserMedia(constraints)
  localStream = localMediaStream
  document.getElementById('localVideo').srcObject = localStream
}

export function remoteStreamHandler(event, peerUuid) {
  //assign stream to new HTML video element
  let vidElement = document.createElement('video')
  vidElement.setAttribute('autoplay', '')
  vidElement.setAttribute('muted', '')
  vidElement.srcObject = event.streams[0]

  let vidContainer = document.createElement('div')
  vidContainer.setAttribute('id', 'remoteVideo_' + peerUuid)
  vidContainer.setAttribute('class', 'videoContainer')
  vidContainer.appendChild(vidElement)
  vidContainer.appendChild(makeLabel(peersMap[peerUuid].displayName))

  document.getElementById('videos').appendChild(vidContainer)
  updateLayout()
}