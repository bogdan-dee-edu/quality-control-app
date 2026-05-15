class Report {

  constructor(loggerInstance, i18nInstance) {
    this._logger = loggerInstance;
    this._cache = CacheService.getPublicCache();

    this._reportFolder = null;

    this._templateFileId = null;
    this._template = null;

    this._spreadsheet = null;
    this._sheet = null;
  }

  static reportStatusList() {
    return {
      'new': 'NEW', 
      'in_progress': 'IN_PROGRESS',
      'failed': 'FAILED',
      'completed': 'COMPLETED'
    };
  }

  static stageStatusList() {
    return {
      'new': 'NEW', 
      'in_progress': 'IN_PROGRESS',
      'failed': 'FAILED',
      'passed': 'PASSED',
      'completed': 'COMPLETED'
    };
  }

  static itemStatusList() {
    return {
      'empty': '', 
      'failed': 'failed',
      'passed': 'passed'
    };
  }

  static reportStatusDivider() {
    return '|';
  }

  static retrieveStatusAndName(fileName) {
    let splitFileName = fileName.split(Report.reportStatusDivider());

    return {
      'status': splitFileName.at(0),
      'name': splitFileName.at(-1)
    }
  }

  get logger() {
    return this._logger;
  }

  get spreadsheet() {
    return this._spreadsheet;
  }

  get sheet() {
    return this._sheet;
  }

  get templateFileId() {
    return this._templateFileId;
  }

  set templateFileId(id) {
    this._templateFileId = id;
  }

  get reportFolder() {
    return this._reportFolder;
  }

  set reportFolder(reportFolderInstance) {
    this._reportFolder = reportFolderInstance;
  }

  _buildReportFileNameWithStatus(name, status) {
    if (! Object.values(Report.reportStatusList()).includes(status)) {
      let error = new Error(`Report status *${status}* is not supported.`);
      this.logger.error(error);
      throw error;
    }

    return status + Report.reportStatusDivider() + name;
  }

  _openTemplateFile() {
    const template = this._template = DriveApp.getFileById(this.templateFileId);
    if (! template) {
      let error = new Error(`Can not open template file.`);
      this.logger.error(error);
      throw error;
    }
    
    return template;
  }

  _validateSpreadsheetIsReady() {
    if (! this.spreadsheet) {
      let error = new Error(`Report spreadsheet is not ready.`);
      this.logger.error(error);
      throw error;
    }
  }

  _validateSheetIsReady() {
    if (! this.sheet) {
      let error = new Error(`Report stage sheet is not ready.`);
      this.logger.error(error);
      throw error;
    }
  }

  openSpreadsheet(spreadsheetId) {
    this._spreadsheet = SpreadsheetApp.openById(spreadsheetId);
    this._validateSpreadsheetIsReady();

    return this._spreadsheet;
  }

  openSheet(sheetId) {
    this._validateSpreadsheetIsReady();

    this._sheet = this.spreadsheet.getSheetById(sheetId);
    this._validateSheetIsReady();

    return this._sheet;
  }

  _getStagesList(spreadsheet) {
    const sheetsInfo = [];
    const sheets = spreadsheet.getSheets();
    for (let sheet of sheets) {
      let name = sheet.getName();
      if (name === 'logs') {
        continue;
      }
      sheetsInfo.push({
        'id': sheet.getSheetId(),
        'index': sheet.getIndex(),
        'name': name
      });
    }
    return sheetsInfo.sort((a, b) => a.index - b.index);
  }

  _extractRangesByPrefix(sheet, prefix) {
    const ranges = sheet.getNamedRanges(); 
    const filteredRanges = {};
    for (let range of ranges) {
      let rangeName = range.getName();

      // this is how google spreadsheet decides to name the ranges, by using prefix and ! as divider
      // so need to get rid of it in the name
      if (rangeName.indexOf('!') !== -1) {
        rangeName = rangeName.split('!').at(-1);
      }

      // it is also not possible to re-use names accross different sheets
      // that's why al ranges also has suffix, and it also needs to be taken out
      rangeName = rangeName.split('.').at(0);

      if (rangeName.startsWith(prefix)) {
        filteredRanges[rangeName] = range;
      }
    }

    return filteredRanges;
  }

  _getMetaInfoByStage(sheet) {
    const metaPrefix = 'meta_';
    const ranges = this._extractRangesByPrefix(sheet, metaPrefix);

    const meta = {
      'id': sheet.getSheetId(),
      'status': this._calcStageStatus(sheet)
    };
    for (let key in ranges) {
      let value = ranges[key].getRange().getValue();
      if (value instanceof Date) {
        value = value.toISOString();
      }
      
      meta[key.replace(metaPrefix, '')] = value;
    }

    return meta;
  }

  _calcStageStatus(sheet) {
    const metaPrefix = 'meta_';
    const metaRanges = this._extractRangesByPrefix(sheet, metaPrefix);

    const statusHeaderRange = this._extractRangesByPrefix(sheet, 'data_header_status');
    const checklistRange = this._extractRangesByPrefix(sheet, 'checklist');

    const statusRange = statusHeaderRange[Object.keys(statusHeaderRange)[0]].getRange();
    const dataRange = checklistRange[Object.keys(checklistRange)[0]].getRange();

    const allStatuses = sheet.getRange(statusRange.getRow() +1, statusRange.getColumn(), dataRange.getLastRow() - statusRange.getRow())
    .getValues()
    .flat();
    
    const stageStatusList = Report.stageStatusList();
    const itemStatusList = Report.itemStatusList();

    let status = stageStatusList.new;
    if (metaRanges['meta_submitted_by'].getRange().getValue() !== '' && metaRanges['meta_submitted_at'].getRange().getValue() !== '') {
      
      status = stageStatusList.completed;

    } else {

      if (allStatuses.includes(itemStatusList.failed)) {
        status = stageStatusList.failed;

      } else if (allStatuses.includes(itemStatusList.passed) && allStatuses.includes(itemStatusList.empty)) {
        status = stageStatusList.in_progress;

      } else if (allStatuses.every(elem => elem == itemStatusList.passed)) {
        status = stageStatusList.passed;

      }

    }

    return status;
  }

  _getObjKeyByValue(object, value) {
    for (const [key, val] of Object.entries(object)) {
      if (val === value) {
        return key;
      }
    }
    return null;
  }

  _toObjects(data, headers = null) {
    if (! headers) {
      headers = data.shift();
    }
    
    const jsonArray = data.map((row) => {
      const obj = {};
      headers.forEach((h, i) => {
        obj[h] = row[i];
      });
      return obj;
    });

    return jsonArray;
  }

  _loadDatasetByStage(sheet, headerPrefix = 'data_header_', dataPrefix = 'checklist') {
    const ranges = this._extractRangesByPrefix(sheet, headerPrefix);

    const rowIndexHeader = 'row_index'
    const headers = {};
    headers[rowIndexHeader] = rowIndexHeader;
    for (let key in ranges) {
      headers[key.replace(headerPrefix, '')] = ranges[key].getRange().getValue();
    }

    const result = {
      'headers': headers,
      'list': []
    };
    
    const searchedDataRange = this._extractRangesByPrefix(sheet, dataPrefix);
    if (searchedDataRange[dataPrefix] !== undefined && searchedDataRange[dataPrefix] ) {
      const dataRange = searchedDataRange[dataPrefix].getRange();
      const values = dataRange.getValues();
      
      // Get the starting row of the defined range
      var startRow = dataRange.getRow();
      var dataList = [];
      for (var i = 0; i < values.length; i++) { // Loop through rows
        var rowIndex = startRow + i;
        if (i === 0) {
          values[i].unshift(rowIndexHeader); // set row_index header for the first row
        } else {
          values[i].unshift(rowIndex); // set actual row index of each row in the range
        }
        
        dataList.push(values[i]);
      }
      
      const dataHeaders = dataList.shift();
      const correctHeadersKeys = [];
      for (let i in dataHeaders) {
        correctHeadersKeys[i] = this._getObjKeyByValue(headers, dataHeaders[i]);
      }
      result['list'] = this._toObjects(dataList, correctHeadersKeys);
    }

    return result;
  }

  _getChecklistByStage(sheet) {
    return this._loadDatasetByStage(sheet, 'data_header_', 'checklist');
  }

  createFile(name) {
    try {
      const fileNameWithStatus = this._buildReportFileNameWithStatus(name, Report.reportStatusList()['new']);
      this._openTemplateFile();
      return this._template.makeCopy(fileNameWithStatus, this._reportFolder.currentFolder).getId();
    } catch(err) {
      this.logger.error('Can not create a new report file.');
      throw err;
    }
  }

  fillUpNewFile(fileId, data = {}) {
    const metaPrefix = 'meta_';
    const {userInfo, time, serial, version} = {...data};
    const spreadsheet = this.openSpreadsheet(fileId);
    const stages = this._getStagesList(spreadsheet);
    for (let stage of stages) {
      let sheet = spreadsheet.getSheetById(stage['id']);
      let ranges = this._extractRangesByPrefix(sheet, metaPrefix);
      ranges['meta_device_serial'].getRange().setValue(serial);
      ranges['meta_device_version'].getRange().setValue(version);
      ranges['meta_file_created_by'].getRange().setValue(userInfo);
      ranges['meta_file_created_at'].getRange().setValue(time);
    }
  }

  readFile(fileId) {
    try {
      const spreadsheet = this.openSpreadsheet(fileId);
      this._validateSpreadsheetIsReady();
      const stagesList = this._getStagesList(this.spreadsheet);
      const statusAndName = Report.retrieveStatusAndName(spreadsheet.getName());

      const fileInfo = {
        'id': spreadsheet.getId(),
        'url': spreadsheet.getUrl(),
        'status': statusAndName['status'],
        'name': statusAndName['name'],
        'stages': stagesList
      }

      return fileInfo;
    } catch(err) {
      this.logger.error(`Can not read report file ${fileId}.`);
      throw err;
    }
  }

  readStage(fileId, stageId) {
    try {
      this.openSpreadsheet(fileId);
      const sheet = this.openSheet(stageId);
      this._validateSheetIsReady();
      
      const stageInfo = {
        'meta': this._getMetaInfoByStage(sheet),
        'checklist': this._getChecklistByStage(sheet),
      };

      return stageInfo;
    } catch(err) {
      this.logger.error(`Can not read stage ID ${stageId} of the report file ${fileId}`);
      throw err;
    }
  }

  readNotes() {
    try {
      this._validateSpreadsheetIsReady();
      this._validateSheetIsReady();
      
      return this._loadDatasetByStage(this.sheet, 'notes_header_', 'notes');
    } catch(err) {
      this.logger.error(`Can not read notes for stage ID ${stageId} of the report file ${fileId}`);
      throw err;
    }
  }

  getAllStagesWithStatus() {
    this._validateSpreadsheetIsReady();

    const stages = this._getStagesList(this.spreadsheet);
    for (let stage of stages) {
      let sheet = this.spreadsheet.getSheetById(stage['id']);
      let stageStatus = this._calcStageStatus(sheet);
      stage['status'] = stageStatus
    }

    return stages;
  }

  calcReportStatus() {
    const stages = this.getAllStagesWithStatus();
    const stageStatusList = Report.stageStatusList();
    const reportStatusList = Report.reportStatusList();
    
    let reportStatus = reportStatusList.new;
    let isFailed = false;
    let isInProgress = false;
    
    for (let stage of stages) {
      if (stage['status'] === stageStatusList.failed) {
        isFailed = true;
        isInProgress = false;
        break;
      }

      if (stage['status'] === stageStatusList.in_progress || stage['status'] === stageStatusList.completed) {
        isInProgress = true;
      }
    }

    if (isFailed) {
      reportStatus = reportStatusList.failed;

    } else {
      if (stages.every(elem => elem['status'] == stageStatusList.completed)) {
        reportStatus = reportStatusList.completed;

      } else {
        if (isInProgress) {
          reportStatus = reportStatusList.in_progress;
          
        }  
      }
    }

    return reportStatus;
  }

  getReportStatus() {
    this._validateSpreadsheetIsReady();

    const statusAndName = Report.retrieveStatusAndName(this.spreadsheet.getName());

    return statusAndName['status'];
  }

  changeReportStatusToInProgress(currentStageStatus) {
    const reportStatusList = Report.reportStatusList();
    const stageStatusList = Report.stageStatusList();
    
    const currentStatus = this.getReportStatus();

    // in this action report status can be either IN_PROGRESS or FAILED
    // by default it's IN_PROGRESS
    let newReportStatus = reportStatusList.in_progress;

    // if current stage status is still FAILED, then report stays FAILED too
    if (currentStageStatus === stageStatusList.failed) {
      newReportStatus = reportStatusList.failed;
    } else {

      // if current stage isn't FAILED we look for other stages, if any is FAILED then report is FAILED too
      const calculatedReportStatus = this.calcReportStatus();
      if (calculatedReportStatus === reportStatusList.failed) {
        newReportStatus = reportStatusList.failed;
      }
    }

    // after the checks above, if new status of the report is still IN_PROGRESS then we change it:
    const statusAndName = Report.retrieveStatusAndName(this.spreadsheet.getName());
    if (newReportStatus === reportStatusList.in_progress && currentStatus !== newReportStatus) {
      const newName = this._buildReportFileNameWithStatus(statusAndName['name'], newReportStatus);
      this.spreadsheet.rename(newName);
    }
    
    return newReportStatus;
  }

  changeReportStatusToFailed() {
    const reportStatusList = Report.reportStatusList();
    const statusAndName = Report.retrieveStatusAndName(this.spreadsheet.getName());

    if (statusAndName['status'] !== reportStatusList.failed) {
      const newName = this._buildReportFileNameWithStatus(statusAndName['name'], reportStatusList.failed);
      this.spreadsheet.rename(newName);
    }

    return reportStatusList.failed;
  }

  changeReportStatusToCompleted() {
    const reportStatusList = Report.reportStatusList();
    const statusAndName = Report.retrieveStatusAndName(this.spreadsheet.getName());

    // check if current status is not already compelted
    if (statusAndName['status'] !== reportStatusList.completed) {

      // calculate real status by cheking all the stags/tabs:
      const calculatedReportStatus = this.calcReportStatus();

      // if all stages are completed then we can update this report too:
      if (calculatedReportStatus === reportStatusList.completed) {
        const newName = this._buildReportFileNameWithStatus(statusAndName['name'], reportStatusList.completed);
        this.spreadsheet.rename(newName);
      }
    }

    const updatedStatusAndName = Report.retrieveStatusAndName(this.spreadsheet.getName());

    return updatedStatusAndName['status'];
  }

}

function TEST_reportRead() {
  TESTING_FLAG = true;
  const appContainer = new AppContainer(PROPS_SCHEMA, TESTING_FLAG);
  const { props, logger, i18n, user } = { ...appContainer.run() };

  const reportFileId = '1MahtDZRPSoKr70rgzNhJb7gly8w2l2sqkIlsv1WiVQM';
  const report = new Report(logger);

  const file = report.readFile(reportFileId);
  console.log(file);
}


function TEST_reportGetChecklist() {
  TESTING_FLAG = true;
  const appContainer = new AppContainer(PROPS_SCHEMA, TESTING_FLAG);
  const { props, logger, i18n, user } = { ...appContainer.run() };

  const reportFileId = '162mWIRX0joumYjTH3owDThZwPxOooU6UD5dNql0IrRE';
  const report = new Report(logger);
  report.openSpreadsheet(reportFileId);
  const sheet = report.spreadsheet.getActiveSheet();
  const checklist = report._getChecklistByStage(sheet);

  console.log(checklist['headers']);
  console.log(checklist['list'][0]);
  console.log(checklist['list'][1]);
  console.log(checklist['list'][2]);
}

function TEST_reportCreate() {
  TESTING_FLAG = true;
  const appContainer = new AppContainer(PROPS_SCHEMA, TESTING_FLAG);
  const { props, logger, i18n, user } = { ...appContainer.run() };

  const reportFolder = new ReportFolder(props['reportsRootFolderId'], logger);
  const report = new Report(logger);
  report.reportFolder = reportFolder;
  report.templateFileId = props['reportTemplateId'];

  const newFileId = report.createFile(Math.random());

  console.log(newFileId);
}

function TEST_reportFillUpNewFile() {
  TESTING_FLAG = true;
  const appContainer = new AppContainer(PROPS_SCHEMA, TESTING_FLAG);
  const { props, logger, i18n, user } = { ...appContainer.run() };

  const reportFolder = new ReportFolder(props['reportsRootFolderId'], logger);
  const report = new Report(logger);
  report.reportFolder = reportFolder;
  report.templateFileId = props['reportTemplateId'];

  const serial = `xxxx-xxxx-xxxx-${Math.floor(Math.random() * 9000) + 1000}`;
  const newFileId = report.createFile(serial);
  const data = {
    'time': new Date(),
    'userInfo': `${user['full_name']} ${user['email']}`,
    'serial': serial,
    'ip': '192.168.0.255'
  }
  const fillUpResult = report.fillUpNewFile(newFileId, data);

  console.log(newFileId);
}

function EXEC_renameNamedRangesInTemplate() {
  // return;
  
  // TESTING_FLAG = true;
  const appContainer = new AppContainer(PROPS_SCHEMA, TESTING_FLAG);
  const { props, logger, i18n, user } = { ...appContainer.run() };

  const templateId = '14Gk2RGYfbTI-PMxel9I5CQeO50DkQLQHsHaKOCrPhvE';
  const report = new Report(logger);

  report.openSpreadsheet(templateId);
  const ss = report.spreadsheet;

  const sheets = ss.getSheets();
  sheets.forEach(sheet => {
    const namedRanges = sheet.getNamedRanges();
    namedRanges.forEach(range => {
      let rangeName = range.getName();
      rangeName = rangeName.split('.').at(0);
      
      let newName = `${rangeName.split('!').at(-1)}.${(sheet.getIndex())}`;
      console.log(sheet.getIndex(), sheet.getName(), rangeName, newName);

      range.setName(newName);
    });
  });
}
