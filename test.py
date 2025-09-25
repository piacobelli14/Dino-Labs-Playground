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
from psycopg2.extras import execute_batch, execute_values

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

CHUNK_SIZE = 10000
BATCH_SIZE = 5000


class OptimizedAPCDDeidentifier:
    
    def __init__(self, generate_new_keys=True, con=None):
        self.con = con
        self.RARITY_THRESHOLD_K = 10
        
        if generate_new_keys:
            self.MEMBER_SECRET_KEY = os.urandom(32).hex()
            self.PROVIDER_SECRET_KEY = os.urandom(32).hex()
            self.CLAIM_SECRET_KEY = os.urandom(32).hex()
            self.save_keys_to_file()
        else:
            self.load_keys_from_file()
        
        self.population_data = self.load_population_data()
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
        self.rare_dx_codes = set()
        self.rare_cpt_codes = set()
        self.rare_ndc_codes = set()
    
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
            population_data = dict(zip(df['zip_code'].astype(str).str.zfill(5), df['population']))
        except FileNotFoundError:
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
    
    def precompute_rare_codes_fast(self, df):
        dx_cols = ['principal_diagnosis'] + [f'other_diagnosis_{i}' for i in range(1, 25)]
        cpt_cols = ['procedure_code'] + [f'icd_cm_pcs_other_procedure_code_{i}' for i in range(1, 26)]
        
        all_dx = pd.concat([df[col].dropna() for col in dx_cols if col in df.columns])
        all_cpt = pd.concat([df[col].dropna() for col in cpt_cols if col in df.columns])
        
        dx_counts = all_dx.value_counts()
        cpt_counts = all_cpt.value_counts()
        
        self.rare_dx_codes = set(dx_counts[dx_counts < self.RARITY_THRESHOLD_K].index)
        self.rare_cpt_codes = set(cpt_counts[cpt_counts < self.RARITY_THRESHOLD_K].index)
        
        if 'drug_code' in df.columns:
            ndc_counts = df['drug_code'].dropna().value_counts()
            self.rare_ndc_codes = set(ndc_counts[ndc_counts < self.RARITY_THRESHOLD_K].index)
    
    def create_deidentified_id(self, secret_key: str, input_string: str) -> str:
        key_bytes = secret_key.encode('utf-8')
        input_bytes = input_string.encode('utf-8')
        hmac_object = hmac.new(key_bytes, msg=input_bytes, digestmod=hashlib.sha256)
        binary_digest = hmac_object.digest()
        result = base64.urlsafe_b64encode(binary_digest).decode('utf-8')
        result = ''.join(c for c in result if c.isalnum())[:16]
        return result
    
    def fast_date_to_year_quarter(self, dates):
        if len(dates) == 0:
            return []
        
        dates_series = pd.Series(dates)
        
        def convert_date(date_val):
            if pd.isna(date_val):
                return None
            try:
                if isinstance(date_val, (int, float)):
                    date_str = str(int(date_val))
                    if len(date_str) == 8:
                        dt = pd.to_datetime(date_str, format='%Y%m%d')
                    else:
                        return None
                else:
                    dt = pd.to_datetime(date_val)
                quarter = (dt.month - 1) // 3 + 1
                return f"{dt.year}Q{quarter}"
            except:
                return None
        
        return dates_series.apply(convert_date).tolist()
    
    def fast_date_to_year_only(self, dates):
        if len(dates) == 0:
            return []
        
        dates_series = pd.Series(dates)
        
        def convert_date(date_val):
            if pd.isna(date_val):
                return None
            try:
                if isinstance(date_val, (int, float)):
                    date_str = str(int(date_val))
                    if len(date_str) == 8:
                        dt = pd.to_datetime(date_str, format='%Y%m%d')
                    else:
                        return None
                else:
                    dt = pd.to_datetime(date_val)
                return str(dt.year)
            except:
                return None
        
        return dates_series.apply(convert_date).tolist()
    
    def fast_zip_processing(self, zip_codes):
        if len(zip_codes) == 0:
            return []
        
        zip_series = pd.Series(zip_codes).fillna("000").astype(str).str.strip()
        
        def process_zip(zip_str):
            if len(zip_str) < 3:
                return "000"
            zip_3 = zip_str[:3]
            
            if self.population_data:
                matching_zips = [z for z in self.population_data.keys() if z.startswith(zip_3)]
                total_pop = sum(self.population_data.get(z, 0) for z in matching_zips)
                if total_pop < 20000:
                    return "000"
            return zip_3
        
        return zip_series.apply(process_zip).tolist()
    
    def fast_county_processing(self, fips_codes):
        if len(fips_codes) == 0:
            return []
        
        fips_series = pd.Series(fips_codes).fillna("000")
        
        def process_fips(fips_code):
            if pd.isna(fips_code):
                return "000"
            
            fips_str = str(int(fips_code)) if isinstance(fips_code, float) else str(fips_code)
            
            if len(fips_str) <= 3:
                fips_str = '48' + fips_str.zfill(3)
            elif len(fips_str) == 4:
                fips_str = '4' + fips_str
            
            if fips_str in self.county_population_data:
                if self.county_population_data[fips_str] < 20000:
                    return "000"
            return fips_str
        
        return fips_series.apply(process_fips).tolist()
    
    def fast_age_calculation(self, dobs, reference_date=None):
        if reference_date is None:
            reference_date = datetime.now()
        
        if len(dobs) == 0:
            return []
        
        dobs_series = pd.Series(dobs)
        
        def calc_age(dob):
            if pd.isna(dob):
                return None
            try:
                if isinstance(dob, (str, int)):
                    if isinstance(dob, int):
                        dob_str = str(dob)
                        if len(dob_str) == 8:
                            dob = pd.to_datetime(dob_str, format='%Y%m%d')
                        else:
                            return None
                    else:
                        dob = pd.to_datetime(dob)
                
                age = reference_date.year - dob.year
                if (reference_date.month, reference_date.day) < (dob.month, dob.day):
                    age -= 1
                
                return min(age, 90)
            except:
                return None
        
        return dobs_series.apply(calc_age).tolist()
    
    def fast_age_to_group(self, ages, is_hiv_drug_population=False):
        if len(ages) == 0:
            return []
        
        ages_series = pd.Series(ages)
        
        def age_to_group(age):
            if pd.isna(age):
                return None
            
            age = int(age)
            
            if is_hiv_drug_population:
                if age <= 17: return 23
                elif age <= 34: return 24
                elif age <= 49: return 25
                elif age <= 64: return 26
                else: return 27
            else:
                if age <= 1: return 1
                elif age <= 4: return 2
                elif age <= 9: return 3
                elif age <= 14: return 4
                elif age <= 19: return 5
                elif age <= 24: return 6
                elif age <= 29: return 7
                elif age <= 34: return 8
                elif age <= 39: return 9
                elif age <= 44: return 10
                elif age <= 49: return 11
                elif age <= 54: return 12
                elif age <= 59: return 13
                elif age <= 64: return 14
                elif age <= 69: return 15
                elif age <= 74: return 16
                elif age <= 79: return 17
                elif age <= 84: return 18
                elif age <= 89: return 19
                elif age <= 94: return 20
                elif age <= 99: return 21
                else: return 22
        
        return ages_series.apply(age_to_group).tolist()
    
    def fast_check_sensitive_diagnosis(self, codes):
        if len(codes) == 0:
            return []
        
        codes_series = pd.Series(codes).fillna('').astype(str).str.strip().str.upper().str.replace('.', '')
        
        def is_sensitive(code_str):
            if not code_str:
                return False
            
            code_3 = code_str[:3]
            
            if code_3 in self.high_sensitivity_codes['HIV_AIDS']:
                return True
            elif code_3 in self.high_sensitivity_codes['SUBSTANCE']:
                return True
            elif code_3 in self.abuse_codes:
                return True
            
            return False
        
        return codes_series.apply(is_sensitive).tolist()
    
    def bulk_insert_data_fast(self, table_name, df):
        if len(df) == 0:
            return
        
        cursor = self.con.cursor()
        
        columns = df.columns.tolist()
        df_clean = df.fillna('')
        
        values = [tuple(row) for row in df_clean.values]
        
        insert_sql = f"INSERT INTO {OUTPUT_SCHEMA}.{table_name} ({', '.join(columns)}) VALUES %s"
        execute_values(cursor, insert_sql, values, template=None, page_size=len(values))
        
        cursor.close()
    
    def process_eligibility_data(self):
        cursor = self.con.cursor()
        
        eligibility_table = f"{INPUT_SCHEMA}.{INPUT_ELIGIBILITY_TABLE}"
        
        cursor.execute(f"SELECT COUNT(*) FROM {eligibility_table}")
        total_rows = cursor.fetchone()[0]
        
        cursor.execute(f"DROP TABLE IF EXISTS {OUTPUT_SCHEMA}.{DEID_ELIGIBILITY_TABLE}")
        
        if total_rows <= CHUNK_SIZE:
            cursor.execute(f"SELECT * FROM {eligibility_table}")
            columns = [desc[0] for desc in cursor.description]
            all_data = cursor.fetchall()
            df = pd.DataFrame(all_data, columns=columns)
            
            result_df = self.apply_eligibility_deidentification_fast(df)
            
            columns_def = [f"{col} TEXT" for col in result_df.columns]
            create_sql = f"CREATE TABLE {OUTPUT_SCHEMA}.{DEID_ELIGIBILITY_TABLE} ({', '.join(columns_def)})"
            cursor.execute(create_sql)
            
            self.bulk_insert_data_fast(DEID_ELIGIBILITY_TABLE, result_df)
        else:
            first_chunk = True
            offset = 0
            
            while offset < total_rows:
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
                result_df = self.apply_eligibility_deidentification_fast(df)
                
                if first_chunk:
                    columns_def = [f"{col} TEXT" for col in result_df.columns]
                    create_sql = f"CREATE TABLE {OUTPUT_SCHEMA}.{DEID_ELIGIBILITY_TABLE} ({', '.join(columns_def)})"
                    cursor.execute(create_sql)
                    first_chunk = False
                
                self.bulk_insert_data_fast(DEID_ELIGIBILITY_TABLE, result_df)
                offset += CHUNK_SIZE
        
        cursor.close()
    
    def process_provider_data(self):
        cursor = self.con.cursor()
        
        provider_table = f"{INPUT_SCHEMA}.{INPUT_PROVIDER_TABLE}"
        
        cursor.execute(f"SELECT COUNT(*) FROM {provider_table}")
        total_rows = cursor.fetchone()[0]
        
        cursor.execute(f"DROP TABLE IF EXISTS {OUTPUT_SCHEMA}.{DEID_PROVIDER_TABLE}")
        
        if total_rows <= CHUNK_SIZE:
            cursor.execute(f"SELECT * FROM {provider_table}")
            columns = [desc[0] for desc in cursor.description]
            all_data = cursor.fetchall()
            df = pd.DataFrame(all_data, columns=columns)
            
            result_df = self.apply_provider_deidentification_fast(df)
            
            columns_def = [f"{col} TEXT" for col in result_df.columns]
            create_sql = f"CREATE TABLE {OUTPUT_SCHEMA}.{DEID_PROVIDER_TABLE} ({', '.join(columns_def)})"
            cursor.execute(create_sql)
            
            self.bulk_insert_data_fast(DEID_PROVIDER_TABLE, result_df)
        else:
            first_chunk = True
            offset = 0
            
            while offset < total_rows:
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
                result_df = self.apply_provider_deidentification_fast(df)
                
                if first_chunk:
                    columns_def = [f"{col} TEXT" for col in result_df.columns]
                    create_sql = f"CREATE TABLE {OUTPUT_SCHEMA}.{DEID_PROVIDER_TABLE} ({', '.join(columns_def)})"
                    cursor.execute(create_sql)
                    first_chunk = False
                
                self.bulk_insert_data_fast(DEID_PROVIDER_TABLE, result_df)
                offset += CHUNK_SIZE
        
        cursor.close()
    
    def process_medical_data(self):
        cursor = self.con.cursor()
        
        medical_table = f"{INPUT_SCHEMA}.{INPUT_MEDICAL_TABLE}"
        
        cursor.execute(f"SELECT COUNT(*) FROM {medical_table}")
        total_rows = cursor.fetchone()[0]
        
        cursor.execute(f"DROP TABLE IF EXISTS {OUTPUT_SCHEMA}.{DEID_MEDICAL_TABLE}")
        
        age_lookup = {}
        try:
            cursor.execute(f"""
                SELECT DEID_MEMBER_ID, AGE_GROUP 
                FROM {OUTPUT_SCHEMA}.{DEID_ELIGIBILITY_TABLE}
                WHERE DEID_MEMBER_ID IS NOT NULL AND AGE_GROUP IS NOT NULL
            """)
            age_data = cursor.fetchall()
            age_lookup = {row[0]: row[1] for row in age_data}
        except:
            pass
        
        if total_rows <= CHUNK_SIZE:
            cursor.execute(f"SELECT * FROM {medical_table}")
            columns = [desc[0] for desc in cursor.description]
            all_data = cursor.fetchall()
            df = pd.DataFrame(all_data, columns=columns)
            
            self.precompute_rare_codes_fast(df)
            result_df = self.apply_medical_deidentification_fast(df, age_lookup)
            
            columns_def = [f"{col} TEXT" for col in result_df.columns]
            create_sql = f"CREATE TABLE {OUTPUT_SCHEMA}.{DEID_MEDICAL_TABLE} ({', '.join(columns_def)})"
            cursor.execute(create_sql)
            
            self.bulk_insert_data_fast(DEID_MEDICAL_TABLE, result_df)
        else:
            first_chunk = True
            offset = 0
            
            cursor.execute(f"SELECT * FROM {medical_table} LIMIT 50000")
            columns = [desc[0] for desc in cursor.description]
            sample_data = cursor.fetchall()
            sample_df = pd.DataFrame(sample_data, columns=columns)
            self.precompute_rare_codes_fast(sample_df)
            
            while offset < total_rows:
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
                result_df = self.apply_medical_deidentification_fast(df, age_lookup)
                
                if first_chunk:
                    columns_def = [f"{col} TEXT" for col in result_df.columns]
                    create_sql = f"CREATE TABLE {OUTPUT_SCHEMA}.{DEID_MEDICAL_TABLE} ({', '.join(columns_def)})"
                    cursor.execute(create_sql)
                    first_chunk = False
                
                self.bulk_insert_data_fast(DEID_MEDICAL_TABLE, result_df)
                offset += CHUNK_SIZE
        
        cursor.close()
    
    def apply_eligibility_deidentification_fast(self, df):
        result_df = df.copy()
        
        if 'carrier_specific_unique_member_id' in df.columns and 'data_submitter_code' in df.columns:
            member_combo = df['carrier_specific_unique_member_id'].astype(str) + '|' + df['data_submitter_code'].astype(str)
            result_df['DEID_MEMBER_ID'] = member_combo.apply(lambda x: self.create_deidentified_id(self.MEMBER_SECRET_KEY, x))
        
        if 'carrier_specific_unique_subscriber_id' in df.columns and 'data_submitter_code' in df.columns:
            subscriber_combo = df['carrier_specific_unique_subscriber_id'].astype(str) + '|' + df['data_submitter_code'].astype(str)
            result_df['DEID_SUBSCRIBER_ID'] = subscriber_combo.apply(lambda x: self.create_deidentified_id(self.MEMBER_SECRET_KEY, x))
        
        if 'member_date_of_birth' in df.columns:
            ages = self.fast_age_calculation(df['member_date_of_birth'].values)
            age_groups = self.fast_age_to_group(ages)
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
            result_df[col] = self.fast_zip_processing(result_df[col].values)
        
        fips_columns = [col for col in result_df.columns if 'fips' in col.lower()]
        for col in fips_columns:
            result_df[col] = self.fast_county_processing(result_df[col].values)
        
        date_to_year_only_fields = [
            'member_pcp_effective_date', 'plan_effective_date', 'plan_term_date'
        ]
        for field in date_to_year_only_fields:
            if field in result_df.columns:
                result_df[field] = self.fast_date_to_year_only(result_df[field].values)
        
        date_to_yq_fields = [
            'smib_from_date', 'smib_to_date', 'data_period_start', 'data_period_end'
        ]
        for field in date_to_yq_fields:
            if field in result_df.columns:
                result_df[field] = self.fast_date_to_year_quarter(result_df[field].values)
        
        if 'start_year_of_submission' in result_df.columns:
            result_df['eligibility_year'] = self.fast_date_to_year_only(result_df['start_year_of_submission'].values)
            result_df = result_df.drop(columns=['start_year_of_submission'])
        
        if 'death_date' in result_df.columns:
            result_df['deceased_indicator'] = result_df['death_date'].apply(lambda x: 'Y' if pd.notna(x) else 'N')
            result_df = result_df.drop(columns=['death_date'])
        
        return result_df
    
    def apply_provider_deidentification_fast(self, df):
        result_df = df.copy()
        
        npi_values = df.get('provider_npi', pd.Series([None] * len(df))).fillna('')
        payor_id_values = df.get('payor_assigned_provider_id', pd.Series([None] * len(df))).fillna('')
        
        def create_provider_id(row):
            npi, payor_id = row
            if npi:
                return self.create_deidentified_id(self.PROVIDER_SECRET_KEY, str(npi))
            elif payor_id:
                return self.create_deidentified_id(self.PROVIDER_SECRET_KEY, str(payor_id))
            return None
        
        result_df['DEID_PROVIDER_ID'] = pd.DataFrame({'npi': npi_values, 'payor': payor_id_values}).apply(create_provider_id, axis=1)
        
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
            result_df[col] = self.fast_zip_processing(result_df[col].values)
        
        fips_columns = [col for col in result_df.columns if 'fips' in col.lower()]
        for col in fips_columns:
            result_df[col] = self.fast_county_processing(result_df[col].values)
        
        return result_df
    
    def apply_medical_deidentification_fast(self, df, age_lookup=None):
        result_df = df.copy()
        
        mask_demographics = np.zeros(len(result_df), dtype=bool)
        
        dx_cols = ['principal_diagnosis'] + [f'other_diagnosis_{i}' for i in range(1, 25)]
        dx_cols = [col for col in dx_cols if col in result_df.columns]
        
        for col in dx_cols:
            codes = result_df[col].values
            sensitive_flags = self.fast_check_sensitive_diagnosis(codes)
            mask_demographics |= np.array(sensitive_flags)
            
            rare_mask = result_df[col].isin(self.rare_dx_codes)
            mask_demographics |= rare_mask.values
            
            result_df.loc[rare_mask, col] = result_df.loc[rare_mask, col].astype(str).str[:3]
            
            for generalized, codes_list in self.generalization_codes.items():
                code_mask = result_df[col].astype(str).str.upper().str[:3].isin(codes_list)
                result_df.loc[code_mask, col] = generalized
        
        cpt_cols = ['procedure_code'] + [f'icd_cm_pcs_other_procedure_code_{i}' for i in range(1, 26)]
        cpt_cols = [col for col in cpt_cols if col in result_df.columns]
        
        for col in cpt_cols:
            rare_mask = result_df[col].isin(self.rare_cpt_codes)
            mask_demographics |= rare_mask.values
        
        if 'drug_code' in result_df.columns:
            rare_mask = result_df['drug_code'].isin(self.rare_ndc_codes)
            mask_demographics |= rare_mask.values
        
        zip_columns = [col for col in result_df.columns if 'zip' in col.lower() and 'code' in col.lower()]
        for col in zip_columns:
            result_df[col] = self.fast_zip_processing(result_df[col].values)
        
        fips_columns = [col for col in result_df.columns if 'fips' in col.lower()]
        for col in fips_columns:
            result_df[col] = self.fast_county_processing(result_df[col].values)
        
        for col in zip_columns + fips_columns:
            if col in result_df.columns:
                result_df.loc[mask_demographics, col] = '000'
        
        if 'member_sex' in result_df.columns:
            result_df.loc[mask_demographics, 'member_sex'] = np.nan
        
        if 'payor_claim_control_number' in result_df.columns:
            claim_combo = (result_df['payor_claim_control_number'].astype(str) + '|' + 
                          result_df.get('cross_reference_claims_id', '').astype(str) + '|' +
                          result_df.get('data_submitter_code', '').astype(str))
            result_df['DEID_CLAIM_ID'] = claim_combo.apply(lambda x: self.create_deidentified_id(self.CLAIM_SECRET_KEY, x))
        
        if 'carrier_specific_unique_member_id' in result_df.columns:
            member_combo = (result_df['carrier_specific_unique_member_id'].astype(str) + '|' + 
                           result_df.get('data_submitter_code', '').astype(str))
            result_df['DEID_MEMBER_ID'] = member_combo.apply(lambda x: self.create_deidentified_id(self.MEMBER_SECRET_KEY, x))
        
        if 'carrier_specific_unique_subscriber_id' in result_df.columns:
            subscriber_combo = (result_df['carrier_specific_unique_subscriber_id'].astype(str) + '|' + 
                               result_df.get('data_submitter_code', '').astype(str))
            result_df['DEID_SUBSCRIBER_ID'] = subscriber_combo.apply(lambda x: self.create_deidentified_id(self.MEMBER_SECRET_KEY, x))
        
        provider_fields = {
            'rendering_provider_npi': 'DEID_RENDERING_PROVIDER_ID',
            'billing_provider_npi': 'DEID_BILLING_PROVIDER_ID',
            'attending_provider_npi': 'DEID_ATTENDING_PROVIDER_ID',
            'operating_provider_npi': 'DEID_OPERATING_PROVIDER_ID'
        }
        
        for npi_field, deid_field in provider_fields.items():
            if npi_field in result_df.columns:
                result_df[deid_field] = result_df[npi_field].apply(
                    lambda x: self.create_deidentified_id(self.PROVIDER_SECRET_KEY, str(x)) if pd.notna(x) else None
                )
        
        if age_lookup and 'DEID_MEMBER_ID' in result_df.columns:
            result_df['AGE_GROUP'] = result_df['DEID_MEMBER_ID'].map(age_lookup)
        elif 'member_date_of_birth' in result_df.columns:
            ages = self.fast_age_calculation(result_df['member_date_of_birth'].values)
            age_groups = self.fast_age_to_group(ages)
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
                result_df[field] = self.fast_date_to_year_quarter(result_df[field].values)
        
        return result_df


def main():
    deidentifier = OptimizedAPCDDeidentifier(generate_new_keys=True, con=con)
    
    try:
        deidentifier.process_eligibility_data()
        deidentifier.process_provider_data()
        deidentifier.process_medical_data()
        
        cursor = con.cursor()
        
        cursor.execute(f"SELECT COUNT(*) FROM {OUTPUT_SCHEMA}.{DEID_ELIGIBILITY_TABLE}")
        elig_count = cursor.fetchone()[0]
        
        cursor.execute(f"SELECT COUNT(*) FROM {OUTPUT_SCHEMA}.{DEID_PROVIDER_TABLE}")
        prov_count = cursor.fetchone()[0]
        
        cursor.execute(f"SELECT COUNT(*) FROM {OUTPUT_SCHEMA}.{DEID_MEDICAL_TABLE}")
        med_count = cursor.fetchone()[0]
        
        print(f"Eligibility Records: {elig_count:,}")
        print(f"Provider Records: {prov_count:,}")
        print(f"Medical Records: {med_count:,}")
        
        cursor.close()
        
    except Exception as e:
        print(f"ERROR: {str(e)}")
        import traceback
        traceback.print_exc()
    
    finally:
        if con:
            con.close()


if __name__ == "__main__":
    main()