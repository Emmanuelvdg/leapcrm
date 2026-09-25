import { type ExtendedUIMessage } from 'twenty-shared/ai';
import * as XLSX from 'xlsx';

import { type FileService } from 'src/engine/core-modules/file/services/file.service';
import { extractSpreadsheetTextParts } from 'src/engine/metadata-modules/ai/ai-chat/utils/extract-spreadsheet-text-parts.util';

const buildFilePart = (mediaType: string, filename = 'file.bin') => ({
  type: 'file' as const,
  mediaType,
  filename,
  url: 'https://example.com/file',
  fileId: 'file-id',
});

const buildUserMessage = (
  parts: ExtendedUIMessage['parts'],
): ExtendedUIMessage => ({
  id: 'message-id',
  role: 'user',
  parts,
});

const buildXlsxBuffer = (rows: string[][]): Buffer => {
  const worksheet = XLSX.utils.aoa_to_sheet(rows);
  const workbook = XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1');

  return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
};

describe('extractSpreadsheetTextParts', () => {
  it('replaces a CSV file part with its parsed content as text', async () => {
    const messages = [
      buildUserMessage([buildFilePart('text/csv', 'contacts.csv')]),
    ];
    const fileService = {
      getFileContentById: jest.fn().mockResolvedValue({
        buffer: Buffer.from('name,email\nAda,ada@example.com'),
        mimeType: 'text/csv',
      }),
    } as unknown as FileService;

    const result = await extractSpreadsheetTextParts(
      messages,
      'workspace-id',
      fileService,
    );

    expect(result[0].parts[0]).toMatchObject({
      type: 'text',
      text: expect.stringContaining('name,email'),
    });
    expect(fileService.getFileContentById).toHaveBeenCalledWith({
      fileId: 'file-id',
      workspaceId: 'workspace-id',
      fileFolder: 'agent-chat',
    });
  });

  it('parses an XLSX file part into its cell content', async () => {
    const messages = [
      buildUserMessage([
        buildFilePart('application/vnd.ms-excel', 'deals.xlsx'),
      ]),
    ];
    const fileService = {
      getFileContentById: jest.fn().mockResolvedValue({
        buffer: buildXlsxBuffer([
          ['deal', 'amount'],
          ['Acme', '5000'],
        ]),
        mimeType: 'application/vnd.ms-excel',
      }),
    } as unknown as FileService;

    const result = await extractSpreadsheetTextParts(
      messages,
      'workspace-id',
      fileService,
    );

    expect(result[0].parts[0]).toMatchObject({
      type: 'text',
      text: expect.stringContaining('Acme'),
    });
  });

  it('leaves a text note when the file is no longer available', async () => {
    const messages = [
      buildUserMessage([buildFilePart('text/csv', 'gone.csv')]),
    ];
    const fileService = {
      getFileContentById: jest.fn().mockResolvedValue(null),
    } as unknown as FileService;

    const result = await extractSpreadsheetTextParts(
      messages,
      'workspace-id',
      fileService,
    );

    expect(result[0].parts[0]).toEqual({
      type: 'text',
      text: '[Attached file: gone.csv — file is no longer available]',
    });
  });

  it('leaves non-spreadsheet file parts untouched', async () => {
    const messages = [buildUserMessage([buildFilePart('image/png')])];
    const fileService = {
      getFileContentById: jest.fn(),
    } as unknown as FileService;

    const result = await extractSpreadsheetTextParts(
      messages,
      'workspace-id',
      fileService,
    );

    expect(result[0].parts[0]).toEqual(buildFilePart('image/png'));
    expect(fileService.getFileContentById).not.toHaveBeenCalled();
  });

  it('does not touch non-user messages', async () => {
    const assistantMessage: ExtendedUIMessage = {
      id: 'assistant-id',
      role: 'assistant',
      parts: [{ type: 'text', text: 'hello' }],
    };
    const fileService = {
      getFileContentById: jest.fn(),
    } as unknown as FileService;

    const result = await extractSpreadsheetTextParts(
      [assistantMessage],
      'workspace-id',
      fileService,
    );

    expect(result[0]).toBe(assistantMessage);
  });
});
