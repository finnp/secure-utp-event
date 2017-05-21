# secure-utp-event

One-way channel to send and receive encrypted events over UTP. Messages are
defined in protobuf format, and are acknowledged when received. Useful if you
have a centralized discovery mechanism through which everyone knows each other's
public key. This way the problem of identity is propagated to the discovery
mechanism and messages at the request layer can be trusted without a central
authority.

The API might be slightly verbose, but this module is intended as a building
block.

## Example
```js
var rpc = require('secure-utp-event')

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
```