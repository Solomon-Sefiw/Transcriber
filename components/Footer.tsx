
import React from 'react';

const Footer: React.FC = () => {
  return (
    <footer className="bg-gray-50 border-t border-gray-200 mt-auto py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="text-center md:text-left">
            <p className="text-sm text-gray-500">© {new Date().getFullYear()} EthioTranscribe. Developed for the Federal Democratic Republic of Ethiopia.</p>
            <p className="text-xs text-gray-400 mt-1">Powered by Advanced AI for Official Government Use.</p>
          </div>
          <div className="flex gap-6">
            <a href="#" className="text-gray-400 hover:text-gray-600 transition-colors">Privacy</a>
            <a href="#" className="text-gray-400 hover:text-gray-600 transition-colors">Terms</a>
            <a href="#" className="text-gray-400 hover:text-gray-600 transition-colors">Accessibility</a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
