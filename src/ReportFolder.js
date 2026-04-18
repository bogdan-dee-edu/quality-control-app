class ReportFolder {

  constructor(rootFolderId, loggerInstance) {
    this._rootFolderId = rootFolderId;
    this._logger = loggerInstance;

    // adjust this function to store reports using different subfolders names (e.g. shorter time periods)
    this._reportsSubfolderNameGenerator = (() => {
      const now = new Date();

      return now.getFullYear();
    });

    this._rootFolder = this._loadRootFolder();
    if (! this.rootFolder) {
      let errMsg = 'Reports root folder is not ready!';
      this.logger.error(errMsg);
      throw new Error(errMsg);
    }

    this._folders = this._loadFolders();
    this._currentFolderName = this._reportsSubfolderNameGenerator();
    this._currentFolder = this._loadCurrentFolder();
    if (! this.currentFolder) {
      let errMsg = 'Current reports folder is not ready!';
      this.logger.error(errMsg);
      throw new Error(errMsg);
    }
    if (this.folders.length == 0) {
      let errMsg = 'Reports folders inconsistency found! There are still 0 folders ready after application started. It should have at least 1 folder.';
      this.logger.error(errMsg);
      throw new Error(errMsg);
    }
  }

  get logger() {
    return this._logger;
  }

  _loadRootFolder() {
    return DriveApp.getFolderById(this._rootFolderId);
  }
  
  _loadFolders() {
    let foldersToReturn = [];
    let subFolders = this.rootFolder.getFolders();
    while (subFolders.hasNext()) {
        foldersToReturn.push(subFolders.next());
    }

    // sort by name DESC
    foldersToReturn.sort((a, b) => {
      const nameA = a.getName().toUpperCase(); // Ignore case
      const nameB = b.getName().toUpperCase(); // Ignore case

      if (nameA < nameB) return 1;
      if (nameA > nameB) return -1;
      return 0;
    });

    return foldersToReturn;
  }

  _loadCurrentFolder() {
    let currentFolder = null;
    try {
      currentFolder = this._findCurrentFolder();
      if (! currentFolder) {
        currentFolder = this._createCurrentFolder();
        this._folders.push(currentFolder);
      }
    } catch(err) {
      this.logger.error('Can not load current folder for reports!');
      throw err;
    }

    return currentFolder;
  }

  _findCurrentFolder() {
    return this.folders.find(f => f.getName() == this._currentFolderName) ||  null;
  }

  findFolderById(folderId) {
    return this.folders.find(f => f.getId() == folderId) ||  null;
  }

  _createCurrentFolder() {
    try {
      return this.rootFolder.createFolder(this._currentFolderName);
    } catch (err) {
      this.logger.error('Can not create a new current folder for reports!');
      throw err;
    }
  }

  get rootFolder() {
    return this._rootFolder;
  }

  get currentFolder() {
    return this._currentFolder;
  }

  get folders() {
    return this._folders;
  }

  listFilesInFolder(folderId) {
    const filesToReturn = [];
    const folder = this.findFolderById(folderId);
    if (folder) {
      let files = folder.getFiles();
      while (files.hasNext()) {
          filesToReturn.push(files.next());
      }
    }

    filesToReturn.sort(function(a, b) {
      var dateA = a.getDateCreated().valueOf();
      var dateB = b.getDateCreated().valueOf();
      return dateB - dateA; // desc
    });

    return filesToReturn;
  }

  listAllFiles() {
    const allFiles = [];
    for (let folder of this.folders) {
      for (let file of this.listFilesInFolder(folder.getId())) {
        allFiles.push(file);
      }
    }

    return allFiles;
  }

  static toFilesArray(objetcs) {
    const arr = [];
    for(let obj of objetcs) {
      let statusAndName = Report.retriveStatusAndName(obj.getName());
      arr.push({
        'id': obj.getId(),
        'name': statusAndName['name'],
        'status': statusAndName['status'],
        'url': obj.getUrl(),
        'date_created': obj.getDateCreated().toISOString(),
        'last_updated': obj.getLastUpdated().toISOString()
      });
    }

    return arr;
  }

  static toFoldersArray(objetcs) {
    const arr = [];
    for(let obj of objetcs) {
      arr.push({
        'id': obj.getId(),
        'name': obj.getName(),
        'url': obj.getUrl(),
        'date_created': obj.getDateCreated().toISOString(),
        'last_updated': obj.getLastUpdated().toISOString()
      });
    }

    return arr;
  }
}


function TEST_listFilesInFolder() {
  const settings = new Settings(PROPS_SCHEMA);
  settings.enableTestingEnv();
  const props = settings.scriptProps;

  const appLoggerStorage = new Storage(props['logsSpreadsheetId'], 'logs');
  const appLogger = new AppLogger(props['appId'], appLoggerStorage);

  const reportFolder = new ReportFolder(props['reportsRootFolderId'], appLogger);
  const files = reportFolder.listFilesInFolder(reportFolder.folders[0].getId());

  console.log(ReportFolder.toFilesArray(files));
}


function TEST_listAllFiles() {
  const settings = new Settings(PROPS_SCHEMA);
  settings.enableTestingEnv();
  const props = settings.scriptProps;

  const appLoggerStorage = new Storage(props['logsSpreadsheetId'], 'logs');
  const appLogger = new AppLogger(props['appId'], appLoggerStorage);

  const reportFolder = new ReportFolder(props['reportsRootFolderId'], appLogger);
  const files = reportFolder.listAllFiles();

  console.log(ReportFolder.toFilesArray(files));
}
