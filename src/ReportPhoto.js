class ReportPhoto {

  constructor(fileId, loggerInstance) {
    this._fileId = fileId;
    this._logger = loggerInstance;
  }

  static uploadConfig() {
    return {
      allowedMimeTypes: ['image/jpeg'],
      allowedExtensions: ['jpg', 'jpeg'],
      maxFileSizeMB: 10,
      maxFilesPerUpload: 10,
      maxFilesPerReport: 50
    };
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

  uploadPhoto(serial, file) {
    const config = ReportPhoto.uploadConfig();
    try {
      if (!file || !file.name || !file.mimeType || !file.base64Data) {
        return { success: false, code: 'INVALID_PAYLOAD', error: 'Invalid file payload' };
      }

      if (config.allowedMimeTypes.indexOf(file.mimeType) === -1) {
        return { success: false, code: 'INVALID_TYPE', error: `File type ${file.mimeType} is not allowed` };
      }

      const ext = (file.name.split('.').pop() || '').toLowerCase();
      if (config.allowedExtensions.indexOf(ext) === -1) {
        return { success: false, code: 'INVALID_TYPE', error: `File extension .${ext} is not allowed` };
      }

      const maxBytes = config.maxFileSizeMB * 1024 * 1024;
      if (typeof file.size === 'number' && file.size > maxBytes) {
        return { success: false, code: 'INVALID_SIZE', error: `File exceeds ${config.maxFileSizeMB} MB limit` };
      }

      const reportFile = DriveApp.getFileById(this._fileId);
      const parents = reportFile.getParents();
      if (!parents.hasNext()) {
        return { success: false, code: 'NO_PARENT', error: 'Report file has no parent folder' };
      }
      const parentFolder = parents.next();

      let photosFolder;
      const existing = parentFolder.getFoldersByName(serial);
      if (existing.hasNext()) {
        photosFolder = existing.next();
      } else {
        photosFolder = parentFolder.createFolder(serial);
      }

      let existingCount = 0;
      const existingFiles = photosFolder.getFiles();
      while (existingFiles.hasNext()) {
        const f = existingFiles.next();
        if (f.getMimeType() === 'image/jpeg') existingCount++;
      }
      if (existingCount >= config.maxFilesPerReport) {
        return { success: false, code: 'LIMIT_REACHED', error: `Report already has ${existingCount} photos (limit: ${config.maxFilesPerReport})` };
      }

      const bytes = Utilities.base64Decode(file.base64Data);
      const blob = Utilities.newBlob(bytes, file.mimeType, file.name);
      const created = photosFolder.createFile(blob);

      return {
        success: true,
        photo: {
          id: created.getId(),
          name: created.getName(),
          url: created.getUrl()
        }
      };
    } catch (err) {
      if (this._logger) this._logger.error(err);
      return { success: false, code: 'INTERNAL', error: err.toString() };
    }
  }

}
