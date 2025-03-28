/**
 * File: utils.ts
 * Author: roidy
 * License: GPL v3 - https://www.gnu.org/licenses/gpl-3.0.html
 */

import * as vscode from 'vscode';
import fs = require('fs');
import lineReader = require('n-readlines');
import path = require('path');
import { Buffer } from 'buffer';
import { logger, LogLevel } from './logging';
import { config } from './configuration';

/**
 * Retrieves the word at the current cursor position in the active text editor.
 * If the cursor is on a space, it returns `[undefined, undefined]`.
 * Optionally converts the word to lowercase.
 *
 * @param {boolean} [toLower=false] - Whether to convert the word to lowercase.
 * @returns {[string | undefined, vscode.Selection | undefined]} - A tuple containing the word and its selection range.
 */
export function getWord(toLower: boolean = false): any[] {
    const editor = vscode.window.activeTextEditor;
    if (!editor) { return [undefined, undefined]; }

    const position = editor.selection.active;
    // Check to see is position is a space and could not possibly return a word.
    const currentChar = editor.document.getText(new vscode.Range(position, position.translate(0, 1)));
    if (currentChar.trim() === "") {
        return [undefined, undefined];
    }

    const wordRange = editor.selection.isEmpty
        ? editor!.document.getWordRangeAtPosition(position)
        : editor.selection;
    
    const str = toLower ? editor.document.getText(wordRange).toLowerCase() : editor.document.getText(wordRange);

    return [str, new vscode.Selection(wordRange!.start, wordRange!.end)];
}

/**
 * Finds occurrences of a target word in files within a specified directory.
 *
 * @param directory - The directory to search in.
 * @param targetWord - The word to search for.
 * @param customMatcher - An optional custom regex pattern to use for matching.
 * @param findFirstMatch - Whether to stop searching after the first match is found. Defaults to `false`.
 * @param ext - An array of file extensions to include in the search. Defaults to `['.xml', '.po']`.
 * @param excludeDir - A directory to exclude from the search. Defaults to `'backup'`.
 * @returns An array of `vscode.Location` objects representing the locations of the matches.
 */
export function findWordInFiles(directory: string, targetWord: string, customMatcher?: string, findFirstMatch = false, ext = ['.xml', '.po'], excludeDir = 'backup'): vscode.Location[] {
    if (!fs.existsSync(directory)) {
        return [];
    }

    const files = getFilesInDirectory(directory, ext, excludeDir);
    const locations: vscode.Location[] = [];

    for (const file of files) {
        let lineNumber = 0;
        const lines = new lineReader(file);

        const regex = new RegExp(customMatcher || targetWord, 'i');
        while (true) {
            const line = lines.next();
            if (!line) { break; };
            lineNumber++;
            const lineStr = line.toString();
            const match = lineStr.match(regex);
            if (match) {
                const firstChar = match.index!;
                const lastChar = firstChar + targetWord.length;
                const start = new vscode.Position(lineNumber - 1, firstChar);
                const end = new vscode.Position(lineNumber - 1, lastChar);
                const range = new vscode.Range(start, end);
                const location = new vscode.Location(vscode.Uri.file(file), range);
                locations.push(location);
                if (findFirstMatch) { break; }
            }
        }
        if (findFirstMatch && locations.length !== 0) { break; }
    }

    return locations;
}

/**
 * Recursively retrieves all files in a directory with specified extensions, excluding a specific directory.
 *
 * @param {string} dir - The directory to search within.
 * @param {string[]} ext - An array of file extensions to include in the results.
 * @param {string} excludeDir - A directory to exclude from the search.
 * @returns {string[]} An array of file paths that match the specified extensions.
 */
function getFilesInDirectory(dir: string, ext: string[], excludeDir: string): string[] {
    if (!fs.existsSync(dir)) { return []; }

    const files: string[] = [];
    fs.readdirSync(dir).forEach((file: string) => {
        const filePath = path.join(dir, file);
        const stat = fs.lstatSync(filePath);

        if (stat.isDirectory() && filePath.indexOf(excludeDir) === -1) {
            files.push(...getFilesInDirectory(filePath, ext, excludeDir));
        } else if (ext.includes(path.extname(file))) {
            console.log(path.extname(file));
            files.push(filePath);
        }
    });

    return files;
}


/**
 * Reloads the Kodi skin by sending a JSON-RPC request to the Kodi server.
 * 
 * This function constructs a JSON-RPC request to execute the 'script.vscode.reload' addon on the Kodi server.
 * It encodes the provided username and password in base64 for HTTP Basic Authentication.
 * 
 * @async
 * @function
 * @throws Will log an error message if the request fails.
 * 
 * @example
 * // Ensure that the config object is properly set up with the necessary properties:
 * // config.reloadIPAddress, config.reloadPort, config.reloadUserName, config.reloadPassword
 * await reloadKodiSkin();
 */
export async function reloadKodiSkin() {
    // Encode the username and password in base64
    const kodiUrl = `http://${config.reloadIPAddress}:${config.reloadPort}/jsonrpc`;
    const credentials = `${config.reloadUserName}:${config.reloadPassword}`;
    const encodedCredentials = Buffer.from(credentials).toString('base64');

    // JSON-RPC request to send
    const request = {
        jsonrpc: '2.0',
        method: 'Addons.ExecuteAddon',
        params: { addonid: 'script.vscode.reload' },
        id: 1
    };

    try {
        const response = await fetch(kodiUrl, {
            method: 'POST',
            headers: {
                'Authorization': `Basic ${encodedCredentials}`,
                'Content-Length': Buffer.byteLength(JSON.stringify(request)).toString(),
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(request)
        });
    } catch (err) {
        logger.log(`Error: ${err}`, LogLevel.Error);
    }
}
