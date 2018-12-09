import * as functions from 'firebase-functions';
import * as Express from 'express';
import * as basicAuth from 'express-basic-auth';

import * as slack from './slack';
import * as github from './github';

// Start writing Firebase Functions
// https://firebase.google.com/docs/functions/typescript

const config = functions.config();

const authUser = {};
authUser[config.basic_auth.user] = config.basic_auth.password;

const app = Express();
app.use(basicAuth({
  users: authUser
}));

app.get('/', (req, res) => {
  /**
   * ヘルスチェック用
   */
  res.send('working');
});

app.post('/request', async (req, res) => {
  /**
   * googleフォームからのリクエスト受付
   {
      "formData": [
        { "title": "title1", "value": "val1"},
        { "title": "title2", "value": "val2"},
        { "title": "title3", "value": "val3"}
      ]
    }
   */
  const request = req.body;
  console.log(request);

  const formData = request.formData;
  const issueUrl = await github.createIssue('購買申請', formData);
  formData.push({'title': 'チケットURL', 'value': issueUrl});

  await slack.sendRequestMessage('購買申請', request.requestUserEmail, formData);

  res.send('OK');
});

app.post('/github', async (req, res) => {
  /**
   * github webhook からのリクエスト受付
   */
  console.log(req.headers);

  // github の signature をチェック
  if (!github.isValidateRequest(req)) {
    res.status(403);
    res.send('Forbidden');
    return;
  }

  console.log(req.body);
  const issue = await github.extractIssue(req.body);

  if (issue) {
    console.log(issue);
    await slack.sendCloseMessage('購買申請', issue['email'], issue);
  }

  res.send('OK');
});

exports.app = functions.https.onRequest(app);
