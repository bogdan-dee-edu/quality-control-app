class BaseController {
  constructor(appContainer) {
    this._props = appContainer.props;
    this._user = appContainer.user;
    this._logger = appContainer.logger;
    this._cache = appContainer.cache;
  }

  get props() {
    return this._props;
  }

  get user() {
    return this._user;
  }

  get logger() {
    return this._logger;
  }

  get cache() {
    return this._cache;
  }

  _getResponseSchema() {
    return {
      success: false,
      data: [],
      error: null
    };
  }
}