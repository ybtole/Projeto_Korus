import React, { useState } from 'react';
import { Upload } from 'lucide-react';

export default function AnexoUpload({ onUpload }) {
  const [file, setFile] = useState(null);

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      if (onUpload) onUpload(e.target.files[0]);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <label className="flex items-center gap-2 px-3 py-2 bg-blue-50 text-blue-600 rounded-lg cursor-pointer hover:bg-blue-100 transition-colors">
        <Upload className="w-4 h-4" />
        <span className="text-sm font-medium">Anexar</span>
        <input type="file" className="hidden" onChange={handleFileChange} />
      </label>
      {file && <span className="text-sm text-gray-600">{file.name}</span>}
    </div>
  );
}