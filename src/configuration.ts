import * as vscode from 'vscode';
import { logger } from './logging';

/**
 * The Configuration class is responsible for loading and managing the configuration settings
 * for the 'kodi-skin-tools' extension. It retrieves the configuration values from the 
 * Visual Studio Code workspace settings and stores them as properties of the class.
 */
class Configuration {
  public reloadIPAddress: any;
  public reloadPort: any;
  public reloadUserName: any;
  public reloadPassword: any;
  public reloadExtensions: string[] | undefined;
  public decoratorColor: any;
  public operation: any;

  constructor() {
    this.loadConfig();
  }

  /**
   * Loads the configuration settings for the 'kodi-skin-tools' extension.
   * 
   * This method retrieves the configuration settings from the VS Code workspace
   * and assigns the values to the corresponding properties of the class.
   * 
   * @remarks
   * - `decoratorColor`: The color used for decorators.
   * - `operation`: A boolean flag indicating the type of operation. True = ID / False = $LOCALIZE[]
   */
  public loadConfig() {
    const config = vscode.workspace.getConfiguration('kodi-skin-tools');

    this.reloadIPAddress =config.get('ipAddress');
    this.reloadPort =config.get('port');
    this.reloadUserName=config.get('userName');
    this.reloadPassword =config.get('password');
    var extensions = config.get('reloadExtensions') as string;
    if (extensions) {
      this.reloadExtensions = extensions.replace(/\s+/g, "").split(',');
    }

    this.decoratorColor = config.get('decoratorColor');
    this.operation = config.get('operation');
    this.operation = (this.operation === 'ID') ? true : false;
  }
}

export const config = new Configuration();