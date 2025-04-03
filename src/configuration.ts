/**
 * File: configuration.ts
 * Author: roidy
 * License: GPL v3 - https://www.gnu.org/licenses/gpl-3.0.html
 */

import * as vscode from 'vscode';

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
  public mediaExcludeGlob: any;
  public mediaExcludeKeywords: string[] | undefined;

  constructor() {
    this.loadConfig();
  }

  /**
   * Loads the configuration settings for the 'kodi-skin-tools' extension.
   * 
   * This method retrieves the configuration settings from the VS Code workspace
   * and assigns the values to the corresponding properties of the class.
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

    this.mediaExcludeGlob = config.get('mediaExcludeGlob');
    var keywords = config.get('mediaExcludeKeywords') as string;
    if (keywords) {
      this.mediaExcludeKeywords = keywords.replace(/\s+/g, "").split(',');
    }
  }
}

export const config = new Configuration();