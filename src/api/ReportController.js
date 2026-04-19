class ReportController extends BaseController {

  createAction(params) {
    let { serial, version } = { ...params };

    let result = this._getResponseSchema();
    try {
      const report = new Report(this.logger);
      report.reportFolder = new ReportFolder(this.props['reportsRootFolderId']);
      report.templateFileId = this.props['reportTemplateId'];

      const newFileId = report.createFile(serial);
      const data = {
        'time': new Date(),
        'userInfo': `${this.user['full_name']} ${this.user['email']}`,
        'serial': serial,
        'version': version
      }
      report.fillUpNewFile(newFileId, data);

      result.file_id = newFileId;
      result.success = true;
      
      try {
        const actionsLogger = new UserActionsLogger(newFileId);
        actionsLogger.createdNewReport(data);
        this.cache.clearFiles(report.reportFolder.currentFolder.getId());
      } catch (err) {}
      
    } catch (err) {
      this.logger.error(err);
      result.error = err.toString();
    }

    return result;
  }

  listAction(params) {
    let { folderId, excludeStatus } = { ...params };

    let result = this._getResponseSchema();
    try {
      const reportFolder = new ReportFolder(this.props['reportsRootFolderId'], this.logger);
      if (! folderId) folderId = reportFolder.currentFolder.getId();

      let filesArray = this.cache.getFiles(folderId);
      if (filesArray === null) {  
        const files = reportFolder.listFilesInFolder(folderId);
        filesArray = ReportFolder.toFilesArray(files);

        this.cache.saveFiles(folderId, filesArray);
      }
      
      
      // filter out files with some status, e.g. compelted on the home page
      if (excludeStatus) {
        filesArray = filesArray.filter((f) => f.status.toLowerCase() !== excludeStatus.toLowerCase());
      }

      result.data = filesArray;
      result.success = true;
    } catch (err) {
      this.logger.error(err);
      result.error = err.toString();
    }

    return result;
  }
  
  stageAction(params) {
    let { reportId, stageId } = { ...params };
    let result = this._getResponseSchema();
    try {
      const report = new Report(this.logger);
      const stage = report.readStage(reportId, stageId);
      const infoHTML = include('templates/inc.checklist_info', stage.meta);
      const checklistHTML = include('templates/inc.checklist', stage);

      result.data = stage.meta;
      result.info_html = infoHTML;
      result.checklist_html = checklistHTML;
      result.success = true;
    } catch (err) {
      this.logger.error(err);
      result.error = err.toString();
    }

    return result;
  }
  
  stagesStatusesAction(params) {
    let { reportId } = { ...params };
    let result = this._getResponseSchema();
    try {
      const report = new Report(this.logger);
      report.openSpreadsheet(reportId);
      result.stages = report.getAllStagesWithStatus();
      result.success = true;
    } catch (err) {
      this.logger.error(err);
      result.error = err.toString();
    }

    return result;
  }

  searchAction(params) {
    let { searchString } = { ...params };
    if (! searchString) {
      throw new Error('Search string is empty');
    }

    let result = this._getResponseSchema();
    try {
      const reportFolder = new ReportFolder(this.props['reportsRootFolderId'], this.logger);
      const files = reportFolder.listAllFiles();
      let filesArray = ReportFolder.toFilesArray(files);
      
      filesArray = filesArray.filter((f) => f.name.toLowerCase().includes(searchString.toLowerCase()));

      result.data = filesArray;
      result.success = true;
    } catch (err) {
      this.logger.error(err);
      result.error = err.toString();
    }

    return result;
  }

  batchPassAction(params) {
    let { reportId, stageId } = { ...params };
    let result = this._getResponseSchema();
    try {
      const reportStatusList = Report.reportStatusList();
      const stageStatusList = Report.stageStatusList();
      const report = new Report(this.logger);
      const spreadsheetFile = report.openSpreadsheet(reportId);
      const spreadsheetNameBefore = spreadsheetFile.getName();
      report.openSheet(stageId);
      const reportChecklist = new ReportChecklist(report, this.logger);

      const submissionInfo = {
        'time': new Date(),
        'userInfo': `${this.user['full_name']} ${this.user['email']}`
      };
      const checklistOperationResult = reportChecklist.batchPass({ ...params, ...submissionInfo});

      const stageStatus = checklistOperationResult.stage.status;
      let reportStatus = report.getReportStatus();
      if (stageStatus === stageStatusList.completed) { // if stage is completed then check if whole report can be completed
        reportStatus = report.changeReportStatusToCompleted();
      } else if (reportStatus === reportStatusList.new) { // if report still has 'new' status then change it to in progress
        reportStatus = report.changeReportStatusToInProgress(stageStatus);
      }
      const reportStatusHTML = include('templates/inc.status_badge', {'type': 'report', 'status': reportStatus});

      result = { ...result, ...checklistOperationResult, ...{report: {status: reportStatus, status_html: reportStatusHTML}}};
      result.success = true;


      try {
        // log user action for history
        const actionsLogger = new UserActionsLogger(reportId);
        const stageAL = {id: stageId, name: report.sheet.getName(), status: stageStatus};
        const reportAL = {status: reportStatus};
        actionsLogger.sentBatchPassedTests(reportAL, stageAL, params);

        if (stageStatus === stageStatusList.completed) {
          actionsLogger.completedChecklist(reportAL, stageAL, params);
        }

        // clear cache if there are any changes to the report status/name
        const spreadsheetNameAfter = spreadsheetFile.getName();
        if (spreadsheetNameBefore !== spreadsheetNameAfter) {
          this.cache.clearFile(reportId);
        }
      } catch (err) {}

    } catch (err) {
      this.logger.error(err);
      result.error = err.toString();
    }

    return result;
  }

  passAction(params) {
    let { reportId, stageId } = { ...params };
    let result = this._getResponseSchema();
    try {
      const report = new Report(this.logger);
      const spreadsheetFile = report.openSpreadsheet(reportId);
      const spreadsheetNameBefore = spreadsheetFile.getName();
      report.openSheet(stageId);
      const reportChecklist = new ReportChecklist(report, this.logger);

      const checklistOperationResult = reportChecklist.pass(params);

      // Change report status to in_progress if possible:
      const reportStatus = report.changeReportStatusToInProgress(checklistOperationResult.stage.status);
      const reportStatusHTML = include('templates/inc.status_badge', {'type': 'report', 'status': reportStatus});

      result = { ...result, ...checklistOperationResult, ...{report: {status: reportStatus, status_html: reportStatusHTML}}};
      result.success = true;

      try {
        // log user action for history
        const actionsLogger = new UserActionsLogger(reportId);
        const stageAL = {id: stageId, name: report.sheet.getName(), status: checklistOperationResult.stage.status};
        const reportAL = {status: reportStatus};
        actionsLogger.passedTest(reportAL, stageAL, params);

        // clear cache if there are any changes to the report status/name
        const spreadsheetNameAfter = spreadsheetFile.getName();
        if (spreadsheetNameBefore !== spreadsheetNameAfter) {
          this.cache.clearFile(reportId);
        }
      } catch (err) {}

    } catch (err) {
      this.logger.error(err);
      result.error = err.toString();
    }

    return result;
  }

  failAction(params) {
    let { reportId, stageId } = { ...params };
    let result = this._getResponseSchema();
    try {
      const report = new Report(this.logger);
      const spreadsheetFile = report.openSpreadsheet(reportId);
      const spreadsheetNameBefore = spreadsheetFile.getName();
      report.openSheet(stageId);
      const reportChecklist = new ReportChecklist(report, this.logger);

      const checklistOperationResult = reportChecklist.fail(params);

      // Change report status to failed
      const reportStatus = report.changeReportStatusToFailed();
      const reportStatusHTML = include('templates/inc.status_badge', {'type': 'report', 'status': reportStatus});

      result = { ...result, ...checklistOperationResult, ...{report: {status: reportStatus, status_html: reportStatusHTML}}};
      result.success = true;

      try {
        // log user action for history
        const actionsLogger = new UserActionsLogger(reportId);
        const stageAL = {id: stageId, name: report.sheet.getName(), status: checklistOperationResult.stage.status};
        const reportAL = {status: reportStatus};
        actionsLogger.failedTest(reportAL, stageAL, params);

        // clear cache if there are any changes to the report status/name
        const spreadsheetNameAfter = spreadsheetFile.getName();
        if (spreadsheetNameBefore !== spreadsheetNameAfter) {
          this.cache.clearFile(reportId);
        }
      } catch (err) {}

    } catch (err) {
      this.logger.error(err);
      result.error = err.toString();
    }

    return result;
  }

  revertPassedAction(params) {
    let { stageId, reportId } = { ...params };
    let result = this._getResponseSchema();
    try {
      const report = new Report(this.logger);
      const spreadsheetFile = report.openSpreadsheet(reportId);
      const spreadsheetNameBefore = spreadsheetFile.getName();
      report.openSheet(stageId);
      const reportChecklist = new ReportChecklist(report, this.logger);

      const checklistOperationResult = reportChecklist.revertPassed(params);
      result = { ...result, ...checklistOperationResult};
      result.success = true;

      
      try {
        const spreadsheetNameAfter = spreadsheetFile.getName();

        // log user action for history
        const actionsLogger = new UserActionsLogger(reportId);
        const stageAL = {id: stageId, name: report.sheet.getName(), status: checklistOperationResult.stage.status};
        const reportAL = Report.retrieveStatusAndName(spreadsheetNameAfter);
        actionsLogger.revertedAPassedTest(reportAL, stageAL, params);

        // clear cache if there are any changes to the report status/name
        if (spreadsheetNameBefore !== spreadsheetNameAfter) {
          this.cache.clearFile(reportId);
        }
      } catch (err) {}

    } catch (err) {
      this.logger.error(err);
      result.error = err.toString();
    }

    return result;
  }

  fixFailedAction(params) {
    let { stageId, reportId } = { ...params };
    let result = this._getResponseSchema();
    try {
      const report = new Report(this.logger);
      const spreadsheetFile = report.openSpreadsheet(reportId);
      const spreadsheetNameBefore = spreadsheetFile.getName();
      report.openSheet(stageId);
      const reportChecklist = new ReportChecklist(report, this.logger);

      const checklistOperationResult = reportChecklist.fixFailed(params);

      // Change report status to in_progress if possible:
      const reportStatus = report.changeReportStatusToInProgress(checklistOperationResult.stage.status);
      const reportStatusHTML = include('templates/inc.status_badge', {'type': 'report', 'status': reportStatus});

      result = { ...result, ...checklistOperationResult, ...{report: {status: reportStatus, status_html: reportStatusHTML}}};
      result.success = true;

      try {
        // log user action for history
        const actionsLogger = new UserActionsLogger(reportId);
        const stageAL = {id: stageId, name: report.sheet.getName(), status: checklistOperationResult.stage.status};
        const reportAL = {status: reportStatus};
        actionsLogger.fixedAFailedTest(reportAL, stageAL, params);

        // clear cache if there are any changes to the report status/name
        const spreadsheetNameAfter = spreadsheetFile.getName();
        if (spreadsheetNameBefore !== spreadsheetNameAfter) {
          this.cache.clearFile(reportId);
        }
      } catch (err) {}

    } catch (err) {
      this.logger.error(err);
      result.error = err.toString();
    }

    return result;
  }

  completeChecklistAction(params) {
    let { stageId, reportId } = { ...params };
    let result = this._getResponseSchema();
    try {
      const report = new Report(this.logger);
      const spreadsheetFile = report.openSpreadsheet(reportId);
      const spreadsheetNameBefore = spreadsheetFile.getName();
      report.openSheet(stageId);
      const reportChecklist = new ReportChecklist(report, this.logger);

      const data = {
        'time': new Date(),
        'userInfo': `${this.user['full_name']} ${this.user['email']}`,
      }
      const checklistOperationResult = reportChecklist.completeChecklist({...params, ...data});

      // check if we can change report status to completed; ALL stages should be in completed status
      const reportStatus = report.changeReportStatusToCompleted();
      const reportStatusHTML = include('templates/inc.status_badge', {'type': 'report', 'status': reportStatus});

      result = { ...result, ...checklistOperationResult, ...{report: {status: reportStatus, status_html: reportStatusHTML}}};
      result.success = true;

      try {
        // log user action for history
        const actionsLogger = new UserActionsLogger(reportId);
        const stageAL = {id: stageId, name: report.sheet.getName(), status: checklistOperationResult.stage.status};
        const reportAL = {status: reportStatus};
        actionsLogger.completedChecklist(reportAL, stageAL, params);

        // clear cache if there are any changes to the report status/name
        const spreadsheetNameAfter = spreadsheetFile.getName();
        if (spreadsheetNameBefore !== spreadsheetNameAfter) {
          this.cache.clearFile(reportId);
        }
      } catch (err) {}

    } catch (err) {
      this.logger.error(err);
      result.error = err.toString();
    }

    return result;
  }

  saveNotesAction(params) {
    let { reportId, stageId } = { ...params };
    let result = this._getResponseSchema();
    try {
      const report = new Report(this.logger);
      report.openSpreadsheet(reportId);
      report.openSheet(stageId);
      const reportChecklist = new ReportChecklist(report, this.logger);

      const checklistOperationResult = reportChecklist.saveNotes(params);

      result = { ...result, ...checklistOperationResult };
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
}