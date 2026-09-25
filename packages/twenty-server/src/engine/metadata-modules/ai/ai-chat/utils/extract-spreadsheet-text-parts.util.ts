import {
  type ExtendedFileUIPart,
  type ExtendedUIMessage,
  isExtendedFileUIPart,
} from 'twenty-shared/ai';
import { FileFolder } from 'twenty-shared/types';
import * as XLSX from 'xlsx';

import { type FileService } from 'src/engine/core-modules/file/services/file.service';
import { SPREADSHEET_MIME_TYPES } from 'src/engine/metadata-modules/ai/ai-chat/constants/spreadsheet-mime-types.constant';

// Keeps a spreadsheet's extracted text within a reasonable share of the
// context window - a single wide export can otherwise dwarf the rest of the
// conversation.
const MAX_EXTRACTED_CHARS = 50_000;

const extractTextFromSpreadsheetBuffer = (buffer: Buffer): string => {
  const workbook = XLSX.read(buffer, { type: 'buffer' });

  const sections = workbook.SheetNames.map((sheetName) => {
    const csv = XLSX.utils.sheet_to_csv(workbook.Sheets[sheetName]);

    return workbook.SheetNames.length > 1
      ? `--- Sheet: ${sheetName} ---\n${csv}`
      : csv;
  });

  const combined = sections.join('\n\n');

  if (combined.length <= MAX_EXTRACTED_CHARS) {
    return combined;
  }

  return `${combined.slice(0, MAX_EXTRACTED_CHARS)}\n\n[... truncated, file exceeds ${MAX_EXTRACTED_CHARS} characters ...]`;
};

const buildSpreadsheetTextPart = async (
  part: ExtendedFileUIPart,
  workspaceId: string,
  fileService: FileService,
): Promise<ExtendedUIMessage['parts'][number]> => {
  const filename = part.filename ?? 'uploaded_file';

  try {
    const fileContent = await fileService.getFileContentById({
      fileId: part.fileId,
      workspaceId,
      fileFolder: FileFolder.AgentChat,
    });

    if (fileContent === null) {
      return {
        type: 'text',
        text: `[Attached file: ${filename} — file is no longer available]`,
      };
    }

    const extracted = extractTextFromSpreadsheetBuffer(fileContent.buffer);

    return {
      type: 'text',
      text: `[Attached spreadsheet: ${filename}]\n\n${extracted}`,
    };
  } catch {
    return {
      type: 'text',
      text: `[Attached file: ${filename} — failed to read spreadsheet content]`,
    };
  }
};

// Runs only when the code interpreter is unavailable - when it's enabled,
// CODE_INTERPRETER_MIME_TYPES already carries these same mime types into a
// real pandas/openpyxl sandbox, which is strictly more capable than a flat
// text dump. This is the fallback so a spreadsheet is at least readable
// instead of becoming a "not supported for direct analysis" stub.
export const extractSpreadsheetTextParts = async (
  messages: ExtendedUIMessage[],
  workspaceId: string,
  fileService: FileService,
): Promise<ExtendedUIMessage[]> => {
  return Promise.all(
    messages.map(async (message) => {
      if (message.role !== 'user' || !message.parts) {
        return message;
      }

      const newParts: ExtendedUIMessage['parts'] = [];

      for (const part of message.parts) {
        if (
          isExtendedFileUIPart(part) &&
          SPREADSHEET_MIME_TYPES.has(part.mediaType ?? '')
        ) {
          newParts.push(
            await buildSpreadsheetTextPart(part, workspaceId, fileService),
          );
        } else {
          newParts.push(part);
        }
      }

      return { ...message, parts: newParts };
    }),
  );
};
