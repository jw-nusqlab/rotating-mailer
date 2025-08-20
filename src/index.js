require("dotenv").config()
const { PORT } = require("./config")
const logger = require("./config/logger")
const startServer = require("./server")
const storage = require("./repositories/storage")
const queueService = require("./services/queue.service")

let app = null
let isInitialized = false

async function initializeApp() {
  if (isInitialized) {
    return app
  }

  try {
    await storage.connect()
    logger.info("Connected to MongoDB")

    // start express server (without listen)
    app = await startServer()

    // init queue & worker
    await queueService.init()
    logger.info("Queue service initialized")

    isInitialized = true
    return app
  } catch (err) {
    logger.error("Startup error", err)
    throw err
  }
}

module.exports = async (req, res) => {
  try {
    const expressApp = await initializeApp()
    return expressApp(req, res)
  } catch (error) {
    logger.error("Request handling error", error)
    res.status(500).json({ error: "Internal server error" })
  }
}

if (require.main === module) {
  async function main() {
    try {
      const expressApp = await initializeApp()
      expressApp.listen(PORT || 3000, () => {
        logger.info(`Server listening on port ${PORT || 3000}`)
      })
    } catch (err) {
      logger.error("Startup error", err)
      process.exit(1)
    }
  }

  main()
}
