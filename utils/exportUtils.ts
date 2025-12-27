
export const exportToDoc = (text: string, filename: string) => {
  const formattedLines = text.split('\n').map(line => {
    if (!line.trim()) return '';
    const match = line.match(/^([^:]+:)(.*)$/);
    if (match) {
      return `<p style='margin:0; padding:0; line-height:1.0; font-family:Courier;'><b>${match[1]}</b>${match[2]}</p>`;
    }
    return `<p style='margin:0; padding:0; line-height:1.0; font-family:Courier;'>${line}</p>`;
  }).join('');

  const html = `<html><body style='margin:0.5in;'><h3 style='text-align:center; margin-bottom:10px;'>Waghimra High Court Official Record</h3><div style='line-height:1.0;'>${formattedLines}</div></body></html>`;
  const blob = new Blob(['\ufeff', html], { type: 'application/msword' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${filename}.doc`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
