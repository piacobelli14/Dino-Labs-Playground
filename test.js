def pullClaimsNeedingNoAdditionalProcessing():
    '''
    All line_counters have only one version and one row per the version. They also have one paid date.
    This is the vast majority of the 'kspadmn' payor codes.
    We will simply take the claims as they currently exist.
    '''
    query1 = f'''
        drop table if exists research_dev.pi_kspadmn_base_claims_temp;
        create table research_dev.pi_kspadmn_base_claims_temp as
        select payor_code::int as payor_code, payor_claim_control_number as pccn, plan_specific_contract_number as mem_id
        from research_dev.pi_payor_specific_claims_kspadmn
        where date_of_service_from::int / 10000 >= 2019 and payor_code::int = 20000040
        group by 1,2,3
        having count(distinct paid_date) = 1 and count(distinct version_number) = 1
        distributed by (payor_code);
    '''

    query2 = f'''
        drop table if exists research_dev.pi_kspadmn_base_claims_kspadmn;
        create table research_dev.pi_kspadmn_base_claims_kspadmn as
        select distinct
            c.apcd_id::bigint as apcd_id,
            a.data_submitter_code,
            a.payor_code::int as payor_code,
            a.plan_specific_contract_number as mem_id,
            a.carrier_specific_unique_subscriber_id as sub_id,
            a.payor_claim_control_number as pccn,
            a.line_counter,
            a.member_zip_code,
            to_date(a.date_of_service_from::text, 'YYYYMMDD') as date_of_service_from,
            to_date(a.date_of_service_thru::text, 'YYYYMMDD') as date_of_service_thru,
            to_date(a.paid_date::text, 'YYYYMMDD') as paid_date,
            to_date(a.admission_date::text, 'YYYYMMDD') as admission_date,
            a.admission_hour,
            a.admission_type,
            a.point_of_origin,
            to_date(a.discharge_date::text, 'YYYYMMDD') as discharge_date,
            a.discharge_hour,
            a.discharge_status,
            a.type_of_bill_institutional as bill,
            a.place_of_service_professional as place_of_service,
            a.revenue_code,
            a.procedure_code,
            a.procedure_modifier_1,
            a.procedure_modifier_2,
            a.procedure_modifier_3,
            a.procedure_modifier_4,
            a.admitting_diagnosis,
            a.first_external_cause_code,
            a.icd_version_indicator,
            a.principal_diagnosis,
            a.other_diagnosis_1,
            a.other_diagnosis_2,
            a.other_diagnosis_3,
            a.other_diagnosis_4,
            a.other_diagnosis_5,
            a.other_diagnosis_6,
            a.other_diagnosis_7,
            a.other_diagnosis_8,
            a.other_diagnosis_9,
            a.other_diagnosis_10,
            a.other_diagnosis_11,
            a.other_diagnosis_12,
            a.other_diagnosis_13,
            a.other_diagnosis_14,
            a.other_diagnosis_15,
            a.other_diagnosis_16,
            a.other_diagnosis_17,
            a.other_diagnosis_18,
            a.other_diagnosis_19,
            a.other_diagnosis_20,
            a.other_diagnosis_21,
            a.other_diagnosis_22,
            a.other_diagnosis_23,
            a.other_diagnosis_24,
            a.present_on_admission_code_1,
            a.present_on_admission_code_2,
            a.present_on_admission_code_3,
            a.present_on_admission_code_4,
            a.present_on_admission_code_5,
            a.present_on_admission_code_6,
            a.present_on_admission_code_7,
            a.present_on_admission_code_8,
            a.present_on_admission_code_9,
            a.present_on_admission_code_10,
            a.present_on_admission_code_11,
            a.present_on_admission_code_12,
            a.present_on_admission_code_13,
            a.present_on_admission_code_14,
            a.present_on_admission_code_15,
            a.present_on_admission_code_16,
            a.present_on_admission_code_17,
            a.present_on_admission_code_18,
            a.present_on_admission_code_19,
            a.present_on_admission_code_20,
            a.present_on_admission_code_21,
            a.present_on_admission_code_22,
            a.present_on_admission_code_23,
            a.present_on_admission_code_24,
            a.present_on_admission_code_25,
            a.icd_cm_pcs_principal_procedure_code,
            a.icd_cm_pcs_other_procedure_code_1,
            a.icd_cm_pcs_other_procedure_code_2,
            a.icd_cm_pcs_other_procedure_code_3,
            a.icd_cm_pcs_other_procedure_code_4,
            a.icd_cm_pcs_other_procedure_code_5,
            a.icd_cm_pcs_other_procedure_code_6,
            a.icd_cm_pcs_other_procedure_code_7,
            a.icd_cm_pcs_other_procedure_code_8,
            a.icd_cm_pcs_other_procedure_code_9,
            a.icd_cm_pcs_other_procedure_code_10,
            a.icd_cm_pcs_other_procedure_code_11,
            a.icd_cm_pcs_other_procedure_code_12,
            a.icd_cm_pcs_other_procedure_code_13,
            a.icd_cm_pcs_other_procedure_code_14,
            a.icd_cm_pcs_other_procedure_code_15,
            a.icd_cm_pcs_other_procedure_code_16,
            a.icd_cm_pcs_other_procedure_code_17,
            a.icd_cm_pcs_other_procedure_code_18,
            a.icd_cm_pcs_other_procedure_code_19,
            a.icd_cm_pcs_other_procedure_code_20,
            a.icd_cm_pcs_other_procedure_code_21,
            a.icd_cm_pcs_other_procedure_code_22,
            a.icd_cm_pcs_other_procedure_code_23,
            a.icd_cm_pcs_other_procedure_code_24,
            a.icd_cm_pcs_other_procedure_code_25,
            a.service_units_quantity,
            a.unit_of_measure,
            a.charge_amount,
            a.withhold_amount as withold_amount,
            a.plan_paid_amount,
            a.co_pay_amount,
            a.coinsurance_amount,
            a.deductible_amount,
            a.other_insurance_paid_amount,
            a.cob_tpl_amount,
            a.allowed_amount,
            a.payment_arrangement_type_flag,
            a.drug_code,
            a.rendering_provider_id,
            a.rendering_provider_npi,
            a.rendering_provider_entity_type_qualifier,
            a.in_plan_network_indicator,
            a.rendering_provider_first_name,
            a.rendering_provider_middle_name,
            a.rendering_provider_last_name_or_organization_name,
            a.rendering_provider_suffix,
            a.rendering_provider_specialty,
            a.rendering_provider_city_name,
            a.rendering_provider_state_or_province,
            a.rendering_provider_zip_code,
            a.rendering_provider_group_practice_npi,
            a.billing_provider_id,
            a.billing_provider_npi,
            a.billing_provider_last_name_or_organization_name,
            a.billing_providertax_id,
            a.referring_provider_id,
            a.referring_provider_npi,
            a.attending_provider_id,
            a.attending_provider_npi,
            a.carrier_associated_with_claim,
            a.type_of_claim,
            a.claim_status,
            a.denied_claim_line_indicator,
            a.claim_adjustment_reason_code,
            a.claim_line_type,
            1 as approach
        from research_dev.pi_payor_specific_claims_kspadmn a
        join research_dev.pi_kspadmn_base_claims_temp b
            on a.payor_code::int = b.payor_code
            and a.payor_claim_control_number = b.pccn
            and a.plan_specific_contract_number = b.mem_id
        left join research_data.xz_mpi_crosswalk c
            on a.payor_code::int = c.payor_code
            and a.plan_specific_contract_number = c.mem_id
        distributed by (apcd_id);
    '''

    query3 = f'''
        insert into research_dev.pi_final_claims_kspadmn
        select * from research_dev.pi_kspadmn_base_claims_kspadmn;
    '''

    with connection.cursor() as cursor:
        try:
            cursor.execute(query1)
            print(f"Created temp table with {cursor.rowcount} rows")
            cursor.execute(query2)
            print(f"Created base table with {cursor.rowcount} rows")
            cursor.execute(query3)
            print(f"Inserted {cursor.rowcount} rows into final table")
            cursor.execute('vacuum analyze research_dev.pi_final_claims_kspadmn;')
        except psycopg2.Error as e:
            print(f"Database error: {e}")
            raise
