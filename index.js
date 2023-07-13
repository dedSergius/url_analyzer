const express = require('express');
const puppeteer = require('puppeteer');
const path = require('path');
const cors = require('cors');
const app = express();

const port = 80;

let browser;
app.use(cors());
app.use(express.json());
app.use(
  express.urlencoded({
    extended: true,
  })
);

async function analyzeWebsite(url) {
  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });
  const client = await page.target().createCDPSession();
  await client.send('Network.enable');
  const resources = [];
  client.on('Network.responseReceived', (event) => {
    resources.push({
      url: event.response.url,
      status: event.response.status,
      type: event.type,
      mimeType: event.response.mimeType,
      size: event.response.bodySize,
      remoteIPAddress: event.response.remoteIPAddress,
    });
  });
  await page.goto(url, {
    waitUntil: 'load',
  });
  try {
    await page.waitForNavigation({
      waitUntil: 'load',
      timeout: 3000,
    });
  } catch (error) {
    console.log();
  }

  const screenshot =
    'data:image/png;base64,' +
    (await page.screenshot({
      encoding: 'base64',
    }));

  const title = await page.$eval('title', (el) => el.textContent);
  const descEl = await page.$('meta[name="description"]');
  const description = descEl
    ? await descEl.getProperty('content').then((prop) => prop.jsonValue())
    : null;
  await page.close();
  return {
    title,
    description,
    screenshot,
    resources
  };
}

async function getRobotsTxt(url) {
  const page = await browser.newPage();
  const response = await page.goto(url + '/robots.txt', {
    waitUntil: 'load',
  });
  return await response.text();
}

app.get('/api/analyze', async (req, res) => {
  const { url } = req.query;

  if (!url) {
    return res.status(400).send({
      error: 'not url',
    });
  }

  try {
    const [ page, robotsTxt ] = await Promise.all([
      analyzeWebsite(url),
      getRobotsTxt(url)
    ]);
    res.json({
      ...page,
      robotsTxt
    });
  } catch (err) {
    console.error(err);
    res.status(500).send(err);
  }
});

app.use(express.static(path.join(__dirname, 'dist'), {
  index: false
}));

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist/index.html'));
});

let startServer = async () => {
  try {
    browser = await puppeteer.launch();
  } catch (error) {
    console.log(error);
  }
  app.listen(port, () => {
    console.log(`Server listening port ${port}`);
  });
};

let stop = async () => {
  await browser.close();
};

startServer();

process.on('exit', async () => await stop());
process.on('SIGINT', async () => await stop());
process.on('SIGUSR1', async () => await stop());
process.on('SIGUSR2', async () => await stop());
process.on('uncaughtException', async () => await stop());
