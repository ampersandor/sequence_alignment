DROP TABLE IF EXISTS align_job;
DROP TABLE IF EXISTS file_record;

CREATE TABLE IF NOT EXISTS file_record (
    id BIGINT NOT NULL AUTO_INCREMENT,
    filename VARCHAR(255),
    unique_filename VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    file_type VARCHAR(10) NOT NULL DEFAULT 'INPUT' CHECK (file_type IN ('INPUT', 'OUTPUT')),
    size BIGINT,
    PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS align_job (
    id BIGINT NOT NULL AUTO_INCREMENT,
    user_id BIGINT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    align_tool VARCHAR(20) NOT NULL CHECK (align_tool IN ('mafft', 'uclust', 'vsearch')),
    options TEXT,
    input_file_record_id BIGINT,
    input_file_path VARCHAR(255),
    task_id VARCHAR(100) UNIQUE,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'SUCCESS', 'ERROR')),
    output_file_record_id BIGINT,
    error_message TEXT,
    PRIMARY KEY (id),
    CONSTRAINT fk_align_job_input_file 
        FOREIGN KEY (input_file_record_id) REFERENCES file_record(id),
    CONSTRAINT fk_align_job_output_file 
        FOREIGN KEY (output_file_record_id) REFERENCES file_record(id)
);