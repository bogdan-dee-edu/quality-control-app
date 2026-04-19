function doGet(e) {
  let html = '';
  let action = 'index';
  if (e.parameter && e.parameter.action !== undefined && e.parameter.action !== '') {
    action = e.parameter.action;
  }
  
  // Main Application Routing
  // for rendering HTML pages
  try {
    switch(action) {
      case 'report':
        html = ReportPage.reportAction(e);
        break;

      case 'report_action_logs':
        html = ReportPage.reportActionLogsAction(e);
        break;

      case 'reports':
        html = ReportPage.reportsAction(e);
        break;

      default:
        html = IndexPage.indexAction(e);
        break;
    }
  } catch(err) {
    html = IndexPage.renderError(err);

    // try to spin up the app logger and write down this error to the logs
    try {
      const appContainer = new AppContainer(PROPS_SCHEMA, TESTING_FLAG);
      const logger = appContainer.loadAppLogger();
      logger.error(err);
    } catch (error){}
  }

  return html;
}

function include(filename, context) {
  let template = HtmlService.createTemplateFromFile(filename);
  Object.assign(template, context);
  let html = template.evaluate();
  
  return html.getContent().trim();
}

function getUrl() {
  return ScriptApp.getService().getUrl();
}

function getTimezone() {
  return Session.getScriptTimeZone();
}


