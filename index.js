var protobufs = require('protocol-buffers-stream')
var utp = require('utp-native')
var concat = require('concat-stream')
var sodium = require('sodium-universal')

exports.server = Server
exports.client = Client

function Server (schema, getPublicKey) {
  if (!(this instanceof Server)) return new Server(schema, getPublicKey)

  this.getPublicKey = getPublicKey
  this.schema = schema
  this.nonce = Buffer.alloc(sodium.crypto_box_NONCEBYTES)
  this.secretKey = Buffer.alloc(sodium.crypto_box_SECRETKEYBYTES)
  this.publicKey = Buffer.alloc(sodium.crypto_box_PUBLICKEYBYTES)
  this.stream = protobufs(schema)()

  sodium.crypto_box_keypair(this.publicKey, this.secretKey)
  sodium.randombytes_buf(this.nonce)
}

Server.prototype.on = function (name, handler) {
  this.stream.on(name, handler)
}

Server.prototype.listen = function (port) {
  var stream = this.stream
  var secretKey = this.secretKey
  var nonce = this.nonce
  var getPublicKey = this.getPublicKey
  utp.createServer(function (socket) {
    socket.on('data', function (cipher) {
      getPublicKey(socket, function (err, publicKey) {
        if (err) return socket.end('err')
        var message = Buffer.alloc(cipher.length - sodium.crypto_box_MACBYTES)
        var success = sodium.crypto_box_open_easy(message, cipher, nonce, publicKey, secretKey)
        if (!success) return socket.end('err')
        stream.write(message)
        socket.end('acc')
      })
    })
  }).listen(port)
}

function Client (schema) {
  if (!(this instanceof Client)) return new Client(schema)
  this.schema = schema
  this.createStream = protobufs(schema)

  this.secretKey = Buffer.alloc(sodium.crypto_box_SECRETKEYBYTES)
  this.publicKey = Buffer.alloc(sodium.crypto_box_PUBLICKEYBYTES)
  sodium.crypto_box_keypair(this.publicKey, this.secretKey)
}

Client.prototype.send = function (name, addr, cred, data, cb) {
  var stream = this.createStream()
  var socket = utp.connect(addr.port, addr.host)
  var clientSecretKey = this.secretKey
  stream[name](data)
  stream.finalize()
  stream.pipe(concat(function (message) {
    var cipher = Buffer.alloc(message.length + sodium.crypto_box_MACBYTES)
    sodium.crypto_box_easy(cipher, message, cred.nonce, cred.publicKey, clientSecretKey)
    socket.write(cipher)
  }))
  socket.on('data', function (res) {
    if (res.toString() === 'err') return cb(new Error('could not send message'))
    cb()
  })
}
