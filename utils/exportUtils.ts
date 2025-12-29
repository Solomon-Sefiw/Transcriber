
export const exportToDoc = (text: string, filename: string) => {
  const formattedLines = text.split('\n').map(line => {
    if (!line.trim()) return '<br/>';
    // Capture speaker tag before the colon, supporting Ethiopic range
    const match = line.match(/^([^:]+:)(.*)$/);
    if (match) {
      return `<p style='margin:0; padding-bottom:12px; line-height:1.5; font-family:"Times New Roman", "Nyala", serif; font-size:12pt;'>
                <b style='color:#0a3d52;'>${match[1]}</b>${match[2]}
              </p>`;
    }
    return `<p style='margin:0; padding-bottom:12px; line-height:1.5; font-family:"Times New Roman", "Nyala", serif; font-size:12pt;'>${line}</p>`;
  }).join('');

  const html = `
    <html>
      <head>
        <meta charset="utf-8">
      </head>
      <body style='margin:1in; font-family:Nyala, "Times New Roman";'>
        <div style='text-align:center; margin-bottom:40px;'>
          <h2 style='margin:0; color:#0a3d52;'>የዋግ ኸምራ ብሔረሰብ አስተዳደር ከፍተኛ ፍርድ ቤት</h2>
          <h3 style='margin:5px 0; color:#0a3d52;'>WAGHIMRA NATIONALITY ADMINISTRATION HIGH COURT</h3>
          <p style='margin:5px 0; font-size:10pt; color:#666;'>OFFICIAL JUDICIAL RECORD • STENOGRAPHY DIVISION</p>
          <hr style='border:0.5pt solid #0a3d52;'/>
        </div>
        <div style='text-align:right; margin-bottom:30px; font-size:11pt;'>
          <b>DATE:</b> ${new Date().toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' })}<br/>
          <b>CASE REF:</b> ${filename}
        </div>
        <div style='line-height:1.5;'>
          ${formattedLines}
        </div>
        <div style='margin-top:80px; text-align:center; font-size:9pt; color:#888; border-top: 1pt solid #eee; pt: 20px;'>
          <p>*** END OF OFFICIAL JUDICIAL TRANSCRIPT ***</p>
          <p>This document was generated using authorized Waghimra Judicial AI Systems.</p>
        </div>
      </body>
    </html>`;

  const blob = new Blob(['\ufeff', html], { type: 'application/msword' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${filename.replace(/[^a-z0-9]/gi, '_')}.doc`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};
