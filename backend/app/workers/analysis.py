from celery import Task
from sqlalchemy.orm import Session
from app.db.database import SessionLocal
from app.models import Analysis
from app.workers import celery
import subprocess
import os
from app.core.config import settings
import logging
from datetime import datetime
import uuid

logger = logging.getLogger(__name__)

class AlignmentTask(Task):
    def on_failure(self, exc, task_id, args, kwargs, einfo):
        try:
            db = SessionLocal()
            # task_id가 아닌 analysis_id로 조회
            analysis_id = kwargs.get('analysis_id')
            if analysis_id:
                analysis = db.query(Analysis).filter(
                    Analysis.id == analysis_id
                ).first()
                
                if analysis:
                    analysis.status = "FAILURE"
                    analysis.error = str(exc)
                    db.commit()
        except Exception as e:
            logger.error(f"Error in on_failure: {str(e)}")
        finally:
            db.close()

def run_mafft_alignment(input_file: str, output_file: str) -> subprocess.CompletedProcess:
    """
    MAFFT를 사용하여 시퀀스 정렬 수행
    """
    cmd = ['mafft', '--retree', '2', '--thread', '2', input_file]
    logger.info(f"Running MAFFT command: {' '.join(cmd)}")
    
    # 로그 파일 경로 설정
    log_file = output_file.replace('.fa', '.log')
    
    with open(output_file, 'w') as f_out, open(log_file, 'w', encoding='utf-8') as f_log:
        process = subprocess.run(
            cmd, 
            stdout=f_out, 
            stderr=f_log, 
            text=True
        )
    
    if process.returncode != 0:
        with open(log_file, 'r', encoding='utf-8') as f:
            error_msg = f.read()
        logger.error(f"MAFFT alignment failed with error: {error_msg}")
        raise RuntimeError(f"MAFFT alignment failed: {error_msg}")
    
    logger.info(f"MAFFT alignment completed successfully. Output saved to: {output_file}")
    return process

def run_uclust_alignment(input_file: str, output_file: str) -> subprocess.CompletedProcess:
    """
    UCLUST를 사용하여 시퀀스 클러스터링 수행 (3단계)
    """
    base_path = os.path.dirname(output_file)
    base_name = os.path.splitext(os.path.basename(input_file))[0]
    
    # Step 1: Generate UC file
    uc_file = os.path.join(base_path, f"{base_name}_pctid_0.uc")
    cmd1 = ['uclust', '--input', input_file, '--uc', uc_file, '--id', '0.0', '--usersort', '--maxlen', '20000']
    logger.info(f"Running UCLUST step 1 command: {' '.join(cmd1)}")
    process1 = subprocess.run(cmd1, stderr=subprocess.PIPE, text=True)
    
    if process1.returncode != 0:
        logger.error(f"UCLUST step 1 failed with error: {process1.stderr}")
        raise RuntimeError(f"UCLUST step 1 failed: {process1.stderr}")
    
    # Step 2: Convert UC to FASTA
    temp_fa = os.path.join(base_path, f"{base_name}_pctid_0.fa")
    cmd2 = ['uclust', '--uc2fasta', uc_file, '--input', input_file, '--output', temp_fa]
    logger.info(f"Running UCLUST step 2 command: {' '.join(cmd2)}")
    process2 = subprocess.run(cmd2, stderr=subprocess.PIPE, text=True)
    
    if process2.returncode != 0:
        logger.error(f"UCLUST step 2 failed with error: {process2.stderr}")
        raise RuntimeError(f"UCLUST step 2 failed: {process2.stderr}")
    
    # Step 3: Star alignment
    cmd3 = ['uclust', '--staralign', temp_fa, '--output', output_file]
    logger.info(f"Running UCLUST step 3 command: {' '.join(cmd3)}")
    process3 = subprocess.run(cmd3, stderr=subprocess.PIPE, text=True)
    
    if process3.returncode != 0:
        logger.error(f"UCLUST step 3 failed with error: {process3.stderr}")
        raise RuntimeError(f"UCLUST step 3 failed: {process3.stderr}")
    
    logger.info(f"UCLUST alignment completed successfully. Output saved to: {output_file}")
    return process3

@celery.task(bind=True, base=AlignmentTask)
def align_sequences(self, upload_id: int, method: str):
    """
    시퀀스 정렬을 수행하는 Celery 태스크
    """
    db = SessionLocal()
    try:
        analysis = db.query(Analysis).filter(
            Analysis.upload_id == upload_id,
            Analysis.method == method
        ).first()
        
        if not analysis:
            raise ValueError(f"Analysis not found for upload_id: {upload_id} and method: {method}")

        input_file = os.path.join(settings.UPLOAD_DIR, analysis.upload.stored_filename)
        if not os.path.exists(input_file):
            raise FileNotFoundError(f"Input file not found: {input_file}")

        base_filename = os.path.splitext(analysis.upload.filename)[0]
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        unique_id = str(uuid.uuid4())[:8]
        result_filename = f"{base_filename}_{timestamp}_{unique_id}_{method}_result.fasta"
        result_file = os.path.join(settings.RESULT_DIR, result_filename)

        # 메소드에 따라 적절한 정렬 함수 호출
        if method == 'mafft':
            process = run_mafft_alignment(input_file, result_file)
        elif method == 'uclust':
            process = run_uclust_alignment(input_file, result_file)
        else:
            raise ValueError(f"Unsupported method: {method}")

        # 분석 결과 업데이트
        analysis.status = "SUCCESS"
        analysis.result_file = result_filename
        db.commit()

        return {
            "status": "SUCCESS",
            "result_file": result_filename
        }

    except Exception as e:
        logger.error(f"Error in alignment task: {str(e)}")
        if analysis:
            analysis.status = "FAILURE"
            analysis.error = str(e)
            db.commit()
        raise

    finally:
        db.close()

@celery.task(bind=True)
def calculate_bluebase_task(self, input_path: str, output_path: str) -> dict:
    """
    Bluebase 계산을 수행하는 Celery 태스크
    
    Args:
        input_path (str): 입력 FASTA 파일 경로
        output_path (str): 결과 파일 경로
    
    Returns:
        dict: 작업 결과 정보를 담은 딕셔너리
    """
    logger.info(f"Starting Bluebase calculation for: {input_path}")
    
    try:
        # TODO: 실제 Bluebase 계산 로직 구현
        # 1. FASTA 파일 읽기
        # 2. 시퀀스 분석
        # 3. Bluebase 계산
        # 4. 결과 파일 저장
        
        logger.info(f"Bluebase calculation completed. Results saved to: {output_path}")
        
        return {
            "status": "SUCCESS",
            "result_file": os.path.basename(output_path),
            "metrics": {
                "input_file": os.path.basename(input_path),
                "output_file": os.path.basename(output_path),
                "timestamp": datetime.now().isoformat()
            }
        }
        
    except Exception as e:
        logger.error(f"Error in Bluebase calculation: {str(e)}")
        raise RuntimeError(f"Bluebase calculation failed: {str(e)}")
