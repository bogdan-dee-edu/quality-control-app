class PhotoController extends BaseControllerAbstract {

  getPhotoAction(params) {
    const response = this._getResponseSchema();
    try {
      const thumbnailUrl = `https://drive.google.com/thumbnail?id=${params.id}&sz=w400`;
      const fetchResponse = UrlFetchApp.fetch(thumbnailUrl, {
        headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken() },
        muteHttpExceptions: true
      });

      const blob = fetchResponse.getBlob();
      const base64 = Utilities.base64Encode(blob.getBytes());
      response.data = `data:${blob.getContentType()};base64,${base64}`;
      response.success = true;
    } catch(err) {
      this.logger.error(err);
      response.error = err.toString();
    }
    return response;
  }

}
