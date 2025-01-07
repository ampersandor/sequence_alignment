from celery import Celery
import subprocess
import os
import logging
import shutil

# 로깅 설정
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# 디렉토리 경로 설정
RESULTS_DIR = os.path.join(os.path.dirname(__file__), "results")
UPLOAD_DIR = os.path.join(os.path.dirname(__file__), "uploads")

# Celery 앱 생성
celery = Celery("celery_worker", broker="redis://redis:6379/0", backend="redis://redis:6379/0")


@celery.task(name="celery_worker.align_sequences")
def align_sequences(file_path: str, method: str):
    try:
        # 결과 디렉토리 생성
        os.makedirs(RESULTS_DIR, exist_ok=True)

        # 입력 파일 경로를 절대 경로로 변환
        input_file = os.path.join(UPLOAD_DIR, os.path.basename(file_path))
        file_name = os.path.basename(file_path).split(".")[0]
        output_file = os.path.join(RESULTS_DIR, f"{file_name}_{method}_result.fasta")

        # 파일 내용 확인을 위한 로깅 추가
        logger.info(f"Input file contents:")
        with open(input_file, "r") as f:
            logger.info(f.read())

        if method == "mafft":
            cmd = ["mafft", "--retree", "2", "--thread", "2", input_file]
            logger.info(f"Running command: {' '.join(cmd)}")
            result = subprocess.run(cmd, capture_output=True, text=True)
            with open(output_file, "w") as f:
                f.write(result.stdout)

        elif method == "uclust":
            try:
                # 임시 파일들의 경로를 RESULTS_DIR 내부로 변경
                uc_file = os.path.join(RESULTS_DIR, f"{file_name}.uc")
                temp_output = os.path.join(RESULTS_DIR, f"{file_name}_temp.fa")
                final_output = os.path.join(RESULTS_DIR, f"{file_name}_final.fasta")

                # 입력 파일 내용 확인
                logger.info("Input file contents before UCLUST:")
                with open(input_file, "r") as f:
                    logger.info(f.read())

                # Step 1: uclust 클러스터링
                cmd1 = [
                    "uclust",
                    "--input",
                    input_file,
                    "--uc",
                    uc_file,
                    "--id",
                    "0.0",
                    "--usersort",
                    "--maxlen",
                    "20000",
                ]
                logger.info(f"Running UCLUST command 1/3: {' '.join(cmd1)}")
                subprocess.run(cmd1, check=True, capture_output=True, text=True)

                # UC 파일 내용 확인
                logger.info("UC file contents:")
                with open(uc_file, "r") as f:
                    logger.info(f.read())

                # Step 2: UC 파일을 FASTA로 변환
                cmd2 = ["uclust", "--uc2fasta", uc_file, "--input", input_file, "--output", temp_output]
                logger.info(f"Running UCLUST command 2/3: {' '.join(cmd2)}")
                result2 = subprocess.run(cmd2, check=True, capture_output=True, text=True)

                # 임시 FASTA 파일 내용 확인
                logger.info("Temp FASTA contents:")
                with open(temp_output, "r") as f:
                    logger.info(f.read())

                # Step 3: 스타 정렬 수행
                cmd3 = ["uclust", "--staralign", temp_output, "--output", final_output]
                logger.info(f"Running UCLUST command 3/3: {' '.join(cmd3)}")
                result3 = subprocess.run(cmd3, check=True, capture_output=True, text=True)

                # 최종 결과 파일 내용 확인
                logger.info("Final UCLUST output contents:")
                with open(final_output, "r") as f:
                    final_content = f.read()
                    logger.info(final_content)

                # 결과 파일에 직접 쓰기 (바이너리 모드로 변경)
                with open(output_file, "wb") as f:
                    f.write(final_content.encode("utf-8"))
                    f.flush()
                    os.fsync(f.fileno())

                # 최종 저장된 파일 내용 확인
                logger.info("Saved output file contents:")
                with open(output_file, "r") as f:
                    logger.info(f.read())

                # 임시 파일 정리
                for temp_file in [uc_file, temp_output, final_output]:
                    if os.path.exists(temp_file):
                        os.remove(temp_file)

                # UCLUST 결과 파일 백업
                uclust_backup = os.path.join(RESULTS_DIR, f"{file_name}_uclust_backup.fasta")
                shutil.copy2(output_file, uclust_backup)

            except Exception as e:
                logger.error(f"Error in UCLUST processing: {str(e)}")
                raise

        # # bluebase.py는 각 방법의 결과가 모두 준비된 후에만 실행
        # if method == "uclust":  # UCLUST가 완료된 후에만 bluebase 실행
        #     mafft_output = os.path.join(RESULTS_DIR, f"{file_name}_mafft_result.fasta")
        #     if os.path.exists(mafft_output):
        #         # bluebase.py 실행
        #         bluebase_path = os.path.join(os.path.dirname(__file__), "bluebase.py")
        #         cmd4 = [
        #             "python",
        #             bluebase_path,
        #             "-i",
        #             input_file,
        #             "--uclust-output",
        #             output_file,
        #             "--mafft-output",
        #             mafft_output,
        #             "-v",
        #         ]
        #         logger.info(f"Running bluebase.py: {' '.join(cmd4)}")
        #         subprocess.run(cmd4, check=True)

        #         # bluebase 실행 후 UCLUST 결과 복원
        #         uclust_backup = os.path.join(RESULTS_DIR, f"{file_name}_uclust_backup.fasta")
        #         if os.path.exists(uclust_backup):
        #             shutil.copy2(uclust_backup, output_file)
        #             os.remove(uclust_backup)

        # 최종 결과 확인
        logger.info(f"Checking final result file contents:")
        with open(output_file, "r") as f:
            logger.info(f.read())

        return {"status": "completed", "result_file": output_file}

    except subprocess.CalledProcessError as e:
        logger.error(f"Process error: {str(e)}")
        return {"status": "failed", "error": f"Process error: {str(e)}"}
    except Exception as e:
        logger.error(f"Unexpected error: {str(e)}")
        return {"status": "failed", "error": str(e)}


# Celery 설정
celery.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
)
