class ReportPhoto {

  constructor(fileId, loggerInstance) {
    this._fileId = fileId;
    this._logger = loggerInstance;
  }

  loadPhotos(serial) {
    const result = { found: false, folderUrl: null, photos: [] };
    try {
      const reportFile = DriveApp.getFileById(this._fileId);
      const parents = reportFile.getParents();
      if (!parents.hasNext()) return result;

      const parentFolder = parents.next();
      const subFolders = parentFolder.getFoldersByName(serial);
      if (!subFolders.hasNext()) return result;

      const photosFolder = subFolders.next();
      result.found = true;
      result.folderUrl = photosFolder.getUrl();

      const files = photosFolder.getFiles();
      while (files.hasNext()) {
        const f = files.next();
        if (f.getMimeType() === 'image/jpeg') {
          result.photos.push({
            id: f.getId(),
            name: f.getName(),
            url: f.getUrl()
          });
        }
      }
    } catch(err) {
      if (this._logger) this._logger.error(err);
    }

    return result;
  }

}
