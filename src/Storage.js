class Storage {
  constructor(spreadsheetId, sheetName) {
    this._spreadsheetId = spreadsheetId;
    this._spreadsheet = null;
    this._sheetName = sheetName;
    this._sheet = null;

    // this._openSheet();
  }

  get sheetName() {
    return this._sheetName;
  }

  get sheet() {
    return this._sheet;
  }

  _validateOpenSheet() {
    if (! this.sheet) {
      throw new Error('Sheet is not ready, open a required sheet first.');
    }
  }

  _insertRow(data) {
    this._validateOpenSheet();
    this.sheet.appendRow(data);
  }

  openSheet() {
    this._spreadsheet = SpreadsheetApp.openById(this._spreadsheetId);
    this._sheet = this._spreadsheet.getSheetByName(this.sheetName);

    return this.sheet;
  }

  duplicateSheet(newName) {
    this._validateOpenSheet();
    var duplicatedSheet = this.sheet.copyTo(this._spreadsheet);

    const sheetExists = this._spreadsheet.getSheetByName(newName);
    if (sheetExists) {
      this._spreadsheet.deleteSheet(sheetExists);
    }
    
    duplicatedSheet.setName(newName); 
  }

  clearSheet() {
    const rangeToClear = this.sheet.getRange(2, 1, this.sheet.getLastRow() - 1, this.sheet.getLastColumn());
    rangeToClear.clearContent();
  }

  getLastRow() {
    this._validateOpenSheet();
    return this.sheet.getLastRow();
  }

  getHeader() {
    this._validateOpenSheet();
    return this.sheet.getRange(1, 1, 1, this.sheet.getLastColumn()).getValues()[0];
  }

  loadSheetData() {
    this._validateOpenSheet();
      
    return this.sheet
    .getRange(1, 1, this.sheet.getLastRow(), this.sheet.getLastColumn())
    .getValues();
  }

  insert(obj) {
    const header = this.getHeader();

    const row = [];
    for (let h = 0; h < header.length; h++) {
      row.push(header[h] in obj ? obj[header[h]] : "NULL");
    }

    this._insertRow(row);
  }

  toObjects(data) {
    const headers = data.shift();
    
    const jsonArray = data.map((row) => {
      const obj = {};
      headers.forEach((h, i) => {
        obj[h] = row[i];
      });
      return obj;
    });

    return jsonArray;
  }

  toKeyValue(data) {
    data.shift(); // move header
    const entries = new Map(data);
    const obj = Object.fromEntries(entries);

    return obj;
  }
}

function storageInsertTest() {
  const settings = new Settings(PROPS_SCHEMA);
  settings.enableTestingEnv();
  const props = settings.scriptProps;
  const storage = new Storage(props['storageSpreadsheetId'], props['usersSheetName']);

  const newObj = {
    'id': '999',	
    'email': 'test@gmail.com',
    'full_name': 'Test User',
    'is_active': 0,
    'role': 'user'
  }
  storage.insert(newObj);
}
