const express = require('express');
const router = express.Router();

const en = require('../locales/en.json');
const fr = require('../locales/fr.json');

router.get('/', (req, res) => {
  const language = req.query.lang === 'fr' ? 'fr' : 'en';
  const content = language === 'fr' ? fr : en;

  const formattedDate = new Intl.DateTimeFormat(
    language === 'fr' ? 'fr-FR' : 'en-GB',
    {
      dateStyle: 'full'
    }
  ).format(new Date());

  const questions = content.questions.map((question, index) => `
    <label for="answer${index + 1}">${index + 1}. ${question}</label>
    <textarea id="answer${index + 1}" name="answer${index + 1}" rows="4"></textarea>
  `).join('');

  res.send(`
    <!DOCTYPE html>
    <html lang="${language}">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${content.title}</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          max-width: 750px;
          margin: 40px auto;
          padding: 20px;
          background: #f4f6f8;
        }
        main {
          background: white;
          padding: 30px;
          border-radius: 10px;
        }
        label {
          display: block;
          margin-top: 22px;
          font-weight: bold;
        }
        textarea {
          width: 100%;
          box-sizing: border-box;
          margin-top: 8px;
          padding: 12px;
          min-height: 90px;
        }
        a {
          margin-right: 15px;
        }
      </style>
    </head>
    <body>
      <main>
        <h1>${content.title}</h1>
        <p>${content.instructions}</p>
        <p>${content.dateLabel}: ${formattedDate}</p>

        <p>
          <a href="/feedback?lang=en">English</a>
          <a href="/feedback?lang=fr">Français</a>
        </p>

        <form>
          ${questions}
        </form>
      </main>
    </body>
    </html>
  `);
});

module.exports = router;