class BasePageAbstract {
  static renderError(err) {
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