const { Builder, By, Key, until } = require('selenium-webdriver')
const { Options } = require('selenium-webdriver/chrome')
const _ = require('lodash')
const { Item } = require('./model/item')
const { fe, fes, check_title, check_price } = require('./util')

const base_url = 'https://www.mercari.com/jp'

async function search (driver, target) {
  const { search_words, max_newest } = target
  const words = search_words.split(',')
  const results = []
  for (const w of words) {
    results.push(await search_wrap(driver, w, max_newest))
  }
  return _.flatten(results)
}

async function search_wrap(driver, search_word, max_newest) {
  await driver.get(`${base_url}/search/?keyword=${encodeURIComponent(search_word)}`)
  await driver.wait(until.elementLocated(By.className('items-box-photo')))

  const items = await fes(driver, 'items-box')
  const n = max_newest ? Math.min(items.length, max_newest) : items.length
  return (
    await Promise.allSettled(
      items.slice(0, n).map(item => get_item_info(item))
    )
  ).map(o => o.value).filter(v => v)
}

async function get_item_info (driver) {
  try {
    const url = await driver.findElement(By.css('a')).getAttribute('href')
    const title = await (await fe(driver, 'items-box-name')).getText()
    const img_url = (
      await (await driver.findElement(By.css('img'))).getAttribute('data-src')
    ).split('?')[0]
    const price = (
      await (await fe(driver, 'items-box-price')).getText()
    ).replace(/¥|,/g, '')
    let on_sale
    try {
      await fe(driver, 'item-sold-out-badge')
      on_sale = false
    } catch (e) {
      on_sale = true
    }
    return { url, title, price, img_url, on_sale }
  } catch (e) {
    console.log(e);
  }
}

function is_desired(item, target) {
  return check_title(item, target) && check_price(item, target)
}

async function may_update_item (item) {
  const { url, price } = item
  const [ old_item, created ] = await Item.findOrCreate({
    where: { url },
    defaults: _.pick(item, ['url', 'title', 'price'])
  })
  if (created) {
    return { ...item, status: 'new' }
  } else {
    const { price: old_price } = old_item.get()
    if (price < old_price) {
      await Item.update(_.pick(item, ['url', 'title', 'price']), { where: { url } })
      return { ...item, discount: price - old_price, status: 'discount' }
    }
  }
}

async function crawling (driver, target) {
  const items = await search(driver, target)
  const filtered_items = items.filter(item => is_desired(item, target))
  const may_update_list = filtered_items.map(item => may_update_item(item))
  return (await Promise.allSettled(may_update_list)).map(o => o.value).filter(v => v)
}

module.exports = { crawling }