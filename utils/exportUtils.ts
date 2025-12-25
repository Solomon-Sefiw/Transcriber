
import { jsPDF } from "jspdf";

export const exportToPdf = (text: string, filename: string) => {
  const doc = new jsPDF();
  const splitText = doc.splitTextToSize(text, 180);
  
  doc.setFontSize(16);
  doc.text("Official Transcription - EthioTranscribe", 15, 20);
  doc.setFontSize(10);
  doc.text(`Generated on: ${new Date().toLocaleString()}`, 15, 28);
  doc.setLineWidth(0.5);
  doc.line(15, 32, 195, 32);
  
  doc.setFontSize(11);
  doc.text(splitText, 15, 40);
  doc.save(`${filename}.pdf`);
};

export const exportToDoc = (text: string, filename: string) => {
  // Creating a simple HTML-based Word document blob
  const header = `
    <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
    <head><meta charset='utf-8'><title>Transcription</title></head><body>
    <div style='font-family: Arial, sans-serif;'>
      <h2 style='color: #064e3b;'>Official Government Transcription</h2>
      <p style='color: #666;'>Generated via EthioTranscribe on ${new Date().toLocaleString()}</p>
      <hr/>
      <div style='white-space: pre-wrap;'>${text}</div>
    </div>
    </body></html>`;

  const blob = new Blob(['\ufeff', header], {
    type: 'application/msword'
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${filename}.doc`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
