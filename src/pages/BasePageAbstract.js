class BasePageAbstract {
  static get daisyTheme() {
    return 'corporate'; // leave empty to disable DaisyUI Themes
  }

  static renderError(err) {
    const template = HtmlService.createTemplateFromFile('templates/error');
    template.daisyTheme = this.daisyTheme;
    template.error = err;
    const html = template.evaluate();
    html.addMetaTag('viewport', 'width=device-width, initial-scale=1');
    html.setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);

    return html;
  }

  renderAccessDenied() {
    const template = HtmlService.createTemplateFromFile('templates/access_denied');
    template.daisyTheme = this.daisyTheme;
    const html = template.evaluate();
    html.addMetaTag('viewport', 'width=device-width, initial-scale=1');
    html.setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);

    return html;
  }
}