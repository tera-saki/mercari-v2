const Sequelize = require('sequelize')
const { Item } = require('./model/item')
const { db } = require('../config/config.json')

const { database, user, pass, host, dialect } = db
const sequelize = new Sequelize(database, user, pass, { host, dialect })

async function main () {
  try {
    await sequelize.authenticate()
    await Item.sync({ force: true })
    console.log('completed to initialize.')
  } catch (e) {
    console.log(e)
  }
}

main().then(() => {
  process.exit(0)
})