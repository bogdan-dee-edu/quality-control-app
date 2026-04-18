function doGet(e) {
  let html = '';
  let action = 'index';
  if (e.parameter && e.parameter.action !== undefined && e.parameter.action !== '') {
    action = e.parameter.action;
  }
  
  try {
    switch(action) {
      case 'report':
        html = reportAction(e);
        break;

      case 'report_action_logs':
        html = reportActionLogsAction(e);
        break;

      case 'reports':
        html = reportsAction(e);
        break;

      default:
        html = indexAction(e);
        break;
    }
  } catch(err) {
    html = renderError(err);

    // try to spin up the app logger and write down this error to the logs
    try {
      const appContainer = new AppContainer(PROPS_SCHEMA, TESTING_FLAG);
      const logger = appContainer.loadAppLogger();
      logger.error(err);
    } catch (error){}
  }

  return html;
}



function reportsAction(e) {
  const appContainer = new AppContainer(PROPS_SCHEMA, TESTING_FLAG);
  const { props, logger, i18n, user, cache } = { ...appContainer.run() };

  if (! user) {
    return renderAccessDenied();
  }

  const templateFile = 'templates/reports';
  const template = HtmlService.createTemplateFromFile(templateFile);
  template.props = props;
  template.i18n = i18n;
  template.user = user;

  const reportFolder = new ReportFolder(props['reportsRootFolderId'], logger);

  let folders = cache.getFolders();
  if (folders === null) {
    folders = ReportFolder.toFoldersArray(reportFolder.folders);

    cache.saveFolders(folders);
  }
  
  template.folders = folders;
  template.currentFolderId = reportFolder.currentFolder.getId();

  const html = template.evaluate();
  html.addMetaTag('viewport', 'width=device-width, initial-scale=1'); 
  html.setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
   
  return html;
}

function reportAction(e) {
  const appContainer = new AppContainer(PROPS_SCHEMA, TESTING_FLAG);
  const { props, i18n, user, cache } = { ...appContainer.run() };

  let fileId = null;
  if (e.parameter && e.parameter.id !== undefined && e.parameter.id !== '') {
    fileId = e.parameter.id;
  }
  if (! fileId) {
    throw new Error(`File not found`);
  }
  if (! user) {
    return renderAccessDenied();
  }

  const templateFile = 'templates/report';
  const template = HtmlService.createTemplateFromFile(templateFile);
  template.props = props;
  template.i18n = i18n;
  template.user = user;

  let file = cache.getFile(fileId);
  if (file === null) {
    const report = new Report();
    file = report.readFile(fileId);

    cache.saveFile(fileId, file);
  }

  template.report = file;

  const html = template.evaluate();
  html.addMetaTag('viewport', 'width=device-width, initial-scale=1'); 
  html.setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
   
  return html;
}



function reportActionLogsAction(e) {
  const appContainer = new AppContainer(PROPS_SCHEMA, TESTING_FLAG);
  const { props, i18n, user, cache } = { ...appContainer.run() };

  let fileId = null;
  if (e.parameter && e.parameter.id !== undefined && e.parameter.id !== '') {
    fileId = e.parameter.id;
  }
  if (! fileId) {
    throw new Error(`File not found`);
  }
  if (! user) {
    return renderAccessDenied();
  }

  const templateFile = 'templates/report_action_logs';
  const template = HtmlService.createTemplateFromFile(templateFile);
  template.props = props;
  template.i18n = i18n;
  template.user = user;


  let file = cache.getFile(fileId);
  if (file === null) {
    const report = new Report();
    file = report.readFile(fileId);

    cache.saveFile(fileId, file);
  }
  template.report = file;

  const actionsLogger = new UserActionsLogger(fileId);
  const actions = actionsLogger.readAllLogs();
  template.actions = actions;

  const html = template.evaluate();
  html.addMetaTag('viewport', 'width=device-width, initial-scale=1'); 
  html.setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
   
  return html;
}

function indexAction(e) {
  const appContainer = new AppContainer(PROPS_SCHEMA, TESTING_FLAG);
  const { props, logger, i18n, user } = { ...appContainer.run() };

  if (! user) {
    return renderAccessDenied();
  }

  const templateFile = 'templates/index';
  const template = HtmlService.createTemplateFromFile(templateFile);
  template.props = props;
  template.i18n = i18n;
  template.user = user;

  const html = template.evaluate();
  html.addMetaTag('viewport', 'width=device-width, initial-scale=1'); 
  html.setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
   
  return html;
}

function include(filename, context) {
  let template = HtmlService.createTemplateFromFile(filename);
  Object.assign(template, context);
  let html = template.evaluate();
  
  return html.getContent().trim();
}

function renderError(err) {
  const template = HtmlService.createTemplateFromFile('templates/error');
  template.error = err;
  const html = template.evaluate();
  html.addMetaTag('viewport', 'width=device-width, initial-scale=1'); 
  html.setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
   
  return html;
}

function renderAccessDenied() {
  const template = HtmlService.createTemplateFromFile('templates/access_denied');
  const html = template.evaluate();
  html.addMetaTag('viewport', 'width=device-width, initial-scale=1'); 
  html.setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
   
  return html;
}

function getUrl() {
  return ScriptApp.getService().getUrl();
}

function getTimezone() {
  return Session.getScriptTimeZone();
}


