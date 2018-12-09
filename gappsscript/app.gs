var APP_URL = PropertiesService.getScriptProperties().getProperty("APP_URL");
var APP_USER = PropertiesService.getScriptProperties().getProperty("APP_USER");
var APP_PASSWORD = PropertiesService.getScriptProperties().getProperty("APP_PASSWORD");

function sendToApp(requestData) {
  const payload = JSON.stringify(requestData);
  Logger.log(payload);

  const options = {
    "method": "POST",
    "contentType": "application/json",
    "payload": payload,
    "muteHttpExceptions": true,
    "headers": {
      "Authorization": "Basic " + Utilities.base64Encode(APP_USER + ":" + APP_PASSWORD)
    }
  };
  const response = UrlFetchApp.fetch(APP_URL, options);
  Logger.log(response);
}

function getFormData(e) {
  var requestUserEmail = '';
  var formData = [];
  Object.keys(e.namedValues).sort().forEach(function (key) {
    var title = key;
    // デフォルトでセットされる項目名を一部変更
    if (title === 'メールアドレス') {
      title = '申請者';
      requestUserEmail = e.namedValues[key][0];
    }
    if (title === 'タイムスタンプ') title = '申請日時';
    formData.push({'title': title, 'value': e.namedValues[key][0]});
  });

  return {
    'requestUserEmail': requestUserEmail,
    'formData': formData
  };
}

function onFormSubmit(e) {
  Logger.log(e);
  sendToApp(getFormData(e));
}

function test_sendToApp() {
  const e = {
    'values': ['morozumi@scouty.co.jp', '2018/12/09 13:30:40', 'val1', 'val2', 'val3'],
    'namedValues': {
      'key1': ['val1'],
      'key2': ['val2'],
      'key3': ['val3'],
      'メールアドレス': ['morozumi@scouty.co.jp'],
      'タイムスタンプ': ['2018/12/09 13:30:40']
    }
  };

  sendToApp(getFormData(e));
}
