class ReportNotesController extends BaseController {
  
  listAction(params) {
    let { reportId, stageId } = { ...params };
    let result = this._getResponseSchema();
    try {
      const report = new Report(this.logger);
      report.openSpreadsheet(reportId);
      report.openSheet(stageId);
      const reportNotes = new ReportNotes(report, this.logger);

      result = { ...result, ...reportNotes.list() };
      result.success = true;
    } catch (err) {
      this.logger.error(err);
      result.error = err.toString();
    }

    return result;
  }

  addAction(params) {
    let { reportId, stageId, notes } = { ...params };
    let result = this._getResponseSchema();
    try {
      const report = new Report(this.logger);
      report.openSpreadsheet(reportId);
      report.openSheet(stageId);
      const reportNotes = new ReportNotes(report, this.logger);
      const note = {
        'time': new Date(),
        'user': `${this.user['full_name']} ${this.user['email']}`,
        'notes': notes,
      }

      result = { ...result, ...reportNotes.add(note) };
      result.success = true;

      try {
        // log user action for history
        const actionsLogger = new UserActionsLogger(reportId);
        actionsLogger.updatedTestNotes(params);
      } catch(err) {}
    } catch (err) {
      this.logger.error(err);
      result.error = err.toString();
    }

    return result;
  }

  editAction(params) {
    let { reportId, stageId } = { ...params };
    let result = this._getResponseSchema();
    try {
      const report = new Report(this.logger);
      report.openSpreadsheet(reportId);
      report.openSheet(stageId);
      const reportNotes = new ReportNotes(report, this.logger);
      const user = {'user': `${this.user['full_name']} ${this.user['email']}`};
      
      result = { ...result, ...reportNotes.edit({ ...params, ...user}) };
      result.success = true;
    } catch (err) {
      this.logger.error(err);
      result.error = err.toString();
    }

    return result;
  }
}