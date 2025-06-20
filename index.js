const axios = require('axios').default;
const cheerio = require('cheerio');
const TelegramBot = require('node-telegram-bot-api');
const tough = require('tough-cookie');
const { wrapper } = require('axios-cookiejar-support');

const config = require('./config');

const bot = new TelegramBot(config.telegramBotToken, { polling: true });
const jar = new tough.CookieJar();
const client = wrapper(axios.create({ jar }));

let lastOtpCode = null;

async function login() {
  const res = await client.post('http://94.23.120.156/ints/client/processing', new URLSearchParams({
    username: config.seven1telUsername,
    password: config.seven1telPassword
  }), {
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    }
  });
  return res.headers['set-cookie'];
}

async function fetchLatestOtp() {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const date = `${yyyy}-${mm}-${dd}`;

  const res = await client.post('http://94.23.120.156/ints/client/SMSCDRStats', new URLSearchParams({
    fdate1: `${date} 00:00:00`,
    fdate2: `${date} 23:59:59`,
    frange: '',
    fnum: '',
    fcli: ''
  }), {
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    }
  });

  const $ = cheerio.load(res.data);
  const rows = $('table tbody tr');

  if (rows.length === 0) return;

  const lastRow = $(rows[0]).find('td').map((i, el) => $(el).text().trim()).get();

  const [_, time, number, , service, code, msg] = lastRow;
  if (code && code !== lastOtpCode) {
    lastOtpCode = code;
    const message = `✨ OTP Received ✨

⏰ Time: ${time}
📞 Number: ${number}
🔧 Service: ${service}
🔐 OTP Code: ${code}
📝 Msg: ${msg}`;

    bot.sendMessage(config.telegramGroupId, message);
  }
}

(async () => {
  console.log("🔐 Logging in to Seven1tel...");
  await login();
  console.log("✅ Logged in successfully. Starting OTP fetch...");

  await fetchLatestOtp(); // Send last OTP on startup

  setInterval(fetchLatestOtp, 1000); // Check every 1 second
})();
