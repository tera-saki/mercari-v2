const { Builder, By, Key, until } = require('selenium-webdriver')
const { Options } = require('selenium-webdriver/chrome')

async function fe (driver, klass) {
  return await driver.findElement(By.className(klass))
}

async function fes (driver, klass) {
  return await driver.findElements(By.className(klass))
}

function check_title (item, target) {
  const { title } = item
  const { exclude_word } = target

  if (!exclude_word) return true

  return exclude_word.split(',')
    .reduce((acc, e) => acc && !title.includes(e), true)
}

function check_price (item, target) {
  const { price } = item
  const { max_price } = target

  return !max_price || price <= max_price
}

module.exports = { fe, fes, check_title, check_price }