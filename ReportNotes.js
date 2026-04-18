class ReportNotes {

  constructor(reportInstance, loggerInstance, i18nInstance) {
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

  _getNotesCellByRowIndex(rowIndex, cellHeaderName) {
    const headerRange = this.report._extractRangesByPrefix(this.report.sheet, cellHeaderName);
    const range = headerRange[Object.keys(headerRange)[0]].getRange();
    const columnIndex = range.getColumn();
    const cellRange = this.report.sheet.getRange(rowIndex, columnIndex, 1, 1);

    return {'range': cellRange, 'value': cellRange.getValue()};
  }

  list() {
    const { headers, list } = { ...this.report.readNotes() };
    // const filtered = list.filter(elem => elem.text !== '');
    const filtered = [];
    for (let item of list) {
      if (item.text !== '') {         
        item.time = item.time.toISOString();
        filtered.push(item);
      }
    }
    
    return {
      'headers': headers,
      'list': filtered.sort((a, b) => a.time.localeCompare(b.time)),
      'maxCount': list.length
    }
  }

  add(params) {
    const { user, time, notes } = { ...params };
    const { list } = { ...this.report.readNotes() };

    const emptyList = list.filter(elem => elem.text == '').sort((a, b) => a.row_index - b.row_index);
    if (emptyList.length === 0) {
      throw new Error(`You have reached a limit of notes number for this stage.`);
    }
    const nextRow = emptyList.at(0);

    const userCell = this._getNotesCellByRowIndex(nextRow['row_index'], 'notes_header_user');
    const timeCell = this._getNotesCellByRowIndex(nextRow['row_index'], 'notes_header_time');
    const textCell = this._getNotesCellByRowIndex(nextRow['row_index'], 'notes_header_text');

    userCell['range'].setValue(user);
    timeCell['range'].setValue(time);
    textCell['range'].setValue(notes);


    const { list: updatedList, maxCount } = this.list();

    return {
      'note': updatedList.at(-1),
      'count': updatedList.length,
      'maxCount': maxCount
    };
  }

  edit(params) {
    const { rowIndex, user, notes } = { ...params };

    const { list } = { ...this.report.readNotes() };
    const findNote = list.find(item => parseInt(item['row_index']) === parseInt(rowIndex) && item['user'].toLowerCase() === user.toLowerCase());
    if (! findNote) {
      throw new Error('Note was not found');
    }

    const textCell = this._getNotesCellByRowIndex(findNote['row_index'], 'notes_header_text');
    textCell['range'].setValue(notes);

    const { list: updatedList, maxCount } = this.list();

    return {
      'note': updatedList.find(item => parseInt(item['row_index']) === parseInt(rowIndex)),
      'count': updatedList.length,
      'maxCount': maxCount
    };
  }
}


function TEST_addNote() {
  const settings = new Settings(PROPS_SCHEMA);
  settings.enableTestingEnv();
  const props = settings.scriptProps;

  const appLoggerStorage = new Storage(props['logsSpreadsheetId'], 'logs');
  const appLogger = new AppLogger(props['appId'], appLoggerStorage);

  let reportId = '1uo7IvLJtYA_WnnkDFuYbMokfD3_E0Z2xMEGcDFzrn0k';
  let stageId = '950457542';

  const report = new Report(appLogger);
  report.openSpreadsheet(reportId);
  report.openSheet(stageId);
  const reportNotes = new ReportNotes(report, appLogger);

  const note = {
    'time': new Date(),
    'user': `test user`,
    'notes': 'some text',
  }
  reportNotes.add(note);
}