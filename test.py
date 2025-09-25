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
from psycopg2.extras import execute_values

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


class APCDMasterDeidentifier:
    
    def __init__(self, generate_new_keys=True, con=None, use_sqlite=False):
        self.con = con
        self.use_sqlite = use_sqlite
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
        self._create_lookup_tables()
    
    def define_sensitive_codes(self):
        self.high_sensitivity_codes = {
            'HIV_AIDS': ['B20', 'B21', 'B22', 'B23', 'B24'],
            'SUBSTANCE': ['F10', 'F11', 'F12', 'F13', 'F14', 'F15', 'F16', 'F17', 'F18', 'F19']
        }
        
        self.newborn_codes = ['Z38', 'Z332']
        self.abuse_codes = ['T74', 'T76']
        
        self.generalization_codes = {
            'A50-A64': ['A50', 'A51', 'A52', 'A53', 'A54', 'A55', 'A56', 'A57', 'A58', 'A59', 'A60', 'A61', 'A62', 'A63', 'A64'],
            'F20': ['F20'],
            'F31': ['F31'],
            'T74': ['T74'],
            'T76': ['T76'],
            'G10': ['G10'],
            'E84': ['E84']
        }

    def _create_lookup_tables(self):
        self.sensitive_codes_set = set()
        for codes in self.high_sensitivity_codes.values():
            self.sensitive_codes_set.update(codes)
        self.sensitive_codes_set.update(self.abuse_codes)
        
        self.generalization_lookup = {}
        for generalized, codes_list in self.generalization_codes.items():
            for code in codes_list:
                self.generalization_lookup[code] = generalized
    
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
            
            print("  Sample ZIP codes loaded:")
            for i, (zip_code, pop) in enumerate(list(population_data.items())[:5]):
                print(f"    {zip_code}: {pop:,}")
            
            prefixes = {}
            for zip_code, pop in population_data.items():
                prefix = zip_code[:3]
                if prefix not in prefixes:
                    prefixes[prefix] = {'count': 0, 'total_pop': 0}
                prefixes[prefix]['count'] += 1
                prefixes[prefix]['total_pop'] += pop
            
            masked_prefixes = [p for p, data in prefixes.items() if data['total_pop'] < 20000]
            print(f"  3-digit prefixes that will be masked (pop < 20K): {len(masked_prefixes)} out of {len(prefixes)}")
            if masked_prefixes:
                for prefix in masked_prefixes:
                    print(f"    {prefix}: {prefixes[prefix]['total_pop']:,} total population")
                
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
            '48201': 1716239,
            '48029': 2688247,
            '48113': 1395269,
            '48439': 944279,
            '48453': 1290446,
            '48085': 394453,
            '48121': 485445,
            '48157': 620961,
            '48215': 354452,
            '48339': 432022,
            '48011': 1904,
            '48033': 8466,
            '48045': 3353,
        }
        return county_data
    
    def create_deidentified_id_vectorized(self, secret_key: str, series: pd.Series) -> pd.Series:
        key_bytes = secret_key.encode('utf-8')
        
        def hash_single(input_string):
            if pd.isna(input_string):
                return None
            input_bytes = str(input_string).encode('utf-8')
            hmac_object = hmac.new(key_bytes, msg=input_bytes, digestmod=hashlib.sha256)
            binary_digest = hmac_object.digest()
            result = base64.urlsafe_b64encode(binary_digest).decode('utf-8')
            result = ''.join(c for c in result if c.isalnum())[:16]
            return result
        
        return series.apply(hash_single)
    
    def date_to_year_quarter_vectorized(self, series):
        def convert_date(date_value):
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
        
        return series.apply(convert_date)
    
    def date_to_year_only_vectorized(self, series):
        def convert_date(date_value):
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
        
        return series.apply(convert_date)
    
    def truncate_zip_to_3digits_vectorized(self, series):
        def process_zip(zip_code):
            if pd.isna(zip_code):
                return "000"
            zip_str = str(zip_code).strip()
            if len(zip_str) < 3:
                return "000"
            zip_3 = zip_str[:3]
            
            if self.population_data:
                matching_zips = [z for z in self.population_data.keys() if z.startswith(zip_3)]
                total_pop = sum(self.population_data.get(z, 0) for z in matching_zips)
                if total_pop < 20000:
                    return "000"
            
            return zip_3
        
        return series.apply(process_zip)
    
    def process_county_fips_vectorized(self, series):
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
            
            return fips_str
        
        return series.apply(process_fips)
    
    def calculate_age_from_dob_vectorized(self, series, reference_date=None):
        if reference_date is None:
            reference_date = datetime.now()
        
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
                
                if age > 90:
                    age = 90
                
                return age
            except:
                return None
        
        return series.apply(calc_age)
    
    def age_to_group_vectorized(self, series, is_hiv_drug_population=False):
        def convert_age(age):
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
        
        return series.apply(convert_age)
    
    def load_eligibility_data(self):
        print("Loading eligibility data...")
        if self.use_sqlite:
            query = f"SELECT * FROM {INPUT_ELIGIBILITY_TABLE}"
        else:
            eligibility_table = f"{INPUT_SCHEMA}.{INPUT_ELIGIBILITY_TABLE}"
            query = f"SELECT * FROM {eligibility_table}"
        
        return pd.read_sql_query(query, self.con)
    
    def load_provider_data(self):
        print("Loading provider data...")
        if self.use_sqlite:
            query = f"SELECT * FROM {INPUT_PROVIDER_TABLE}"
        else:
            provider_table = f"{INPUT_SCHEMA}.{INPUT_PROVIDER_TABLE}"
            query = f"SELECT * FROM {provider_table}"
        
        return pd.read_sql_query(query, self.con)
    
    def load_medical_data(self):
        print("Loading medical claims data...")
        if self.use_sqlite:
            query = f"SELECT * FROM {INPUT_MEDICAL_TABLE}"
        else:
            medical_table = f"{INPUT_SCHEMA}.{INPUT_MEDICAL_TABLE}"
            query = f"SELECT * FROM {medical_table}"
        
        return pd.read_sql_query(query, self.con)
    
    def apply_eligibility_deidentification(self, df):
        print("Applying eligibility deidentification...")
        result_df = df.copy()
        
        if 'carrier_specific_unique_member_id' in result_df.columns and 'data_submitter_code' in result_df.columns:
            combined_series = result_df['carrier_specific_unique_member_id'].astype(str) + '|' + result_df['data_submitter_code'].astype(str)
            result_df['DEID_MEMBER_ID'] = self.create_deidentified_id_vectorized(self.MEMBER_SECRET_KEY, combined_series)
        
        if 'carrier_specific_unique_subscriber_id' in result_df.columns and 'data_submitter_code' in result_df.columns:
            combined_series = result_df['carrier_specific_unique_subscriber_id'].astype(str) + '|' + result_df['data_submitter_code'].astype(str)
            result_df['DEID_SUBSCRIBER_ID'] = self.create_deidentified_id_vectorized(self.MEMBER_SECRET_KEY, combined_series)
        
        if 'member_date_of_birth' in result_df.columns:
            ages = self.calculate_age_from_dob_vectorized(result_df['member_date_of_birth'])
            result_df['AGE_GROUP'] = self.age_to_group_vectorized(ages)
        
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
            result_df[col] = self.truncate_zip_to_3digits_vectorized(result_df[col])
        
        fips_columns = [col for col in result_df.columns if 'fips' in col.lower()]
        for col in fips_columns:
            result_df[col] = self.process_county_fips_vectorized(result_df[col])
        
        date_to_year_only_fields = ['member_pcp_effective_date', 'plan_effective_date', 'plan_term_date']
        for field in date_to_year_only_fields:
            if field in result_df.columns:
                result_df[field] = self.date_to_year_only_vectorized(result_df[field])
        
        date_to_yq_fields = ['smib_from_date', 'smib_to_date', 'data_period_start', 'data_period_end']
        for field in date_to_yq_fields:
            if field in result_df.columns:
                result_df[field] = self.date_to_year_quarter_vectorized(result_df[field])
        
        if 'start_year_of_submission' in result_df.columns:
            result_df['eligibility_year'] = self.date_to_year_only_vectorized(result_df['start_year_of_submission'])
            result_df = result_df.drop(columns=['start_year_of_submission'])
        
        if 'death_date' in result_df.columns:
            result_df['deceased_indicator'] = result_df['death_date'].notna().map({True: 'Y', False: 'N'})
            result_df = result_df.drop(columns=['death_date'])
        
        return result_df
    
    def apply_provider_deidentification(self, df):
        print("Applying provider deidentification...")
        result_df = df.copy()
        
        def create_provider_id_series(df):
            provider_ids = []
            for _, row in df.iterrows():
                id_components = []
                if pd.notna(row.get('provider_npi')):
                    id_components.append(str(row['provider_npi']))
                elif pd.notna(row.get('payor_assigned_provider_id')):
                    id_components.append(str(row['payor_assigned_provider_id']))
                
                if id_components:
                    provider_ids.append('|'.join(id_components))
                else:
                    provider_ids.append(None)
            
            return pd.Series(provider_ids)
        
        provider_id_series = create_provider_id_series(result_df)
        result_df['DEID_PROVIDER_ID'] = self.create_deidentified_id_vectorized(self.PROVIDER_SECRET_KEY, provider_id_series)
        
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
            result_df[col] = self.truncate_zip_to_3digits_vectorized(result_df[col])
        
        fips_columns = [col for col in result_df.columns if 'fips' in col.lower()]
        for col in fips_columns:
            result_df[col] = self.process_county_fips_vectorized(result_df[col])
        
        return result_df
    
    def apply_medical_deidentification(self, df, eligibility_deid_df=None):
        print("Applying medical deidentification with enhanced masking...")
        result_df = df.copy()
        
        mask_demographics = pd.Series([False] * len(result_df), index=result_df.index)
        
        dx_cols = ['principal_diagnosis'] + [f'other_diagnosis_{i}' for i in range(1, 25)]
        dx_cols = [col for col in dx_cols if col in result_df.columns]
        
        print(f"Found diagnosis columns: {dx_cols}")
        
        all_dx_values = []
        dx_positions = []
        
        for col in dx_cols:
            if col in result_df.columns:
                col_values = result_df[col].dropna()
                all_dx_values.extend(col_values.tolist())
                dx_positions.extend([(idx, col) for idx in col_values.index])
        
        if all_dx_values:
            dx_series = pd.Series(all_dx_values)
            dx_freq = dx_series.value_counts()
            rare_dx_codes = set(dx_freq[dx_freq < self.RARITY_THRESHOLD_K].index)
            
            print(f"Total diagnosis codes: {len(all_dx_values)}")
            print(f"Unique diagnosis codes: {len(dx_freq)}")
            print(f"Rare diagnosis codes (< {self.RARITY_THRESHOLD_K}): {len(rare_dx_codes)}")
            
            masked_sensitive = 0
            masked_rare_dx = 0
            
            for col in dx_cols:
                if col in result_df.columns:
                    col_data = result_df[col].dropna()
                    
                    sensitive_mask = col_data.str[:3].isin(self.sensitive_codes_set)
                    if sensitive_mask.any():
                        mask_demographics.loc[sensitive_mask[sensitive_mask].index] = True
                        masked_sensitive += sensitive_mask.sum()
                    
                    rare_mask = col_data.isin(rare_dx_codes)
                    if rare_mask.any():
                        mask_demographics.loc[rare_mask[rare_mask].index] = True
                        result_df.loc[rare_mask[rare_mask].index, col] = col_data[rare_mask].str[:3]
                        masked_rare_dx += rare_mask.sum()
                    
                    for code, generalized in self.generalization_lookup.items():
                        code_mask = col_data.str[:3] == code
                        if code_mask.any():
                            result_df.loc[code_mask[code_mask].index, col] = generalized
            
            print(f"Records with sensitive diagnoses: {masked_sensitive}")
            print(f"Records with rare diagnoses: {masked_rare_dx}")
        else:
            print("No diagnosis codes found")
        
        cpt_cols = ['procedure_code'] + [f'icd_cm_pcs_other_procedure_code_{i}' for i in range(1, 26)]
        cpt_cols = [col for col in cpt_cols if col in result_df.columns]
        
        print(f"Found procedure columns: {cpt_cols}")
        
        masked_rare_cpt = 0
        if cpt_cols:
            all_cpt_values = []
            for col in cpt_cols:
                if col in result_df.columns:
                    all_cpt_values.extend(result_df[col].dropna().tolist())
            
            if all_cpt_values:
                cpt_series = pd.Series(all_cpt_values)
                cpt_freq = cpt_series.value_counts()
                rare_cpt_codes = set(cpt_freq[cpt_freq < self.RARITY_THRESHOLD_K].index)
                
                print(f"Total procedure codes: {len(all_cpt_values)}")
                print(f"Unique procedure codes: {len(cpt_freq)}")
                print(f"Rare procedure codes (< {self.RARITY_THRESHOLD_K}): {len(rare_cpt_codes)}")
                
                for col in cpt_cols:
                    if col in result_df.columns:
                        col_data = result_df[col].dropna()
                        rare_mask = col_data.isin(rare_cpt_codes)
                        if rare_mask.any():
                            mask_demographics.loc[rare_mask[rare_mask].index] = True
                            masked_rare_cpt += rare_mask.sum()
                
                print(f"Records with rare procedures: {masked_rare_cpt}")
            else:
                print("No procedure codes found")
        
        masked_rare_ndc = 0
        if 'drug_code' in result_df.columns:
            drug_codes = result_df['drug_code'].dropna()
            if len(drug_codes) > 0:
                ndc_freq = drug_codes.value_counts()
                rare_ndc_codes = set(ndc_freq[ndc_freq < self.RARITY_THRESHOLD_K].index)
                
                print(f"Total drug codes: {len(drug_codes)}")
                print(f"Unique drug codes: {len(ndc_freq)}")
                print(f"Rare drug codes (< {self.RARITY_THRESHOLD_K}): {len(rare_ndc_codes)}")
                
                rare_mask = drug_codes.isin(rare_ndc_codes)
                if rare_mask.any():
                    mask_demographics.loc[rare_mask[rare_mask].index] = True
                    masked_rare_ndc = rare_mask.sum()
                
                print(f"Records with rare drugs: {masked_rare_ndc}")
            else:
                print("No drug codes found")
        else:
            print("No drug_code column found")
        
        total_masked = mask_demographics.sum()
        print(f"TOTAL records to be masked: {total_masked} out of {len(result_df)} ({total_masked/len(result_df)*100:.1f}%)")
        
        zip_columns = [col for col in result_df.columns if 'zip' in col.lower() and 'code' in col.lower()]
        fips_columns = [col for col in result_df.columns if 'fips' in col.lower()]
        
        for col in zip_columns:
            result_df[col] = self.truncate_zip_to_3digits_vectorized(result_df[col])
        
        for col in fips_columns:
            result_df[col] = self.process_county_fips_vectorized(result_df[col])
        
        if total_masked > 0:
            for col in zip_columns:
                if col in result_df.columns:
                    result_df.loc[mask_demographics, col] = '000'
            
            for col in fips_columns:
                if col in result_df.columns:
                    result_df.loc[mask_demographics, col] = '000'
            
            if 'member_sex' in result_df.columns:
                result_df.loc[mask_demographics, 'member_sex'] = np.nan
        
        if 'payor_claim_control_number' in result_df.columns:
            claim_series = (result_df['payor_claim_control_number'].astype(str) + '|' + 
                           result_df.get('cross_reference_claims_id', '').astype(str) + '|' + 
                           result_df.get('data_submitter_code', '').astype(str))
            result_df['DEID_CLAIM_ID'] = self.create_deidentified_id_vectorized(self.CLAIM_SECRET_KEY, claim_series)
        
        if 'carrier_specific_unique_member_id' in result_df.columns:
            member_series = (result_df['carrier_specific_unique_member_id'].astype(str) + '|' + 
                           result_df.get('data_submitter_code', '').astype(str))
            result_df['DEID_MEMBER_ID'] = self.create_deidentified_id_vectorized(self.MEMBER_SECRET_KEY, member_series)
        
        if 'carrier_specific_unique_subscriber_id' in result_df.columns:
            subscriber_series = (result_df['carrier_specific_unique_subscriber_id'].astype(str) + '|' + 
                               result_df.get('data_submitter_code', '').astype(str))
            result_df['DEID_SUBSCRIBER_ID'] = self.create_deidentified_id_vectorized(self.MEMBER_SECRET_KEY, subscriber_series)
        
        provider_fields = {
            'rendering_provider_npi': 'DEID_RENDERING_PROVIDER_ID',
            'billing_provider_npi': 'DEID_BILLING_PROVIDER_ID',
            'attending_provider_npi': 'DEID_ATTENDING_PROVIDER_ID',
            'operating_provider_npi': 'DEID_OPERATING_PROVIDER_ID'
        }
        
        for npi_field, deid_field in provider_fields.items():
            if npi_field in result_df.columns:
                result_df[deid_field] = self.create_deidentified_id_vectorized(self.PROVIDER_SECRET_KEY, result_df[npi_field].astype(str))
        
        if 'AGE_GROUP' in result_df.columns:
            result_df = result_df.drop(columns=['AGE_GROUP'])
        
        if eligibility_deid_df is not None and 'DEID_MEMBER_ID' in result_df.columns and 'AGE_GROUP' in eligibility_deid_df.columns:
            print("Merging age groups from eligibility data...")
            age_lookup = eligibility_deid_df[['DEID_MEMBER_ID', 'AGE_GROUP']].drop_duplicates()
            
            medical_members = set(result_df['DEID_MEMBER_ID'].dropna())
            elig_members = set(age_lookup['DEID_MEMBER_ID'].dropna())
            print(f"  Medical members: {len(medical_members):,}")
            print(f"  Eligibility members: {len(elig_members):,}")
            print(f"  Members in both: {len(medical_members.intersection(elig_members)):,}")
            
            result_df = result_df.merge(age_lookup, on='DEID_MEMBER_ID', how='left')
            
            null_age_after_merge = result_df['AGE_GROUP'].isna().sum()
            print(f"  Null AGE_GROUP after merge: {null_age_after_merge:,} ({null_age_after_merge/len(result_df)*100:.1f}%)")
            
        elif 'member_date_of_birth' in result_df.columns:
            print("Calculating age groups from date of birth in medical data...")
            ages = self.calculate_age_from_dob_vectorized(result_df['member_date_of_birth'])
            result_df['AGE_GROUP'] = self.age_to_group_vectorized(ages)
            
            null_age_from_dob = result_df['AGE_GROUP'].isna().sum()
            print(f"  Null AGE_GROUP from DOB calculation: {null_age_from_dob:,} ({null_age_from_dob/len(result_df)*100:.1f}%)")
        else:
            print("WARNING: No eligibility data provided and no member_date_of_birth in medical data - AGE_GROUP will be null")
        
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
                result_df[field] = self.date_to_year_quarter_vectorized(result_df[field])
        
        print(f"  - Records with masked demographics: {mask_demographics.sum():,}")
        
        return result_df

    def bulk_insert_to_db(self, df, table_name):
        cursor = self.con.cursor()
        full_table = f"{OUTPUT_SCHEMA}.{table_name}"
        
        cursor.execute(f"DROP TABLE IF EXISTS {full_table}")
        
        columns = []
        for col in df.columns:
            columns.append(f"{col} TEXT")
        create_sql = f"CREATE TABLE {full_table} ({', '.join(columns)})"
        cursor.execute(create_sql)
        
        data_tuples = [tuple(str(val) if pd.notna(val) else None for val in row) for row in df.values]
        
        placeholders = ', '.join(['%s'] * len(df.columns))
        insert_sql = f"INSERT INTO {full_table} ({', '.join(df.columns)}) VALUES ({placeholders})"
        
        execute_values(cursor, insert_sql, data_tuples, page_size=1000)
        
        cursor.close()


def validate_deidentification(eligibility_df, provider_df, medical_df):
    print("\n" + "="*70)
    print("VALIDATION REPORT")
    print("="*70)
    
    issues = []
    
    pii_fields = {
        'eligibility': ['subscriber_social_security_number', 'member_social_security_number', 
                       'member_last_name', 'member_first_name'],
        'provider': ['provider_tax_id', 'provider_npi', 'provider_first_name'],
        'medical': ['member_social_security_number', 'patient_control_number', 
                   'medical_record_number']
    }
    
    for file_type, fields in pii_fields.items():
        if file_type == 'eligibility':
            df = eligibility_df
        elif file_type == 'provider':
            df = provider_df
        else:
            df = medical_df
        
        for field in fields:
            if field in df.columns:
                issues.append(f"PII field '{field}' still present in {file_type} file")
    
    id_fields = {
        'eligibility': ['DEID_MEMBER_ID', 'DEID_SUBSCRIBER_ID'],
        'provider': ['DEID_PROVIDER_ID'],
        'medical': ['DEID_CLAIM_ID', 'DEID_MEMBER_ID']
    }
    
    for file_type, fields in id_fields.items():
        if file_type == 'eligibility':
            df = eligibility_df
        elif file_type == 'provider':
            df = provider_df
        else:
            df = medical_df
        
        for field in fields:
            if field not in df.columns:
                issues.append(f"De-identified ID '{field}' missing from {file_type} file")
            elif df[field].isna().all():
                issues.append(f"De-identified ID '{field}' is all null in {file_type} file")
    
    print("\n CROSS-FILE LINKAGE VALIDATION:")
    print("-"*40)
    
    if 'DEID_MEMBER_ID' in eligibility_df.columns and 'DEID_MEMBER_ID' in medical_df.columns:
        elig_members = set(eligibility_df['DEID_MEMBER_ID'].dropna())
        medical_members = set(medical_df['DEID_MEMBER_ID'].dropna())
        common_members = elig_members.intersection(medical_members)
        print(f"  Members in eligibility file: {len(elig_members):,}")
        print(f"  Members in medical file: {len(medical_members):,}")
        print(f"  Members in both files: {len(common_members):,}")
        print(f"  Members only in eligibility: {len(elig_members - medical_members):,}")
        print(f"  Members only in medical: {len(medical_members - elig_members):,}")
    
    if 'DEID_SUBSCRIBER_ID' in eligibility_df.columns and 'DEID_SUBSCRIBER_ID' in medical_df.columns:
        elig_subscribers = set(eligibility_df['DEID_SUBSCRIBER_ID'].dropna())
        medical_subscribers = set(medical_df['DEID_SUBSCRIBER_ID'].dropna())
        common_subscribers = elig_subscribers.intersection(medical_subscribers)
        print(f"\n  Subscribers in eligibility file: {len(elig_subscribers):,}")
        print(f"  Subscribers in medical file: {len(medical_subscribers):,}")
        print(f"  Subscribers in both files: {len(common_subscribers):,}")
    
    provider_id_fields = ['DEID_RENDERING_PROVIDER_ID', 'DEID_BILLING_PROVIDER_ID', 
                         'DEID_ATTENDING_PROVIDER_ID', 'DEID_OPERATING_PROVIDER_ID']
    
    if 'DEID_PROVIDER_ID' in provider_df.columns:
        provider_ids = set(provider_df['DEID_PROVIDER_ID'].dropna())
        print(f"\n  Providers in provider file: {len(provider_ids):,}")
        
        medical_provider_ids = set()
        for field in provider_id_fields:
            if field in medical_df.columns:
                medical_provider_ids.update(medical_df[field].dropna())
        
        if medical_provider_ids:
            common_providers = provider_ids.intersection(medical_provider_ids)
            print(f"  Providers referenced in medical file: {len(medical_provider_ids):,}")
            print(f"  Providers in both files: {len(common_providers):,}")
    
    print("\n DATA QUALITY CHECKS:")
    print("-"*40)
    
    if 'AGE_GROUP' in eligibility_df.columns:
        null_age_groups = eligibility_df['AGE_GROUP'].isna().sum()
        print(f"  Eligibility - Null AGE_GROUP: {null_age_groups:,} ({null_age_groups/len(eligibility_df)*100:.1f}%)")
        if null_age_groups == len(eligibility_df):
            issues.append("All AGE_GROUP values are null in eligibility file")
    
    if 'AGE_GROUP' in medical_df.columns:
        null_age_groups = medical_df['AGE_GROUP'].isna().sum()
        print(f"  Medical - Null AGE_GROUP: {null_age_groups:,} ({null_age_groups/len(medical_df)*100:.1f}%)")
        if null_age_groups == len(medical_df):
            issues.append("All AGE_GROUP values are null in medical file")
    
    if issues:
        print("\n  VALIDATION ISSUES FOUND:")
        for issue in issues:
            print(f"   - {issue}")
    else:
        print("\n ALL VALIDATION CHECKS PASSED")
    
    return len(issues) == 0


def main():
    print("\n" + "="*70)
    print("TX-APCD COMPLIANT DE-IDENTIFICATION SYSTEM")
    print("="*70)
    print("Version 2.0 - Enhanced Masking Rules")
    print("K=10 threshold for ICD-10, CPT, and NDC codes")
    print("")
    
    use_sqlite = False
    
    deidentifier = APCDMasterDeidentifier(generate_new_keys=True, con=con, use_sqlite=use_sqlite)
    
    try:
        print("\n1. LOADING DATA FROM DATABASE")
        print("-"*40)
        eligibility_data = deidentifier.load_eligibility_data()
        provider_data = deidentifier.load_provider_data()
        medical_data = deidentifier.load_medical_data()
        
        print(f" Eligibility: {len(eligibility_data)} records, {len(eligibility_data.columns)} columns")
        print(f" Provider: {len(provider_data)} records, {len(provider_data.columns)} columns")
        print(f" Medical: {len(medical_data)} records, {len(medical_data.columns)} columns")
        
        print("\n2. APPLYING DE-IDENTIFICATION RULES")
        print("-"*40)
        
        eligibility_deid = deidentifier.apply_eligibility_deidentification(eligibility_data)
        print(f" Eligibility de-identified: {len(eligibility_deid.columns)} columns remaining")
        
        provider_deid = deidentifier.apply_provider_deidentification(provider_data)
        print(f" Provider de-identified: {len(provider_deid.columns)} columns remaining")
        
        medical_deid = deidentifier.apply_medical_deidentification(medical_data, eligibility_deid)
        print(f" Medical de-identified: {len(medical_deid.columns)} columns remaining")
        
        print("\n3. SAVING DE-IDENTIFIED DATA TO DATABASE")
        print("-"*40)
        
        deidentifier.bulk_insert_to_db(eligibility_deid, DEID_ELIGIBILITY_TABLE)
        deidentifier.bulk_insert_to_db(provider_deid, DEID_PROVIDER_TABLE)
        deidentifier.bulk_insert_to_db(medical_deid, DEID_MEDICAL_TABLE)
        
        print(f" Data saved to database")
        
        print("\n4. RUNNING VALIDATION CHECKS")
        print("-"*40)
        
        is_valid = validate_deidentification(eligibility_deid, provider_deid, medical_deid)
        
        print("\n5. SUMMARY STATISTICS")
        print("-"*40)
        
        print("\nEligibility File:")
        print(f"   Records: {len(eligibility_deid):,}")
        print(f"   Unique Members: {eligibility_deid['DEID_MEMBER_ID'].nunique():,}")
        print(f"   Unique Subscribers: {eligibility_deid['DEID_SUBSCRIBER_ID'].nunique():,}")
        zip_columns = [col for col in eligibility_deid.columns if 'zip' in col.lower() and 'code' in col.lower()]
        for col in zip_columns:
            if col in eligibility_deid.columns:
                masked_zips = (eligibility_deid[col] == '000').sum()
                print(f"   Masked {col}: {masked_zips:,} ({masked_zips/len(eligibility_deid)*100:.1f}%)")
        
        print("\nProvider File:")
        print(f"   Records: {len(provider_deid):,}")
        print(f"   Unique Providers: {provider_deid['DEID_PROVIDER_ID'].nunique():,}")
        
        print("\nMedical File:")
        print(f"   Records: {len(medical_deid):,}")
        print(f"   Unique Claims: {medical_deid['DEID_CLAIM_ID'].nunique():,}")
        print(f"   Unique Members: {medical_deid['DEID_MEMBER_ID'].nunique():,}")
        zip_columns = [col for col in medical_deid.columns if 'zip' in col.lower() and 'code' in col.lower()]
        for col in zip_columns:
            if col in medical_deid.columns:
                masked_zips = (medical_deid[col] == '000').sum()
                print(f"   Masked {col}: {masked_zips:,} ({masked_zips/len(medical_deid)*100:.1f}%)")
        if 'member_sex' in medical_deid.columns:
            masked_gender = medical_deid['member_sex'].isna().sum()
            print(f"   Masked Gender: {masked_gender:,} ({masked_gender/len(medical_deid)*100:.1f}%)")
        
        print("\n6. CREATING CROSSWALK FILES")
        print("-"*40)
        
        os.makedirs("crosswalks", exist_ok=True)
        
        if 'carrier_specific_unique_member_id' in eligibility_data.columns:
            member_crosswalk = pd.DataFrame({
                'original_member_id': eligibility_data['carrier_specific_unique_member_id'],
                'deid_member_id': eligibility_deid['DEID_MEMBER_ID']
            })
            member_crosswalk.to_csv("crosswalks/member_id_crosswalk.csv", index=False)
            print(" Member ID crosswalk saved")
        
        if 'provider_npi' in provider_data.columns:
            provider_crosswalk = pd.DataFrame({
                'original_npi': provider_data['provider_npi'],
                'deid_provider_id': provider_deid['DEID_PROVIDER_ID']
            })
            provider_crosswalk.to_csv("crosswalks/provider_id_crosswalk.csv", index=False)
            print(" Provider ID crosswalk saved")
        
        if 'DEID_MEMBER_ID' in medical_deid.columns and 'DEID_CLAIM_ID' in medical_deid.columns:
            member_claim_crosswalk = medical_deid[['DEID_MEMBER_ID', 'DEID_CLAIM_ID']].drop_duplicates()
            member_claim_crosswalk.to_csv("crosswalks/member_claim_crosswalk.csv", index=False)
            print(" Member-Claim crosswalk saved")
        
        print("\n" + "="*70)
        if is_valid:
            print(" DE-IDENTIFICATION COMPLETE - TX-APCD COMPLIANT")
        else:
            print("  DE-IDENTIFICATION COMPLETE - REVIEW VALIDATION ISSUES")
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