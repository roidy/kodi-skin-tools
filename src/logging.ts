import * as vscode from 'vscode';

class Logger {
    private outputChannel: vscode.OutputChannel;

    /**
     * Creates an instance of the logging class.
     * Initializes the output channel for KodiSkinTools and displays it.
     */
    constructor() {
        this.outputChannel = vscode.window.createOutputChannel('KodiSkinTools');
        this.outputChannel.show();
    }

    /**
     * Logs a given string to the output channel.
     *
     * @param string - The string to be logged.
     */
    public log(string: string) {
        this.outputChannel.appendLine(string);
    }
  }

export const logger = new Logger();