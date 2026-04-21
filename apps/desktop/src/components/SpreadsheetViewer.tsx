import React, { useEffect, useMemo, useState } from 'react';

interface CellStyle {
  bold?: boolean;
  italic?: boolean;
}

interface CellRange {
  s: { r: number; c: number };
  e: { r: number; c: number };
}

interface SpreadsheetData {
  name: string;
  rows: number;
  cols: number;
  cells: Record<string, string>;
  styles: Record<string, CellStyle>;
  merges: CellRange[];
}

interface SpreadsheetDocument {
  activeSheet: number;
  sheets: SpreadsheetData[];
}

interface SpreadsheetViewerProps {
  content: string;
  isEditable: boolean;
  onUpdate: (content: string) => void;
}

const DEFAULT_ROWS = 30;
const DEFAULT_COLS = 12;

const colName = (col: number) => {
  let n = col + 1;
  let s = '';
  while (n > 0) {
    const rem = (n - 1) % 26;
    s = String.fromCharCode(65 + rem) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
};

const cellId = (row: number, col: number) => `${colName(col)}${row + 1}`;
const parseCellRef = (id: string) => {
  const match = id.match(/^([A-Z]+)(\d+)$/);
  if (!match) return null;
  const letters = match[1];
  const row = Number(match[2]) - 1;
  let col = 0;
  for (let i = 0; i < letters.length; i += 1) col = col * 26 + (letters.charCodeAt(i) - 64);
  return { row, col: col - 1 };
};
const normalizeRange = (a: { row: number; col: number }, b: { row: number; col: number }): CellRange => ({
  s: { r: Math.min(a.row, b.row), c: Math.min(a.col, b.col) },
  e: { r: Math.max(a.row, b.row), c: Math.max(a.col, b.col) },
});
const inRange = (r: number, c: number, range: CellRange) => r >= range.s.r && r <= range.e.r && c >= range.s.c && c <= range.e.c;

const parseSpreadsheet = (content: string): SpreadsheetDocument => {
  try {
    const parsed = JSON.parse(content) as Partial<SpreadsheetDocument & SpreadsheetData>;
    if (Array.isArray(parsed.sheets) && parsed.sheets.length > 0) {
      return {
        activeSheet: typeof parsed.activeSheet === 'number' ? parsed.activeSheet : 0,
        sheets: parsed.sheets.map((sheet, index) => ({
          name: typeof sheet.name === 'string' && sheet.name ? sheet.name : `Sheet${index + 1}`,
          rows: typeof sheet.rows === 'number' ? sheet.rows : DEFAULT_ROWS,
          cols: typeof sheet.cols === 'number' ? sheet.cols : DEFAULT_COLS,
          cells: sheet.cells && typeof sheet.cells === 'object' ? sheet.cells : {},
          styles: sheet.styles && typeof sheet.styles === 'object' ? sheet.styles : {},
          merges: Array.isArray(sheet.merges) ? sheet.merges : [],
        })),
      };
    }

    // Backward compatibility for previous single-sheet format
    return {
      activeSheet: 0,
      sheets: [{
        name: 'Sheet1',
        rows: typeof parsed.rows === 'number' ? parsed.rows : DEFAULT_ROWS,
        cols: typeof parsed.cols === 'number' ? parsed.cols : DEFAULT_COLS,
        cells: parsed.cells && typeof parsed.cells === 'object' ? parsed.cells : {},
        styles: {},
        merges: [],
      }],
    };
  } catch {
    return {
      activeSheet: 0,
      sheets: [{ name: 'Sheet1', rows: DEFAULT_ROWS, cols: DEFAULT_COLS, cells: {}, styles: {}, merges: [] }],
    };
  }
};

const toNumber = (v: string) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

const evaluateFormula = (formula: string, cells: Record<string, string>): string => {
  const raw = formula.trim();
  if (!raw.startsWith('=')) return raw;
  const expr = raw.slice(1).trim();

  const fnMatch = expr.match(/^(SUM|AVERAGE|AVG|MIN|MAX)\(([A-Z]+\d+):([A-Z]+\d+)\)$/i);
  if (fnMatch) {
    const fn = fnMatch[1].toUpperCase();
    const start = fnMatch[2];
    const end = fnMatch[3];
    const parseRef = (ref: string) => {
      const m = ref.match(/^([A-Z]+)(\d+)$/);
      if (!m) return null;
      const letters = m[1];
      let col = 0;
      for (let i = 0; i < letters.length; i += 1) col = col * 26 + (letters.charCodeAt(i) - 64);
      return { col: col - 1, row: Number(m[2]) - 1 };
    };
    const a = parseRef(start);
    const b = parseRef(end);
    if (!a || !b) return '#ERR';
    const minRow = Math.min(a.row, b.row);
    const maxRow = Math.max(a.row, b.row);
    const minCol = Math.min(a.col, b.col);
    const maxCol = Math.max(a.col, b.col);
    const values: number[] = [];
    for (let r = minRow; r <= maxRow; r += 1) {
      for (let c = minCol; c <= maxCol; c += 1) {
        values.push(toNumber(cells[cellId(r, c)] || '0'));
      }
    }
    if (values.length === 0) return '0';
    if (fn === 'SUM') return String(values.reduce((a2, b2) => a2 + b2, 0));
    if (fn === 'AVERAGE' || fn === 'AVG') return String(values.reduce((a2, b2) => a2 + b2, 0) / values.length);
    if (fn === 'MIN') return String(Math.min(...values));
    if (fn === 'MAX') return String(Math.max(...values));
  }

  const replaced = expr.replace(/[A-Z]+\d+/g, (ref) => String(toNumber(cells[ref] || '0')));
  try {
    // Expression is limited to simple operators after reference replacement.
    const value = Function(`"use strict"; return (${replaced});`)();
    return String(value ?? '');
  } catch {
    return '#ERR';
  }
};

export const SpreadsheetViewer: React.FC<SpreadsheetViewerProps> = ({ content, isEditable, onUpdate }) => {
  const doc = useMemo(() => parseSpreadsheet(content), [content]);
  const activeSheetIndex = Math.min(Math.max(doc.activeSheet || 0, 0), doc.sheets.length - 1);
  const sheet = doc.sheets[activeSheetIndex];
  const [selected, setSelected] = useState('A1');
  const [selectionStart, setSelectionStart] = useState('A1');
  const [selectedRow, setSelectedRow] = useState<number | null>(null);
  const [selectedCol, setSelectedCol] = useState<number | null>(null);

  const updateDocument = (nextDoc: SpreadsheetDocument) => onUpdate(JSON.stringify(nextDoc));

  const updateSheet = (nextSheet: SpreadsheetData, nextActiveSheet = activeSheetIndex) => {
    const nextSheets = doc.sheets.map((candidate, idx) => (idx === activeSheetIndex ? nextSheet : candidate));
    updateDocument({ activeSheet: nextActiveSheet, sheets: nextSheets });
  };

  const ensureCapacityForSelection = (id: string, currentSheet: SpreadsheetData): SpreadsheetData => {
    const match = id.match(/^([A-Z]+)(\d+)$/);
    if (!match) return currentSheet;
    const letters = match[1];
    const rowNumber = Number(match[2]);
    let col = 0;
    for (let i = 0; i < letters.length; i += 1) col = col * 26 + (letters.charCodeAt(i) - 64);
    const targetCol = col;
    const targetRow = rowNumber;
    return {
      ...currentSheet,
      rows: Math.max(currentSheet.rows, targetRow + 10),
      cols: Math.max(currentSheet.cols, targetCol + 5),
    };
  };

  const updateCell = (id: string, value: string) => {
    const expanded = ensureCapacityForSelection(id, sheet);
    const cells = { ...sheet.cells, [id]: value };
    updateSheet({ ...expanded, cells });
  };

  const applyStyleToSelection = (stylePatch: CellStyle) => {
    const start = parseCellRef(selectionStart);
    const end = parseCellRef(selected);
    if (!start || !end) return;
    const range = normalizeRange(start, end);
    const styles = { ...sheet.styles };
    for (let r = range.s.r; r <= range.e.r; r += 1) {
      for (let c = range.s.c; c <= range.e.c; c += 1) {
        const id = cellId(r, c);
        styles[id] = { ...(styles[id] || {}), ...stylePatch };
      }
    }
    updateSheet({ ...sheet, styles });
  };

  const toggleStyle = (key: keyof CellStyle) => {
    const current = sheet.styles[selected]?.[key] || false;
    applyStyleToSelection({ [key]: !current });
  };

  const mergeSelection = () => {
    const start = parseCellRef(selectionStart);
    const end = parseCellRef(selected);
    if (!start || !end) return;
    const range = normalizeRange(start, end);
    if (range.s.r === range.e.r && range.s.c === range.e.c) return;
    const merges = [
      ...sheet.merges.filter((m) => !(inRange(range.s.r, range.s.c, m) || inRange(range.e.r, range.e.c, m))),
      range,
    ];
    updateSheet({ ...sheet, merges });
  };

  const splitSelection = () => {
    const current = parseCellRef(selected);
    if (!current) return;
    const merges = sheet.merges.filter((m) => !inRange(current.row, current.col, m));
    updateSheet({ ...sheet, merges });
  };

  const addSheet = () => {
    const nextIndex = doc.sheets.length;
    const nextSheets = [
      ...doc.sheets,
      { name: `Sheet${nextIndex + 1}`, rows: DEFAULT_ROWS, cols: DEFAULT_COLS, cells: {}, styles: {}, merges: [] },
    ];
    updateDocument({ activeSheet: nextIndex, sheets: nextSheets });
    setSelected('A1');
  };

  const removeSheet = (index: number) => {
    if (doc.sheets.length <= 1) return;
    const nextSheets = doc.sheets.filter((_, idx) => idx !== index);
    const nextActive = Math.min(activeSheetIndex, nextSheets.length - 1);
    updateDocument({ activeSheet: nextActive, sheets: nextSheets });
    setSelected('A1');
  };

  const renameSheet = (index: number) => {
    const current = doc.sheets[index];
    const nextName = window.prompt('Rename sheet', current.name);
    if (!nextName?.trim()) return;
    const nextSheets = doc.sheets.map((candidate, idx) => (idx === index ? { ...candidate, name: nextName.trim() } : candidate));
    updateDocument({ activeSheet: activeSheetIndex, sheets: nextSheets });
  };

  const selectSheet = (index: number) => {
    updateDocument({ activeSheet: index, sheets: doc.sheets });
    setSelected('A1');
    setSelectedRow(null);
    setSelectedCol(null);
  };

  const selectRow = (row: number) => {
    setSelectedRow(row);
    setSelectedCol(null);
  };

  const selectCol = (col: number) => {
    setSelectedCol(col);
    setSelectedRow(null);
  };

  useEffect(() => {
    const handler = (event: Event) => {
      const custom = event as CustomEvent<{ command: string }>;
      const command = custom.detail?.command;
      if (!command) return;

      if (command === 'add-row') {
        updateSheet({ ...sheet, rows: sheet.rows + 25 });
        return;
      }
      if (command === 'add-col') {
        updateSheet({ ...sheet, cols: sheet.cols + 10 });
        return;
      }
      if (command === 'fmt-bold' && isEditable) {
        toggleStyle('bold');
        return;
      }
      if (command === 'fmt-italic' && isEditable) {
        toggleStyle('italic');
        return;
      }
      if (command === 'merge-cells' && isEditable) {
        mergeSelection();
        return;
      }
      if (command === 'split-cells' && isEditable) {
        splitSelection();
        return;
      }

      const formulaMap: Record<string, string> = {
        'fn-sum': '=SUM(A1:A10)',
        'fn-avg': '=AVERAGE(A1:A10)',
        'fn-min': '=MIN(A1:A10)',
        'fn-max': '=MAX(A1:A10)',
      };
      if (formulaMap[command] && isEditable) {
        updateCell(selected, formulaMap[command]);
      }
    };
    window.addEventListener('omnis:spreadsheet-command', handler);
    return () => window.removeEventListener('omnis:spreadsheet-command', handler);
  }, [sheet, selected, isEditable, activeSheetIndex, doc.sheets, selectionStart]);

  const handleGridScroll = (event: React.UIEvent<HTMLDivElement>) => {
    const element = event.currentTarget;
    const nearBottom = element.scrollHeight - element.scrollTop - element.clientHeight < 240;
    const nearRight = element.scrollWidth - element.scrollLeft - element.clientWidth < 240;
    if (nearBottom || nearRight) {
      updateSheet({
        ...sheet,
        rows: nearBottom ? sheet.rows + 25 : sheet.rows,
        cols: nearRight ? sheet.cols + 10 : sheet.cols,
      });
    }
  };

  const handleCellKeyDown = (event: React.KeyboardEvent<HTMLInputElement>, row: number, col: number) => {
    const next = { row, col };

    if (event.key === 'ArrowUp') next.row -= 1;
    if (event.key === 'ArrowDown') next.row += 1;
    if (event.key === 'ArrowLeft') next.col -= 1;
    if (event.key === 'ArrowRight') next.col += 1;

    if (event.shiftKey && event.key === ' ') {
      event.preventDefault();
      selectRow(row);
      return;
    }
    if ((event.ctrlKey || event.metaKey) && event.key === ' ') {
      event.preventDefault();
      selectCol(col);
      return;
    }

    if (!['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key)) return;
    event.preventDefault();
    next.row = Math.max(0, next.row);
    next.col = Math.max(0, next.col);
    const id = cellId(next.row, next.col);
    if (event.shiftKey) {
      setSelected(id);
      setSelectedRow(null);
      setSelectedCol(null);
    } else {
      setSelectionStart(id);
      setSelected(id);
      setSelectedRow(null);
      setSelectedCol(null);
    }
  };

  const rangeSelection = useMemo(() => {
    const a = parseCellRef(selectionStart);
    const b = parseCellRef(selected);
    if (!a || !b) return null;
    return normalizeRange(a, b);
  }, [selectionStart, selected]);
  const isRangeCell = (r: number, c: number) => (rangeSelection ? inRange(r, c, rangeSelection) : false);
  const mergeAnchor = (r: number, c: number) => sheet.merges.find((m) => m.s.r === r && m.s.c === c);
  const coveredByMerge = (r: number, c: number) => sheet.merges.some((m) => inRange(r, c, m) && !(m.s.r === r && m.s.c === c));

  return (
    <div className="w-full h-full bg-slate-100 p-4 overflow-auto">
      <div className="mb-2 flex items-center gap-1 overflow-x-auto">
        {doc.sheets.map((candidate, idx) => (
          <div key={`${candidate.name}-${idx}`} className="flex items-center">
            <button
              onClick={() => selectSheet(idx)}
              className={`px-3 py-1.5 text-xs border rounded-l-md ${
                idx === activeSheetIndex ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-600 border-slate-200'
              }`}
            >
              {candidate.name}
            </button>
            {isEditable && (
              <>
                <button onClick={() => renameSheet(idx)} className="px-2 py-1.5 text-xs border-y border-r border-slate-200 bg-white text-slate-500">✎</button>
                <button onClick={() => removeSheet(idx)} className="px-2 py-1.5 text-xs border-y border-r border-slate-200 bg-white text-rose-500">×</button>
              </>
            )}
          </div>
        ))}
        {isEditable && (
          <button onClick={addSheet} className="px-3 py-1.5 text-xs border border-slate-200 bg-white rounded-md text-slate-600">
            + Sheet
          </button>
        )}
      </div>
      <div className="mb-3 bg-white border border-slate-200 rounded-lg p-2 flex items-center gap-2">
        <span className="text-xs font-mono text-slate-500 w-16">{selected}</span>
        <input
          value={sheet.cells[selected] || ''}
          onChange={(e) => isEditable && updateCell(selected, e.target.value)}
          disabled={!isEditable}
          placeholder="Formula or value"
          className="flex-1 text-sm border border-slate-200 rounded px-2 py-1.5 outline-none disabled:bg-slate-50"
        />
      </div>
      <div className="inline-block min-w-full bg-white border border-slate-200 rounded-lg overflow-auto max-h-[70vh]" onScroll={handleGridScroll}>
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className="w-14 border-b border-r border-slate-200 bg-slate-50" />
              {Array.from({ length: sheet.cols }).map((_, c) => (
                <th
                  key={c}
                  onClick={() => selectCol(c)}
                  className={`h-8 min-w-24 px-2 text-xs font-semibold border-b border-r border-slate-200 cursor-pointer select-none ${
                    selectedCol === c ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'
                  }`}
                >
                  {colName(c)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: sheet.rows }).map((_, r) => (
              <tr key={r}>
                <td
                  onClick={() => selectRow(r)}
                  className={`h-9 text-xs font-semibold text-center border-b border-r border-slate-200 cursor-pointer select-none ${
                    selectedRow === r ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'
                  }`}
                >
                  {r + 1}
                </td>
                {Array.from({ length: sheet.cols }).map((__, c) => {
                  if (coveredByMerge(r, c)) return null;
                  const id = cellId(r, c);
                  const raw = sheet.cells[id] || '';
                  const display = raw.startsWith('=') ? evaluateFormula(raw, sheet.cells) : raw;
                  const selectedCell = selected === id;
                  const isRowHighlighted = selectedRow === r;
                  const isColHighlighted = selectedCol === c;
                  const isHeaderSelection = isRowHighlighted || isColHighlighted;
                  const rangeHighlighted = isRangeCell(r, c);
                  const merge = mergeAnchor(r, c);
                  return (
                    <td
                      key={id}
                      rowSpan={merge ? merge.e.r - merge.s.r + 1 : 1}
                      colSpan={merge ? merge.e.c - merge.s.c + 1 : 1}
                      className={`h-9 px-1 border-b border-r border-slate-200 ${
                        selectedCell
                          ? 'bg-indigo-200'
                          : rangeHighlighted
                            ? 'bg-indigo-100'
                          : isHeaderSelection
                            ? 'bg-indigo-50'
                            : 'bg-white'
                      }`}
                    >
                      {isEditable ? (
                        <input
                          value={raw}
                          onFocus={() => {
                            setSelected(id);
                            setSelectionStart(id);
                            setSelectedRow(null);
                            setSelectedCol(null);
                          }}
                          onKeyDown={(e) => handleCellKeyDown(e, r, c)}
                          onChange={(e) => updateCell(id, e.target.value)}
                          style={{ fontWeight: sheet.styles[id]?.bold ? 700 : 400, fontStyle: sheet.styles[id]?.italic ? 'italic' : 'normal' }}
                          className="w-full h-full px-1 text-xs bg-transparent outline-none"
                        />
                      ) : (
                        <button
                          onClick={() => {
                            setSelected(id);
                            setSelectionStart(id);
                            setSelectedRow(null);
                            setSelectedCol(null);
                          }}
                          style={{ fontWeight: sheet.styles[id]?.bold ? 700 : 400, fontStyle: sheet.styles[id]?.italic ? 'italic' : 'normal' }}
                          className="w-full h-full text-left px-1 text-xs text-slate-700"
                        >
                          {display}
                        </button>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
