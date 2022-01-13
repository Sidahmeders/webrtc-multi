const HTTPS_PORT = 8443 //default port for https is 443
const HTTP_PORT = 8080  //default port for http is 80

const fs = require('fs')
const http = require('http')
const https = require('https')
const WebSocket = require('ws')
const WebSocketServer = WebSocket.Server

// Yes, TLS is required
const serverConfig = {
  key: fs.readFileSync('key.pem'),
  cert: fs.readFileSync('cert.pem')
}

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

const httpsServer = https.createServer(serverConfig, handleRequest)
httpsServer.listen(HTTPS_PORT, () => console.log(`server running on port ${HTTPS_PORT}...`))

// Create a server for handling websocket calls
const wss = new WebSocketServer({ server: httpsServer })

wss.on('connection', ws => {
  ws.on('message', message => {
    // Broadcast any received message to all clients
    wss.broadcast(message)
  })
  ws.on('error', () => ws.terminate())
})

wss.broadcast = function (data){
  this.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) client.send(data)
  })
}

// Separate server to redirect from http to https
http.createServer((req, res) => {
    res.writeHead(301, { "Location": "https://" + req.headers['host'] + req.url })
    res.end()
}).listen(HTTP_PORT, () => console.log(`server running on ${HTTP_PORT}...`))