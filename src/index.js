const fs = require('fs')
const path = require('path')
const { Builder, By, Key, until } = require('selenium-webdriver')
const { Options } = require('selenium-webdriver/chrome')
const axios = require('axios')
const { crawling } = require('./crawling')
const { webhook } = require('../config/config.json')


async function createDriver () {
  const options = new Options().addArguments(['--headless'])
  return await new Builder()
    .forBrowser('chrome')
    .setChromeOptions(options)
    .build()
}

function create_message(item) {
  let pretext = ''
  let text = ''

  if (!item.on_sale) text += ':balloon: Sold!\n'
  switch (item.status) {
    case 'new':
      pretext = ':tada: New!'
      text += `price: ${item.price}\n`
      break
    case 'discount':
      pretext = ':moneybag: Discount!'
      text += `price: ${item.price} (${item.discount})`
      break
  }

  return {
    "pretext": pretext,
    "title": item.title,
    "text": text,
    "title_link": item.url,
    "thumb_url": item.img_url
  }
}

async function send (updated_items) {
  const messages = []
  for (const item of updated_items) {
    messages.push(create_message(item))
  }
  await axios.post(webhook, { attachments: messages })
}

async function main () {
  const driver = await createDriver()

  const target_dir = path.join(__dirname, '..', 'config', 'targets')
  const target_files = fs.readdirSync(target_dir)

  for (const file of target_files) {
    const target = require(path.join(target_dir, file))
    if (target.ignore) continue
    try {
      const updated_items = await crawling(driver, target)
      if (updated_items.length === 0) continue
      await send(updated_items)
    } catch (e) {
      console.log(e)
    }
  }
  await driver.quit()
}

main().then(() => {
  process.exit(0)
})