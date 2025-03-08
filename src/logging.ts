import * as vscode from 'vscode';

export enum LogLevel {
    Info = 'INFO',
    Warning = 'WARNING',
    Error = 'ERROR'
}

/**
 * A Logger class that provides logging functionality to the output channel in Visual Studio Code.
 */
class Logger {
    private outputChannel: vscode.OutputChannel;


    /**
     * Initializes a new instance of the logging class.
     *
     * Sets up the output channel to be used for Kodi Skin Tools logging.
     */
    constructor() {
        this.outputChannel = vscode.window.createOutputChannel('Kodi Skin Tools');
        this.outputChannel.show(true);
    }

    /**
     * Logs a message to the output channel with a specified log level.
     *
     * @param message - The message to log.
     * @param level - The log level of the message. Defaults to `LogLevel.Info`.
     */
    public log(message: string, level: LogLevel = LogLevel.Info) {
        const currentDateTime = new Date().toLocaleTimeString();
        this.outputChannel.appendLine(`[${currentDateTime}] [${level}] ${message}`);
    }
}

export const logger = new Logger();