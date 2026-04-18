class Auth {
  constructor(appId, storageInstance, appCacheInstance = null) {
    this._cache = appCacheInstance;

    this._appId = appId;
    this._storage = storageInstance;
    this._users = this._loadUsers();
    
    this._user = this._findUserByEmail(Session.getActiveUser().getEmail());
    
    if (this._user) {
      this.user['props'] = this.loadUserProps();
    }
  }

  _findUserByEmail(searchEmail) {
    return this._users.find(({ email }) => searchEmail == email);
  }

  _loadUsers() {
    let users = this._cache ? this._cache.getUsers() : null;
    if (users === null) {
      if (! this._storage.sheet) this._storage.openSheet();
      users = this._storage.loadSheetData();
      
      if (this._cache) this._cache.saveUsers(users);
    }

    return this._storage.toObjects(users);
  }

  get user() {
    return this._user;
  }

  isAuthorized() {
    return Boolean(this.isActive()) && this.isAppAccessGranted();
  }

  isActive() {
    return (this.user && this.user.is_active !== undefined && parseInt(this.user.is_active) === 1);
  }

  isAppAccessGranted() {
    const apps = this.user['apps'] || '';

    return apps.split(',').includes(this._appId);
  }

  loadUserProps() {
    let props = [];
    try {
      const userProperties = PropertiesService.getUserProperties();
      props = userProperties.getProperties();
    } catch (err) {
      // console.error(err);
    }

    return props;
  }

  _setUserProperty(name, value) {
    const userProperties = PropertiesService.getUserProperties();
    userProperties.setProperty(name, value);
    this.user['props'] = userProperties.getProperties();

    return value === this.user.props[name];
  }

  setUserTimeZone(newTimeZone = 'Etc/UTC') {
    return this._setUserProperty('timezone', newTimeZone);
  }

  setUserTheme(newTheme = 'light') {
    return this._setUserProperty('theme', newTheme);
  }

  setUserLanguage(newLang = 'en') {
    return this._setUserProperty('language', newLang);
  }
}

function authTest() {
  const settings = new Settings(PROPS_SCHEMA);
  settings.enableTestingEnv();
  const props = settings.scriptProps;

  const storage = new Storage(props['storageSpreadsheetId'], props['usersSheetName']);
  const auth = new Auth(props['appId'], storage);

  console.log(auth.isAuthorized());
  console.log(auth.user);
}