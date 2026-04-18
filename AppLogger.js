class AppLogger {
  constructor(appId, storageInstance) {
    this._maxLogsRows = 999;
    this._storage = storageInstance;
    this._appId = appId;
  }

  get storage() {
    return this._storage;
  }

  _getUserEmail() {
    try {
      return Session.getActiveUser().getEmail() || 'unknown';
    } catch (err) {
      return 'unknown';
    }
  }

  log(level, message) {
    const obj = {
      appId: this._appId,
      time: new Date().toISOString(),
      user_email: this._getUserEmail(),
      level: level,
      message: message
    }

    if (this.storage) {
      if (! this.storage.sheet) this.storage.openSheet();
      
      this.storage.insert(obj);
      this.rotate();
    }
  }

  info(message) {
    this.log('info', message);
    console.log(message);
  }

  warn(message) {
    this.log('warn', message);
    console.warn(message);
  }

  error(e) {
    this.log('error', e.stack || e.toString());
    console.error(e);
  }

  rotate() {
    if (this.storage.getLastRow() >= this._maxLogsRows) {
      this.storage.duplicateSheet('logs-backup');
      this.storage.clearSheet();
    }
  }
}

function loggerTest() {
  const settings = new Settings(PROPS_SCHEMA);
  settings.enableTestingEnv();
  const props = settings.scriptProps;

  const storage = new Storage(props['logsSpreadsheetId'], 'logs');
  const logger = new AppLogger(props['appId'], storage);
  logger.info("logging some testing message from the test func");
}