import * as crypto from 'crypto';

import * as functions from 'firebase-functions';
import axios from 'axios';
import * as express from "express";


const config = functions.config();

export const createIssue = async (ticketType: string, formData: Array<object>) => {
  /**
   * github issue を作成する
   */
  const payload = {
    'title': `[${ticketType}] ${formData[0]['value']}`,
    'body': '',
    'assignees': config.github.asignees,
    'labels': [
      ticketType
    ]
  };

  // github issue の本文を作成
  formData.forEach(function (obj) {
    payload.body += `## ${obj['title']}\n${obj['value']}\n`
  });

  const url = `${config.github.issue_url}?access_token=${config.github.api_token}`;
  const response = await axios.post(url, payload);

  if (response.status >= 300) {
    console.error(response.status, response.data);
  }

  return response.data.html_url;
};

export const getLatestComment = async (commentsUrl: String) => {
  /**
   * 最新のコメントを取得する
   */
  const url = `${commentsUrl}?access_token=${config.github.api_token}`;
  const response = await axios.get(url);

  if (response.status >= 300) {
    console.error(response.status, response.data);
  }

  const comments = response.data as Array<object>;
  const latestComment = comments.pop();

  if (latestComment) {
    return latestComment['body'];
  }
};

export const extractIssue = async (data: object) => {
  /**
   * github から受け取った issue の情報から必要な項目を抽出する
   */
  if (data['action'] !== 'closed') {
    return null;
  }
  const issue = data['issue'];
  const email = issue['body'].match(/\S+@\S+/);

  if (email.length < 1) {
    console.warn('issue の内容からメールアドレスが取得できませんでした', issue['body']);
  }
  const latestComment = await getLatestComment(data['issue']['comments_url']);

  return {
    'url': issue['html_url'],
    'title': issue['title'],
    'body': issue['body'],
    'email': email.length > 0 ? email[0] : '',
    'comment': latestComment
  }
};

const calculateSha1Digest = (data: string, secret: string): string => {
  /**
   * SHA1ダイジェストを生成する
   */
  return `sha1=${crypto.createHmac("sha1", secret).update(data).digest("hex")}`;
};

export const isValidateRequest = (request: express.Request) => {
  /**
   * GitHub から受け取ったリクエストの署名が正しいかを検証する
   */
  const signature = request.headers['x-hub-signature'] as string;

  if (!signature) {
    console.error('secret configured, but missing signature, returning 403');
    return false;
  }

  const body = JSON.stringify(request.body);
  const computedSignature = calculateSha1Digest(body, config.github.webhook.secret);

  if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(computedSignature))) {
    console.log('received', signature, 'computed', computedSignature);
    console.error('got invalid signature, returning 403');
    return false;
  }

  return true;
};
