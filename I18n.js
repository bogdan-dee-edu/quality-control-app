class I18n {
  constructor(langCode, storageInstance, loggerInstance, appCacheInstance = null) {
    this._storage = storageInstance;
    this._logger = loggerInstance;
    this._cache = appCacheInstance;

    this._lang = null;
    this._fallbackLang = null;
    this._supportedLangs = [];
    this._setupLang(langCode.toLowerCase())

    this._dict = this._loadDictionaty();
    this._translations = this._selectTranslationsByLang();
  }

  get storage() {
    return this._storage;
  }

  get logger() {
    return this._logger;
  }

  get cache() {
    return this._cache;
  }

  get supportedLangs() {
    return this._supportedLangs;
  }

  get fallbackLang() {
    return this._fallbackLang;
  }

  _setupLang(langCode) {
    this._supportedLangs = this.loadSupportedLangs();
    if (this.supportedLangs.length === 0) {
      let error = new Error(`Failed loading i18n module. Can not get a list of locales from the translations storage.`);
      this.logger.error(error);
      throw error;
    }
    this._fallbackLang = this.supportedLangs[0]; // first locale from the translations sheet is a fallback one

    if (! this.supportedLangs.includes(langCode)) {
      let error = new Error(`Failed loading i18n module. Locale ${langCode} is not supported.`);
      this.logger.error(error);
      throw error;
    }
    this.lang = langCode;
  }

  _loadDictionaty() {
    let dict = this.cache ? this.cache.getI18nDict() : null;
    if (dict === null) {
      if (! this.storage.sheet) this.storage.openSheet();
      const rawTranslations = this.storage.loadSheetData();
      dict = this.storage.toObjects(rawTranslations);

      if (this.cache) this.cache.saveI18nDict(dict);
    }

    return dict;
  }

  _selectTranslationsByLang() {
    const translations = {};
    const dict = this._dict;
    for (let i in dict) {
      translations[dict[i]['key']] = dict[i][this.lang] || dict[i][this.fallbackLang];
    }

    return translations;
  }


  loadSupportedLangs() {
    let langs = this.cache ? this.cache.getI18nSupportedLangs() : null;
    if (langs === null) {
      if (! this.storage.sheet) this.storage.openSheet();
      langs = this.storage.getHeader().filter(v => v !== 'key');

      if (this.cache) this.cache.saveI18nSupportedLangs(langs);
    }
    
    return langs ?? [];
  }

  trans(key) {
    return this._translations[key] ?? '{' + key + '}';
  }
}

function test_trans() {
  const settings = new Settings(PROPS_SCHEMA);
  settings.enableTestingEnv();
  const props = settings.scriptProps;

  const appLoggerStorage = new Storage(props['logsSpreadsheetId'], 'logs');
  const appLogger = new AppLogger(props['appId'], appLoggerStorage);

  const storage = new Storage(props['storageSpreadsheetId'], props['i18nSheetName']);
  const i18nObj = new I18n('ua', storage, appLogger);

  console.log(i18nObj.trans('welcome'));
}