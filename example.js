var rpc = require('./')

var PORT = 3000
var schema = `
  message Test {
    required string hello = 1;
  }
`

var client = rpc.client(schema)
var server = rpc.server(schema, function (socket, cb) {
  // this function is to find the public key of the sender to verify
  // their identity
  cb(null, client.publicKey)
})

server.on('test', function (message) {
  console.log('message', message)
})

server.listen(PORT)

var credentials = {
  publicKey: server.publicKey,
  nonce: server.nonce
}

var eventName = 'test'
var message = { hello: 'cat world' }
var address = {
  port: PORT,
  host: '127.0.0.1'
}
client.send(eventName, address, credentials, message, function (err) {
  if (err) return console.error(err)
  console.log('sent message')
})
