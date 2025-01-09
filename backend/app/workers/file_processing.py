from . import celery
import os
import shutil
import logging
from app.core.config import settings
import time

logger = logging.getLogger(__name__)

@celery.task(name="workers.process_file")
def process_file(file_path: str, process_type: str = "copy"):
    """
    파일 처리 작업을 수행하는 태스크
    
    Args:
        file_path: 처리할 파일 경로
        process_type: 처리 유형 (copy, move, delete 등)
    """
    try:
        if process_type == "copy":
            dest_path = os.path.join(settings.UPLOAD_DIR, os.path.basename(file_path))
            os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
            shutil.copy2(file_path, dest_path)
            logger.info(f"File copied to: {dest_path}")
            return {"status": "success", "destination": dest_path}
            
        elif process_type == "move":
            dest_path = os.path.join(settings.UPLOAD_DIR, os.path.basename(file_path))
            os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
            shutil.move(file_path, dest_path)
            logger.info(f"File moved to: {dest_path}")
            return {"status": "success", "destination": dest_path}
            
        elif process_type == "delete":
            os.remove(file_path)
            logger.info(f"File deleted: {file_path}")
            return {"status": "success", "deleted": file_path}
            
    except Exception as e:
        logger.error(f"Error processing file {file_path}: {str(e)}")
        raise

@celery.task(name="workers.cleanup_old_files")
def cleanup_old_files(days: int = 7):
    """
    오래된 파일들을 정리하는 태스크
    
    Args:
        days: 이 일수보다 오래된 파일들을 삭제
    """
    try:
        # 업로드 디렉토리 정리
        cleanup_directory(settings.UPLOAD_DIR, days)
        # 결과 디렉토리 정리
        cleanup_directory(settings.RESULTS_DIR, days)
        
        return {"status": "success", "message": f"Cleaned up files older than {days} days"}
        
    except Exception as e:
        logger.error(f"Error during cleanup: {str(e)}")
        raise

def cleanup_directory(directory: str, days: int):
    """특정 디렉토리의 오래된 파일들을 삭제"""
    current_time = time.time()
    for filename in os.listdir(directory):
        filepath = os.path.join(directory, filename)
        if os.path.isfile(filepath):
            file_time = os.path.getmtime(filepath)
            if current_time - file_time > days * 86400:  # 86400 = 24 * 60 * 60 (하루)
                os.remove(filepath)
                logger.info(f"Removed old file: {filepath}") 