class ReportChecklist {

  constructor(reportInstance, loggerInstance, i18nInstance) {
    // all the errors are supposed to be catched in the front controllers
    // you may see some duplicate error messages in the logs
    // if that's a problem then remove all lines with this.logger.error(*);
    this._logger = loggerInstance;
    
    if (! reportInstance.sheet || ! reportInstance.sheet.getSheetId()) {
      let errMsg = 'Sheet is not loaded.';
      this.logger.error(errMsg);
      throw new Error(errMsg);
    }

    this._report = reportInstance;
  }

  get report() {
    return this._report;
  }

  get logger() {
    return this._logger;
  }

  _getRangeOfChecklistNumbers() {
    const numberHeaderRange = this.report._extractRangesByPrefix(this.report.sheet, 'data_header_number');
    const numberRange = numberHeaderRange[Object.keys(numberHeaderRange)[0]].getRange();

    const checklistRange = this.report._extractRangesByPrefix(this.report.sheet, 'checklist');
    const dataRange = checklistRange[Object.keys(checklistRange)[0]].getRange();

    return {
      'columnIndex': numberRange.getColumn(),
      'firstRow': numberRange.getRow() +1,
      'lastRow': dataRange.getLastRow()
    }
  }

  _getChecklistItemPosition(checklistItemNumber) {
    let searchNumber = null;
    const {columnIndex, firstRow, lastRow} = {...this._getRangeOfChecklistNumbers(this.report.sheet)};
    const numberColumnRange = this.report.sheet.getRange(firstRow, columnIndex, (lastRow - firstRow) +1, 1);
    const numberColumnRangeValues = numberColumnRange.getValues();
    for (let i = 0; i < numberColumnRangeValues.length; i++) {
      let rowIndex = i;
      let row = numberColumnRangeValues[i];

      let realRowIndex = rowIndex + firstRow;
      let cellValue = row.at(0);
      if (parseInt(checklistItemNumber) === parseInt(cellValue)) {
        searchNumber = {
          'realRowIndex': realRowIndex,
          'columnIndex': columnIndex,
          'value': cellValue
        }
        break;
      }
    }

    return searchNumber;
  }

  // DEPRECATED
  _getChecklistCellByItemNumber(checklistItemPosition, cellHeaderName) {
    const headerRange = this.report._extractRangesByPrefix(this.report.sheet, cellHeaderName);
    const range = headerRange[Object.keys(headerRange)[0]].getRange();
    const columnIndex = range.getColumn();
    const cellRange = this.report.sheet.getRange(checklistItemPosition['realRowIndex'], columnIndex, 1, 1);

    return {'range': cellRange, 'value': cellRange.getValue()};
  }

  _getChecklistCellByRowIndex(rowIndex, cellHeaderName) {
    const headerRange = this.report._extractRangesByPrefix(this.report.sheet, cellHeaderName);
    const range = headerRange[Object.keys(headerRange)[0]].getRange();
    const columnIndex = range.getColumn();
    const cellRange = this.report.sheet.getRange(rowIndex, columnIndex, 1, 1);

    return {'range': cellRange, 'value': cellRange.getValue()};
  }

  _findChecklistItemByNumber(itemNumber) {
    const checklist = this.report._getChecklistByStage(this.report.sheet);
    let checklistItem = null;
    for (let item of checklist['list']) {
      if (parseInt(item['number']) === parseInt(itemNumber)) {
        checklistItem = item;
        break;
      }
    }

    return checklistItem;
  }

  _validateItemPosition(checklistRowIndex, checklistItemNumber) {
    const itemNumber = this._getChecklistCellByRowIndex(checklistRowIndex, 'data_header_number');
    if (parseInt(itemNumber['value']) !== parseInt(checklistItemNumber)) {
      let errMsg = `Cheklist item number and row index don't match.`;
      this.logger.error(errMsg);
      throw new Error(errMsg);
    }
  }

  _validateStageStatusNotCompleted(stageStatus) {
    const stageStatusList = Report.stageStatusList();
    if (stageStatus.toUpperCase() === stageStatusList.completed) {
      let errMsg = `Can not make any updates to checklist with status ${stageStatus}.`;
      this.logger.error(errMsg);
      throw new Error(errMsg);
    }
  }

  _prepareResponse(itemNumber) {
    const stageStatus = this.report._calcStageStatus(this.report.sheet); // reload stage status after actions completed
    const checklistItem = this._findChecklistItemByNumber(itemNumber);
    const checklistItemHTML = include('templates/inc.checklist_item', {item: checklistItem, stageStatus: stageStatus});
    const stageStatusHTML = include('templates/inc.status_badge', {'type': 'stage', 'status': stageStatus});

    return {
      'stage': {'status': stageStatus, 'status_html': stageStatusHTML},
      'obj': checklistItem,
      'html': checklistItemHTML
    }
  }

  pass(params) {
    const { checklistRowIndex, checklistItemNumber } = { ...params };

    const itemStatusList = Report.itemStatusList();
    const stageStatus = this.report._calcStageStatus(this.report.sheet);
    this._validateStageStatusNotCompleted(stageStatus);
    this._validateItemPosition(checklistRowIndex, checklistItemNumber);

    const itemStatus = this._getChecklistCellByRowIndex(checklistRowIndex, 'data_header_status');
    if (itemStatus['value'] !== itemStatusList.empty) {
      let errMsg = `Can not make any updates to item with status ${itemStatus['value'] || '(empty)'}.`;
      this.logger.error(errMsg);
      throw new Error(errMsg);
    }

    // saving new item status to spreadsheet:
    itemStatus['range'].setValue(itemStatusList.passed);

    return this._prepareResponse(checklistItemNumber);
  }

  fail(params) {
    let { checklistRowIndex, checklistItemNumber, toFixDate, notes } = { ...params };
    if (! toFixDate) {
      let errMsg = `*To Fix Date* is not provided.`;
      this.logger.error(errMsg);
      throw new Error(errMsg);
    }

    const itemStatusList = Report.itemStatusList();
    const stageStatus = this.report._calcStageStatus(this.report.sheet);
    this._validateStageStatusNotCompleted(stageStatus);
    this._validateItemPosition(checklistRowIndex, checklistItemNumber);    

    const itemStatus = this._getChecklistCellByRowIndex(checklistRowIndex, 'data_header_status');
    if (itemStatus['value'] !== itemStatusList.empty) {
      let errMsg = `Can not make any updates to item with status ${itemStatus['value'] || '(empty)'}.`;
      this.logger.error(errMsg);
      throw new Error(errMsg);
    }

    // saving new item status to spreadsheet:
    itemStatus['range'].setValue(itemStatusList.failed);

    // fill up to fix date cell
    const existingToFixDate = this._getChecklistCellByRowIndex(checklistRowIndex, 'data_header_to_fix_date');
    existingToFixDate['range'].setValue(toFixDate);
    
    // fill up notes cell
    const existingNotes = this._getChecklistCellByRowIndex(checklistRowIndex, 'data_header_notes');
    existingNotes['range'].setValue(notes);


    return this._prepareResponse(checklistItemNumber);
  }

  revertPassed(params) {
    const { checklistRowIndex, checklistItemNumber } = { ...params };

    const itemStatusList = Report.itemStatusList();
    const stageStatus = this.report._calcStageStatus(this.report.sheet);
    this._validateStageStatusNotCompleted(stageStatus);
    this._validateItemPosition(checklistRowIndex, checklistItemNumber);    

    const itemStatus = this._getChecklistCellByRowIndex(checklistRowIndex, 'data_header_status');
    if (itemStatus['value'] !== itemStatusList.passed) {
      let errMsg = `Can not make any updates to item with status ${itemStatus['value'] || '(empty)'}.`;
      this.logger.error(errMsg);
      throw new Error(errMsg);
    }

    // saving new item status to spreadsheet:
    itemStatus['range'].setValue(itemStatusList.empty);

    return this._prepareResponse(checklistItemNumber);
  }

  fixFailed(params) {
    const { checklistRowIndex, checklistItemNumber } = { ...params };

    const itemStatusList = Report.itemStatusList();
    const stageStatus = this.report._calcStageStatus(this.report.sheet);
    this._validateStageStatusNotCompleted(stageStatus);
    this._validateItemPosition(checklistRowIndex, checklistItemNumber);

    const itemStatus = this._getChecklistCellByRowIndex(checklistRowIndex, 'data_header_status');
    if (itemStatus['value'] !== itemStatusList.failed) {
      let errMsg = `Can not make any updates to item with status ${itemStatus['value'] || '(empty)'}.`;
      this.logger.error(errMsg);
      throw new Error(errMsg);
    }

    // saving new item status to spreadsheet:
    itemStatus['range'].setValue(itemStatusList.passed);

    // fill up fixed_date cell
    const fixedDate = this._getChecklistCellByRowIndex(checklistRowIndex, 'data_header_fixed_date');
    fixedDate['range'].setValue(new Date().toISOString().split('T').at(0));

    return this._prepareResponse(checklistItemNumber);
  }

  completeChecklist(completionData) {
    const metaPrefix = 'meta_';
    const {userInfo, time} = {...completionData};

    const stageStatusList = Report.stageStatusList();
    const stageStatus = this.report._calcStageStatus(this.report.sheet);
    if (stageStatus.toUpperCase() !== stageStatusList.passed) {
      let errMsg = `Can not complete this checklist until it has status: ${stageStatusList.passed}.`;
      this.logger.error(errMsg);
      throw new Error(errMsg);
    }
    
    let ranges = this.report._extractRangesByPrefix(this.report.sheet, metaPrefix);
    ranges['meta_submitted_by'].getRange().setValue(userInfo);
    ranges['meta_submitted_at'].getRange().setValue(time);

    // now it's assumed that checklist is completed
    const stageStatusHTML = include('templates/inc.status_badge', {'type': 'stage', 'status': stageStatusList.completed});

    return {
      'stage': {
        'status': stageStatusList.completed,
        'meta_submitted_by': ranges['meta_submitted_by'].getRange().getValue(),
        'meta_submitted_at': ranges['meta_submitted_at'].getRange().getValue().toISOString(),
        'status_html': stageStatusHTML
      }
    }
  }

  batchPass(params) {
    const metaPrefix = 'meta_';
    const {checklistRows, userInfo, time} = { ...params };

    const stageStatusList = Report.stageStatusList();
    const itemStatusList = Report.itemStatusList();
    const stageStatus = this.report._calcStageStatus(this.report.sheet);
    this._validateStageStatusNotCompleted(stageStatus);

    const headerRange = this.report._extractRangesByPrefix(this.report.sheet, 'data_header_status');
    const range = headerRange[Object.keys(headerRange)[0]].getRange();
    const columnIndex = range.getColumn();
    
    let i = 0;
    for (i; i < checklistRows.length; i++) {
      let checklistRowIndex = checklistRows[i];
      const cellRange = this.report.sheet.getRange(checklistRowIndex, columnIndex, 1, 1);
      if (cellRange.getValue() === itemStatusList.failed) {
        let errMsg = `Can not make any updates to a failed item (row index ${checklistRowIndex})`;
        this.logger.error(errMsg);
        throw new Error(errMsg);
      }

      // saving new item status to spreadsheet:
      cellRange.setValue(itemStatusList.passed);
    }
    

    let updatedStageStatus = this.report._calcStageStatus(this.report.sheet); // reload stage status after action's completed
    // if all tests passed then we automatically complete the stage
    if (updatedStageStatus.toUpperCase() === stageStatusList.passed) {
      let ranges = this.report._extractRangesByPrefix(this.report.sheet, metaPrefix);
      ranges['meta_submitted_by'].getRange().setValue(userInfo);
      ranges['meta_submitted_at'].getRange().setValue(time);
      updatedStageStatus = stageStatusList.completed;
    }

    return {
      'passed_count': i,
      'stage': {
        'status': updatedStageStatus
      }
    }
  }

  saveNotes(params) {
    const { checklistRowIndex, checklistItemNumber, notes } = { ...params };

    const stageStatus = this.report._calcStageStatus(this.report.sheet);
    this._validateStageStatusNotCompleted(stageStatus);
    this._validateItemPosition(checklistRowIndex, checklistItemNumber);

    // save notes to cell
    const existingNotes = this._getChecklistCellByRowIndex(checklistRowIndex, 'data_header_notes');
    existingNotes['range'].setValue(notes);
    
    const checklistItem = this._findChecklistItemByNumber(checklistItemNumber);
    const checklistItemHTML = include('templates/inc.checklist_item', {item: checklistItem, stageStatus: stageStatus});

    return {
       'obj': checklistItem,
       'html': checklistItemHTML
    };
  }

}

function passTest() {
  TESTING_FLAG = true;
  const appContainer = new AppContainer(PROPS_SCHEMA, TESTING_FLAG);
  const { props, logger, i18n, user } = { ...appContainer.run() };

  const report = new Report();
  report.openSpreadsheet('162mWIRX0joumYjTH3owDThZwPxOooU6UD5dNql0IrRE');
  report.openSheet('1424598776');

  const reportChecklist = new ReportChecklist(report, logger);
  const result = reportChecklist.pass({ checklistRowIndex: 9, checklistItemNumber: 1 });

  console.log(result);
}

function failTest() {
  TESTING_FLAG = true;
  const appContainer = new AppContainer(PROPS_SCHEMA, TESTING_FLAG);
  const { props, logger, i18n, user } = { ...appContainer.run() };

  const report = new Report();
  report.openSpreadsheet('162mWIRX0joumYjTH3owDThZwPxOooU6UD5dNql0IrRE');
  report.openSheet('1424598776');

  const reportChecklist = new ReportChecklist(report, logger);
  const result = reportChecklist.fail({checklistRowIndex: 10, checklistItemNumber: 2, toFixDate: '2025-12-13', notes: 'testing note'});

  console.log(result);
}

function revertPassedTest() {
  TESTING_FLAG = true;
  const appContainer = new AppContainer(PROPS_SCHEMA, TESTING_FLAG);
  const { props, logger, i18n, user } = { ...appContainer.run() };

  const report = new Report();
  report.openSpreadsheet('162mWIRX0joumYjTH3owDThZwPxOooU6UD5dNql0IrRE');
  report.openSheet('1424598776');

  const reportChecklist = new ReportChecklist(report, logger);
  const result = reportChecklist.revertPassed({ checklistRowIndex: 9, checklistItemNumber: 1 });

  console.log(result);
}

function fixFailedTest() {
  TESTING_FLAG = true;
  const appContainer = new AppContainer(PROPS_SCHEMA, TESTING_FLAG);
  const { props, logger, i18n, user } = { ...appContainer.run() };

  const report = new Report();
  report.openSpreadsheet('162mWIRX0joumYjTH3owDThZwPxOooU6UD5dNql0IrRE');
  report.openSheet('1424598776');

  const reportChecklist = new ReportChecklist(report, logger);
  const result = reportChecklist.fixFailed({ checklistRowIndex: 10, checklistItemNumber: 2 });

  console.log(result);
}

function completeChecklistTest() {
  TESTING_FLAG = true;
  const appContainer = new AppContainer(PROPS_SCHEMA, TESTING_FLAG);
  const { props, logger, i18n, user } = { ...appContainer.run() };

  const report = new Report();
  report.openSpreadsheet('1hcosE7cRwXUYoxmGU7yDveqd20EIguadHXU3HC__fdY');
  report.openSheet('950457542');

  const reportChecklist = new ReportChecklist(report, logger);
  const result = reportChecklist.completeChecklist({'userInfo': 'test user', 'time': new Date()});

  console.log(result);
}


function batchPassTest() {
  TESTING_FLAG = true;
  const appContainer = new AppContainer(PROPS_SCHEMA, TESTING_FLAG);
  const { props, logger, i18n, user } = { ...appContainer.run() };

  const report = new Report();
  report.openSpreadsheet('162mWIRX0joumYjTH3owDThZwPxOooU6UD5dNql0IrRE');
  report.openSheet('1424598776');

  const reportChecklist = new ReportChecklist(report, logger);
  const result = reportChecklist.batchPass({checklistRows: [9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23], userInfo: 'test user', time: new Date()});

  console.log(result);
}