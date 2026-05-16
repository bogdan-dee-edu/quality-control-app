class IndexController extends BaseControllerAbstract {

  changeTimeZoneAction(params) {
    let { timeZone } = { ...params };

    let result = {
      success: false,
      data: [],
      error: null
    };

    try {
      const storage = new Storage(this.props['storageSpreadsheetId'], this.props['usersSheetName']);
      const auth = new Auth(this.props['appId'], storage, this.cache);
      result.success = auth.setUserTimeZone(timeZone);
    } catch (err) {
      this.logger.error(err);
      result.error = err.toString();
    }

    return result;
  }

  changeThemeAction(params) {
    let { theme } = { ...params };

    let result = {
      success: false,
      data: [],
      error: null
    };

    try {
      const storage = new Storage(this.props['storageSpreadsheetId'], this.props['usersSheetName']);
      const auth = new Auth(this.props['appId'], storage, this.cache);
      result.success = auth.setUserTheme(theme);
    } catch (err) {
      this.logger.error(err);
      result.error = err.toString();
    }

    return result;
  }

  changeLanguageAction(params) {
    let { language } = { ...params };

    let result = this._getResponseSchema();
    try {
      if (! this.i18n.supportedLangs.includes(language)) {
        throw new Error(`Language "${language}" is not supported. Supported: ${this.i18n.supportedLangs.join(', ')}.`);
      }
      const storage = new Storage(this.props['storageSpreadsheetId'], this.props['usersSheetName']);
      const auth = new Auth(this.props['appId'], storage, this.cache);
      result.success = auth.setUserLanguage(language);
    } catch (err) {
      this.logger.error(err);
      result.error = err.toString();
    }

    return result;
  }

  clearCacheAction() {
    let result = {
      success: false,
      data: [],
      error: null
    };

    try {
      if (this.user.role === 'admin') {
        this.cache.clearAll();

        const reportFolder = new ReportFolder(this.props['reportsRootFolderId'], this.logger);
        const files = reportFolder.listAllFiles();
        for (let file of files) {
          this.cache.clearFile(file.getId());
        }
      }
      result.success = true;
    } catch (err) {
      this.logger.error(err);
      result.error = err.toString();
    }

    return result;
  }
}