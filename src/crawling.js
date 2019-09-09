const { Builder, By, Key, until } = require('selenium-webdriver')
const { Options } = require('selenium-webdriver/chrome')
const _ = require('lodash')
const { Item } = require('./model/item')
const { fe, fes, check_title, check_price } = require('./util')

const base_url = 'https://www.mercari.com/jp'

async function search_wrap(driver, search_word, max_newest) {
  await driver.get(`${base_url}/search/?keyword=${encodeURIComponent(search_word)}`)

  const items = await fes(driver, 'items-box')
  const n = max_newest ? Math.min(items.length, max_newest) : items.length
  return (
    await Promise.all(
      items.slice(0, n).map(item => item.findElement(By.css('a')).getAttribute('href'))
    )
  ).map(u => u.split('?')[0])
}

async function search (driver, target) {
  const { search_words, max_newest } = target
  const words = search_words.split(',')
  const urls = []
  for (const w of words) {
    urls.push(await search_wrap(driver, w, max_newest))
  }
  return _.flatten(urls)
}

async function get_item_info (driver, url) {
  await driver.get(url)
  await driver.wait(until.elementLocated(By.className('item-photo')))
  const title = await (await fe(driver, 'item-name')).getText()
  const photo_el = await fe(driver, 'item-photo')
  const img_url = (
    await (await photo_el.findElement(By.css('img'))).getAttribute('data-src')
  ).split('?')[0]
  const price = (
    await (await driver.findElement(By.xpath("//div[@class='item-price-box text-center']/span[@class='item-price bold']"))).getText()
  ).replace(/¥|,/g, '')
  let on_sale
  try {
    await driver.findElement(By.xpath("//div[@class='item-buy-btn disabled']"))
    on_sale = false
  } catch (e) {
    on_sale = true
  }
  return { url, title, price, img_url, on_sale }
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
  const urls = await search(driver, target)
  const may_update_list = []
  for (const url of urls) {
    try {
      const item = await get_item_info(driver, url)
      if (!is_desired(item, target)) continue

      may_update_list.push(
        may_update_item(item)
      )
    } catch (e) {
      console.log(e)
    }
  }
  return (await Promise.allSettled(may_update_list)).map(o => o.value).filter(v => v)
}

module.exports = { crawling }