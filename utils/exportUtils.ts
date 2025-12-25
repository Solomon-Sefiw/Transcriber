
export const exportToDoc = (text: string, filename: string) => {
  const header = `
    <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
    <head><meta charset='utf-8'><title>Judicial Export</title></head><body>
    <div style='font-family: "Segoe UI", Tahoma, sans-serif; padding: 40px;'>
      <div style='text-align: center; border-bottom: 2px solid #0a3d52; padding-bottom: 20px; margin-bottom: 30px;'>
        <h2 style='color: #0a3d52; margin: 0;'>Waghimra Nationality Administration High Court</h2>
        <p style='color: #c5a059; font-weight: bold; margin: 5px 0;'>Federal Democratic Republic of Ethiopia</p>
      </div>
      <div style='margin-top: 20px;'>
        <div style='white-space: pre-wrap; font-size: 12pt; line-height: 2.2; color: #000; text-align: justify;'>${text}</div>
      </div>
      <div style='margin-top: 100px; text-align: right;'>
        <p style='color: #666; font-size: 10px;'>Securely processed via 2S Tec Judicial AI on ${new Date().toLocaleString()}</p>
        <div style='width: 200px; border-top: 1px solid #000; display: inline-block;'></div>
        <p style='font-size: 10px; font-weight: bold;'>Official Seal & Clerk Signature</p>
      </div>
    </div>
    </body></html>`;

  const blob = new Blob(['\ufeff', header], { type: 'application/msword' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${filename}.doc`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};
