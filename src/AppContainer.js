class AppContainer {

  constructor(propsSchema, testingFlag = false) {
    this._settings = new Settings(propsSchema);
    if (testingFlag) {
      this._settings.enableTestingEnv();
    }

    this._props = this._settings.scriptProps;
    this._cache = new AppCache();
    this._user = null;
    this._logger = null;
    this._i18n = null;
  }

  get props() {
    return this._props;
  }

  get logger() {
    return this._logger;
  }

  get user() {
    return this._user;
  }

  get i18n() {
    return this._i18n;
  }

  loadUser() {
    const storage = new Storage(this.props['storageSpreadsheetId'], this.props['usersSheetName']);
    const auth = new Auth(this.props['appId'], storage, this._cache);
    
    return (auth.isAuthorized() ? auth.user : null);
  }

  loadI18n(locale, loggerInstance) {
    const storage = new Storage(this.props['storageSpreadsheetId'], this.props['i18nSheetName']);
    
    return new I18n(locale, storage, loggerInstance, this._cache);
  }

  loadAppLogger() {
    const storage = new Storage(this.props['logsSpreadsheetId'], 'logs');
    return new AppLogger({ appId: this.props['appId'], logLevel: this.props['logLevel'] }, storage);
  }

  run() {
    this._logger = this.loadAppLogger();
    this._user = this.loadUser();
    this._i18n = this.loadI18n(this.props['defaultLang'], this._logger);

    return {
      'props': this.props,
      'logger': this._logger,
      'i18n': this._i18n,
      'user': this._user,
      'cache': this._cache
    }
  }
  
}