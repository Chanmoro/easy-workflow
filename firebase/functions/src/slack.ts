import * as functions from 'firebase-functions';
import axios from 'axios';
import * as slack_user_mapping from '../slack_user_mapping.json';

const config = functions.config();

const searchUserIdByEmail = async (email: string) => {
  /**
   * メールアドレスから slack ユーザーを取得する
   */
  if (!email) return;

  // slack_user_mapping.json にあるユーザーはここから取得
  if (email in slack_user_mapping) {
    console.log(email, slack_user_mapping, slack_user_mapping[email]);
    return slack_user_mapping[email];
  }

  // user search api でユーザーを検索
  const response = await axios.get(config.slack.user_search.url, {
    params: {
      token: config.slack.user_search.token,
      email: email
    }
  });

  if (response.status >= 300) {
    console.error(response.status, response.data);
  }

  // データを取得できなかったら undefined を返却
  if (!response.data.user) return;

  return response.data.user.id;
};

const sendToSlack = async (mentionUserEmailList: Array<string>, massge: string) => {
  // メンションする文字列を作成する
  let mention = '';
  for (const email of mentionUserEmailList) {
    const slackUserId = await searchUserIdByEmail(email);
    mention += slackUserId ? `<@${slackUserId}> ` : '';
  }

  // contact に設定された窓口には必ずメンションする
  const contact = config.slack.contact ? config.slack.contact : '';

  const response = await axios.post(config.slack.webhook_url, {
    text: `${contact} ${mention} ${massge}`
  });
  console.log(response.status);
};

export const sendRequestMessage = async (ticketType: string, requestUserEmail: string, formData: Array<object>) => {
  /**
   * 購買申請のメッセージをslackに送る
   */
  if (!formData) return;

  let message = `${ticketType}がきたでー！\n`;

  // フォームの内容を取得する
  for (const data of formData) {
    // slack に通知するメッセージを作成
    message += `*${data['title']} *\t${data['value']}\n`
  }

  await sendToSlack([requestUserEmail], message);
};


export const sendCloseMessage = async (ticketType: string, requestUserEmail: string, issue: object) => {
  /**
   * issueがクローズされたメッセージをslackに送る
   */
  if (!issue) return;

  // slack に通知するメッセージを作成
  const message = `${ticketType}がクローズされたでー！\n`
    + issue['body'] + '\n'
    + `${issue['comment'] ? '*コメント*\t' + issue['comment'] + '\n' : ''}`
    + '*チケットURL*\t' + issue['url'];

  await sendToSlack([requestUserEmail], message);

};


