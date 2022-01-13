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