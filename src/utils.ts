/**
 * File: utils.ts
 * Author: roidy
 * License: GPL v3 - https://www.gnu.org/licenses/gpl-3.0.html
 */

import * as vscode from 'vscode';
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
 * Searches for occurrences of a target word or pattern in files within the workspace.
 *
 * @param targetMatch - The word or regex pattern to search for in the files.
 * @param findFirstMatch - If `true`, stops searching after finding the first match. Defaults to `false`.
 * @param ext - The file extension(s) to include in the search. Supports glob patterns. Defaults to `"{*.xml,*.po}"`.
 * @param excludeDir - The directory to exclude from the search. Defaults to `'backup'`.
 * @returns A promise that resolves to an array of `vscode.Location` objects representing the positions of matches.
 *
 * @throws Will throw an error if there is an issue accessing files or reading their contents.
 */
export async function findWordInFiles(targetMatch: string, findFirstMatch = false, ext = "{*.xml,*.po}", excludeDir = 'backup'): Promise<vscode.Location[]> {
    const files = await vscode.workspace.findFiles(`**/${ext}`, `**/${excludeDir}/**`);
    const locations: vscode.Location[] = [];
    const regex = new RegExp(targetMatch, 'ig');

    for (const file of files) {
        const document = await vscode.workspace.openTextDocument(file);
        const text = document.getText();
        const matches = text.matchAll(regex);
        for (const match of matches) {
            if (match.index !== undefined) {
                const position = document.positionAt(match.index);
                const range = new vscode.Range(position, position.translate(0, targetMatch.length));
                const location = new vscode.Location(document.uri, range);
                locations.push(location);
                if (findFirstMatch) { break; }
            }
        }
        if (findFirstMatch && locations.length !== 0) { break; }
    }
    return locations;
}

/**
 * Reloads the Kodi skin by sending a JSON-RPC request to the Kodi server.
 * 
 * This function constructs a JSON-RPC request to execute the 'script.vscode.reload' addon on the Kodi server.
 * It encodes the provided username and password in base64 for HTTP Basic Authentication.
 *
 * @throws Will log an error message if the request fails.
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
