import { httpServer } from './app.js'

const PORT = Number(process.env.PORT || 3000)

httpServer.listen(PORT, () => {
  console.log(`SeatSync backend running on port ${PORT}`)
})
