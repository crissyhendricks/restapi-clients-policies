const jwt = require('jsonwebtoken')
const http = require('http')
const {
  JWT_SECRET,
  CLIENTS_URL,
  JWT_EXPIRATION
} = require('../properties/application.properties')

function login(req, res) {
  const username = req.body.username

  const request = new Promise((resolve, reject) => {
    http.get(CLIENTS_URL, (response) => {
      const chunks = []

      response.on('data', (fragments) => {
        chunks.push(fragments)
      })

      response.on('end', () => {
        const response = Buffer.concat(chunks)
        resolve(response.toString())
      })

      response.on('error', (error) => {
        reject(error)
      })
    })
  })

  request
    .then((response) => {
      if (!response.empty) {
        const user = JSON.parse(response).clients.find(
          (it) => it.name === username
        )

        if (user) {
          jwt.sign(
            { user },
            JWT_SECRET,
            { expiresIn: JWT_EXPIRATION },
            (err, token) => {
              if(!err){
                res.status(200).send({ Bearer: token })
              }else{
                res.status(400).send({ message: err })
              }
            }
          )
        } else {
          res
            .status(404)
            .send({ message: `No user with id '${username}' not found` })
        }
      } else {
        res.status(404).send({ message: `No results` })
      }
    })
    .catch((error) => {
      res.status(500).send({ message: error.message })
    })
}

function ensureAuthenticated(req, res, next) {
  if (req.headers.authorization) {
    const token = req.headers.authorization.split(' ')[1]

    if (token) {
      jwt.verify(token, JWT_SECRET, (err, decoded) => {
        if (err) {
          if (err instanceof jwt.TokenExpiredError) {
            res.status(403).send({ message: 'Token expired' })
          } else {
            res.status(403).send({ message: 'Invalid Token' })
          }
        } else {
          req.decoded = decoded
          next()
        }
      })
    } else {
      res.status(403).send({ message: 'Access Denied' })
    }
  } else {
    res.status(403).send({ message: 'Access Denied' })
  }
}

module.exports = {
  login,
  ensureAuthenticated,
}
