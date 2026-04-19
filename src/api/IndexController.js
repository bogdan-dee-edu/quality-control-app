class IndexController extends BaseController {

  changeTimeZoneAction(params) {
    let { timeZone } = { ...params };

    let result = {
      success: false,
      data: [],
      error: null
    };

    try {
      const storage = new Storage(this.props['storageSpreadsheetId'], this.props['usersSheetName']);
      const auth = new Auth(this.props['appId'], Session, storage);
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
      const auth = new Auth(this.props['appId'], Session, storage);
      result.success = auth.setUserTheme(theme);
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