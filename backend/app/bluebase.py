import argparse

def parse_arguments():
    parser = argparse.ArgumentParser(
        description='Process sequence files with UCLUST and MAFFT alignments'
    )
    
    # 필수 인자
    parser.add_argument(
        '-i', '--input',
        required=True,
        help='Input sequence file path'
    )
    
    # 출력 파일 인자들
    parser.add_argument(
        '--uclust-output',
        required=True,
        help='Path for UCLUST result file'
    )
    parser.add_argument(
        '--mafft-output',
        required=True,
        help='Path for MAFFT result file'
    )
    
    # 선택적 인자
    parser.add_argument(
        '-v', '--verbose',
        action='store_true',
        help='Increase output verbosity'
    )
    
    return parser.parse_args()

def main():
    args = parse_arguments()
    
    if args.verbose:
        print(f"Input file: {args.input}")
        print(f"UCLUST output will be saved to: {args.uclust_output}")
        print(f"MAFFT output will be saved to: {args.mafft_output}")
    
    
    
if __name__ == "__main__":
    main()
    