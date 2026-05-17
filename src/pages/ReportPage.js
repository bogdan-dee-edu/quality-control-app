class ReportPage extends BasePageAbstract {

  static reportsAction(e) {
    const appContainer = new AppContainer(PROPS_SCHEMA, TESTING_FLAG);
    const { props, logger, i18n, user, cache } = { ...appContainer.run() };

    if (!user) {
      return this.renderAccessDenied();
    }

    const templateFile = 'templates/reports';
    const template = HtmlService.createTemplateFromFile(templateFile);
    template.daisyTheme = this.daisyTheme;
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

  static reportAction(e) {
    const appContainer = new AppContainer(PROPS_SCHEMA, TESTING_FLAG);
    const { props, i18n, user, cache } = { ...appContainer.run() };

    let fileId = null;
    if (e.parameter && e.parameter.id !== undefined && e.parameter.id !== '') {
      fileId = e.parameter.id;
    }
    if (!fileId) {
      throw new Error(`File not found`);
    }
    if (!user) {
      return this.renderAccessDenied();
    }

    const templateFile = 'templates/report';
    const template = HtmlService.createTemplateFromFile(templateFile);
    template.daisyTheme = this.daisyTheme;
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

  static reportPhotosAction(e) {
    const appContainer = new AppContainer(PROPS_SCHEMA, TESTING_FLAG);
    const { props, i18n, user, cache } = { ...appContainer.run() };

    let fileId = null;
    if (e.parameter && e.parameter.id !== undefined && e.parameter.id !== '') {
      fileId = e.parameter.id;
    }
    if (!fileId) {
      throw new Error(`File not found`);
    }
    if (!user) {
      return this.renderAccessDenied();
    }

    const templateFile = 'templates/report_photos';
    const template = HtmlService.createTemplateFromFile(templateFile);
    template.daisyTheme = this.daisyTheme;
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
    const reportPhoto = new ReportPhoto(fileId);
    template.photoData = reportPhoto.loadPhotos(file.name);

    const html = template.evaluate();
    html.addMetaTag('viewport', 'width=device-width, initial-scale=1');
    html.setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);

    return html;
  }

  static reportActionLogsAction(e) {
    const appContainer = new AppContainer(PROPS_SCHEMA, TESTING_FLAG);
    const { props, i18n, user, cache } = { ...appContainer.run() };

    let fileId = null;
    if (e.parameter && e.parameter.id !== undefined && e.parameter.id !== '') {
      fileId = e.parameter.id;
    }
    if (!fileId) {
      throw new Error(`File not found`);
    }
    if (!user) {
      return this.renderAccessDenied();
    }

    const templateFile = 'templates/report_action_logs';
    const template = HtmlService.createTemplateFromFile(templateFile);
    template.daisyTheme = this.daisyTheme;
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
  
}