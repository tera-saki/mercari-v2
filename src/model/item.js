const Sequelize = require('sequelize')
const { db } = require('../../config/config.json')

const { database, user, pass, host, dialect } = db
const sequelize = new Sequelize(database, user, pass, { host, dialect })

const Item = sequelize.define('item', {
  title: {
    type: Sequelize.STRING,
    allowNull: false
  },
  price: {
    type: Sequelize.INTEGER,
    allowNull: false
  },
  url: {
    type: Sequelize.STRING,
    allowNull: false
  }
}, {
    underscored: true,
})

module.exports = { Item }