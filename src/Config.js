// override it to true while running tests, so AppContainer will pick up correct config values
let TESTING_FLAG = false;
let currentDeploymentMode = getUrl().split('/').at(-1);
if (currentDeploymentMode === 'dev') {
  // uncomment this line if you want to use testing folders and files in the development mode
  // TESTING_FLAG = true;
}

// Application settings schema for loading and validation Script Properties from the Properties Service
let PROPS_SCHEMA = {
  'required': {
    'appId': null,
    'productVersions': null,
    'defaultLang': null,
    'logsSpreadsheetId': null,
    'storageSpreadsheetId': null,
    'usersSheetName': null,
    'i18nSheetName': null,
    'reportTemplateId': null,
    'reportsRootFolderId': null,
    'logLevel': null,   // controls spreadsheet write verbosity: 'info' | 'warn' | 'error'
    'logEnabled': null, // 'true' | 'false' — set to 'false' to skip spreadsheet logging entirely
    'cacheEnabled': null, // 'true' | 'false' — set to 'false' to bypass AppCache reads/writes entirely
  },
  'optional': {
    'TEST_logsSpreadsheetId': null,
    'TEST_storageSpreadsheetId': null,
    'TEST_reportTemplateId': null,
    'TEST_reportsRootFolderId': null
  }
};