
export const exportToDoc = (text: string, filename: string) => {
  // Wrap speakers in bold but keep everything tight
  const formattedLines = text.split('\n').map(line => {
    if (!line.trim()) return '';
    const match = line.match(/^([^:]+:)(.*)$/);
    if (match) {
      return `<p style='margin:0; padding:0; line-height:1.0;'><b>${match[1]}</b>${match[2]}</p>`;
    }
    return `<p style='margin:0; padding:0; line-height:1.0;'>${line}</p>`;
  }).join('');

  const htmlContent = `
    <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
    <head>
      <meta charset='utf-8'>
      <style>
        body { font-family: "Courier New", Courier, monospace; font-size: 10pt; margin: 0; padding: 0; }
        .page { padding: 0.5in; }
        .header { text-align: center; border-bottom: 1pt solid #0a3d52; margin-bottom: 10px; }
        .content { line-height: 1.0; }
        .footer { margin-top: 20px; text-align: right; font-size: 8pt; color: #666; }
      </style>
    </head>
    <body>
      <div class='page'>
        <div class='header'>
          <h4 style='margin:0; color:#0a3d52;'>Waghimra High Court Official Record</h4>
          <p style='margin:0; font-size:8pt;'>Judicial Transcription Service</p>
        </div>
        <div class='content'>
          ${formattedLines}
        </div>
        <div class='footer'>
          <p style='margin:0;'>Date: ${new Date().toLocaleDateString()}</p>
        </div>
      </div>
    </body>
    </html>`;

  const blob = new Blob(['\ufeff', htmlContent], { type: 'application/msword' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${filename}.doc`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};
