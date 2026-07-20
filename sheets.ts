import { Message, FriendLore, TaskItem, ReminderItem } from "./types";

export interface SheetsData {
  messages?: Message[];
  lore?: FriendLore;
  tasks?: TaskItem[];
  reminders?: ReminderItem[];
}

/**
 * Fetch all AMICA state from Google Sheets Web App
 */
export async function fetchFromSheets(webAppUrl: string): Promise<SheetsData | null> {
  if (!webAppUrl || !webAppUrl.startsWith("http")) return null;

  try {
    const url = webAppUrl.includes("?") 
      ? `${webAppUrl}&action=getData` 
      : `${webAppUrl}?action=getData`;
      
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Google Sheets API HTTP ${response.status}`);
    
    const json = await response.json();
    return json;
  } catch (error) {
    console.error("[AMICA Google Sheets Sync Error]", error);
    return null;
  }
}

/**
 * Save / Sync data to Google Sheets Web App
 */
export async function syncToSheets(webAppUrl: string, data: SheetsData): Promise<boolean> {
  if (!webAppUrl || !webAppUrl.startsWith("http")) return false;

  try {
    const response = await fetch(webAppUrl, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({
        action: "syncAll",
        ...data,
      }),
    });
    
    if (!response.ok) throw new Error(`Google Sheets Sync HTTP ${response.status}`);
    return true;
  } catch (error) {
    console.error("[AMICA Google Sheets Sync Error]", error);
    return false;
  }
}

/**
 * Apps Script template for user to copy into Google Sheets Extensions > Apps Script
 */
export const APPS_SCRIPT_CODE = `/**
 * AMICA Google Sheets Backend Script
 * ===================================
 * 1. Open your Google Sheet
 * 2. Click Extensions > Apps Script
 * 3. Delete any default code and paste this script
 * 4. Click 'Deploy' > 'New deployment'
 * 5. Select type: 'Web app'
 * 6. Set 'Execute as': 'Me'
 * 7. Set 'Who has access': 'Anyone'
 * 8. Click 'Deploy', authorize permissions, and copy the Web App URL!
 */

function doGet(e) {
  var action = e ? e.parameter.action : 'getData';
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  
  if (action === 'getData') {
    var data = {
      messages: getSheetData(ss.getSheetByName('Messages')),
      lore: getSheetLore(ss.getSheetByName('Lore')),
      tasks: getSheetData(ss.getSheetByName('Tasks')),
      reminders: getSheetData(ss.getSheetByName('Reminders'))
    };
    return ContentService.createTextOutput(JSON.stringify(data))
      .setMimeType(ContentService.MimeType.JSON);
  }
  
  return ContentService.createTextOutput(JSON.stringify({ status: 'AMICA Backend Online' }))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var payload = JSON.parse(e.postData.contents);
    var action = payload.action;
    
    if (action === 'syncAll') {
      if (payload.messages) saveSheetData(ss, 'Messages', payload.messages);
      if (payload.lore) saveSheetLore(ss, 'Lore', payload.lore);
      if (payload.tasks) saveSheetData(ss, 'Tasks', payload.tasks);
      if (payload.reminders) saveSheetData(ss, 'Reminders', payload.reminders);
    }
    
    return ContentService.createTextOutput(JSON.stringify({ status: 'success' }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ status: 'error', error: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function getSheetData(sheet) {
  if (!sheet) return [];
  var values = sheet.getDataRange().getValues();
  if (values.length <= 1) return [];
  var headers = values[0];
  var result = [];
  for (var i = 1; i < values.length; i++) {
    var obj = {};
    for (var j = 0; j < headers.length; j++) {
      var val = values[i][j];
      if (headers[j] === 'completed') {
        val = (val === true || val === 'true');
      }
      obj[headers[j]] = val;
    }
    result.push(obj);
  }
  return result;
}

function getSheetLore(sheet) {
  if (!sheet) return null;
  var values = sheet.getDataRange().getValues();
  if (values.length <= 1) return null;
  var lore = {};
  for (var i = 1; i < values.length; i++) {
    if (values[i][0]) {
      lore[values[i][0]] = values[i][1] || '';
    }
  }
  return Object.keys(lore).length > 0 ? lore : null;
}

function saveSheetData(ss, sheetName, rows) {
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
  } else {
    sheet.clear();
  }
  if (!rows || rows.length === 0) return;
  
  var cleanRows = rows.map(function(r) {
    var copy = {};
    for (var key in r) {
      if (typeof r[key] === 'object' && r[key] !== null) {
        copy[key] = JSON.stringify(r[key]);
      } else {
        copy[key] = r[key];
      }
    }
    return copy;
  });
  
  var headers = Object.keys(cleanRows[0]);
  sheet.appendRow(headers);
  cleanRows.forEach(function(row) {
    var rowValues = headers.map(function(h) { return row[h] !== undefined ? row[h] : ''; });
    sheet.appendRow(rowValues);
  });
}

function saveSheetLore(ss, sheetName, loreObj) {
  if (!loreObj) return;
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
  } else {
    sheet.clear();
  }
  sheet.appendRow(['Key', 'Value']);
  for (var key in loreObj) {
    sheet.appendRow([key, loreObj[key]]);
  }
}
`;
