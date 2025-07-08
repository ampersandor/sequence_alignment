import { useState } from 'react';
import type { AlignmentRequest } from '../types';

interface AlignmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (alignmentRequest: AlignmentRequest) => void;
  fileName: string;
}

export function AlignmentModal({ isOpen, onClose, onConfirm, fileName }: AlignmentModalProps) {
  const [alignTool, setAlignTool] = useState('mafft');
  const [options, setOptions] = useState('--auto');

  if (!isOpen) return null;

  const handleConfirm = () => {
    const alignmentRequest: AlignmentRequest = {
      user_id: 1, // 기본 사용자 ID (추후 실제 사용자 시스템 연동 시 수정)
      align_tool: alignTool as 'mafft' | 'uclust' | 'vsearch',
      options: options.trim() || '--auto'
    };
    onConfirm(alignmentRequest);
    onClose();
  };

  const handleCancel = () => {
    // 값 초기화
    setAlignTool('mafft');
    setOptions('--auto');
    onClose();
  };

  const alignToolOptions = [
    { value: 'mafft', label: 'MAFFT', description: '빠르고 정확한 다중 서열 정렬' },
    { value: 'uclust', label: 'UCLUST', description: '빠른 클러스터링 기반 정렬' },
    { value: 'vsearch', label: 'VSEARCH', description: '고성능 서열 검색 및 정렬' }
  ];

  const commonOptions = {
    mafft: ['--auto', '--localpair', '--globalpair', '--maxiterate 1000'],
    uclust: ['--cluster_fast', '--id 0.97', '--centroids', '--uc'],
    vsearch: ['--cluster_fast', '--id 0.97', '--centroids', '--uc']
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg p-6 max-w-lg w-full mx-4 border border-gray-700">
        <div className="flex items-center mb-6">
          <span className="text-2xl mr-3">⚙️</span>
          <h3 className="text-lg font-semibold text-white">정렬 작업 설정</h3>
        </div>
        
        <div className="mb-4">
          <p className="text-gray-300 text-sm mb-4">
            <strong>{fileName}</strong> 파일의 정렬 작업을 설정하세요.
          </p>
        </div>

        {/* Alignment Tool 선택 */}
        <div className="mb-6">
          <label className="block text-white text-sm font-medium mb-3">
            정렬 도구 선택
          </label>
          <div className="space-y-2">
            {alignToolOptions.map((tool) => (
              <label
                key={tool.value}
                className="flex items-start p-3 rounded-lg border border-gray-600 hover:border-gray-500 cursor-pointer transition-colors"
              >
                <input
                  type="radio"
                  name="alignTool"
                  value={tool.value}
                  checked={alignTool === tool.value}
                  onChange={(e) => {
                    setAlignTool(e.target.value);
                    setOptions(commonOptions[tool.value as keyof typeof commonOptions][0]);
                  }}
                  className="mt-1 mr-3"
                />
                <div>
                  <div className="text-white font-medium">{tool.label}</div>
                  <div className="text-gray-400 text-xs">{tool.description}</div>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Options 입력 */}
        <div className="mb-6">
          <label className="block text-white text-sm font-medium mb-2">
            옵션 설정
          </label>
          <div className="mb-2">
            <div className="flex flex-wrap gap-1 mb-2">
              {commonOptions[alignTool as keyof typeof commonOptions].map((option) => (
                <button
                  key={option}
                  onClick={() => setOptions(option)}
                  className="px-2 py-1 text-xs bg-gray-700 text-gray-300 rounded hover:bg-gray-600 transition-colors"
                >
                  {option}
                </button>
              ))}
            </div>
          </div>
          <textarea
            value={options}
            onChange={(e) => setOptions(e.target.value)}
            placeholder="정렬 옵션을 입력하세요 (예: --auto)"
            className="w-full p-3 bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-400 focus:border-blue-500 focus:outline-none resize-none"
            rows={3}
          />
          <div className="text-gray-400 text-xs mt-1">
            위의 버튼을 클릭하거나 직접 입력할 수 있습니다.
          </div>
        </div>

        {/* 버튼 */}
        <div className="flex justify-end space-x-3">
          <button
            onClick={handleCancel}
            className="px-4 py-2 text-gray-300 border border-gray-600 rounded hover:bg-gray-700 transition-colors"
          >
            취소
          </button>
          <button
            onClick={handleConfirm}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
          >
            정렬 시작
          </button>
        </div>
      </div>
    </div>
  );
} 