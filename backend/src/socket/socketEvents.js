export const emitSocketEvent = (event, payload) => {
  const io = globalThis.__SEATSYNC_IO__
  if (io) {
    io.emit(event, payload)
  }
  return payload
}
