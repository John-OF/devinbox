import { app } from './app.ts'

const port = Number(process.env.API_PORT ?? 3001)
// Solo loopback: el servidor de desarrollo no debe ser accesible desde la red Wi-Fi
const host = '127.0.0.1'

app.listen(port, host, () => {
  console.log(`[api] escuchando en http://${host}:${port}`)
})
