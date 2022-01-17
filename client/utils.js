
export function sendMessage({ peerName, peerUuid, dest, peerSDP, peerICE }) {
  const message = JSON.stringify({ peerName, peerUuid, dest, peerSDP, peerICE })
  wss.send(message)
}

export function makeLabel(label) {
  const vidLabel = document.createElement('div')
  vidLabel.appendChild(document.createTextNode(label))
  vidLabel.setAttribute('class', 'videoLabel')
  return vidLabel
}

export function updateLayout() {
  // update CSS grid based on number of diplayed videos
  let rowHeight = '98vh'
  let colWidth = '98vw'
  let numVideos = Object.keys(peersMap).length + 1 // add one to include local video

  if (numVideos > 1 && numVideos <= 4) { // 2x2 grid
    rowHeight = '48vh'
    colWidth = '48vw'
  } else if (numVideos > 4) { // 3x3 grid
    rowHeight = '32vh'
    colWidth = '32vw'
  }

  document.documentElement.style.setProperty(`--rowHeight`, rowHeight)
  document.documentElement.style.setProperty(`--colWidth`, colWidth)
}