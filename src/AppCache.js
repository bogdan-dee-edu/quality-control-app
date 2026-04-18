class AppCache {
  constructor() {
    this._scriptCache = CacheService.getScriptCache();

    this.cacheMaxExpSec = 21600;

    this._config = {
      'i18n_supported_langs': {
        'key': 'i18n_supported_langs',
        'expiration': this.cacheMaxExpSec
      },
      'i18n_dict': {
        'key': 'i18n_dict',
        'expiration': this.cacheMaxExpSec
      },
      'users': {
        'key': 'users',
        'expiration': 600
      },
      'folders': {
        'key': 'folders',
        'expiration': this.cacheMaxExpSec
      },
    }

    this._configPrefix = {
      'folder': {
        'prefix': 'folder',
        'expiration': 3600
      },
      'file': {
        'prefix': 'file',
        'expiration': 3600
      },
    }

    this._userConfig = {}
  }

  get config() {
    return this._config;
  }

  get configPrefix() {
    return this._configPrefix;
  }

  get scriptCache() {
    return this._scriptCache;
  }

  _read(key) {
    const value = this._scriptCache.get(key);
    // console.log(`reading cache key: ${key}`, value);
    
    if (value !== null) {
      return JSON.parse(value);
    }

    return null;
  }

  _save(key, data) {
    this.scriptCache.put(this.config[key]['key'], JSON.stringify(data), this.config[key]['expiration']);
    // console.log(`updated cache key ${this.config[key].key}`);
  }

  _saveWithPrefix(prefix, key, data) {
    this.scriptCache.put(key, JSON.stringify(data), this.configPrefix[prefix]['expiration']);
    // console.log(`updated cache key ${this.config[key].key}`);
  }

  _clear(key) {
    this.scriptCache.remove(key);
  }

  _getParentFolderIds(fileId) {
    const foldersIds = [];
    try {
      const file = DriveApp.getFileById(fileId);
      const parents = file.getParents();
      if (parents.hasNext()) {
        const parentFolder = parents.next();
        foldersIds.push(parentFolder.getId());
      }
    } catch (err) {}

    return foldersIds;
  }


  // i18n section
  getI18nDict() {
    return this._read(this.config.i18n_dict.key);
  }

  saveI18nDict(data) {
    this._save(this.config.i18n_dict.key, data);
  }

  getI18nSupportedLangs() {
    return this._read(this.config.i18n_supported_langs.key);
  }

  saveI18nSupportedLangs(data) {
    this._save(this.config.i18n_supported_langs.key, data);
  }

  

  // users section
  getUsers() {
    return this._read(this.config.users.key);
  }

  saveUsers(data) {
    this._save(this.config.users.key, data);
  }


  // folders and reports section
  getFolders() {
    return this._read(this.config.folders.key);
  }

  saveFolders(data) {
    this._save(this.config.folders.key, data);
  }
  
  getFiles(folderId) {
    const key = this.configPrefix.folder.prefix + String(folderId);
    return this._read(key);
  }

  saveFiles(folderId, data) {
    const key = this.configPrefix.folder.prefix + String(folderId);
    this._saveWithPrefix(this.configPrefix.folder.prefix, key, data);
  }

  clearFiles(folderId) {
    const key = this.configPrefix.folder.prefix + String(folderId);
    this._clear(key);
  }
  
  getFile(fileId) {
    const key = this.configPrefix.file.prefix + String(fileId);
    return this._read(key);
  }

  saveFile(fileId, data) {
    const key = this.configPrefix.file.prefix + String(fileId);
    this._saveWithPrefix(this.configPrefix.file.prefix, key, data);
  }

  clearFile(fileId) {
    const key = this.configPrefix.file.prefix + String(fileId);
    this._clear(key);

    const foldersIds = this._getParentFolderIds(fileId);
    if (foldersIds.length > 0) {
      const cacheKeys = foldersIds.map(elem => this.configPrefix.folder.prefix + elem);
      this.scriptCache.removeAll(cacheKeys);
    }
  }

  clearAll() {
    this.scriptCache.removeAll(Object.keys(this.config));
  }
}

function EXEC_warmUpCache() {
  const appContainer = new AppContainer(PROPS_SCHEMA, TESTING_FLAG);
  const { props, logger, i18n, user, cache } = { ...appContainer.run() }; // run the app and warm up the cache for general things (e.g. i18n, users, etc.)

  const responseAPI = runAPI('Report', 'list', {excludeStatus: 'completed'}); // get the list of file on the home page
  if (responseAPI.success) {
    for (file of responseAPI.data) { // iterate through all files
      reportAction({parameter: {id: file.id}}); // call the report page and it will cache everything it needs
    }
  }

  const actionResnpose = reportsAction(); // also cache the list of folders
}