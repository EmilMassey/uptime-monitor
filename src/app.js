const express = require('express')
const axios = require('axios')
const { v4: uuidv4 } = require('uuid')
const { ValidationError } = require('joi')

const DataManager = require('./DataManager')
const entryValidator = require('./validators/entry')

const app = express()
const port = 3000
const entriesManager = new DataManager('entries.json')

function createError(status = 500, msg = 'Internal Server Error') {
  const err = new Error(msg)
  err.status = status

  return err
}

app.get('/', (req, res) => {
  res.send('Hello World!')
})

app.use(express.json())

app.use('/api', async function (req, res, next) {
  const accessToken =
    req.query['access_token'] || req.header('access_token') || req.body['access_token']

  if (!accessToken) {
    return next(createError(401, 'Unauthorized. You must pass Access Token to the request.'))
  }

  try {
    const response = await axios.get(
      `https://gitlab.empressia.pl/api/v4/user?access_token=${accessToken}`,
    )
    const user = response.data

    if (!user.is_admin || user.state !== 'active') {
      return next(
        createError(403, "Access Forbidden. You must be Gitlab's administrator to access API."),
      )
    }

    req.user = user
    next()
  } catch (error) {
    if (error.response.status === 401) {
      return next(createError(401, 'Unauthorized. Your Access Token is invalid.'))
    }

    return next(createError())
  }
})

app.get('/api/entries', async function (req, res) {
  res.send((await entriesManager.read()) || [])
})

app.post('/api/entries', async function (req, res, next) {
  let entry

  try {
    entry = await entryValidator.validateAsync(req.body)
  } catch (e) {
    return next(e)
  }

  entry.id = uuidv4()
  await entriesManager.insert(entry)

  res.status(201)
  res.send(entry)
})

app.get('/api/entries/:id', async function (req, res, next) {
  const id = req.params.id
  const entry = await entriesManager.findBy('id', id)

  if (entry.length > 0) {
    res.send(entry[0])
  } else {
    next()
  }
})

app.delete('/api/entries/:id', async function (req, res, next) {
  const id = req.params.id
  const entry = await entriesManager.findBy('id', id)

  if (entry.length > 0) {
    await entriesManager.delete('id', id)

    res.status(204)
    res.send()
  } else {
    next()
  }
})

app.put('/api/entries/:id', async function (req, res, next) {
  let data

  try {
    data = await entryValidator.validateAsync(req.body)
  } catch (e) {
    return next(e)
  }

  const id = req.params.id
  const entry = await entriesManager.findBy('id', id)

  if (entry.length > 0) {
    data.id = id
    await entriesManager.update(data, 'id', id)
    res.send(data)
  } else {
    next()
  }
})

app.use(function (err, req, res, next) {
  if (err instanceof ValidationError) {
    res.status(400)
    res.send({ error: 'Validation Failed', details: err.details })

    return
  }

  res.status(err.status)
  res.send({ error: err.message })
})

app.use(function (req, res) {
  res.status(404)
  res.send({ error: 'Not found' })
})

app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`)
})
