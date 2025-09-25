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
        self.high_sensitivity_codes = {
            'HIV_AIDS': ['B20', 'B21', 'B22', 'B23', 'B24'],
            'SUBSTANCE': ['F10', 'F11', 'F12', 'F13', 'F14', 'F15', 'F16', 'F17', 'F18', 'F19']
        }
        
        self.newborn_codes = ['Z38', 'Z332']
        self.abuse_codes = ['T74', 'T76']
        
        self.generalization_codes = {
            'A50-A64': ['A50', 'A51', 'A52', 'A53', 'A54', 'A55', 'A56', 
                       'A57', 'A58', 'A59', 'A60', 'A61', 'A62', 'A63', 'A64'],
            'F20': ['F20'],
            'F31': ['F31'],
            'T74': ['T74'],
            'T76': ['T76'],
            'G10': ['G10'],
            'E84': ['E84']
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
        try:
            df = pd.read_csv('Texas_DemographicsByZipCode_sample.csv')
            for _, row in df.iterrows():
                zip_code = str(row['zip_code']).zfill(5)
                population_data[zip_code] = row['population']
            print(f"  Loaded population data for {len(population_data)} ZIP codes from CSV")
            
            prefixes = {}
            for zip_code, pop in population_data.items():
                prefix = zip_code[:3]
                if prefix not in prefixes:
                    prefixes[prefix] = {'count': 0, 'total_pop': 0}
                prefixes[prefix]['count'] += 1
                prefixes[prefix]['total_pop'] += pop
            
            masked_prefixes = [p for p, data in prefixes.items() if data['total_pop'] < 20000]
            print(f"  3-digit prefixes that will be masked (pop < 20K): {len(masked_prefixes)} out of {len(prefixes)}")
                
        except FileNotFoundError:
            print("  Warning: Texas_DemographicsByZipCode_sample.csv not found, using default population data")
            major_zips = ['750', '751', '752', '753', '754', '755', '756', '757', '758', '759',
                          '760', '761', '762', '763', '764', '765', '766', '767', '768', '769',
                          '770', '771', '772', '773', '774', '775', '776', '777', '778']
            for prefix in major_zips:
                for suffix in range(0, 20):
                    zip_code = f"{prefix}{str(suffix).zfill(2)}"
                    population_data[zip_code] = random.randint(21000, 50000)
            
            small_zips = ['790', '791', '792', '793']
            for prefix in small_zips:
                for suffix in range(0, 10):
                    zip_code = f"{prefix}{str(suffix).zfill(2)}"
                    population_data[zip_code] = random.randint(1000, 19000)
        
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
        
        dx_cols = ['principal_diagnosis'] + [f'other_diagnosis_{i}' for i in range(1, 25)]
        cpt_cols = ['procedure_code'] + [f'icd_cm_pcs_other_procedure_code_{i}' for i in range(1, 26)]
        
        self.rare_dx_codes = set()
        self.rare_cpt_codes = set()
        self.rare_ndc_codes = set()
        
        try:
            for col in dx_cols:
                try:
                    cursor.execute(f"""
                        SELECT {col}, COUNT(*) as freq 
                        FROM {medical_table} 
                        WHERE {col} IS NOT NULL 
                        GROUP BY {col} 
                        HAVING COUNT(*) < %s
                    """, (self.RARITY_THRESHOLD_K,))
                    
                    rare_codes = [row[0] for row in cursor.fetchall()]
                    self.rare_dx_codes.update(rare_codes)
                except:
                    continue
            
            for col in cpt_cols:
                try:
                    cursor.execute(f"""
                        SELECT {col}, COUNT(*) as freq 
                        FROM {medical_table} 
                        WHERE {col} IS NOT NULL 
                        GROUP BY {col} 
                        HAVING COUNT(*) < %s
                    """, (self.RARITY_THRESHOLD_K,))
                    
                    rare_codes = [row[0] for row in cursor.fetchall()]
                    self.rare_cpt_codes.update(rare_codes)
                except:
                    continue
            
            try:
                cursor.execute(f"""
                    SELECT drug_code, COUNT(*) as freq 
                    FROM {medical_table} 
                    WHERE drug_code IS NOT NULL 
                    GROUP BY drug_code 
                    HAVING COUNT(*) < %s
                """, (self.RARITY_THRESHOLD_K,))
                
                rare_codes = [row[0] for row in cursor.fetchall()]
                self.rare_ndc_codes.update(rare_codes)
            except:
                pass
        
        except Exception as e:
            print(f"Warning: Could not pre-compute rare codes: {e}")
            self.rare_dx_codes = set()
            self.rare_cpt_codes = set()
            self.rare_ndc_codes = set()
        
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
    
    def vectorized_date_to_year_quarter(self, dates):
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
                    date_value = pd.to_datetime(date_value)
                quarter = (date_value.month - 1) // 3 + 1
                return f"{date_value.year}Q{quarter}"
            except:
                return None
        return [convert_single_date(d) for d in dates]
    
    def vectorized_date_to_year_only(self, dates):
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
                    date_value = pd.to_datetime(date_value)
                return str(date_value.year)
            except:
                return None
        return [convert_single_date(d) for d in dates]
    
    def vectorized_zip_processing(self, zip_codes):
        result = []
        for zip_code in zip_codes:
            if pd.isna(zip_code):
                result.append("000")
                continue
            zip_str = str(zip_code).strip()
            if len(zip_str) < 3:
                result.append("000")
                continue
            zip_3 = zip_str[:3]
            
            if self.population_data:
                matching_zips = [z for z in self.population_data.keys() if z.startswith(zip_3)]
                total_pop = sum(self.population_data.get(z, 0) for z in matching_zips)
                if total_pop < 20000:
                    result.append("000")
                    continue
            result.append(zip_3)
        return result
    
    def vectorized_county_processing(self, fips_codes):
        result = []
        for fips_code in fips_codes:
            if pd.isna(fips_code):
                result.append("000")
                continue
            
            fips_str = str(int(fips_code)) if isinstance(fips_code, float) else str(fips_code)
            
            if len(fips_str) <= 3:
                fips_str = '48' + fips_str.zfill(3)
            elif len(fips_str) == 4:
                fips_str = '4' + fips_str
            
            if fips_str in self.county_population_data:
                if self.county_population_data[fips_str] < 20000:
                    result.append("000")
                    continue
            result.append(fips_str)
        return result
    
    def vectorized_age_calculation(self, dobs, reference_date=None):
        if reference_date is None:
            reference_date = datetime.now()
        
        ages = []
        for dob in dobs:
            if pd.isna(dob):
                ages.append(None)
                continue
            
            try:
                if isinstance(dob, (str, int)):
                    if isinstance(dob, int):
                        dob_str = str(dob)
                        if len(dob_str) == 8:
                            dob = pd.to_datetime(dob_str, format='%Y%m%d')
                        else:
                            ages.append(None)
                            continue
                    else:
                        dob = pd.to_datetime(dob)
                
                age = reference_date.year - dob.year
                if (reference_date.month, reference_date.day) < (dob.month, dob.day):
                    age -= 1
                
                if age > 90:
                    age = 90
                ages.append(age)
            except:
                ages.append(None)
        
        return ages
    
    def vectorized_age_to_group(self, ages, is_hiv_drug_population=False):
        groups = []
        for age in ages:
            if pd.isna(age):
                groups.append(None)
                continue
            
            age = int(age)
            
            if is_hiv_drug_population:
                if age <= 17: groups.append(23)
                elif age <= 34: groups.append(24)
                elif age <= 49: groups.append(25)
                elif age <= 64: groups.append(26)
                else: groups.append(27)
            else:
                if age <= 1: groups.append(1)
                elif age <= 4: groups.append(2)
                elif age <= 9: groups.append(3)
                elif age <= 14: groups.append(4)
                elif age <= 19: groups.append(5)
                elif age <= 24: groups.append(6)
                elif age <= 29: groups.append(7)
                elif age <= 34: groups.append(8)
                elif age <= 39: groups.append(9)
                elif age <= 44: groups.append(10)
                elif age <= 49: groups.append(11)
                elif age <= 54: groups.append(12)
                elif age <= 59: groups.append(13)
                elif age <= 64: groups.append(14)
                elif age <= 69: groups.append(15)
                elif age <= 74: groups.append(16)
                elif age <= 79: groups.append(17)
                elif age <= 84: groups.append(18)
                elif age <= 89: groups.append(19)
                elif age <= 94: groups.append(20)
                elif age <= 99: groups.append(21)
                else: groups.append(22)
        
        return groups
    
    def check_sensitive_diagnosis_vectorized(self, codes):
        sensitive_flags = []
        for code in codes:
            if pd.isna(code):
                sensitive_flags.append(False)
                continue
            
            code_str = str(code).strip().upper().replace('.', '')
            
            is_sensitive = False
            if code_str[:3] in self.high_sensitivity_codes['HIV_AIDS']:
                is_sensitive = True
            elif code_str[:3] in self.high_sensitivity_codes['SUBSTANCE']:
                is_sensitive = True
            elif code_str[:3] in self.abuse_codes:
                is_sensitive = True
            
            sensitive_flags.append(is_sensitive)
        
        return sensitive_flags
    
    def bulk_insert_data(self, table_name, df, batch_size=BATCH_SIZE):
        cursor = self.con.cursor()
        
        columns = df.columns.tolist()
        placeholders = ', '.join(['%s'] * len(columns))
        insert_sql = f"INSERT INTO {OUTPUT_SCHEMA}.{table_name} ({', '.join(columns)}) VALUES ({placeholders})"
        
        df_values = df.values
        data_tuples = []
        
        for i in range(len(df_values)):
            values = tuple(str(val) if pd.notna(val) else None for val in df_values[i])
            data_tuples.append(values)
            
            if len(data_tuples) >= batch_size:
                execute_batch(cursor, insert_sql, data_tuples, page_size=batch_size)
                data_tuples = []
        
        if data_tuples:
            execute_batch(cursor, insert_sql, data_tuples, page_size=len(data_tuples))
        
        cursor.close()
    
    def process_eligibility_data(self):
        print("Processing eligibility data in chunks...")
        cursor = self.con.cursor()
        
        eligibility_table = f"{INPUT_SCHEMA}.{INPUT_ELIGIBILITY_TABLE}"
        
        cursor.execute(f"SELECT COUNT(*) FROM {eligibility_table}")
        total_rows = cursor.fetchone()[0]
        print(f"Total eligibility records: {total_rows:,}")
        
        cursor.execute(f"""
            DROP TABLE IF EXISTS {OUTPUT_SCHEMA}.{DEID_ELIGIBILITY_TABLE}
        """)
        
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
                columns_def = []
                for col in result_df.columns:
                    columns_def.append(f"{col} TEXT")
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
        
        cursor.execute(f"""
            DROP TABLE IF EXISTS {OUTPUT_SCHEMA}.{DEID_PROVIDER_TABLE}
        """)
        
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
                columns_def = []
                for col in result_df.columns:
                    columns_def.append(f"{col} TEXT")
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
        
        cursor.execute(f"""
            DROP TABLE IF EXISTS {OUTPUT_SCHEMA}.{DEID_MEDICAL_TABLE}
        """)
        
        age_lookup = {}
        try:
            cursor.execute(f"""
                SELECT DEID_MEMBER_ID, AGE_GROUP 
                FROM {OUTPUT_SCHEMA}.{DEID_ELIGIBILITY_TABLE}
                WHERE DEID_MEMBER_ID IS NOT NULL AND AGE_GROUP IS NOT NULL
            """)
            age_data = cursor.fetchall()
            age_lookup = {row[0]: row[1] for row in age_data}
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
                columns_def = []
                for col in result_df.columns:
                    columns_def.append(f"{col} TEXT")
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
            member_ids = []
            member_id_values = result_df['carrier_specific_unique_member_id'].values
            submitter_values = result_df['data_submitter_code'].values
            
            for i in range(len(member_id_values)):
                if pd.notna(member_id_values[i]):
                    member_id = self.create_deidentified_id(
                        self.MEMBER_SECRET_KEY, 
                        f"{member_id_values[i]}|{submitter_values[i]}"
                    )
                    member_ids.append(member_id)
                else:
                    member_ids.append(None)
            result_df['DEID_MEMBER_ID'] = member_ids
        
        if 'carrier_specific_unique_subscriber_id' in result_df.columns and 'data_submitter_code' in result_df.columns:
            subscriber_ids = []
            subscriber_id_values = result_df['carrier_specific_unique_subscriber_id'].values
            submitter_values = result_df['data_submitter_code'].values
            
            for i in range(len(subscriber_id_values)):
                if pd.notna(subscriber_id_values[i]):
                    subscriber_id = self.create_deidentified_id(
                        self.MEMBER_SECRET_KEY, 
                        f"{subscriber_id_values[i]}|{submitter_values[i]}"
                    )
                    subscriber_ids.append(subscriber_id)
                else:
                    subscriber_ids.append(None)
            result_df['DEID_SUBSCRIBER_ID'] = subscriber_ids
        
        if 'member_date_of_birth' in result_df.columns:
            ages = self.vectorized_age_calculation(result_df['member_date_of_birth'].values)
            age_groups = self.vectorized_age_to_group(ages)
            result_df['AGE_GROUP'] = age_groups
        
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
                result_df[field] = self.vectorized_date_to_year_only(result_df[field].values)
        
        date_to_yq_fields = [
            'smib_from_date', 'smib_to_date', 'data_period_start', 'data_period_end'
        ]
        for field in date_to_yq_fields:
            if field in result_df.columns:
                result_df[field] = self.vectorized_date_to_year_quarter(result_df[field].values)
        
        if 'start_year_of_submission' in result_df.columns:
            result_df['eligibility_year'] = self.vectorized_date_to_year_only(result_df['start_year_of_submission'].values)
            result_df = result_df.drop(columns=['start_year_of_submission'])
        
        if 'death_date' in result_df.columns:
            deceased_flags = ['Y' if pd.notna(x) else 'N' for x in result_df['death_date'].values]
            result_df['deceased_indicator'] = deceased_flags
            result_df = result_df.drop(columns=['death_date'])
        
        return result_df
    
    def apply_provider_deidentification_vectorized(self, df):
        result_df = df.copy()
        
        provider_ids = []
        npi_values = result_df.get('provider_npi', pd.Series([None] * len(result_df))).values
        payor_id_values = result_df.get('payor_assigned_provider_id', pd.Series([None] * len(result_df))).values
        
        for i in range(len(result_df)):
            id_components = []
            if pd.notna(npi_values[i]):
                id_components.append(str(npi_values[i]))
            elif pd.notna(payor_id_values[i]):
                id_components.append(str(payor_id_values[i]))
            
            if id_components:
                provider_id = self.create_deidentified_id(self.PROVIDER_SECRET_KEY, '|'.join(id_components))
                provider_ids.append(provider_id)
            else:
                provider_ids.append(None)
        
        result_df['DEID_PROVIDER_ID'] = provider_ids
        
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
        
        mask_demographics = [False] * len(result_df)
        
        dx_cols = ['principal_diagnosis'] + [f'other_diagnosis_{i}' for i in range(1, 25)]
        dx_cols = [col for col in dx_cols if col in result_df.columns]
        
        for col in dx_cols:
            if col in result_df.columns:
                codes = result_df[col].values
                sensitive_flags = self.check_sensitive_diagnosis_vectorized(codes)
                for idx, is_sensitive in enumerate(sensitive_flags):
                    if is_sensitive:
                        mask_demographics[idx] = True
                
                rare_flags = [code in self.rare_dx_codes for code in codes]
                for idx, is_rare in enumerate(rare_flags):
                    if is_rare:
                        mask_demographics[idx] = True
                        if pd.notna(codes[idx]):
                            result_df.iloc[idx, result_df.columns.get_loc(col)] = str(codes[idx])[:3]
                
                for idx in range(len(codes)):
                    code = codes[idx]
                    if pd.notna(code):
                        code_str = str(code).upper()[:3]
                        for generalized, codes_list in self.generalization_codes.items():
                            if code_str in codes_list:
                                result_df.iloc[idx, result_df.columns.get_loc(col)] = generalized
                                break
        
        cpt_cols = ['procedure_code'] + [f'icd_cm_pcs_other_procedure_code_{i}' for i in range(1, 26)]
        cpt_cols = [col for col in cpt_cols if col in result_df.columns]
        
        for col in cpt_cols:
            if col in result_df.columns:
                codes = result_df[col].values
                rare_flags = [code in self.rare_cpt_codes for code in codes]
                for idx, is_rare in enumerate(rare_flags):
                    if is_rare:
                        mask_demographics[idx] = True
        
        if 'drug_code' in result_df.columns:
            drug_codes = result_df['drug_code'].values
            rare_flags = [code in self.rare_ndc_codes for code in drug_codes]
            for idx, is_rare in enumerate(rare_flags):
                if is_rare:
                    mask_demographics[idx] = True
        
        zip_columns = [col for col in result_df.columns if 'zip' in col.lower() and 'code' in col.lower()]
        for col in zip_columns:
            result_df[col] = self.vectorized_zip_processing(result_df[col].values)
        
        fips_columns = [col for col in result_df.columns if 'fips' in col.lower()]
        for col in fips_columns:
            result_df[col] = self.vectorized_county_processing(result_df[col].values)
        
        for idx, should_mask in enumerate(mask_demographics):
            if should_mask:
                for col in zip_columns:
                    if col in result_df.columns:
                        result_df.iloc[idx, result_df.columns.get_loc(col)] = '000'
                
                for col in fips_columns:
                    if col in result_df.columns:
                        result_df.iloc[idx, result_df.columns.get_loc(col)] = '000'
                
                if 'member_sex' in result_df.columns:
                    result_df.iloc[idx, result_df.columns.get_loc('member_sex')] = np.nan
        
        if 'payor_claim_control_number' in result_df.columns:
            claim_ids = []
            claim_values = result_df['payor_claim_control_number'].values
            cross_ref_values = result_df.get('cross_reference_claims_id', pd.Series([None] * len(result_df))).values
            submitter_values = result_df.get('data_submitter_code', pd.Series([None] * len(result_df))).values
            
            for i in range(len(claim_values)):
                if pd.notna(claim_values[i]):
                    claim_id = self.create_deidentified_id(
                        self.CLAIM_SECRET_KEY, 
                        f"{claim_values[i]}|{cross_ref_values[i] if pd.notna(cross_ref_values[i]) else ''}|{submitter_values[i] if pd.notna(submitter_values[i]) else ''}"
                    )
                    claim_ids.append(claim_id)
                else:
                    claim_ids.append(None)
            result_df['DEID_CLAIM_ID'] = claim_ids
        
        if 'carrier_specific_unique_member_id' in result_df.columns:
            member_ids = []
            member_id_values = result_df['carrier_specific_unique_member_id'].values
            submitter_values = result_df.get('data_submitter_code', pd.Series([None] * len(result_df))).values
            
            for i in range(len(member_id_values)):
                if pd.notna(member_id_values[i]):
                    member_id = self.create_deidentified_id(
                        self.MEMBER_SECRET_KEY, 
                        f"{member_id_values[i]}|{submitter_values[i] if pd.notna(submitter_values[i]) else ''}"
                    )
                    member_ids.append(member_id)
                else:
                    member_ids.append(None)
            result_df['DEID_MEMBER_ID'] = member_ids
        
        if 'carrier_specific_unique_subscriber_id' in result_df.columns:
            subscriber_ids = []
            subscriber_id_values = result_df['carrier_specific_unique_subscriber_id'].values
            submitter_values = result_df.get('data_submitter_code', pd.Series([None] * len(result_df))).values
            
            for i in range(len(subscriber_id_values)):
                if pd.notna(subscriber_id_values[i]):
                    subscriber_id = self.create_deidentified_id(
                        self.MEMBER_SECRET_KEY, 
                        f"{subscriber_id_values[i]}|{submitter_values[i] if pd.notna(submitter_values[i]) else ''}"
                    )
                    subscriber_ids.append(subscriber_id)
                else:
                    subscriber_ids.append(None)
            result_df['DEID_SUBSCRIBER_ID'] = subscriber_ids
        
        provider_fields = {
            'rendering_provider_npi': 'DEID_RENDERING_PROVIDER_ID',
            'billing_provider_npi': 'DEID_BILLING_PROVIDER_ID',
            'attending_provider_npi': 'DEID_ATTENDING_PROVIDER_ID',
            'operating_provider_npi': 'DEID_OPERATING_PROVIDER_ID'
        }
        
        for npi_field, deid_field in provider_fields.items():
            if npi_field in result_df.columns:
                provider_ids = []
                npi_values = result_df[npi_field].values
                for npi in npi_values:
                    if pd.notna(npi):
                        provider_id = self.create_deidentified_id(self.PROVIDER_SECRET_KEY, str(npi))
                        provider_ids.append(provider_id)
                    else:
                        provider_ids.append(None)
                result_df[deid_field] = provider_ids
        
        if age_lookup and 'DEID_MEMBER_ID' in result_df.columns:
            age_groups = []
            member_id_values = result_df['DEID_MEMBER_ID'].values
            for member_id in member_id_values:
                age_groups.append(age_lookup.get(member_id))
            result_df['AGE_GROUP'] = age_groups
        elif 'member_date_of_birth' in result_df.columns:
            ages = self.vectorized_age_calculation(result_df['member_date_of_birth'].values)
            age_groups = self.vectorized_age_to_group(ages)
            result_df['AGE_GROUP'] = age_groups
        
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
                result_df[field] = self.vectorized_date_to_year_quarter(result_df[field].values)
        
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