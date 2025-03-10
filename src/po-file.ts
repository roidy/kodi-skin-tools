/**
 * File: po-file.ts
 * Author: roidy
 * License: GPL v3 - https://www.gnu.org/licenses/gpl-3.0.html
 */

import * as vscode from 'vscode';
import PO from "pofile";
import path from 'path';
import { copyFileSync, existsSync, mkdirSync, readFileSync } from 'fs';
import { logger, LogLevel } from './logging';
import { config } from './configuration';
import { decorator } from './decorator';

/**
 * The POFiles class is responsible for handling the loading, saving, and manipulation of PO (GNU gettext) files.
 */
class POFiles {
    public skinPO: PO | undefined;
    public kodiPO: PO | undefined;
    private translationCode: string = 'en_us';

    /**
     * Initializes a new instance of the POFiles class and loads the skin and Kodi PO files.
     */
    constructor() {
        this.loadSkinPO();
        this.loadKodiPO();
    }

    /**
     * Loads the Kodi PO file from a remote URL.
     */
    async loadKodiPO() {
        const response = await fetch('https://raw.githubusercontent.com/xbmc/xbmc/master/addons/resource.language.en_gb/resources/strings.po');
        if (response.status !== 200) {
            logger.log('Unable to fetch Kodi po file from GitHub.', LogLevel.Error);
            this.kodiPO = undefined;
            return;
        }
        const body = await response.text();
        const po = PO.parse(body);
        this.kodiPO = po;
        // Force a decorator update after loading the po file.
        decorator.updateDecorations();
    }
    /**
     * Loads the skin PO file from the local file system workspace.
     */
    async loadSkinPO() {
        let editor = vscode.window.activeTextEditor;
        if (editor?.document.uri) {
            const folder = vscode.workspace.getWorkspaceFolder(editor!.document.uri);
            const poFile = folder!.uri.fsPath + `${path.sep}language${path.sep}resource.language.en_gb${path.sep}strings.po`;
            const data = readFileSync(poFile, 'utf-8');
            const po = PO.parse(data);
            this.skinPO = po;
            return;
        }
        logger.log('Failed to load skin po.', LogLevel.Error);
        this.skinPO = undefined;
        return;
    }
    /**
     * Writes the current state of the skin PO file to the local file system, creating a backup of the existing file.
     */
    writeSkinPO() {
        const editor = vscode.window.activeTextEditor;
        if (editor && editor.document.uri) {
            const folder = vscode.workspace.getWorkspaceFolder(editor!.document.uri);
            const stamp = new Date().toISOString().replace(/[:.]/g, '');
            const backupPoDirectory = folder!.uri.fsPath + `${path.sep}language${path.sep}resource.language.en_gb${path.sep}backup${path.sep}`;
            const backupPoFile = `${backupPoDirectory}${stamp}.po`;
            const poFile = folder!.uri.fsPath + `${path.sep}language${path.sep}resource.language.en_gb${path.sep}strings.po`;

            if (!existsSync(backupPoDirectory)) {
                mkdirSync(backupPoDirectory);
            }

            copyFileSync(poFile, backupPoFile);

            this.skinPO?.save(poFile, function (err) {
                if (err) {
                    logger.log('Error saving new PO file: ' + err.message);
                } else {
                    logger.log('PO file saved successfully');
                }
            });
        }
    }

    /**
     * Retrieves a string from the PO files by its ID.
     * @param {number} id - The ID of the string to retrieve.
     * @returns {string} The string corresponding to the given ID, or an empty string if not found.
     */
    getString(id: number): string {
        const stringId = `#${id}`;

        // Check Skin strings
        if (this.skinPO) {
            const skinString = this.skinPO.items?.find(item => item.msgctxt === stringId)?.msgid;
            if (skinString) { return skinString; }
        }

        // Check Kodi strings
        if (this.kodiPO) {
            const kodiString = this.kodiPO.items?.find(item => item.msgctxt === stringId)?.msgid;
            if (kodiString) { return kodiString; }
        }

        return '';
    }

    /**
     * Finds the ID of a given string in the PO files.
     * @param {string} word - The word to find the ID for.
     * @returns {string} The ID of the word, or an empty string if not found.
     */
    getID(word: String): string {
        // Find word in po
        let id: string | undefined;
        const skinID = this.skinPO?.items?.find((v) => v.msgid === word);
        if (skinID) { id = `${skinID.msgctxt?.substring(1)}`; }

        const kodiID = this.kodiPO?.items?.find((v) => v.msgid === word);
        if (kodiID) { id = `${kodiID.msgctxt?.substring(1)}`; }

        if (id) {
            if (config.operation) {
                return id;
            } else {
                return `$LOCALIZE[${id}]`;
            }
        }
        return '';
    }

    /**
     * Creates a new entry in the skin PO file with the given word.
     * @param {string} word - The word to create a new entry for.
     */
    createEntry(word: string) {
        let item;
        if (this.skinPO && this.skinPO.items) {
            for (let i = 31000; i < 34000; i++) {
                item = this.skinPO.items.find((v) => v.msgctxt === `#${i}`);
                if (!item) {
                    var newItem = new PO.Item();
                    newItem.msgctxt = `#${i}`;
                    newItem.msgid = (word as string);
                    var newPO = this.skinPO.items.concat(newItem);
                    this.skinPO.items = newPO;
                    this.skinPO.items.sort((a, b) => (a > b ? 1 : -1));
                    this.writeSkinPO();
                    break;
                }
            }
        }
    }

    /**
     * Generates a new translation file based on the provided country code.
     */
    async generateTranslation() {
        logger.log('Start generate new translation file');
        const countryCode = await vscode.window.showInputBox({
            value: `${this.translationCode}`,
            prompt: "Enter the counrty code to generate a translation file or press 'Enter' to use last value."
        });
        if (!countryCode) {
            logger.log('No country code, exiting!');
            return;
        }

        const editor = vscode.window.activeTextEditor;
        if (editor && editor.document.uri) {
            const folder = vscode.workspace.getWorkspaceFolder(editor.document.uri);
            const translationDirectory = `${folder!.uri.fsPath}${path.sep}language${path.sep}resource.language.${countryCode}`;
            const poFile = `${translationDirectory}${path.sep}strings.po`;

            if (!existsSync(translationDirectory)) {
                mkdirSync(translationDirectory);
            }

            // Build new po file from skin po
            var translation = new PO();
            translation.comments = this.skinPO?.comments || [];
            translation.headers = this.skinPO?.headers || {};
            translation.headers.Language = countryCode;

            this.skinPO?.items.forEach(item => {
                var newItem = new PO.Item();
                newItem.msgctxt = item.msgctxt;
                newItem.msgid = item.msgid;
                newItem.msgstr[0] = item.msgid;
                translation.items.push(newItem);
            });

            translation.save(poFile, function (err) {
                if (err) {
                    logger.log('Error saving new PO file: ' + err.message);
                } else {
                    logger.log('PO file saved successfully');
                }
            });
        }

    }
}

export const po = new POFiles();