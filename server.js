const HTTP_PORT = 8080

import fs from 'fs'
import http from 'http'
import WebSokect, { WebSocketServer } from 'ws'

// Create a server for the client html page
const handleRequest = (req, res) => {
 if (req.url === '/webrtc.js') {
    res.writeHead(200, { 'Content-Type': 'application/javascript' })
    res.end(fs.readFileSync('client/webrtc.js'))
  } else if (req.url === '/style.css') {
    res.writeHead(200, { 'Content-Type': 'text/css' })
    res.end(fs.readFileSync('client/style.css'))
  } else {
    res.writeHead(200, { 'Content-Type': 'text/html' })
    res.end(fs.readFileSync('client/index.html'))
  }
}

const httpServer = http.createServer(handleRequest)
.listen(HTTP_PORT, () => console.log(`server running on ${HTTP_PORT}...`))

// Create a server for handling websocket calls
const wss = new WebSocketServer({ server: httpServer })

wss.on('connection', ws => {
  ws.on('message', (data, isBinary) => {
    const message = isBinary ? data : data.toString()
    wss.broadcast(message) // Broadcast any received message to all clients
  })
  ws.on('error', () => ws.terminate())
})

wss.broadcast = function(data) {
  wss.clients.forEach(client => {
    if (client.readyState === WebSokect.OPEN) client.send(data)
  })
}
