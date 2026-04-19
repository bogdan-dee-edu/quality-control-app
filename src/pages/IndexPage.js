class IndexPage extends BasePage {

  indexAction(e) {
    const appContainer = new AppContainer(PROPS_SCHEMA, TESTING_FLAG);
    const { props, logger, i18n, user } = { ...appContainer.run() };

    if (!user) {
      return this.renderAccessDenied();
    }

    const templateFile = 'templates/index';
    const template = HtmlService.createTemplateFromFile(templateFile);
    template.props = props;
    template.i18n = i18n;
    template.user = user;

    const html = template.evaluate();
    html.addMetaTag('viewport', 'width=device-width, initial-scale=1');
    html.setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);

    return html;
  }

  renderError(err) {
    const template = HtmlService.createTemplateFromFile('templates/error');
    template.error = err;
    const html = template.evaluate();
    html.addMetaTag('viewport', 'width=device-width, initial-scale=1');
    html.setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);

    return html;
  }

  renderAccessDenied() {
    const template = HtmlService.createTemplateFromFile('templates/access_denied');
    const html = template.evaluate();
    html.addMetaTag('viewport', 'width=device-width, initial-scale=1');
    html.setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);

    return html;
  }
}