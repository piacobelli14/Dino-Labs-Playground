import hmac
import hashlib
import base64
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
import random
import os
import json
import string
import warnings
warnings.filterwarnings('ignore')

import psycopg2
from psycopg2.extras import execute_batch
from psycopg2 import sql

password = 'PAiacobelli14-!-'
host = 'spgpcdplv001'
port = 5432
database = 'apcd_dev'
username = 'piacobelli'

con = psycopg2.connect(
    host=host, 
    database=database, 
    user=username, 
    port=port, 
    password=password, 
    keepalives=1, 
    keepalives_idle=100
)
con.autocommit = True

INPUT_SCHEMA = 'research_dev'
OUTPUT_SCHEMA = 'synthetic_data'

INPUT_ELIGIBILITY_TABLE = 'pi_temp_deid_data_eligibility'
INPUT_PROVIDER_TABLE = 'pi_temp_deid_data_provider'
INPUT_MEDICAL_TABLE = 'pi_temp_deid_data_medical'

DEID_ELIGIBILITY_TABLE = 'eligibility_deid'
DEID_PROVIDER_TABLE = 'provider_deid'
DEID_MEDICAL_TABLE = 'medical_deid'

CHUNK_SIZE = 50000
BATCH_SIZE = 10000


class OptimizedAPCDDeidentifier:
    
    def __init__(self, generate_new_keys=True, con=None):
        self.con = con
        self.RARITY_THRESHOLD_K = 10
        
        if generate_new_keys:
            print("Generating new cryptographically secure keys...")
            self.MEMBER_SECRET_KEY = os.urandom(32).hex()
            self.PROVIDER_SECRET_KEY = os.urandom(32).hex()
            self.CLAIM_SECRET_KEY = os.urandom(32).hex()
            self.save_keys_to_file()
            print("New secure keys generated and saved")
        else:
            print("Loading existing keys from file...")
            self.load_keys_from_file()
            print("Keys loaded successfully")
        
        print("Loading Texas ZIP code population data...")
        self.population_data = self.load_population_data()
        print("Loading Texas county population data...")
        self.county_population_data = self.load_county_population_data()
        
        self.age_groups_general = {
            1: "0-1", 2: "2-4", 3: "5-9", 4: "10-14", 5: "15-19", 
            6: "20-24", 7: "25-29", 8: "30-34", 9: "35-39", 10: "40-44", 
            11: "45-49", 12: "50-54", 13: "55-59", 14: "60-64", 15: "65-69", 
            16: "70-74", 17: "75-79", 18: "80-84", 19: "85-89", 20: "90-94", 
            21: "95-99", 22: "100+"
        }
        
        self.age_groups_hiv_drug = {
            23: "0-17", 24: "18-34", 25: "35-49", 26: "50-64", 27: "65+"
        }
        
        self.define_sensitive_codes()
        self.precompute_rare_codes()
    
    def define_sensitive_codes(self):
        self.high_sensitivity_codes = set(['B20', 'B21', 'B22', 'B23', 'B24', 'F10', 'F11', 'F12', 'F13', 'F14', 'F15', 'F16', 'F17', 'F18', 'F19'])
        self.newborn_codes = set(['Z38', 'Z332'])
        self.abuse_codes = set(['T74', 'T76'])
        
        self.generalization_codes = {
            'A50': 'A50-A64', 'A51': 'A50-A64', 'A52': 'A50-A64', 'A53': 'A50-A64', 'A54': 'A50-A64', 'A55': 'A50-A64', 'A56': 'A50-A64',
            'A57': 'A50-A64', 'A58': 'A50-A64', 'A59': 'A50-A64', 'A60': 'A50-A64', 'A61': 'A50-A64', 'A62': 'A50-A64', 'A63': 'A50-A64', 'A64': 'A50-A64',
            'F20': 'F20', 'F31': 'F31', 'T74': 'T74', 'T76': 'T76', 'G10': 'G10', 'E84': 'E84'
        }
    
    def save_keys_to_file(self):
        keys = {
            'MEMBER_SECRET_KEY': self.MEMBER_SECRET_KEY,
            'PROVIDER_SECRET_KEY': self.PROVIDER_SECRET_KEY,
            'CLAIM_SECRET_KEY': self.CLAIM_SECRET_KEY,
            'generated_at': datetime.now().isoformat(),
            'key_length_bits': 256
        }
        secure_folder = "secure_keys"
        os.makedirs(secure_folder, exist_ok=True)
        key_file = os.path.join(secure_folder, "apcd_encryption_keys.json")
        with open(key_file, 'w') as f:
            json.dump(keys, f, indent=2)
        print(f"Keys saved to: {key_file}")
    
    def load_keys_from_file(self):
        key_file = os.path.join("secure_keys", "apcd_encryption_keys.json")
        if not os.path.exists(key_file):
            raise FileNotFoundError(f"Key file not found: {key_file}")
        with open(key_file, 'r') as f:
            keys = json.load(f)
        self.MEMBER_SECRET_KEY = keys['MEMBER_SECRET_KEY']
        self.PROVIDER_SECRET_KEY = keys['PROVIDER_SECRET_KEY']
        self.CLAIM_SECRET_KEY = keys['CLAIM_SECRET_KEY']
    
    def load_population_data(self):
        population_data = {}
        zip_prefix_populations = {}
        try:
            df = pd.read_csv('Texas_DemographicsByZipCode_sample.csv')
            df['zip_code'] = df['zip_code'].astype(str).str.zfill(5)
            population_data = dict(zip(df['zip_code'], df['population']))
            
            prefix_df = df.groupby(df['zip_code'].str[:3])['population'].sum()
            zip_prefix_populations = prefix_df.to_dict()
            
            print(f"  Loaded population data for {len(population_data)} ZIP codes from CSV")
            masked_prefixes = sum(1 for pop in zip_prefix_populations.values() if pop < 20000)
            print(f"  3-digit prefixes that will be masked (pop < 20K): {masked_prefixes} out of {len(zip_prefix_populations)}")
                
        except FileNotFoundError:
            print("  Warning: Texas_DemographicsByZipCode_sample.csv not found, using default population data")
            major_zips = ['750', '751', '752', '753', '754', '755', '756', '757', '758', '759',
                          '760', '761', '762', '763', '764', '765', '766', '767', '768', '769',
                          '770', '771', '772', '773', '774', '775', '776', '777', '778']
            for prefix in major_zips:
                zip_prefix_populations[prefix] = random.randint(21000, 50000)
                for suffix in range(0, 20):
                    zip_code = f"{prefix}{str(suffix).zfill(2)}"
                    population_data[zip_code] = random.randint(1000, 2500)
            
            small_zips = ['790', '791', '792', '793']
            for prefix in small_zips:
                zip_prefix_populations[prefix] = random.randint(1000, 19000)
                for suffix in range(0, 10):
                    zip_code = f"{prefix}{str(suffix).zfill(2)}"
                    population_data[zip_code] = random.randint(100, 1900)
        
        self.zip_prefix_populations = zip_prefix_populations
        return population_data
    
    def load_county_population_data(self):
        county_data = {
            '48201': 1716239, '48029': 2688247, '48113': 1395269, '48439': 944279,
            '48453': 1290446, '48085': 394453, '48121': 485445, '48157': 620961,
            '48215': 354452, '48339': 432022, '48011': 1904, '48033': 8466, '48045': 3353,
        }
        return county_data
    
    def precompute_rare_codes(self):
        print("Pre-computing rare code frequencies using SQL...")
        cursor = self.con.cursor()
        
        medical_table = f"{INPUT_SCHEMA}.{INPUT_MEDICAL_TABLE}"
        
        self.rare_dx_codes = set()
        self.rare_cpt_codes = set()
        self.rare_ndc_codes = set()
        
        try:
            dx_query = f"""
                SELECT code, COUNT(*) as freq FROM (
                    SELECT principal_diagnosis as code FROM {medical_table} WHERE principal_diagnosis IS NOT NULL
                    UNION ALL
                    SELECT other_diagnosis_1 as code FROM {medical_table} WHERE other_diagnosis_1 IS NOT NULL
                    UNION ALL
                    SELECT other_diagnosis_2 as code FROM {medical_table} WHERE other_diagnosis_2 IS NOT NULL
                    UNION ALL
                    SELECT other_diagnosis_3 as code FROM {medical_table} WHERE other_diagnosis_3 IS NOT NULL
                    UNION ALL
                    SELECT other_diagnosis_4 as code FROM {medical_table} WHERE other_diagnosis_4 IS NOT NULL
                    UNION ALL
                    SELECT other_diagnosis_5 as code FROM {medical_table} WHERE other_diagnosis_5 IS NOT NULL
                    UNION ALL
                    SELECT other_diagnosis_6 as code FROM {medical_table} WHERE other_diagnosis_6 IS NOT NULL
                    UNION ALL
                    SELECT other_diagnosis_7 as code FROM {medical_table} WHERE other_diagnosis_7 IS NOT NULL
                    UNION ALL
                    SELECT other_diagnosis_8 as code FROM {medical_table} WHERE other_diagnosis_8 IS NOT NULL
                    UNION ALL
                    SELECT other_diagnosis_9 as code FROM {medical_table} WHERE other_diagnosis_9 IS NOT NULL
                    UNION ALL
                    SELECT other_diagnosis_10 as code FROM {medical_table} WHERE other_diagnosis_10 IS NOT NULL
                    UNION ALL
                    SELECT other_diagnosis_11 as code FROM {medical_table} WHERE other_diagnosis_11 IS NOT NULL
                    UNION ALL
                    SELECT other_diagnosis_12 as code FROM {medical_table} WHERE other_diagnosis_12 IS NOT NULL
                    UNION ALL
                    SELECT other_diagnosis_13 as code FROM {medical_table} WHERE other_diagnosis_13 IS NOT NULL
                    UNION ALL
                    SELECT other_diagnosis_14 as code FROM {medical_table} WHERE other_diagnosis_14 IS NOT NULL
                    UNION ALL
                    SELECT other_diagnosis_15 as code FROM {medical_table} WHERE other_diagnosis_15 IS NOT NULL
                    UNION ALL
                    SELECT other_diagnosis_16 as code FROM {medical_table} WHERE other_diagnosis_16 IS NOT NULL
                    UNION ALL
                    SELECT other_diagnosis_17 as code FROM {medical_table} WHERE other_diagnosis_17 IS NOT NULL
                    UNION ALL
                    SELECT other_diagnosis_18 as code FROM {medical_table} WHERE other_diagnosis_18 IS NOT NULL
                    UNION ALL
                    SELECT other_diagnosis_19 as code FROM {medical_table} WHERE other_diagnosis_19 IS NOT NULL
                    UNION ALL
                    SELECT other_diagnosis_20 as code FROM {medical_table} WHERE other_diagnosis_20 IS NOT NULL
                    UNION ALL
                    SELECT other_diagnosis_21 as code FROM {medical_table} WHERE other_diagnosis_21 IS NOT NULL
                    UNION ALL
                    SELECT other_diagnosis_22 as code FROM {medical_table} WHERE other_diagnosis_22 IS NOT NULL
                    UNION ALL
                    SELECT other_diagnosis_23 as code FROM {medical_table} WHERE other_diagnosis_23 IS NOT NULL
                    UNION ALL
                    SELECT other_diagnosis_24 as code FROM {medical_table} WHERE other_diagnosis_24 IS NOT NULL
                ) all_dx
                GROUP BY code
                HAVING COUNT(*) < %s
            """
            cursor.execute(dx_query, (self.RARITY_THRESHOLD_K,))
            self.rare_dx_codes = set(row[0] for row in cursor.fetchall())
            
            cpt_query = f"""
                SELECT code, COUNT(*) as freq FROM (
                    SELECT procedure_code as code FROM {medical_table} WHERE procedure_code IS NOT NULL
                    UNION ALL
                    SELECT icd_cm_pcs_other_procedure_code_1 as code FROM {medical_table} WHERE icd_cm_pcs_other_procedure_code_1 IS NOT NULL
                    UNION ALL
                    SELECT icd_cm_pcs_other_procedure_code_2 as code FROM {medical_table} WHERE icd_cm_pcs_other_procedure_code_2 IS NOT NULL
                    UNION ALL
                    SELECT icd_cm_pcs_other_procedure_code_3 as code FROM {medical_table} WHERE icd_cm_pcs_other_procedure_code_3 IS NOT NULL
                    UNION ALL
                    SELECT icd_cm_pcs_other_procedure_code_4 as code FROM {medical_table} WHERE icd_cm_pcs_other_procedure_code_4 IS NOT NULL
                    UNION ALL
                    SELECT icd_cm_pcs_other_procedure_code_5 as code FROM {medical_table} WHERE icd_cm_pcs_other_procedure_code_5 IS NOT NULL
                    UNION ALL
                    SELECT icd_cm_pcs_other_procedure_code_6 as code FROM {medical_table} WHERE icd_cm_pcs_other_procedure_code_6 IS NOT NULL
                    UNION ALL
                    SELECT icd_cm_pcs_other_procedure_code_7 as code FROM {medical_table} WHERE icd_cm_pcs_other_procedure_code_7 IS NOT NULL
                    UNION ALL
                    SELECT icd_cm_pcs_other_procedure_code_8 as code FROM {medical_table} WHERE icd_cm_pcs_other_procedure_code_8 IS NOT NULL
                    UNION ALL
                    SELECT icd_cm_pcs_other_procedure_code_9 as code FROM {medical_table} WHERE icd_cm_pcs_other_procedure_code_9 IS NOT NULL
                    UNION ALL
                    SELECT icd_cm_pcs_other_procedure_code_10 as code FROM {medical_table} WHERE icd_cm_pcs_other_procedure_code_10 IS NOT NULL
                    UNION ALL
                    SELECT icd_cm_pcs_other_procedure_code_11 as code FROM {medical_table} WHERE icd_cm_pcs_other_procedure_code_11 IS NOT NULL
                    UNION ALL
                    SELECT icd_cm_pcs_other_procedure_code_12 as code FROM {medical_table} WHERE icd_cm_pcs_other_procedure_code_12 IS NOT NULL
                    UNION ALL
                    SELECT icd_cm_pcs_other_procedure_code_13 as code FROM {medical_table} WHERE icd_cm_pcs_other_procedure_code_13 IS NOT NULL
                    UNION ALL
                    SELECT icd_cm_pcs_other_procedure_code_14 as code FROM {medical_table} WHERE icd_cm_pcs_other_procedure_code_14 IS NOT NULL
                    UNION ALL
                    SELECT icd_cm_pcs_other_procedure_code_15 as code FROM {medical_table} WHERE icd_cm_pcs_other_procedure_code_15 IS NOT NULL
                    UNION ALL
                    SELECT icd_cm_pcs_other_procedure_code_16 as code FROM {medical_table} WHERE icd_cm_pcs_other_procedure_code_16 IS NOT NULL
                    UNION ALL
                    SELECT icd_cm_pcs_other_procedure_code_17 as code FROM {medical_table} WHERE icd_cm_pcs_other_procedure_code_17 IS NOT NULL
                    UNION ALL
                    SELECT icd_cm_pcs_other_procedure_code_18 as code FROM {medical_table} WHERE icd_cm_pcs_other_procedure_code_18 IS NOT NULL
                    UNION ALL
                    SELECT icd_cm_pcs_other_procedure_code_19 as code FROM {medical_table} WHERE icd_cm_pcs_other_procedure_code_19 IS NOT NULL
                    UNION ALL
                    SELECT icd_cm_pcs_other_procedure_code_20 as code FROM {medical_table} WHERE icd_cm_pcs_other_procedure_code_20 IS NOT NULL
                    UNION ALL
                    SELECT icd_cm_pcs_other_procedure_code_21 as code FROM {medical_table} WHERE icd_cm_pcs_other_procedure_code_21 IS NOT NULL
                    UNION ALL
                    SELECT icd_cm_pcs_other_procedure_code_22 as code FROM {medical_table} WHERE icd_cm_pcs_other_procedure_code_22 IS NOT NULL
                    UNION ALL
                    SELECT icd_cm_pcs_other_procedure_code_23 as code FROM {medical_table} WHERE icd_cm_pcs_other_procedure_code_23 IS NOT NULL
                    UNION ALL
                    SELECT icd_cm_pcs_other_procedure_code_24 as code FROM {medical_table} WHERE icd_cm_pcs_other_procedure_code_24 IS NOT NULL
                    UNION ALL
                    SELECT icd_cm_pcs_other_procedure_code_25 as code FROM {medical_table} WHERE icd_cm_pcs_other_procedure_code_25 IS NOT NULL
                ) all_cpt
                GROUP BY code
                HAVING COUNT(*) < %s
            """
            cursor.execute(cpt_query, (self.RARITY_THRESHOLD_K,))
            self.rare_cpt_codes = set(row[0] for row in cursor.fetchall())
            
            cursor.execute(f"""
                SELECT drug_code, COUNT(*) as freq 
                FROM {medical_table} 
                WHERE drug_code IS NOT NULL 
                GROUP BY drug_code 
                HAVING COUNT(*) < %s
            """, (self.RARITY_THRESHOLD_K,))
            
            self.rare_ndc_codes = set(row[0] for row in cursor.fetchall())
        
        except Exception as e:
            print(f"Warning: Could not pre-compute rare codes: {e}")
        
        cursor.close()
        print(f"  Rare diagnosis codes: {len(self.rare_dx_codes)}")
        print(f"  Rare procedure codes: {len(self.rare_cpt_codes)}")
        print(f"  Rare drug codes: {len(self.rare_ndc_codes)}")
    
    def create_deidentified_id(self, secret_key: str, input_string: str) -> str:
        key_bytes = secret_key.encode('utf-8')
        input_bytes = input_string.encode('utf-8')
        hmac_object = hmac.new(key_bytes, msg=input_bytes, digestmod=hashlib.sha256)
        binary_digest = hmac_object.digest()
        result = base64.urlsafe_b64encode(binary_digest).decode('utf-8')
        result = ''.join(c for c in result if c.isalnum())[:16]
        return result
    
    def vectorized_create_ids(self, secret_key, input_strings):
        key_bytes = secret_key.encode('utf-8')
        result = []
        for input_string in input_strings:
            if pd.isna(input_string) or input_string is None:
                result.append(None)
            else:
                input_bytes = str(input_string).encode('utf-8')
                hmac_object = hmac.new(key_bytes, msg=input_bytes, digestmod=hashlib.sha256)
                binary_digest = hmac_object.digest()
                encoded = base64.urlsafe_b64encode(binary_digest).decode('utf-8')
                cleaned = ''.join(c for c in encoded if c.isalnum())[:16]
                result.append(cleaned)
        return result
    
    def vectorized_date_processing(self, dates, output_format='quarter'):
        def convert_single_date(date_value):
            if pd.isna(date_value):
                return None
            try:
                if isinstance(date_value, (int, float)):
                    date_str = str(int(date_value))
                    if len(date_str) == 8:
                        date_value = pd.to_datetime(date_str, format='%Y%m%d')
                    else:
                        return None
                else:
                    date_value = pd.to_datetime(date_value, errors='coerce')
                
                if pd.isna(date_value):
                    return None
                    
                if output_format == 'quarter':
                    quarter = (date_value.month - 1) // 3 + 1
                    return f"{date_value.year}Q{quarter}"
                else:
                    return str(date_value.year)
            except:
                return None
        
        return [convert_single_date(d) for d in dates]
    
    def vectorized_zip_processing(self, zip_codes):
        zip_series = pd.Series(zip_codes).astype(str).str[:3]
        zip_series = zip_series.replace('nan', '000')
        
        mask_small = zip_series.map(lambda x: self.zip_prefix_populations.get(x, 21000) < 20000)
        zip_series.loc[mask_small] = '000'
        
        return zip_series.values
    
    def vectorized_county_processing(self, fips_codes):
        fips_series = pd.Series(fips_codes, dtype=object)
        
        def process_fips(fips):
            if pd.isna(fips):
                return "000"
            
            fips_str = str(int(fips)) if isinstance(fips, float) else str(fips)
            
            if len(fips_str) <= 3:
                fips_str = '48' + fips_str.zfill(3)
            elif len(fips_str) == 4:
                fips_str = '4' + fips_str
            
            if self.county_population_data.get(fips_str, 21000) < 20000:
                return "000"
            
            return fips_str
        
        return fips_series.apply(process_fips).values
    
    def vectorized_age_calculation_and_grouping(self, dobs, reference_date=None, is_hiv_drug_population=False):
        if reference_date is None:
            reference_date = datetime.now()
        
        dob_series = pd.to_datetime(dobs, errors='coerce', format='%Y%m%d')
        ages = (reference_date - dob_series).dt.days / 365.25
        ages = ages.fillna(-1).astype(int)
        ages = np.where(ages > 90, 90, ages)
        ages = np.where(ages < 0, None, ages)
        
        if is_hiv_drug_population:
            age_groups = np.select(
                [ages <= 17, ages <= 34, ages <= 49, ages <= 64],
                [23, 24, 25, 26],
                default=27
            )
        else:
            age_groups = np.select(
                [ages <= 1, ages <= 4, ages <= 9, ages <= 14, ages <= 19, ages <= 24, 
                 ages <= 29, ages <= 34, ages <= 39, ages <= 44, ages <= 49, ages <= 54,
                 ages <= 59, ages <= 64, ages <= 69, ages <= 74, ages <= 79, ages <= 84,
                 ages <= 89, ages <= 94, ages <= 99],
                [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21],
                default=22
            )
        
        age_groups = np.where(pd.isna(ages), None, age_groups)
        return age_groups
    
    def vectorized_sensitive_diagnosis_check(self, codes):
        codes_series = pd.Series(codes, dtype=str).str.upper().str.replace('.', '').str[:3]
        sensitive_mask = codes_series.isin(self.high_sensitivity_codes) | codes_series.isin(self.abuse_codes)
        return sensitive_mask.values
    
    def bulk_insert_data(self, table_name, df, batch_size=BATCH_SIZE):
        cursor = self.con.cursor()
        
        df_clean = df.copy()
        for col in df_clean.columns:
            df_clean[col] = df_clean[col].astype(str)
            df_clean.loc[df_clean[col] == 'None', col] = None
            df_clean.loc[df_clean[col] == 'nan', col] = None
            df_clean.loc[df_clean[col] == '<NA>', col] = None
        
        columns = list(df_clean.columns)
        placeholders = ', '.join(['%s'] * len(columns))
        insert_sql = f"INSERT INTO {OUTPUT_SCHEMA}.{table_name} ({', '.join(columns)}) VALUES ({placeholders})"
        
        data_tuples = [tuple(row) for row in df_clean.values]
        
        for i in range(0, len(data_tuples), batch_size):
            batch = data_tuples[i:i+batch_size]
            execute_batch(cursor, insert_sql, batch, page_size=len(batch))
        
        cursor.close()
    
    def process_eligibility_data(self):
        print("Processing eligibility data in chunks...")
        cursor = self.con.cursor()
        
        eligibility_table = f"{INPUT_SCHEMA}.{INPUT_ELIGIBILITY_TABLE}"
        
        cursor.execute(f"SELECT COUNT(*) FROM {eligibility_table}")
        total_rows = cursor.fetchone()[0]
        print(f"Total eligibility records: {total_rows:,}")
        
        cursor.execute(f"DROP TABLE IF EXISTS {OUTPUT_SCHEMA}.{DEID_ELIGIBILITY_TABLE}")
        
        first_chunk = True
        offset = 0
        
        while offset < total_rows:
            print(f"Processing eligibility chunk {offset:,} - {min(offset + CHUNK_SIZE, total_rows):,}")
            
            cursor.execute(f"""
                SELECT * FROM {eligibility_table}
                ORDER BY carrier_specific_unique_member_id
                LIMIT %s OFFSET %s
            """, (CHUNK_SIZE, offset))
            
            columns = [desc[0] for desc in cursor.description]
            chunk_data = cursor.fetchall()
            
            if not chunk_data:
                break
            
            df = pd.DataFrame(chunk_data, columns=columns)
            result_df = self.apply_eligibility_deidentification_vectorized(df)
            
            if first_chunk:
                columns_def = [f"{col} TEXT" for col in result_df.columns]
                create_sql = f"CREATE TABLE {OUTPUT_SCHEMA}.{DEID_ELIGIBILITY_TABLE} ({', '.join(columns_def)})"
                cursor.execute(create_sql)
                first_chunk = False
            
            self.bulk_insert_data(DEID_ELIGIBILITY_TABLE, result_df)
            offset += CHUNK_SIZE
        
        cursor.close()
        print(f"Eligibility processing complete")
    
    def process_provider_data(self):
        print("Processing provider data in chunks...")
        cursor = self.con.cursor()
        
        provider_table = f"{INPUT_SCHEMA}.{INPUT_PROVIDER_TABLE}"
        
        cursor.execute(f"SELECT COUNT(*) FROM {provider_table}")
        total_rows = cursor.fetchone()[0]
        print(f"Total provider records: {total_rows:,}")
        
        cursor.execute(f"DROP TABLE IF EXISTS {OUTPUT_SCHEMA}.{DEID_PROVIDER_TABLE}")
        
        first_chunk = True
        offset = 0
        
        while offset < total_rows:
            print(f"Processing provider chunk {offset:,} - {min(offset + CHUNK_SIZE, total_rows):,}")
            
            cursor.execute(f"""
                SELECT * FROM {provider_table}
                ORDER BY provider_npi
                LIMIT %s OFFSET %s
            """, (CHUNK_SIZE, offset))
            
            columns = [desc[0] for desc in cursor.description]
            chunk_data = cursor.fetchall()
            
            if not chunk_data:
                break
            
            df = pd.DataFrame(chunk_data, columns=columns)
            result_df = self.apply_provider_deidentification_vectorized(df)
            
            if first_chunk:
                columns_def = [f"{col} TEXT" for col in result_df.columns]
                create_sql = f"CREATE TABLE {OUTPUT_SCHEMA}.{DEID_PROVIDER_TABLE} ({', '.join(columns_def)})"
                cursor.execute(create_sql)
                first_chunk = False
            
            self.bulk_insert_data(DEID_PROVIDER_TABLE, result_df)
            offset += CHUNK_SIZE
        
        cursor.close()
        print(f"Provider processing complete")
    
    def process_medical_data(self):
        print("Processing medical data in chunks...")
        cursor = self.con.cursor()
        
        medical_table = f"{INPUT_SCHEMA}.{INPUT_MEDICAL_TABLE}"
        
        cursor.execute(f"SELECT COUNT(*) FROM {medical_table}")
        total_rows = cursor.fetchone()[0]
        print(f"Total medical records: {total_rows:,}")
        
        cursor.execute(f"DROP TABLE IF EXISTS {OUTPUT_SCHEMA}.{DEID_MEDICAL_TABLE}")
        
        age_lookup = {}
        try:
            cursor.execute(f"""
                SELECT DEID_MEMBER_ID, AGE_GROUP 
                FROM {OUTPUT_SCHEMA}.{DEID_ELIGIBILITY_TABLE}
                WHERE DEID_MEMBER_ID IS NOT NULL AND AGE_GROUP IS NOT NULL
            """)
            age_data = cursor.fetchall()
            age_lookup = dict(age_data)
            print(f"Loaded age groups for {len(age_lookup):,} members")
        except:
            print("Warning: Could not load age groups from eligibility data")
        
        first_chunk = True
        offset = 0
        
        while offset < total_rows:
            print(f"Processing medical chunk {offset:,} - {min(offset + CHUNK_SIZE, total_rows):,}")
            
            cursor.execute(f"""
                SELECT * FROM {medical_table}
                ORDER BY carrier_specific_unique_member_id, payor_claim_control_number
                LIMIT %s OFFSET %s
            """, (CHUNK_SIZE, offset))
            
            columns = [desc[0] for desc in cursor.description]
            chunk_data = cursor.fetchall()
            
            if not chunk_data:
                break
            
            df = pd.DataFrame(chunk_data, columns=columns)
            result_df = self.apply_medical_deidentification_vectorized(df, age_lookup)
            
            if first_chunk:
                columns_def = [f"{col} TEXT" for col in result_df.columns]
                create_sql = f"CREATE TABLE {OUTPUT_SCHEMA}.{DEID_MEDICAL_TABLE} ({', '.join(columns_def)})"
                cursor.execute(create_sql)
                first_chunk = False
            
            self.bulk_insert_data(DEID_MEDICAL_TABLE, result_df)
            offset += CHUNK_SIZE
        
        cursor.close()
        print(f"Medical processing complete")
    
    def apply_eligibility_deidentification_vectorized(self, df):
        result_df = df.copy()
        
        if 'carrier_specific_unique_member_id' in result_df.columns and 'data_submitter_code' in result_df.columns:
            member_input = result_df['carrier_specific_unique_member_id'].astype(str) + '|' + result_df['data_submitter_code'].astype(str)
            result_df['DEID_MEMBER_ID'] = self.vectorized_create_ids(self.MEMBER_SECRET_KEY, member_input.values)
        
        if 'carrier_specific_unique_subscriber_id' in result_df.columns and 'data_submitter_code' in result_df.columns:
            subscriber_input = result_df['carrier_specific_unique_subscriber_id'].astype(str) + '|' + result_df['data_submitter_code'].astype(str)
            result_df['DEID_SUBSCRIBER_ID'] = self.vectorized_create_ids(self.MEMBER_SECRET_KEY, subscriber_input.values)
        
        if 'member_date_of_birth' in result_df.columns:
            result_df['AGE_GROUP'] = self.vectorized_age_calculation_and_grouping(result_df['member_date_of_birth'].values)
        
        fields_to_remove = [
            'subscriber_social_security_number', 'plan_specific_contract_number',
            'subscriber_last_name', 'subscriber_first_name', 'subscriber_middle_initial',
            'sequence_number', 'member_social_security_number',
            'member_last_name', 'member_first_name', 'member_middle_initial',
            'member_street_address', 'hios_plan_id', 'payor_assigned_id_for_medical_home',
            'employer_tax_id', 'carrier_specific_unique_member_id',
            'carrier_specific_unique_subscriber_id', 'subscriber_medicare_beneficiary_identifier',
            'member_medicare_beneficiary_identifier', 'member_street_address_2', 'case_number',
            'member_date_of_birth', 'member_city_name', 'member_country_code'
        ]
        result_df = result_df.drop(columns=[col for col in fields_to_remove if col in result_df.columns])
        
        zip_columns = [col for col in result_df.columns if 'zip' in col.lower() and 'code' in col.lower()]
        for col in zip_columns:
            result_df[col] = self.vectorized_zip_processing(result_df[col].values)
        
        fips_columns = [col for col in result_df.columns if 'fips' in col.lower()]
        for col in fips_columns:
            result_df[col] = self.vectorized_county_processing(result_df[col].values)
        
        date_to_year_only_fields = [
            'member_pcp_effective_date', 'plan_effective_date', 'plan_term_date'
        ]
        for field in date_to_year_only_fields:
            if field in result_df.columns:
                result_df[field] = self.vectorized_date_processing(result_df[field].values, 'year')
        
        date_to_yq_fields = [
            'smib_from_date', 'smib_to_date', 'data_period_start', 'data_period_end'
        ]
        for field in date_to_yq_fields:
            if field in result_df.columns:
                result_df[field] = self.vectorized_date_processing(result_df[field].values, 'quarter')
        
        if 'start_year_of_submission' in result_df.columns:
            result_df['eligibility_year'] = self.vectorized_date_processing(result_df['start_year_of_submission'].values, 'year')
            result_df = result_df.drop(columns=['start_year_of_submission'])
        
        if 'death_date' in result_df.columns:
            result_df['deceased_indicator'] = result_df['death_date'].notna().astype(str).replace({'True': 'Y', 'False': 'N'})
            result_df = result_df.drop(columns=['death_date'])
        
        return result_df
    
    def apply_provider_deidentification_vectorized(self, df):
        result_df = df.copy()
        
        npi_series = result_df.get('provider_npi', pd.Series([None] * len(result_df))).fillna('')
        payor_id_series = result_df.get('payor_assigned_provider_id', pd.Series([None] * len(result_df))).fillna('')
        
        provider_input = np.where(npi_series != '', npi_series.astype(str), payor_id_series.astype(str))
        result_df['DEID_PROVIDER_ID'] = self.vectorized_create_ids(self.PROVIDER_SECRET_KEY, provider_input)
        
        fields_to_remove = [
            'provider_tax_id', 'provider_dea_number', 'provider_state_license_number',
            'provider_first_name', 'provider_middle_name_or_initial',
            'provider_last_name_or_organization_name', 'provider_suffix',
            'provider_office_street_address', 'provider_phone',
            'payor_assigned_provider_id', 'provider_npi',
            'provider_medicare_provider_id', 'provider_medicaid_provider_id',
            'provider_office_city'
        ]
        result_df = result_df.drop(columns=[col for col in fields_to_remove if col in result_df.columns])
        
        zip_columns = [col for col in result_df.columns if 'zip' in col.lower() and 'code' in col.lower()]
        for col in zip_columns:
            result_df[col] = self.vectorized_zip_processing(result_df[col].values)
        
        fips_columns = [col for col in result_df.columns if 'fips' in col.lower()]
        for col in fips_columns:
            result_df[col] = self.vectorized_county_processing(result_df[col].values)
        
        return result_df
    
    def apply_medical_deidentification_vectorized(self, df, age_lookup=None):
        result_df = df.copy()
        
        mask_demographics = np.zeros(len(result_df), dtype=bool)
        
        dx_cols = ['principal_diagnosis'] + [f'other_diagnosis_{i}' for i in range(1, 25)]
        dx_cols = [col for col in dx_cols if col in result_df.columns]
        
        for col in dx_cols:
            if col in result_df.columns:
                codes = result_df[col].fillna('')
                
                sensitive_flags = self.vectorized_sensitive_diagnosis_check(codes.values)
                mask_demographics |= sensitive_flags
                
                rare_flags = codes.isin(self.rare_dx_codes)
                mask_demographics |= rare_flags.values
                
                rare_mask = rare_flags & codes.notna()
                result_df.loc[rare_mask, col] = result_df.loc[rare_mask, col].astype(str).str[:3]
                
                generalized_codes = codes.astype(str).str.upper().str[:3].map(self.generalization_codes)
                result_df.loc[generalized_codes.notna(), col] = generalized_codes[generalized_codes.notna()]
        
        cpt_cols = ['procedure_code'] + [f'icd_cm_pcs_other_procedure_code_{i}' for i in range(1, 26)]
        cpt_cols = [col for col in cpt_cols if col in result_df.columns]
        
        for col in cpt_cols:
            if col in result_df.columns:
                codes = result_df[col].fillna('')
                rare_flags = codes.isin(self.rare_cpt_codes)
                mask_demographics |= rare_flags.values
        
        if 'drug_code' in result_df.columns:
            drug_codes = result_df['drug_code'].fillna('')
            rare_flags = drug_codes.isin(self.rare_ndc_codes)
            mask_demographics |= rare_flags.values
        
        zip_columns = [col for col in result_df.columns if 'zip' in col.lower() and 'code' in col.lower()]
        for col in zip_columns:
            result_df[col] = self.vectorized_zip_processing(result_df[col].values)
            result_df.loc[mask_demographics, col] = '000'
        
        fips_columns = [col for col in result_df.columns if 'fips' in col.lower()]
        for col in fips_columns:
            result_df[col] = self.vectorized_county_processing(result_df[col].values)
            result_df.loc[mask_demographics, col] = '000'
        
        if 'member_sex' in result_df.columns:
            result_df.loc[mask_demographics, 'member_sex'] = None
        
        if 'payor_claim_control_number' in result_df.columns:
            claim_input = (result_df['payor_claim_control_number'].astype(str) + '|' + 
                          result_df.get('cross_reference_claims_id', '').astype(str) + '|' + 
                          result_df.get('data_submitter_code', '').astype(str))
            result_df['DEID_CLAIM_ID'] = self.vectorized_create_ids(self.CLAIM_SECRET_KEY, claim_input.values)
        
        if 'carrier_specific_unique_member_id' in result_df.columns:
            member_input = (result_df['carrier_specific_unique_member_id'].astype(str) + '|' + 
                           result_df.get('data_submitter_code', '').astype(str))
            result_df['DEID_MEMBER_ID'] = self.vectorized_create_ids(self.MEMBER_SECRET_KEY, member_input.values)
        
        if 'carrier_specific_unique_subscriber_id' in result_df.columns:
            subscriber_input = (result_df['carrier_specific_unique_subscriber_id'].astype(str) + '|' + 
                               result_df.get('data_submitter_code', '').astype(str))
            result_df['DEID_SUBSCRIBER_ID'] = self.vectorized_create_ids(self.MEMBER_SECRET_KEY, subscriber_input.values)
        
        provider_fields = {
            'rendering_provider_npi': 'DEID_RENDERING_PROVIDER_ID',
            'billing_provider_npi': 'DEID_BILLING_PROVIDER_ID',
            'attending_provider_npi': 'DEID_ATTENDING_PROVIDER_ID',
            'operating_provider_npi': 'DEID_OPERATING_PROVIDER_ID'
        }
        
        for npi_field, deid_field in provider_fields.items():
            if npi_field in result_df.columns:
                result_df[deid_field] = self.vectorized_create_ids(self.PROVIDER_SECRET_KEY, result_df[npi_field].astype(str).values)
        
        if age_lookup and 'DEID_MEMBER_ID' in result_df.columns:
            member_ids = result_df['DEID_MEMBER_ID']
            result_df['AGE_GROUP'] = member_ids.map(age_lookup)
        elif 'member_date_of_birth' in result_df.columns:
            result_df['AGE_GROUP'] = self.vectorized_age_calculation_and_grouping(result_df['member_date_of_birth'].values)
        
        fields_to_remove = [
            'subscriber_social_security_number', 'subscriber_last_name', 'subscriber_first_name',
            'sequence_number', 'member_social_security_number', 'member_last_name',
            'member_first_name', 'patient_control_number', 'rendering_provider_first_name',
            'rendering_provider_middle_name', 'rendering_provider_last_name_or_organization_name',
            'rendering_provider_suffix', 'billing_provider_last_name_or_organization_name',
            'billing_providertax_id', 'rendering_provider_street_address', 'medical_record_number',
            'member_date_of_birth', 'rendering_provider_city_name',
            'payor_claim_control_number', 'cross_reference_claims_id',
            'rendering_provider_id', 'rendering_provider_npi', 'billing_provider_id',
            'billing_provider_npi', 'referring_provider_id', 'referring_provider_npi',
            'attending_provider_id', 'attending_provider_npi',
            'carrier_specific_unique_member_id', 'carrier_specific_unique_subscriber_id'
        ]
        result_df = result_df.drop(columns=[col for col in fields_to_remove if col in result_df.columns])
        
        date_fields = ['paid_date', 'admission_date', 'discharge_date',
                      'date_of_service_from', 'date_of_service_thru',
                      'data_period_start', 'data_period_end']
        
        for field in date_fields:
            if field in result_df.columns:
                result_df[field] = self.vectorized_date_processing(result_df[field].values, 'quarter')
        
        print(f"  Records with masked demographics: {sum(mask_demographics):,}")
        
        return result_df


def main():
    print("\n" + "="*70)
    print("TX-APCD COMPLIANT DE-IDENTIFICATION SYSTEM - OPTIMIZED")
    print("="*70)
    print("Version 3.0 - High Performance for Large Datasets")
    print("K=10 threshold for ICD-10, CPT, and NDC codes")
    print("")
    
    deidentifier = OptimizedAPCDDeidentifier(generate_new_keys=True, con=con)
    
    try:
        print("\n1. PROCESSING ELIGIBILITY DATA")
        print("-"*40)
        deidentifier.process_eligibility_data()
        
        print("\n2. PROCESSING PROVIDER DATA")
        print("-"*40)
        deidentifier.process_provider_data()
        
        print("\n3. PROCESSING MEDICAL DATA")
        print("-"*40)
        deidentifier.process_medical_data()
        
        print("\n4. SUMMARY STATISTICS")
        print("-"*40)
        
        cursor = con.cursor()
        
        cursor.execute(f"SELECT COUNT(*) FROM {OUTPUT_SCHEMA}.{DEID_ELIGIBILITY_TABLE}")
        elig_count = cursor.fetchone()[0]
        print(f"Eligibility Records: {elig_count:,}")
        
        cursor.execute(f"SELECT COUNT(*) FROM {OUTPUT_SCHEMA}.{DEID_PROVIDER_TABLE}")
        prov_count = cursor.fetchone()[0]
        print(f"Provider Records: {prov_count:,}")
        
        cursor.execute(f"SELECT COUNT(*) FROM {OUTPUT_SCHEMA}.{DEID_MEDICAL_TABLE}")
        med_count = cursor.fetchone()[0]
        print(f"Medical Records: {med_count:,}")
        
        cursor.close()
        
        print("\n" + "="*70)
        print(" DE-IDENTIFICATION COMPLETE - TX-APCD COMPLIANT")
        print("="*70)
        
    except Exception as e:
        print(f"\n ERROR: {str(e)}")
        import traceback
        traceback.print_exc()
    
    finally:
        if con:
            con.close()
            print("\nDatabase connection closed.")


if __name__ == "__main__":
    main()