from celery import Celery
import subprocess
import os
import logging
import shutil
from database import SessionLocal
from models import Analysis
import time

# 로깅 설정
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# 디렉토리 경로 설정
RESULTS_DIR = os.path.join(os.path.dirname(__file__), "results")
UPLOAD_DIR = os.path.join(os.path.dirname(__file__), "uploads")

# Celery 앱 생성
celery = Celery("celery_worker", broker="redis://redis:6379/0", backend="redis://redis:6379/0")


@celery.task(name="celery_worker.align_sequences", bind=True)
def align_sequences(self, file_path: str, method: str):
    db = SessionLocal()
    start_time = time.time()
    
    try:
        # 작업 시작 상태 업데이트
        self.update_state(state='STARTED')
        analysis = db.query(Analysis).filter(
            Analysis.id == int(self.request.id)
        ).first()
        if analysis:
            analysis.status = "STARTED"
            db.commit()

        # 결과 디렉토리 생성
        os.makedirs(RESULTS_DIR, exist_ok=True)

        # 입력 파일 이름에서 타임스탬프 포함된 base_name 추출
        file_name = os.path.basename(file_path)
        base_name = file_name.rsplit('.', 1)[0]  # 확장자 제외한 이름 (타임스탬프 포함)
        output_file = os.path.join(RESULTS_DIR, f"{base_name}_{method}_result.fasta")

        # 진행 상태 업데이트
        self.update_state(state='PROCESSING')
        if analysis:
            analysis.status = "PROCESSING"
            db.commit()

        # 실제 파일 처리 전에 입력 파일 존재 확인
        if not os.path.exists(file_path):
            raise FileNotFoundError(f"Input file not found: {file_path}")

        # 파일 내용 확인을 위한 로깅 추가
        logger.info(f"Processing file: {file_path}")
        logger.info(f"Will save result to: {output_file}")

        if method == "mafft":
            cmd = ["mafft", "--retree", "2", "--thread", "2", file_path]
            logger.info(f"Running command: {' '.join(cmd)}")
            result = subprocess.run(cmd, capture_output=True, text=True)
            with open(output_file, "w") as f:
                f.write(result.stdout)

            # MAFFT 메트릭 수집
            execution_time = time.time() - start_time
            with open(output_file, 'r') as f:
                sequences = f.read().split('>')
                sequence_count = len(sequences) - 1
                lengths = [len(seq.split('\n', 1)[1].replace('\n', '')) 
                          for seq in sequences[1:]]
                avg_length = sum(lengths) / len(lengths) if lengths else 0

            metrics = {
                "execution_metrics": {
                    "execution_time": round(execution_time, 2),
                    "sequence_count": sequence_count,
                    "average_sequence_length": round(avg_length, 2)
                },
                "parameters": {
                    "method": method,
                    "mafft": {
                        "retree": 2,
                        "thread": 2
                    }
                }
            }

        elif method == "uclust":
            try:
                logger.info("Starting UCLUST processing...")
                
                # 임시 파일들의 경로를 RESULTS_DIR 내부로 변경
                uc_file = os.path.join(RESULTS_DIR, f"{file_name}.uc")
                temp_output = os.path.join(RESULTS_DIR, f"{file_name}_temp.fa")
                final_output = os.path.join(RESULTS_DIR, f"{file_name}_final.fasta")
                
                # 입력 파일을 results 디렉토리로 복사 (여기로 이동)
                input_copy = os.path.join(RESULTS_DIR, file_name)
                shutil.copy2(file_path, input_copy)
                logger.info(f"Copied input file to: {input_copy}")
                
                logger.info(f"Input file: {file_path}")
                logger.info(f"Output file: {output_file}")

                # Step 1: uclust 클러스터링
                cmd1 = [
                    "uclust",
                    "--input",
                    input_copy,
                    "--uc",
                    uc_file,
                    "--id",
                    "0.0",
                    "--usersort",
                    "--maxlen",
                    "20000",
                ]
                logger.info(f"Running UCLUST command 1/3: {' '.join(cmd1)}")
                try:
                    result1 = subprocess.run(cmd1, check=True, capture_output=True, text=True)
                except subprocess.CalledProcessError as e:
                    logger.error(f"UCLUST command 1 failed with error:")
                    logger.error(f"stdout: {e.stdout}")
                    logger.error(f"stderr: {e.stderr}")
                    raise

                if result1.stderr:
                    logger.error(f"UCLUST command 1 stderr: {result1.stderr}")
                
                # UC 파일이 생성되었는지 확인
                if not os.path.exists(uc_file):
                    raise FileNotFoundError(f"UC file was not created: {uc_file}")
                
                logger.info(f"UC file created successfully: {uc_file}")
                
                # RESULTS_DIR로 작업 디렉토리 변경
                current_dir = os.getcwd()
                os.chdir(RESULTS_DIR)
                
                try:
                    # Step 2: UC 파일을 FASTA로 변환
                    cmd2 = [
                        "uclust",
                        "--uc2fasta",
                        uc_file,
                        "--input",
                        input_copy,
                        "--output",
                        temp_output
                    ]
                    
                    logger.info(f"Running UCLUST command 2/3 in {RESULTS_DIR}: {' '.join(cmd2)}")
                    try:
                        result2 = subprocess.run(cmd2, check=True, capture_output=True, text=True)
                    except subprocess.CalledProcessError as e:
                        logger.error(f"UCLUST command 2 failed with error:")
                        logger.error(f"stdout: {e.stdout}")
                        logger.error(f"stderr: {e.stderr}")
                        raise

                    if result2.stderr:
                        logger.error(f"UCLUST command 2 stderr: {result2.stderr}")
                    
                    # temp_output 파일이 생성되었는지 확인
                    if not os.path.exists(temp_output):
                        raise FileNotFoundError(f"Temp output file was not created: {temp_output}")
                    
                    # Step 3: 스타 정렬 수행
                    cmd3 = [
                        "uclust",
                        "--staralign",
                        os.path.basename(temp_output),
                        "--output",
                        os.path.basename(final_output)
                    ]
                    
                    logger.info(f"Running UCLUST command 3/3: {' '.join(cmd3)}")
                    result3 = subprocess.run(cmd3, check=True, capture_output=True, text=True)
                    
                finally:
                    os.chdir(current_dir)  # 원래 디렉토리로 복귀

                # 결과 파일 복사
                logger.info("Copying final result to output file...")
                with open(output_file, "wb") as f:
                    with open(final_output, "r") as source:
                        content = source.read()
                        f.write(content.encode("utf-8"))
                        f.flush()
                        os.fsync(f.fileno())

                logger.info("Checking if output file exists and has content...")
                if os.path.exists(output_file):
                    with open(output_file, 'r') as f:
                        content = f.read()
                        logger.info(f"Output file size: {len(content)} bytes")
                else:
                    logger.error("Output file does not exist!")

                # 메트릭 수집
                logger.info("Collecting metrics...")
                execution_time = time.time() - start_time
                
                with open(output_file, 'r') as f:
                    content = f.read()
                    sequences = content.split('>')
                    sequence_count = len(sequences) - 1
                    logger.info(f"Found {sequence_count} sequences")
                    
                    lengths = []
                    for seq in sequences[1:]:  # 첫 번째는 빈 문자열이므로 건너뜀
                        try:
                            seq_lines = seq.split('\n', 1)[1].replace('\n', '')
                            lengths.append(len(seq_lines))
                        except Exception as e:
                            logger.error(f"Error processing sequence: {seq}")
                            logger.error(f"Error details: {str(e)}")
                    
                    avg_length = sum(lengths) / len(lengths) if lengths else 0
                    logger.info(f"Average sequence length: {avg_length}")

                metrics = {
                    "execution_metrics": {
                        "execution_time": round(execution_time, 2),
                        "sequence_count": sequence_count,
                        "average_sequence_length": round(avg_length, 2)
                    },
                    "parameters": {
                        "method": method,
                        "uclust": {
                            "id": 0.0,
                            "maxlen": 20000
                        }
                    }
                }
                
                logger.info(f"Final metrics: {metrics}")

            except Exception as e:
                logger.error(f"Error in UCLUST processing: {str(e)}")
                logger.exception("Full traceback:")
                raise

        # 데이터베이스 업데이트
        analysis = db.query(Analysis).filter(
            Analysis.id == int(self.request.id)
        ).first()
        if analysis:
            analysis.status = "SUCCESS"
            analysis.result_file = os.path.basename(output_file)
            analysis.extra_data = metrics
            db.commit()

        return {"status": "completed", "result_file": os.path.basename(output_file)}

    except subprocess.CalledProcessError as e:
        logger.error(f"Process error: {str(e)}")
        # 데이터베이스 상태 업데이트 추가
        analysis = db.query(Analysis).filter(
            Analysis.id == int(self.request.id)
        ).first()
        if analysis:
            analysis.status = "FAILED"
            analysis.error = f"Process error: {str(e)}"
            if e.stderr:
                analysis.error += f"\nError details: {e.stderr}"
            db.commit()
        return {"status": "failed", "error": f"Process error: {str(e)}"}

    except Exception as e:
        # 실패 시 데이터베이스 업데이트
        analysis = db.query(Analysis).filter(
            Analysis.id == int(self.request.id)
        ).first()
        if analysis:
            analysis.status = "FAILED"
            analysis.error = str(e)
            db.commit()

        logger.error(f"Unexpected error: {str(e)}")
        raise

    finally:
        db.close()


# Celery 설정
celery.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
)
