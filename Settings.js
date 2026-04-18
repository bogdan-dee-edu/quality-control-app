class Settings {
  constructor(propertiesSchema) {
    this._schema = propertiesSchema;
    const requiredProps = this.schemaRequired;
    if (! Boolean(Object.keys(requiredProps).length)) {
      throw new Error(`Wrong properties schema.`);
    }

    this._scriptProps = this.loadScriptProperties();
    const isScriptPropsValid = this.validateRequiredProps();
    if (! isScriptPropsValid) {
      throw new Error(`Required script properties are missing. Expecting: ${Object.keys(requiredProps).join(',')}; Provided: ${Object.keys(this.scriptProps).join(',')}`);
    }
  }

  get scriptProps() {
    return this._scriptProps;
  }

  set scriptProps(props) {
    this._scriptProps = props;
  }

  get schemaRequired() {
    return this._schema['required'] || {};
  }

  get schemaOptional() {
    return this._schema['optional'] || {};
  }

  validateRequiredProps() {
    const requiredPropsKeys = Object.keys(this.schemaRequired);
    const scriptPropsKeys = Object.keys(this.scriptProps);

    const allKeysPresent = requiredPropsKeys.every(key => scriptPropsKeys.includes(key));

    return allKeysPresent;
  }

  validateOptionalProps() {
    const optionalPropsKeys = Object.keys(this.schemaOptional);
    if (! Boolean(optionalPropsKeys.length)) {
      throw new Error('Wrong optional properties schema.');
    }

    const scriptPropsKeys = Object.keys(this.scriptProps);
    const allKeysPresent = optionalPropsKeys.every(key => scriptPropsKeys.includes(key));

    return allKeysPresent;
  }
  
  loadScriptProperties() {
    try {
      const scriptProperties = PropertiesService.getScriptProperties();
      const data = scriptProperties.getProperties();
      
      return data;
    } catch (err) {
      console.error(err);
      throw err;
    }
  }

  enableTestingEnv() {
    const pref = 'TEST_';
    const testingPropsKeys = Object.keys(this.scriptProps).filter(key => key.startsWith(pref));

    const isScriptPropsValid = this.validateOptionalProps();
    if (! isScriptPropsValid) {
      let errorMessage = `Optional script properties are missing. 
      They are mandatory for testing environment. 
      Expecting: ${Object.keys(this.schemaOptional).join(',')}; Provided: ${testingPropsKeys.join(',')}`;
      
      throw new Error(errorMessage);
    }

    for (let tKey of testingPropsKeys) {
      this.scriptProps[tKey.replace(pref, '')] = this.scriptProps[tKey];
    }
  }
}

function settingsTest() {
  const settings = new Settings(PROPS_SCHEMA);
  settings.enableTestingEnv();

  console.log(settings.scriptProps);
}