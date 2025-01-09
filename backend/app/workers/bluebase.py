import os
from Bio import SeqIO
from collections import Counter


Nucleotide_common = ["A", "T", "G", "C"]
Nucleotide_IUPAC_code = {
    "A": "A",
    "G": "G",
    "C": "C",
    "T": "T",
    "CT": "Y",
    "AG": "R",
    "AT": "W",
    "GT": "K",
    "CG": "S",
    "AC": "M",
    "AGT": "D",
    "ACG": "V",
    "ACT": "H",
    "CGT": "B",
    "": "None",
    "ACGT": "X",
}
DEG_list = ["Y", "R", "W", "K", "S", "M", "N", "D", "V", "H", "B", "-", "."]


def align_to_statistics(input_file):
    """Get gap statistics and blue base log

    Args:
        input_file (str): alignment file

    Returns:
        values (list):
        gap_stat_header (list): header of gap statistics and blue base log
        gap_stat_result (list): gap statistics and blue base count
        pctid_cutoff (list): list of percentage range
        blue_base_count (dict): blue base count per percentage range in dictionary

    """
    global bp_color
    bp_color = dict()
    fasta_list = list()
    miss_front_list = list()  # miss(not Gap; front or end base
    miss_end_list = list()
    gap_seq_count = 0
    gap_count = 0
    gap_sumlength = 0

    for record in SeqIO.parse(input_file, "fasta"):
        fasta_list.append(str(record.seq).replace(".", "-").upper())  # append fasta sequence
        seq = str(record.seq).replace(".", "-").upper()  # sequence for miss base count

        miss_front = 0
        miss_front_seq = ""
        miss_continue = "F"
        base_start = 0

        for i in range(len(seq)):  # front -> end read
            if seq[i] != "-":
                if base_start == 0:
                    base_start = i
            if miss_continue == "T":
                miss_front_seq = miss_front_seq + "|"
            elif i == 0 and seq[i] == "-":
                miss_front += 1
                miss_front_seq = miss_front_seq + "*"
            elif i == 0 and seq[i] != "-":
                miss_front_seq = miss_front_seq + "|"
                miss_continue = "T"
            elif i != 0 and seq[i] != "-":
                miss_continue = "T"
                miss_front_seq = miss_front_seq + "|"
            elif miss_front != 0 and seq[i] == "-":
                miss_front += 1
                miss_front_seq = miss_front_seq + "*"
        miss_front_list.append(miss_front_seq)

        miss_end = 0
        miss_end_seq = ""
        miss_continue = "F"
        base_end = 0

        for i in reversed(range(len(seq))):  # end -> front read
            if seq[i] != "-":
                if base_end == 0:
                    base_end = i
            if miss_continue == "T":
                miss_end_seq = "|" + miss_end_seq
            elif i == len(seq) - 1 and seq[i] == "-":
                miss_end += 1
                miss_end_seq = "*" + miss_end_seq
            elif i == len(seq) - 1 and seq[i] != "-":
                miss_end_seq = "|" + miss_end_seq
                miss_continue = "T"
            elif i != len(seq) - 1 and seq[i] != "-":
                miss_continue = "T"
                miss_end_seq = "|" + miss_end_seq
            elif miss_end != 0 and seq[i] == "-":
                miss_end += 1
                miss_end_seq = "*" + miss_end_seq
        miss_end_list.append(miss_end_seq)

        nomissgap_seq = seq[base_start : base_end + 1]
        if "-" in nomissgap_seq:
            gap_seq_count += 1

            flag = 0
            gap_starts = list()
            gap_ends = list()
            for n in range(len(nomissgap_seq)):
                if nomissgap_seq[n] == "-":
                    if flag == 0:
                        gap_starts.append(n)
                        flag = 1
                else:
                    if flag == 1:
                        gap_ends.append(n)
                        flag = 0
            gap_count += len(gap_starts)

            for g in range(len(gap_starts)):
                gap_start = gap_starts[g]
                gap_end = gap_ends[g]
                gap_length = gap_end - gap_start
                gap_sumlength += gap_length

    # gap statistics
    if gap_seq_count == 0:
        gap_freq = 0
        gap_avg_length = 0
    else:
        gap_freq = gap_count / float(gap_seq_count)
        gap_avg_length = gap_sumlength / float(gap_seq_count)

    list_length = len(fasta_list)  # Extract total fasta count
    sequence_length = len(fasta_list[0])  # Extract sequence length
    a_data = []
    t_data = []
    g_data = []
    c_data = []
    etc_data = []
    miss_data = []
    real_gap_data = []
    miss_gap_data = []
    total_data = []
    header_data = ["Position"]
    apcr_data = []
    a_freq_data = []
    t_freq_data = []
    g_freq_data = []
    c_freq_data = []
    iupac_data = []
    max_seq_data = []
    max_seq_count_data = []

    cnt = 1
    for i in range(0, sequence_length):
        data = []
        mdata = []  # base miss data
        not_gap_data = []
        header_data.append(str(cnt))
        for j in range(0, list_length):
            try:
                if fasta_list[j][i] in Nucleotide_common:
                    not_gap_data.append(fasta_list[j][i])
                if miss_front_list[j][i] == "*" and miss_end_list[j][i] == "|":
                    mdata.append("*")
                elif miss_front_list[j][i] == "|" and miss_end_list[j][i] == "|":
                    mdata.append("|")
                elif miss_front_list[j][i] == "|" and miss_end_list[j][i] == "*":
                    mdata.append("*")
                data.append(fasta_list[j][i])
            except Exception as e:
                logger.error(f"Error: {e}")
                data.append("-")
        a_count = data.count("A")
        t_count = data.count("T")
        g_count = data.count("G")
        c_count = data.count("C")
        y_count = data.count("Y")
        r_count = data.count("R")
        w_count = data.count("W")
        s_count = data.count("S")
        k_count = data.count("K")
        m_count = data.count("M")
        d_count = data.count("D")
        v_count = data.count("V")
        h_count = data.count("H")
        b_count = data.count("B")
        ambi_count = data.count("N")
        miss_count = mdata.count("*")

        if len(not_gap_data) != 0:
            max_nucleotide, num_max_nucleotide = Counter(not_gap_data).most_common(1)[0]
        else:
            max_nucleotide = "-"
            num_max_nucleotide = 0

        etc_count = (
            y_count
            + r_count
            + w_count
            + s_count
            + k_count
            + m_count
            + d_count
            + v_count
            + h_count
            + b_count
            + ambi_count
        )
        miss_gap_count = data.count("-") + data.count(".")
        real_gap_count = miss_gap_count - miss_count
        sequence_count = a_count + t_count + g_count + c_count  # + etc_count
        total_count = a_count + t_count + g_count + c_count + etc_count + miss_gap_count
        apcr_count = (sequence_count / (total_count * 1.0)) * 100

        delete_duplicate = list(set(data))
        delete_duplicate.sort()
        temp = "".join(delete_duplicate)

        for deg_item in DEG_list:
            temp = temp.replace(deg_item, "")

        a_freq = round((float(a_count) / total_count) * 100)
        t_freq = round((float(t_count) / total_count) * 100)
        g_freq = round((float(g_count) / total_count) * 100)
        c_freq = round((float(c_count) / total_count) * 100)

        iupac_bases = Nucleotide_IUPAC_code[temp]
        a_data.append(str(a_count))
        t_data.append(str(t_count))
        g_data.append(str(g_count))
        c_data.append(str(c_count))
        etc_data.append(str(etc_count))
        miss_data.append(str(miss_count))
        real_gap_data.append(str(real_gap_count))
        miss_gap_data.append(str(miss_gap_count))
        total_data.append(str(total_count))
        apcr_data.append(str(round(apcr_count)))
        a_freq_data.append(str(a_freq))
        t_freq_data.append(str(t_freq))
        g_freq_data.append(str(g_freq))
        c_freq_data.append(str(c_freq))
        iupac_data.append(iupac_bases)
        max_seq_data.append(max_nucleotide)
        max_seq_count_data.append(str(num_max_nucleotide))

        freq_max = max([a_freq, t_freq, g_freq, c_freq])
        bp_color[cnt] = [max_nucleotide, freq_max]
        cnt = cnt + 1

    # Blue base max.
    blue_base_count = dict()
    nomiss_base_count = 0
    noblue_base_count = 0
    pctid_cutoff = [90.0, 80.0, 70.0, 60.0, 50.0, 40.0]
    for seq in fasta_list:
        for j in range(len(seq)):
            if seq[j] != "-":
                nomiss_base_count += 1
            if seq[j] == bp_color[j + 1][0]:
                for c in range(len(pctid_cutoff)):
                    pctid = pctid_cutoff[c]
                    if c == 0:
                        if pctid + 10 >= bp_color[j + 1][1] >= pctid:
                            if pctid not in blue_base_count:
                                blue_base_count[pctid] = 0
                            blue_base_count[pctid] += 1
                    else:
                        if pctid + 10 > bp_color[j + 1][1] >= pctid:
                            if pctid not in blue_base_count:
                                blue_base_count[pctid] = 0
                            blue_base_count[pctid] += 1
                if bp_color[j + 1][1] < 40.0:
                    pctid = 40.0
                    if pctid not in blue_base_count:
                        blue_base_count[pctid] = 0
                    blue_base_count[pctid] += 1
            else:
                if seq[j] != "-":
                    noblue_base_count += 1
    blue_base_ratio = sum(blue_base_count.values()) / float(nomiss_base_count)

    gap_stat_header = [
        "Total seqs",
        "Gap seq. count",
        "Gap count",
        "Gap frequency",
        "Sum of gap length",
        "Gap length",
        "Sum of blue bases",
        "No blue bases",
        "No miss bases",
        "Blue base ratio",
    ]
    gap_stat_result = [
        len(fasta_list),
        gap_seq_count,
        gap_count,
        gap_freq,
        gap_sumlength,
        gap_avg_length,
        sum(blue_base_count.values()),
        noblue_base_count,
        nomiss_base_count,
        blue_base_ratio,
    ]

    # Stat
    header = "\t".join(header_data)

    value_names = (
        list(
            map(
                lambda x: "{} count".format(x),
                ["A", "T", "G", "C", "Miss", "Gap", "etc", "MissGap"],
            )
        )
        + list(map(lambda x: "{} freq".format(x), ["A", "T", "G", "C"]))
        + ["Total count", "Coverage", "IUPAC", "Major base", "Major base count"]
    )
    value_data_list = [
        a_data,
        t_data,
        g_data,
        c_data,
        miss_data,
        real_gap_data,
        etc_data,
        miss_gap_data,
        a_freq_data,
        t_freq_data,
        g_freq_data,
        c_freq_data,
        total_data,
        apcr_data,
        iupac_data,
        max_seq_data,
        max_seq_count_data,
    ]

    values = [header]
    for value_index in range(len(value_names)):
        value = "{}\t{}".format(value_names[value_index], "\t".join(value_data_list[value_index]))
        values.append(value)

    return values, gap_stat_header, gap_stat_result, pctid_cutoff, blue_base_count


def get_statistics(input_file, alignstat_file, gapstat_file):
    """Get base stasitsics log file and gap statistics and blue base log file

    Args:
        input_file (str): alignment file
        alignstat_file (str): base statistics log file
        gapstat_file (str): gap statistics and blue base log file

    Returns:
        max_position (int): maximum aligned length
        total_seqcount (int): total number of aligned seqs

    """
    (
        stat_values,
        gap_statheader,
        gap_stat_result,
        pct_id_cutoff,
        blue_base_count,
    ) = align_to_statistics(input_file)

    outopen = open(alignstat_file, "w")
    outopen.write("\n".join(stat_values) + "\n")
    outopen.close()
    total_seqcount = int(stat_values[13].split("\t")[1])

    outopen = open(gapstat_file, "w")
    for i in range(len(gap_statheader)):
        outopen.write(gap_statheader[i] + " :" + str(gap_stat_result[i]) + "\n")
    outopen.write("Blue bases:\n")
    for p in pct_id_cutoff:
        if p in blue_base_count:
            outopen.write(str(p) + " :" + str(blue_base_count[p]) + "\n")
        else:
            outopen.write(str(p) + " :0\n")
    outopen.close()

    return total_seqcount


class BlueBase:
    def __init__(self, input_file, output_prefix):
        self.input_file = input_file
        self.output_prefix = output_prefix
        self.max_seqs_excel = 30000

    def align_to_statistics(input_file):
        """Get gap statistics and blue base log

        Args:
            input_file (str): alignment file

        Returns:
            values (list):
            gap_stat_header (list): header of gap statistics and blue base log
            gap_stat_result (list): gap statistics and blue base count
            pctid_cutoff (list): list of percentage range
            blue_base_count (dict): blue base count per percentage range in dictionary

        """
        global bp_color
        bp_color = dict()
        fasta_list = list()
        miss_front_list = list()  # miss(not Gap; front or end base
        miss_end_list = list()
        gap_seq_count = 0
        gap_count = 0
        gap_sumlength = 0

        for record in SeqIO.parse(input_file, "fasta"):
            fasta_list.append(str(record.seq).replace(".", "-").upper())  # append fasta sequence
            seq = str(record.seq).replace(".", "-").upper()  # sequence for miss base count

            miss_front = 0
            miss_front_seq = ""
            miss_continue = "F"
            base_start = 0

            for i in range(len(seq)):  # front -> end read
                if seq[i] != "-":
                    if base_start == 0:
                        base_start = i
                if miss_continue == "T":
                    miss_front_seq = miss_front_seq + "|"
                elif i == 0 and seq[i] == "-":
                    miss_front += 1
                    miss_front_seq = miss_front_seq + "*"
                elif i == 0 and seq[i] != "-":
                    miss_front_seq = miss_front_seq + "|"
                    miss_continue = "T"
                elif i != 0 and seq[i] != "-":
                    miss_continue = "T"
                    miss_front_seq = miss_front_seq + "|"
                elif miss_front != 0 and seq[i] == "-":
                    miss_front += 1
                    miss_front_seq = miss_front_seq + "*"
            miss_front_list.append(miss_front_seq)

            miss_end = 0
            miss_end_seq = ""
            miss_continue = "F"
            base_end = 0

            for i in reversed(range(len(seq))):  # end -> front read
                if seq[i] != "-":
                    if base_end == 0:
                        base_end = i
                if miss_continue == "T":
                    miss_end_seq = "|" + miss_end_seq
                elif i == len(seq) - 1 and seq[i] == "-":
                    miss_end += 1
                    miss_end_seq = "*" + miss_end_seq
                elif i == len(seq) - 1 and seq[i] != "-":
                    miss_end_seq = "|" + miss_end_seq
                    miss_continue = "T"
                elif i != len(seq) - 1 and seq[i] != "-":
                    miss_continue = "T"
                    miss_end_seq = "|" + miss_end_seq
                elif miss_end != 0 and seq[i] == "-":
                    miss_end += 1
                    miss_end_seq = "*" + miss_end_seq
            miss_end_list.append(miss_end_seq)

            nomissgap_seq = seq[base_start : base_end + 1]
            if "-" in nomissgap_seq:
                gap_seq_count += 1

                flag = 0
                gap_starts = list()
                gap_ends = list()
                for n in range(len(nomissgap_seq)):
                    if nomissgap_seq[n] == "-":
                        if flag == 0:
                            gap_starts.append(n)
                            flag = 1
                    else:
                        if flag == 1:
                            gap_ends.append(n)
                            flag = 0
                gap_count += len(gap_starts)

                for g in range(len(gap_starts)):
                    gap_start = gap_starts[g]
                    gap_end = gap_ends[g]
                    gap_length = gap_end - gap_start
                    gap_sumlength += gap_length

        # gap statistics
        if gap_seq_count == 0:
            gap_freq = 0
            gap_avg_length = 0
        else:
            gap_freq = gap_count / float(gap_seq_count)
            gap_avg_length = gap_sumlength / float(gap_seq_count)

        list_length = len(fasta_list)  # Extract total fasta count
        sequence_length = len(fasta_list[0])  # Extract sequence length
        a_data = []
        t_data = []
        g_data = []
        c_data = []
        etc_data = []
        miss_data = []
        real_gap_data = []
        miss_gap_data = []
        total_data = []
        header_data = ["Position"]
        apcr_data = []
        a_freq_data = []
        t_freq_data = []
        g_freq_data = []
        c_freq_data = []
        iupac_data = []
        max_seq_data = []
        max_seq_count_data = []

        cnt = 1
        for i in range(0, sequence_length):
            data = []
            mdata = []  # base miss data
            not_gap_data = []
            header_data.append(str(cnt))
            for j in range(0, list_length):
                try:
                    if fasta_list[j][i] in Nucleotide_common:
                        not_gap_data.append(fasta_list[j][i])
                    if miss_front_list[j][i] == "*" and miss_end_list[j][i] == "|":
                        mdata.append("*")
                    elif miss_front_list[j][i] == "|" and miss_end_list[j][i] == "|":
                        mdata.append("|")
                    elif miss_front_list[j][i] == "|" and miss_end_list[j][i] == "*":
                        mdata.append("*")
                    data.append(fasta_list[j][i])
                except Exception as e:
                    logger.error(f"Error: {e}")
                    data.append("-")
            a_count = data.count("A")
            t_count = data.count("T")
            g_count = data.count("G")
            c_count = data.count("C")
            y_count = data.count("Y")
            r_count = data.count("R")
            w_count = data.count("W")
            s_count = data.count("S")
            k_count = data.count("K")
            m_count = data.count("M")
            d_count = data.count("D")
            v_count = data.count("V")
            h_count = data.count("H")
            b_count = data.count("B")
            ambi_count = data.count("N")
            miss_count = mdata.count("*")

            if len(not_gap_data) != 0:
                max_nucleotide, num_max_nucleotide = Counter(not_gap_data).most_common(1)[0]
            else:
                max_nucleotide = "-"
                num_max_nucleotide = 0

            etc_count = (
                y_count
                + r_count
                + w_count
                + s_count
                + k_count
                + m_count
                + d_count
                + v_count
                + h_count
                + b_count
                + ambi_count
            )
            miss_gap_count = data.count("-") + data.count(".")
            real_gap_count = miss_gap_count - miss_count
            sequence_count = a_count + t_count + g_count + c_count  # + etc_count
            total_count = a_count + t_count + g_count + c_count + etc_count + miss_gap_count
            apcr_count = (sequence_count / (total_count * 1.0)) * 100

            delete_duplicate = list(set(data))
            delete_duplicate.sort()
            temp = "".join(delete_duplicate)

            for deg_item in DEG_list:
                temp = temp.replace(deg_item, "")

            a_freq = round((float(a_count) / total_count) * 100)
            t_freq = round((float(t_count) / total_count) * 100)
            g_freq = round((float(g_count) / total_count) * 100)
            c_freq = round((float(c_count) / total_count) * 100)

            iupac_bases = Nucleotide_IUPAC_code[temp]
            a_data.append(str(a_count))
            t_data.append(str(t_count))
            g_data.append(str(g_count))
            c_data.append(str(c_count))
            etc_data.append(str(etc_count))
            miss_data.append(str(miss_count))
            real_gap_data.append(str(real_gap_count))
            miss_gap_data.append(str(miss_gap_count))
            total_data.append(str(total_count))
            apcr_data.append(str(round(apcr_count)))
            a_freq_data.append(str(a_freq))
            t_freq_data.append(str(t_freq))
            g_freq_data.append(str(g_freq))
            c_freq_data.append(str(c_freq))
            iupac_data.append(iupac_bases)
            max_seq_data.append(max_nucleotide)
            max_seq_count_data.append(str(num_max_nucleotide))

            freq_max = max([a_freq, t_freq, g_freq, c_freq])
            bp_color[cnt] = [max_nucleotide, freq_max]
            cnt = cnt + 1

        # Blue base max.
        blue_base_count = dict()
        nomiss_base_count = 0
        noblue_base_count = 0
        pctid_cutoff = [90.0, 80.0, 70.0, 60.0, 50.0, 40.0]
        for seq in fasta_list:
            for j in range(len(seq)):
                if seq[j] != "-":
                    nomiss_base_count += 1
                if seq[j] == bp_color[j + 1][0]:
                    for c in range(len(pctid_cutoff)):
                        pctid = pctid_cutoff[c]
                        if c == 0:
                            if pctid + 10 >= bp_color[j + 1][1] >= pctid:
                                if pctid not in blue_base_count:
                                    blue_base_count[pctid] = 0
                                blue_base_count[pctid] += 1
                        else:
                            if pctid + 10 > bp_color[j + 1][1] >= pctid:
                                if pctid not in blue_base_count:
                                    blue_base_count[pctid] = 0
                                blue_base_count[pctid] += 1
                    if bp_color[j + 1][1] < 40.0:
                        pctid = 40.0
                        if pctid not in blue_base_count:
                            blue_base_count[pctid] = 0
                        blue_base_count[pctid] += 1
                else:
                    if seq[j] != "-":
                        noblue_base_count += 1
        blue_base_ratio = sum(blue_base_count.values()) / float(nomiss_base_count)

        gap_stat_header = [
            "Total seqs",
            "Gap seq. count",
            "Gap count",
            "Gap frequency",
            "Sum of gap length",
            "Gap length",
            "Sum of blue bases",
            "No blue bases",
            "No miss bases",
            "Blue base ratio",
        ]
        gap_stat_result = [
            len(fasta_list),
            gap_seq_count,
            gap_count,
            gap_freq,
            gap_sumlength,
            gap_avg_length,
            sum(blue_base_count.values()),
            noblue_base_count,
            nomiss_base_count,
            blue_base_ratio,
        ]

        # Stat
        header = "\t".join(header_data)

        value_names = (
            list(
                map(
                    lambda x: "{} count".format(x),
                    ["A", "T", "G", "C", "Miss", "Gap", "etc", "MissGap"],
                )
            )
            + list(map(lambda x: "{} freq".format(x), ["A", "T", "G", "C"]))
            + ["Total count", "Coverage", "IUPAC", "Major base", "Major base count"]
        )
        value_data_list = [
            a_data,
            t_data,
            g_data,
            c_data,
            miss_data,
            real_gap_data,
            etc_data,
            miss_gap_data,
            a_freq_data,
            t_freq_data,
            g_freq_data,
            c_freq_data,
            total_data,
            apcr_data,
            iupac_data,
            max_seq_data,
            max_seq_count_data,
        ]

        values = [header]
        for value_index in range(len(value_names)):
            value = "{}\t{}".format(value_names[value_index], "\t".join(value_data_list[value_index]))
            values.append(value)

        return values, gap_stat_header, gap_stat_result, pctid_cutoff, blue_base_count

    def main(self):
        if os.path.exists(self.input_file):
            gap_stat_outputfile = self.output_prefix + "_gapStat.log"
            align_stat_outputfile = self.output_prefix + ".txt"
            total_count = get_statistics(self.input_file, align_stat_outputfile, gap_stat_outputfile)

            return align_stat_outputfile, gap_stat_outputfile
        else:
            raise FileNotFoundError(f"File not found: {self.input_file}")
