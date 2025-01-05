from celery import Celery
import subprocess
import os

# 디렉토리 경로 설정
RESULTS_DIR = os.path.join(os.path.dirname(__file__), "results")
UPLOAD_DIR = os.path.join(os.path.dirname(__file__), "uploads")

# Celery 앱 생성
celery = Celery('celery_worker',
                broker='redis://redis:6379/0',
                backend='redis://redis:6379/0')

# task 데코레이터의 이름을 celery_worker.align_sequences로 변경
@celery.task(name='celery_worker.align_sequences')
def align_sequences(file_path: str, method: str):
    try:
        # 결과 디렉토리 생성
        os.makedirs(RESULTS_DIR, exist_ok=True)
        
        # 입력 파일 경로를 절대 경로로 변환
        input_file = os.path.join(UPLOAD_DIR, os.path.basename(file_path))
        file_name = os.path.basename(file_path).split('.')[0]
        output_file = os.path.join(RESULTS_DIR, f"{file_name}_{method}_result.fasta")
        
        if method == "mafft":
            result = subprocess.run(['mafft', '--retree', '2', '--thread', '2', input_file], 
                                    capture_output=True, 
                                    text=True)
            with open(output_file, 'w') as f:
                f.write(result.stdout)
            
        elif method == "uclust":
            subprocess.run(['vsearch', '--cluster_fast', input_file, 
                          '--id', '0.97', '--centroids', output_file], 
                          check=True)
        
        # bluebase.py 실행 방식 수정
        bluebase_path = os.path.join(os.path.dirname(__file__), 'bluebase.py')
        subprocess.run([
            'python',
            bluebase_path,
            '-i', input_file,
            '--uclust-output', os.path.join(RESULTS_DIR, f"{file_name}_uclust_result.fasta"),
            '--mafft-output', os.path.join(RESULTS_DIR, f"{file_name}_mafft_result.fasta"),
            '-v'
        ], check=True)
        
        return {"status": "completed", "result_file": output_file}
    except subprocess.CalledProcessError as e:
        return {"status": "failed", "error": f"Process error: {str(e)}"}
    except Exception as e:
        return {"status": "failed", "error": str(e)}

# Celery 설정
celery.conf.update(
    task_serializer='json',
    accept_content=['json'],
    result_serializer='json',
    timezone='UTC',
    enable_utc=True,
) 