import dotenv from 'dotenv'
import express from 'express'
import type { Request, Response } from 'express'

const app = express()
app.use(express.json())

dotenv.config()

app.get('/helloworld', (req: Request, res: Response) => {
  res.status(200).send('Hello Weirdo!')
})

const SERVER_PORT = Number(
  process.env.DEFAULT_SERVER_PORT ?? process.env.ALTERNATIVE_SERVER_PORT ?? 3000,
)

app.listen(SERVER_PORT, () => {
  console.log(`Server running on http://localhost:${SERVER_PORT}`)
})
