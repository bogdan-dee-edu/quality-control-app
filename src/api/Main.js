function runAPI(controllerName, actionName, params = {}) {

  let response = {
    success: false,
    error: null
  };

  try {
    const controllersMap = {
      'Report': ReportController,
      'ReportNotes': ReportNotesController,
      'Index': IndexController,
      'Photo': PhotoController
    };
    if (!controllersMap[controllerName]) {
      throw new Error(`Controller ${controllerName} not found.`);
    }

    const appContainer = new AppContainer(PROPS_SCHEMA, TESTING_FLAG);
    const controller = new controllersMap[controllerName](appContainer.run());
    if (!controller.user) {
      throw new Error('Access Denied');
    }

    const methodNameToCall = actionName + 'Action';
    if (typeof controller[methodNameToCall] !== 'function') {
      throw new Error(`Action ${actionName} not found.`);
    }

    response = controller[methodNameToCall](params);
  } catch (err) {
    response.error = err.toString();

    // try to spin up the app logger and write down this error to the logs
    try {
      const appContainer = new AppContainer(PROPS_SCHEMA, TESTING_FLAG);
      const logger = appContainer.loadAppLogger();
      logger.error(err);
    } catch (error) { }
  }

  return response;
}

function TEST_RunAPI() {
  TESTING_FLAG = true;
  // console.log(runAPI('Report', 'loadFiles', {folderId: 'some id'}));
  // console.log(runAPI('Report', 'files'));
  // const API = runAPI('Report', 'stage', {'stageId': 1424598776, 'reportFileId': '1PzCz9AvVSUV6ycAbj1xFSY4v-mhAeyixK8YYx6gYfFw'});

  const params = {
    'reportId': '1LTxv1ub9u73vSzfW9vqcw8Pkzvo8ng0Lpom4ga917xE',
    'stageId': '1914930658',
    'checklistItemNumber': '2',
    'checklistRowIndex': '10'
  }
  const API = runAPI('Report', 'pass', params);

  // const API = runAPI('Index', 'clearCache');

  console.log(API);

}