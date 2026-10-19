/** RFC 4180 CSV: quotes doubled, CRLF line ends. Cells that start like a formula are defused. */
export function toCsv(rows: (string | number | null)[][]): string {
  return rows
    .map((row) =>
      row
        .map((cell) => {
          let text = cell === null ? '' : String(cell);
          if (/^[=+\-@]/.test(text) && typeof cell === 'string') {
            text = `'${text}`;
          }
          return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
        })
        .join(','),
    )
    .join('\r\n');
}

export function downloadCsv(filename: string, csv: string): void {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export function today(): string {
  return new Date().toISOString().slice(0, 10);
}
