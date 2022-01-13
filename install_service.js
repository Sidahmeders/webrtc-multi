const Service = require('node-windows').Service

// Create a new service object
const svc = new Service({
  name:'Office Portal Server',
  description: 'Serves web page and acts as WebRTC relay web server.',
  script: 'C:\\Projects\\WebRTC\\Portal\\server\\server.js'
})

// Listen for the "install" event, which indicates the
// process is available as a service.
svc.on('install', () => svc.start())
svc.install()