class UserActionsLogger {

  constructor(reportFileId) {
    this._reportFileId = reportFileId;
    this._actionLogsSheetName = 'logs';
    this._storage = new Storage(this._reportFileId, this._actionLogsSheetName);
    this._sheet = this._storage.openSheet();
    this._storage._validateOpenSheet();
  }

  get storage() {
    return this._storage;
  }

  _getUserEmail() {
    try {
      return Session.getActiveUser().getEmail() || 'unknown';
    } catch (err) {
      return 'unknown';
    }
  }

  _save(action, description, data = {}) {
    const obj = {
      'time': new Date().toISOString(),
      'user_email': this._getUserEmail(),
      'action': action,
      'description': description,
      'data_json': JSON.stringify(data)
    }

    this.storage.insert(obj);
  }

  _getDefaultDescription(report, stage) {
    return `Report status: ${report.status}\nStage: ${stage.name} (sheet id: ${stage.id}) [${stage.status}]`;
  }

  createdNewReport(params) {
    const action = `This report file is created`;
    const description = ``;
    this._save(action, description, params);
  }


  passedTest(report, stage, params) {
    const { checklistRowIndex, checklistItemNumber } = { ...params };
    const action = `Test in row ${checklistRowIndex} is marked as PASSED.`;
    if (checklistItemNumber) action += ` Test number: ${checklistItemNumber}`
    const description = this._getDefaultDescription(report, stage);

    this._save(action, description, params);
  }

  failedTest(report, stage, params) {
    const { checklistRowIndex, checklistItemNumber } = { ...params };
    const action = `Test number ${checklistItemNumber} in row ${checklistRowIndex} is marked as FAILED`;
    const description = this._getDefaultDescription(report, stage);

    this._save(action, description, params);
  }

  revertedAPassedTest(report, stage, params) {
    const { checklistRowIndex, checklistItemNumber } = { ...params };
    const action = `Test number ${checklistItemNumber} in row ${checklistRowIndex} is REVERTED from the PASSED state`;
    const description = this._getDefaultDescription(report, stage);

    this._save(action, description, params);
  }

  fixedAFailedTest(report, stage, params) {
    const { checklistRowIndex, checklistItemNumber } = { ...params };
    const action = `Test number ${checklistItemNumber} in row ${checklistRowIndex} is updated to FIXED state after a failure`;
    const description = this._getDefaultDescription(report, stage);

    this._save(action, description, params);
  }

  sentBatchPassedTests(report, stage, params) {
    const { checklistRows } = { ...params };
    const countPassedTests = checklistRows.length;

    if (countPassedTests === 1) { // if there is only one test in a batch then delegate it to a different method
      this.passedTest(report, stage, { ...params, ...{checklistRowIndex: checklistRows.at(0)}});

    } else { // otherwise process it here as batch
      const action = `Batch of tests (${countPassedTests}) are marked as PASSED`;
      const description = this._getDefaultDescription(report, stage);

      this._save(action, description, params);
    }
  }

  completedChecklist(report, stage, params) {
    const action = `Checklist is completed`;
    const description = this._getDefaultDescription(report, stage);

    this._save(action, description, params);
  }

  updatedTestNotes(params) {
    const { checklistRowIndex, checklistItemNumber, notes } = { ...params };
    const action = `Notes are updated for the test number ${checklistItemNumber} in row ${checklistRowIndex}`;
    const description = `Notes content: ${notes}`;

    this._save(action, description, params);
  }

  readAllLogs() {
    const actionsRaw = this.storage.loadSheetData();
    const actions = this.storage.toObjects(actionsRaw);

    return actions;
  }
}

function TEST_UAL_getVars() {
  return {
    'reportId': '1LTxv1ub9u73vSzfW9vqcw8Pkzvo8ng0Lpom4ga917xE',
    'stageId': 9999
  }
}

function TEST_UAL_createdNewReport() {
  TESTING_FLAG = true;
  const appContainer = new AppContainer(PROPS_SCHEMA, TESTING_FLAG);
  const { props, logger, i18n, user } = { ...appContainer.run() };

  const actionsLogger = new UserActionsLogger(TEST_UAL_getVars().reportId);

  const data = {'some': 'testing data'};
  actionsLogger.createdNewReport(data);
}

function TEST_UAL_passedTest() {
  TESTING_FLAG = true;
  const appContainer = new AppContainer(PROPS_SCHEMA, TESTING_FLAG);
  const { props, logger, i18n, user } = { ...appContainer.run() };

  const testingVars = TEST_UAL_getVars();
  const params = {reportId: testingVars.reportId, stageId: testingVars.stageId, checklistItemNumber: 1, checklistRowIndex: 10};

  const actionsLogger = new UserActionsLogger(testingVars.reportId);
  const {stageId, checklistItemNumber, checklistRowIndex} = { ...params };
  actionsLogger.passedTest(stageId, checklistItemNumber, checklistRowIndex, params);
}