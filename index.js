const express = require('express');

const app = express();
app.use(express.json());

const LINE_ACCESS_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN;
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

const SYSTEM_PROMPT = `あなたは「海盛水産bot」です。海盛水産（鹿児島県）のまき網漁業に関するあらゆる質問に答えます。温かみのある口調で、簡潔に答えてください。

【会社情報】
会社名：海盛水産（カイセイスイサン）
操業エリア：阿久根、串木野、瓶島、枕崎、内之浦、種子島・屋久島、馬毛島
ウェブサイト：akune-kaisei.jp

【漁のスケジュール】
漁は3〜5日間。出港は夕方〜朝方。漁は夜12時〜朝4時くらい。

【安全】
安全第一。ヘルメット・救命胴衣の着用徹底。声掛けをしながら作業する。

【船上の生活】
トイレ・シャワーあり。エアコン付き完全個室。コックが1日2回食事をふるまう。光熱費・食費は会社負担。船用Wi-Fiあり。喫煙は決められた場所・時間であれば可能。

【休日・給与・福利厚生】
休日：年150日。給与：毎月決まった給与を支給。漁獲高により別途手当あり。
福利厚生：健康保険、雇用保険、傷害保険、労災保険、厚生年金。海技試験受験講習は全額会社負担。

【よくある質問】
Q初心者でも大丈夫？→先輩が優しく教える。最初は見学や簡単な手仕事から。
Q船酔いする人は？→社長自身も最初は船酔いしていたが慣れた。無理はさせない。
Qお試し乗船できる？→できる。3〜5日ほど見学できる。
Q資格は必要？→自動車免許があると便利。
Q雰囲気は？→船員が優しいと評判。笑い声の絶えない職場。`;

async function replyToLine(replyToken, text) {
  await fetch('https://api.line.me/v2/bot/message/reply', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${LINE_ACCESS_TOKEN}`
    },
    body: JSON.stringify({
      replyToken,
      messages: [{ type: 'text', text }]
    })
  });
}

async function askClaude(userMessage) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 500,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userMessage }]
    })
  });
  const data = await res.json();
  console.log('API response:', JSON.stringify(data).substring(0, 200));
  if (!data.content) {
    throw new Error('No content: ' + JSON.stringify(data));
  }
  return data.content[0].text;
}

app.post('/webhook', async (req, res) => {
  res.status(200).send('OK');
  const events = req.body.events || [];
  for (const event of events) {
    if (event.type === 'message' && event.message.type === 'text') {
      try {
        const reply = await askClaude(event.message.text);
        await replyToLine(event.replyToken, reply);
      } catch (e) {
        console.error('Error:', e.message);
        await replyToLine(event.replyToken, 'エラーが発生しました。もう一度お試しください。');
      }
    }
  }
});

app.get('/', (req, res) => res.send('海盛水産bot 稼働中'));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
