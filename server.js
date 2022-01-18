import path from 'path'
import express from 'express'
import { createServer } from 'http'
import WebSokect, { WebSocketServer } from 'ws'

const app = express()
const httpServer = createServer(app)

app.use(express.static(path.join(path.resolve(), '/client')))
app.get('/', (_, res) => res.render('index'))

const HTTP_PORT = 8080
httpServer.listen(HTTP_PORT, () => console.log(`server running on ${HTTP_PORT}...`))

// Create a server for handling websocket calls
const wss = new WebSocketServer({ server: httpServer })

wss.on('connection', ws => {
  wss.sendClientId(ws)

  ws.on('message', (data, isBinary) => {
    const message = isBinary ? data : data.toString()
    wss.broadcast(ws, message) // Broadcast any received message to all clients
  })

  ws.on('error', () => ws.terminate())
})

wss.sendClientId = function(ws) {
  ws.id = wss.getUuid()
  const payload = JSON.stringify({ wsId: ws.id })
  ws.send(payload)
}

wss.broadcast = function(ws, message) {
  let { dest } = JSON.parse(message)

  wss.clients.forEach(client => {
    if (
        client != ws &&
        client.readyState === WebSokect.OPEN &&
        (dest == client.id || dest == 'all')
      ) client.send(message)
  })
}

wss.getUuid = function() {
  const s4 = () => Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1)
  return s4() + s4() + '-' + s4() + '-' + s4() + '-' + s4() + '-' + s4() + s4() + s4()
}
