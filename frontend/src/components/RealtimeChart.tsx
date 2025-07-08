import { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import { downloadFile, getAlignmentJobs } from '../services/api';
import type { AlignmentJob, FilterOption, PaginationInfo } from '../types';

interface RealtimeChartProps {
  latestSSEMessage: AlignmentJob | null;
}

interface ColumnWidths {
  userID: number;
  input: number;
  tool: number;
  options: number;
  createdAt: number;
  updatedAt: number;
  output: number;
  status: number;
}

interface SpringBootPageResponse {
  content: AlignmentJob[];
  totalElements: number;
  totalPages: number;
  page: number;
  size: number;
  first: boolean;
  last: boolean;
  numberOfElements: number;
}

export function RealtimeChart({ latestSSEMessage }: RealtimeChartProps) {
  const [filters, setFilters] = useState<FilterOption[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [downloadingIds, setDownloadingIds] = useState<Set<number>>(new Set());
  const [currentPageJobs, setCurrentPageJobs] = useState<AlignmentJob[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [totalElements, setTotalElements] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  
  // SSE 메시지 처리 최적화를 위한 ref
  const lastProcessedSSERef = useRef<string>('');
  const isFirstPageRef = useRef(true);
  
  // 컬럼 너비 상태 관리
  const [columnWidths, setColumnWidths] = useState<ColumnWidths>({
    userID: 80,
    input: 120,
    tool: 80,
    options: 120,
    createdAt: 130,
    updatedAt: 130,
    output: 150,
    status: 80,
  });
  
  const [isResizing, setIsResizing] = useState<string | null>(null);
  const [startX, setStartX] = useState(0);
  const [startWidth, setStartWidth] = useState(0);
  const tableRef = useRef<HTMLDivElement>(null);

  // 페이지 데이터 로드 함수
  const loadPageData = useCallback(async (page: number) => {
    if (isLoading) return;
    
    try {
      setIsLoading(true);
      console.log(`📄 [API 호출] 페이지 ${page} 데이터를 로드합니다...`);
      
      const response: any = await getAlignmentJobs(page, itemsPerPage);
      
      // Spring Boot 페이지네이션 응답 처리
      let pageData: SpringBootPageResponse;
      
      if (response && typeof response === 'object' && Array.isArray(response.content)) {
        pageData = response as SpringBootPageResponse;
      } else if (Array.isArray(response)) {
        pageData = {
          content: response,
          totalElements: response.length,
          totalPages: 1,
          page: page,
          size: itemsPerPage,
          first: true,
          last: true,
          numberOfElements: response.length
        };
      } else {
        console.warn('⚠️ 예상치 못한 API 응답 구조:', response);
        pageData = {
          content: [],
          totalElements: 0,
          totalPages: 1,
          page: page,
          size: itemsPerPage,
          first: true,
          last: true,
          numberOfElements: 0
        };
      }
      
      setCurrentPageJobs(pageData.content);
      setTotalPages(pageData.totalPages);
      setTotalElements(pageData.totalElements);
      
      console.log(`✅ [API 완료] 페이지 ${page} 로드 완료:`, {
        현재페이지항목: pageData.numberOfElements,
        전체항목: pageData.totalElements,
        전체페이지: pageData.totalPages
      });
      
    } catch (error) {
      console.error('페이지 데이터 로드 실패:', error);
      setCurrentPageJobs([]);
    } finally {
      setIsLoading(false);
    }
  }, [itemsPerPage, isLoading]);

  // 페이지 변경 핸들러
  const handlePageChange = useCallback((newPage: number) => {
    if (newPage === currentPage || isLoading) return;
    
    console.log(`🔄 [페이지 변경] ${currentPage} → ${newPage}`);
    setCurrentPage(newPage);
    isFirstPageRef.current = newPage === 1;
  }, [currentPage, isLoading]);

  // 초기 로드 및 페이지 변경 시 데이터 로드
  useEffect(() => {
    loadPageData(currentPage);
  }, [currentPage]); // loadPageData는 useCallback으로 메모이제이션됨

  // SSE 메시지 처리 - 새로운 룰 적용
  useEffect(() => {
    if (!latestSSEMessage) return;
    
    // 중복 메시지 처리 방지
    const messageKey = `${latestSSEMessage.taskId}-${latestSSEMessage.status}-${latestSSEMessage.updatedAt}`;
    if (lastProcessedSSERef.current === messageKey) return;
    lastProcessedSSERef.current = messageKey;

    const job = latestSSEMessage;
    console.log('📨 [SSE] 메시지 수신:', {
      taskId: job.taskId.substring(0, 8) + '...',
      status: job.status,
      currentPage
    });

    setCurrentPageJobs(prev => {
      const existingIndex = prev.findIndex(j => j.taskId === job.taskId);
      
      // 룰 1: 기존 데이터와 겹치는 경우 (같은 taskId) → 업데이트
      if (existingIndex >= 0) {
        console.log('🔄 [업데이트] 기존 작업 상태 변경');
        const updated = [...prev];
        updated[existingIndex] = job;
        return updated;
      }
      
      // 룰 2: 새로운 데이터인 경우
      // 1번 페이지가 아니라면 무시
      if (currentPage !== 1) {
        console.log('⏭️ [무시] 1번 페이지가 아님');
        return prev;
      }
      
      // 1번 페이지인 경우: createdAt 비교
      if (prev.length > 0) {
        // 현재 데이터들의 가장 최근 createdAt 찾기
        const mostRecentCreatedAt = prev.reduce((latest, current) => {
          return new Date(current.createdAt) > new Date(latest.createdAt) ? current : latest;
        }).createdAt;
        
        // 새 데이터가 현재 데이터들보다 최근인지 확인
        const newJobCreatedAt = new Date(job.createdAt);
        const mostRecentDate = new Date(mostRecentCreatedAt);
        
        if (newJobCreatedAt > mostRecentDate) {
          console.log('✨ [추가] 새 작업이 더 최근임');
          // 맨 앞에 추가하고 10개 넘어가면 마지막 제거
          const newJobs = [job, ...prev];
          return newJobs.slice(0, itemsPerPage);
        } else {
          console.log('⏭️ [무시] 새 작업이 더 예전임');
          return prev;
        }
      } else {
        // 현재 데이터가 없으면 무조건 추가
        console.log('✨ [추가] 첫 번째 데이터');
        return [job];
      }
    });
  }, [latestSSEMessage, currentPage, itemsPerPage]);

  // 필터링된 작업 목록
  const filteredJobs = useMemo(() => {
    if (!Array.isArray(currentPageJobs)) {
      return [];
    }
    
    return currentPageJobs.filter(job => {
      if (job.taskId === 'KEEP_ALIVE') {
        return false;
      }
      
      return filters.every(filter => {
        switch (filter.type) {
          case 'input':
            return job.inputPath?.toLowerCase().includes(filter.value.toLowerCase()) ?? false;
          case 'tool':
            return job.alignTool.toLowerCase().includes(filter.value.toLowerCase());
          case 'user':
            return job.userID.toString().includes(filter.value);
          default:
            return true;
        }
      });
    });
  }, [currentPageJobs, filters]);

  // 페이지네이션 정보
  const pagination: PaginationInfo = useMemo(() => {
    return {
      currentPage,
      totalPages,
      totalItems: totalElements,
      itemsPerPage,
    };
  }, [currentPage, totalPages, totalElements, itemsPerPage]);

  const displayJobs = filteredJobs;

  // 날짜 포맷
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ko-KR', {
      year: '2-digit',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }).replace(/\./g, '').replace(/ /g, ' ');
  };

  // 상태 아이콘
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'SUCCESS':
        return (
          <span className="inline-block animate-bounce-slow">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="#005AEB" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 0 1-1.043 3.296 3.745 3.745 0 0 1-3.296 1.043A3.745 3.745 0 0 1 12 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 0 1-3.296-1.043 3.745 3.745 0 0 1-1.043-3.296A3.745 3.745 0 0 1 3 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 0 1 1.043-3.296 3.746 3.746 0 0 1 3.296-1.043A3.746 3.746 0 0 1 12 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 0 1 3.296 1.043 3.746 3.746 0 0 1 1.043 3.296A3.745 3.745 0 0 1 21 12Z" />
            </svg>
          </span>
        );
      case 'ERROR':
        return (
          <span className="inline-block animate-pulse-slow">
            ❌
          </span>
        );
      default:
        return (
          <span className="inline-block animate-spin-slow">
            ⏳
          </span>
        );
    }
  };

  // 페이지 번호 목록
  const getPageNumbers = () => {
    const pages = [];
    const maxVisible = 10;
    
    for (let i = 1; i <= Math.min(pagination.totalPages, maxVisible); i++) {
      pages.push(i);
    }
    
    return pages;
  };

  // 현재 시간
  const getCurrentTime = () => {
    const now = new Date();
    return now.toLocaleTimeString('ko-KR', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // 필터 추가/제거
  const addFilter = (type: 'input' | 'tool' | 'user', value: string) => {
    const newFilter: FilterOption = {
      label: `${type}: ${value}`,
      value,
      type,
    };
    setFilters(prev => [...prev, newFilter]);
  };

  const removeFilter = (index: number) => {
    setFilters(prev => prev.filter((_, i) => i !== index));
  };

  // 파일 다운로드 핸들러
  const handleDownload = useCallback(async (fileId: number) => {
    try {
      setDownloadingIds(prev => new Set(prev).add(fileId));
      await downloadFile(fileId, `alignment_result_${fileId}.fasta`);
      console.log(`✅ 파일 ID ${fileId} 다운로드 완료`);
    } catch (error) {
      console.error('다운로드 실패:', error);
      alert('파일 다운로드에 실패했습니다.');
    } finally {
      setDownloadingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(fileId);
        return newSet;
      });
    }
  }, []);

  // 컬럼 리사이징 핸들러
  const handleMouseDown = useCallback((e: React.MouseEvent, columnKey: keyof ColumnWidths) => {
    setIsResizing(columnKey);
    setStartX(e.pageX);
    setStartWidth(columnWidths[columnKey]);
    e.preventDefault();
  }, [columnWidths]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isResizing) return;
    
    const diff = e.pageX - startX;
    const newWidth = Math.max(50, startWidth + diff);
    
    setColumnWidths(prev => ({
      ...prev,
      [isResizing]: newWidth,
    }));
  }, [isResizing, startX, startWidth]);

  const handleMouseUp = useCallback(() => {
    setIsResizing(null);
  }, []);

  // 마우스 이벤트 리스너
  useEffect(() => {
    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'col-resize';
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        document.body.style.cursor = '';
      };
    }
  }, [isResizing, handleMouseMove, handleMouseUp]);

  return (
    <div className="w-full">
      {/* 헤더 */}
      <div className="w-full border border-[#d4d4d4] rounded-none mb-6 p-4" style={{ backgroundColor: '#17171c' }}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-white text-xs">실시간 분석 차트</h2>
          <span className="text-[#9c9a9a] text-xs">오늘 {getCurrentTime()}</span>
        </div>
        
        {/* 필터 버튼들 */}
        <div className="flex items-center space-x-2">
          <button 
            className="px-3 py-1 text-[9px] rounded-sm hover:opacity-80 transition-colors"
            style={{ backgroundColor: '#3f3c3c', color: '#ffffff' }}
            onClick={() => addFilter('input', 'sample')}
          >
            필터추가
          </button>
          <button 
            className="px-3 py-1 text-[9px] rounded-sm hover:opacity-80 transition-colors flex items-center"
            style={{ backgroundColor: '#3f3c3c', color: '#ffffff' }}
            onClick={() => addFilter('input', 'input')}
          >
            Input
            <span className="ml-1">▼</span>
          </button>
          <button 
            className="px-3 py-1 text-[9px] rounded-sm hover:opacity-80 transition-colors flex items-center"
            style={{ backgroundColor: '#3f3c3c', color: '#ffffff' }}
            onClick={() => addFilter('tool', 'mafft')}
          >
            Tool
            <span className="ml-1">▼</span>
          </button>
          <button 
            className="px-3 py-1 text-[9px] rounded-sm hover:opacity-80 transition-colors flex items-center"
            style={{ backgroundColor: '#3f3c3c', color: '#ffffff' }}
            onClick={() => addFilter('user', 'user')}
          >
            User
            <span className="ml-1">▼</span>
          </button>
        </div>

        {/* 적용된 필터들 */}
        {filters.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-2">
            {filters.map((filter, index) => (
              <span
                key={index}
                className="px-2 py-1 text-white text-xs rounded flex items-center cursor-pointer hover:opacity-80 transition-opacity"
                style={{ backgroundColor: '#005aeb' }}
                onClick={() => removeFilter(index)}
              >
                {filter.label}
                <span className="ml-1">×</span>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* 테이블 */}
      <div 
        className="w-full overflow-x-auto" 
        ref={tableRef}
        style={{
          scrollbarWidth: 'thin',
          scrollbarColor: '#9ca3af transparent'
        }}
      >
        {/* 테이블 헤더 */}
        <div 
          className="h-6 flex items-center px-4 text-xs" 
          style={{ 
            backgroundColor: '#17171c', 
            color: '#757575',
            minWidth: `${Object.values(columnWidths).reduce((sum, width) => sum + width, 0) + 80}px`
          }}
        >
          {/* userID */}
          <div className="relative flex items-center" style={{ width: columnWidths.userID }}>
            <span className="truncate">userID</span>
            <div
              className="absolute right-0 top-0 bottom-0 w-2 cursor-col-resize hover:bg-blue-400 opacity-0 hover:opacity-100 transition-all bg-transparent border-r border-transparent hover:border-blue-400"
              onMouseDown={(e) => handleMouseDown(e, 'userID')}
            />
          </div>
          
          {/* input */}
          <div className="relative flex items-center ml-2" style={{ width: columnWidths.input }}>
            <span className="truncate">input</span>
            <div
              className="absolute right-0 top-0 bottom-0 w-2 cursor-col-resize hover:bg-blue-400 opacity-0 hover:opacity-100 transition-all bg-transparent border-r border-transparent hover:border-blue-400"
              onMouseDown={(e) => handleMouseDown(e, 'input')}
            />
          </div>
          
          {/* tool */}
          <div className="relative flex items-center ml-2" style={{ width: columnWidths.tool }}>
            <span className="truncate">tool</span>
            <div
              className="absolute right-0 top-0 bottom-0 w-2 cursor-col-resize hover:bg-blue-400 opacity-0 hover:opacity-100 transition-all bg-transparent border-r border-transparent hover:border-blue-400"
              onMouseDown={(e) => handleMouseDown(e, 'tool')}
            />
          </div>
          
          {/* options */}
          <div className="relative flex items-center ml-2" style={{ width: columnWidths.options }}>
            <span className="truncate">options</span>
            <div
              className="absolute right-0 top-0 bottom-0 w-2 cursor-col-resize hover:bg-blue-400 opacity-0 hover:opacity-100 transition-all bg-transparent border-r border-transparent hover:border-blue-400"
              onMouseDown={(e) => handleMouseDown(e, 'options')}
            />
          </div>
          
          {/* createdAt */}
          <div className="relative flex items-center ml-2" style={{ width: columnWidths.createdAt }}>
            <span className="truncate">createdAt</span>
            <div
              className="absolute right-0 top-0 bottom-0 w-2 cursor-col-resize hover:bg-blue-400 opacity-0 hover:opacity-100 transition-all bg-transparent border-r border-transparent hover:border-blue-400"
              onMouseDown={(e) => handleMouseDown(e, 'createdAt')}
            />
          </div>
          
          {/* updatedAt */}
          <div className="relative flex items-center ml-2" style={{ width: columnWidths.updatedAt }}>
            <span className="truncate">updatedAt</span>
            <div
              className="absolute right-0 top-0 bottom-0 w-2 cursor-col-resize hover:bg-blue-400 opacity-0 hover:opacity-100 transition-all bg-transparent border-r border-transparent hover:border-blue-400"
              onMouseDown={(e) => handleMouseDown(e, 'updatedAt')}
            />
          </div>
          
          {/* output */}
          <div className="relative flex items-center ml-2" style={{ width: columnWidths.output }}>
            <span className="truncate">output</span>
            <div
              className="absolute right-0 top-0 bottom-0 w-2 cursor-col-resize hover:bg-blue-400 opacity-0 hover:opacity-100 transition-all bg-transparent border-r border-transparent hover:border-blue-400"
              onMouseDown={(e) => handleMouseDown(e, 'output')}
            />
          </div>
          
          {/* status */}
          <div className="relative flex items-center ml-2" style={{ width: columnWidths.status }}>
            <span className="truncate">status</span>
          </div>
        </div>

        {/* 테이블 바디 */}
        <div className="space-y-0">
          {displayJobs.map((job, index) => (
            <div 
              key={`${job.taskId}-${job.status}-${job.updatedAt}`}
              className="h-11 flex items-center px-4 text-white text-xs"
              style={{ 
                backgroundColor: index % 2 === 0 ? '#22252f' : '#17171c',
                minWidth: `${Object.values(columnWidths).reduce((sum, width) => sum + width, 0) + 80}px`
              }}
            >
              <div className="truncate" style={{ width: columnWidths.userID }}>
                {job.userID}
              </div>
              <div className="truncate ml-2" style={{ width: columnWidths.input }}>
                {job.inputFileRecordId ? (
                  <button
                    onClick={() => handleDownload(job.inputFileRecordId)}
                    className="truncate w-full text-left hover:text-blue-400 transition-colors"
                    style={{ color: '#00b2ff' }}
                    title={`${job.inputPath} (클릭하여 다운로드)`}
                  >
                    {job.inputPath}
                  </button>
                ) : (
                  <span className="truncate" title={job.inputPath}>
                    {job.inputPath}
                  </span>
                )}
              </div>
              <div className="truncate ml-2" style={{ width: columnWidths.tool }}>
                {job.alignTool}
              </div>
              <div className="truncate ml-2" style={{ width: columnWidths.options }} title={job.options}>
                {job.options}
              </div>
              <div className="truncate ml-2" style={{ width: columnWidths.createdAt }}>
                {formatDate(job.createdAt)}
              </div>
              <div className="truncate ml-2" style={{ width: columnWidths.updatedAt }}>
                {formatDate(job.updatedAt)}
              </div>
              <div className="truncate ml-2" style={{ width: columnWidths.output }}>
                {job.outputFileRecordId && job.status === 'SUCCESS' ? (
                  <button
                    onClick={() => handleDownload(job.outputFileRecordId!)}
                    disabled={downloadingIds.has(job.outputFileRecordId)}
                    className={`px-3 py-1 text-xs rounded-sm transition-all duration-200 ${
                      downloadingIds.has(job.outputFileRecordId) 
                        ? 'opacity-75 cursor-wait' 
                        : 'hover:shadow-md hover:scale-105'
                    }`}
                    style={{ 
                      backgroundColor: '#005aeb', 
                      color: '#ffffff',
                      border: 'none',
                      cursor: downloadingIds.has(job.outputFileRecordId) ? 'wait' : 'pointer'
                    }}
                    title={downloadingIds.has(job.outputFileRecordId) ? '다운로드 중...' : `파일 다운로드`}
                  >
                    {downloadingIds.has(job.outputFileRecordId) ? (
                      <span className="flex items-center space-x-1">
                        <span className="animate-spin inline-block w-3 h-3 border-2 border-white border-t-transparent rounded-full"></span>
                        <span>다운로드 중</span>
                      </span>
                    ) : (
                      '다운로드'
                    )}
                  </button>
                ) : (
                  <button
                    disabled
                    className="px-3 py-1 text-xs rounded-sm opacity-50 cursor-not-allowed"
                    style={{ 
                      backgroundColor: '#3f3c3c', 
                      color: '#9c9a9a',
                      border: 'none'
                    }}
                    title={job.status === 'PENDING' || job.status === 'RUNNING' ? '처리 중...' : '사용 불가'}
                  >
                    {job.status === 'PENDING' || job.status === 'RUNNING' ? '처리 중' : '다운로드'}
                  </button>
                )}
              </div>
              <div className="truncate ml-2" style={{ width: columnWidths.status }}>
                {getStatusIcon(job.status)}
              </div>
            </div>
          ))}
          
          {/* 빈 행들로 10행 채우기 */}
          {Array.from({ length: itemsPerPage - displayJobs.length }).map((_, index) => (
            <div 
              key={`empty-${index}-${displayJobs.length}`}
              className="h-11 flex items-center px-4"
              style={{ 
                backgroundColor: (displayJobs.length + index) % 2 === 0 ? '#22252f' : '#17171c',
                minWidth: `${Object.values(columnWidths).reduce((sum, width) => sum + width, 0) + 80}px`
              }}
            >
              <div style={{ width: columnWidths.userID }} />
              <div className="ml-2" style={{ width: columnWidths.input }} />
              <div className="ml-2" style={{ width: columnWidths.tool }} />
              <div className="ml-2" style={{ width: columnWidths.options }} />
              <div className="ml-2" style={{ width: columnWidths.createdAt }} />
              <div className="ml-2" style={{ width: columnWidths.updatedAt }} />
              <div className="ml-2" style={{ width: columnWidths.output }} />
              <div className="ml-2" style={{ width: columnWidths.status }} />
            </div>
          ))}
        </div>

        {/* 페이지네이션 */}
        <div 
          className="h-7 flex items-center justify-center space-x-4" 
          style={{ 
            backgroundColor: '#17171c',
            minWidth: `${Object.values(columnWidths).reduce((sum, width) => sum + width, 0) + 80}px`
          }}
        >
          <button 
            className="text-white hover:opacity-80 transition-opacity disabled:opacity-40"
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1 || isLoading}
          >
            ←
          </button>
          
          <div className="flex items-center space-x-4">
            {getPageNumbers().map(page => (
              <button
                key={page}
                className={`w-5 h-5 rounded-full text-xs flex items-center justify-center transition-colors ${
                  page === currentPage
                    ? 'text-white'
                    : 'hover:text-white'
                }`}
                style={{
                  backgroundColor: page === currentPage ? '#3f3c3c' : 'transparent',
                  color: page === currentPage ? '#ffffff' : '#929292'
                }}
                onClick={() => handlePageChange(page)}
                disabled={isLoading}
              >
                {page}
              </button>
            ))}
          </div>
          
          <button 
            className="text-white hover:opacity-80 transition-opacity disabled:opacity-40"
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === pagination.totalPages || isLoading}
          >
            →
          </button>
        </div>
      </div>
    </div>
  );
} 